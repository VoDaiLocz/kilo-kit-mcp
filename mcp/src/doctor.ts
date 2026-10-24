#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { resolveExecutableInPath } from "./paths.js";
import { createSkillRegistry } from "./registry.js";
import { createKiloKitServer } from "./server.js";

export interface DiagnosticCheck {
  name: string;
  category: "environment" | "database" | "skills" | "clients" | "server";
  status: "pass" | "warn" | "fail";
  message: string;
  details?: string | undefined;
}

export interface DoctorReport {
  overallStatus: "healthy" | "degraded" | "broken";
  checks: DiagnosticCheck[];
  timestamp: string;
  summary: string;
}

export async function runKiloKitDoctor(repoRoot: string): Promise<DoctorReport> {
  const checks: DiagnosticCheck[] = [];

  // 1. Node Environment Check
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split(".")[0] || "20", 10);
  if (major >= 20) {
    checks.push({
      name: "Node.js Runtime",
      category: "environment",
      status: "pass",
      message: `Node.js ${nodeVersion} meets requirement (>= 20.0.0).`,
    });
  } else {
    checks.push({
      name: "Node.js Runtime",
      category: "environment",
      status: "fail",
      message: `Node.js ${nodeVersion} is unsupported. Please upgrade to Node >= 20.`,
    });
  }

  // 2. Global CLI Binaries Resolution Check
  const mcpBin = resolveExecutableInPath("kilo-kit-mcp");
  const doctorBin = resolveExecutableInPath("kilo-kit-doctor");
  const setupBin = resolveExecutableInPath("kilo-kit-setup");
  if (mcpBin && doctorBin && setupBin) {
    checks.push({
      name: "CLI Global Binaries",
      category: "environment",
      status: "pass",
      message: `All CLI binaries resolved in PATH (kilo-kit-mcp -> ${mcpBin}).`,
    });
  } else {
    const missing = [
      !mcpBin ? "kilo-kit-mcp" : null,
      !doctorBin ? "kilo-kit-doctor" : null,
      !setupBin ? "kilo-kit-setup" : null,
    ].filter(Boolean);
    checks.push({
      name: "CLI Global Binaries",
      category: "environment",
      status: "warn",
      message: `Missing binaries in PATH: ${missing.join(", ")}. Run 'npm link' inside repository.`,
    });
  }

  // 3. SQLite Database & Memory Integrity Check
  const sqlitePath = path.resolve(
    process.env.KILO_KIT_MEMORY_PATH ?? path.join(os.homedir(), ".kilo-kit/orchestrator.sqlite"),
  );
  try {
    mkdirSync(path.dirname(sqlitePath), { recursive: true });
    const db = new DatabaseSync(sqlitePath);
    try {
      // PRAGMA integrity_check
      const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string } | undefined;
      const integrityResult =
        integrity?.integrity_check ?? (integrity as any)?.["integrity_check"] ?? "unknown";

      // Core tables check
      const tables = (
        db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
      ).map((t) => t.name);
      const requiredTables = [
        "orchestration_sessions",
        "learning_reflections",
        "memory_facts",
        "memory_decisions",
      ];
      const missingTables = requiredTables.filter((t) => !tables.includes(t));

      // FTS5 table check
      const hasFts = tables.includes("learning_reflections_fts");
      let ftsWorking = false;
      if (hasFts) {
        try {
          db.prepare(
            "SELECT count(*) as cnt FROM learning_reflections_fts WHERE learning_reflections_fts MATCH 'test*'",
          ).get();
          ftsWorking = true;
        } catch {
          ftsWorking = false;
        }
      }

      // Record counts
      let sessionCount = 0;
      let reflectionCount = 0;
      if (tables.includes("orchestration_sessions")) {
        const row = db.prepare("SELECT count(*) as cnt FROM orchestration_sessions").get() as {
          cnt: number;
        };
        sessionCount = row?.cnt ?? 0;
      }
      if (tables.includes("learning_reflections")) {
        const row = db.prepare("SELECT count(*) as cnt FROM learning_reflections").get() as {
          cnt: number;
        };
        reflectionCount = row?.cnt ?? 0;
      }

      if (integrityResult !== "ok") {
        checks.push({
          name: "SQLite Persistence",
          category: "database",
          status: "fail",
          message: `Integrity check failed: ${integrityResult}. File may be corrupted at ${sqlitePath}.`,
        });
      } else if (missingTables.length > 0) {
        checks.push({
          name: "SQLite Persistence",
          category: "database",
          status: "warn",
          message: `Database accessible at ${sqlitePath} but missing tables: ${missingTables.join(", ")}. Tables will be auto-created on next session.`,
        });
      } else {
        const ftsDetail = hasFts && ftsWorking ? "FTS5 BM25 active" : "FTS5 missing";
        checks.push({
          name: "SQLite Persistence",
          category: "database",
          status: "pass",
          message: `SQLite verified at ${sqlitePath} (${tables.length} tables, ${sessionCount} sessions, ${reflectionCount} reflections, ${ftsDetail}, integrity: ok).`,
        });
      }
    } finally {
      db.close();
    }
  } catch (err: unknown) {
    checks.push({
      name: "SQLite Persistence",
      category: "database",
      status: "warn",
      message: `SQLite check failed: ${(err as Error).message}. Falling back to in-memory mode.`,
    });
  }

  // 4. Skill Library Discovery (Expect 180 skills)
  try {
    const registry = await createSkillRegistry({ repoRoot });
    const skills = registry.listSkills();
    if (skills.length >= 180) {
      checks.push({
        name: "Skill Library",
        category: "skills",
        status: "pass",
        message: `Successfully indexed all ${skills.length}/180 skills in repository.`,
      });
    } else {
      checks.push({
        name: "Skill Library",
        category: "skills",
        status: "warn",
        message: `Found only ${skills.length} skills (expected 180).`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Skill Library",
      category: "skills",
      status: "fail",
      message: `Skill discovery error: ${(err as Error).message}`,
    });
  }

  // 5. Host Client Configurations (Deep & Explicit Audit)
  const home = os.homedir();
  const clientConfigs = [
    { name: "Antigravity CLI", path: path.join(home, ".gemini/antigravity-cli/mcp_config.json") },
    { name: "Gemini CLI", path: path.join(home, ".gemini/config/mcp_config.json") },
    { name: "Cursor IDE", path: path.join(home, ".cursor/mcp.json") },
    { name: "Windsurf IDE", path: path.join(home, ".codeium/windsurf/mcp_config.json") },
    { name: "Claude Code", path: path.join(home, ".claude.json") },
    {
      name: "Claude Desktop",
      path:
        process.platform === "darwin"
          ? path.join(home, "Library/Application Support/Claude/claude_desktop_config.json")
          : process.platform === "win32" && process.env.APPDATA
            ? path.join(process.env.APPDATA, "Claude/claude_desktop_config.json")
            : path.join(home, ".config/Claude/claude_desktop_config.json"),
    },
    {
      name: "VS Code (Roo Code)",
      path:
        process.platform === "darwin"
          ? path.join(
              home,
              "Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json",
            )
          : process.platform === "win32" && process.env.APPDATA
            ? path.join(
                process.env.APPDATA,
                "Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json",
              )
            : path.join(
                home,
                ".config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json",
              ),
    },
    {
      name: "VS Code (Cline)",
      path:
        process.platform === "darwin"
          ? path.join(
              home,
              "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
            )
          : process.platform === "win32" && process.env.APPDATA
            ? path.join(
                process.env.APPDATA,
                "Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
              )
            : path.join(
                home,
                ".config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
              ),
    },
    { name: "GitHub Copilot", path: path.join(home, ".copilot/mcp-config.json") },
    { name: "OpenCode", path: path.join(home, ".config/opencode/opencode.jsonc") },
  ];

  let detectedClients = 0;
  for (const client of clientConfigs) {
    if (existsSync(client.path)) {
      try {
        const raw = readFileSync(client.path, "utf8");
        let kiloKitConfig: any = undefined;
        try {
          const parsed = JSON.parse(raw);
          kiloKitConfig = parsed.mcpServers?.["kilo-kit"] ?? parsed.mcp?.["kilo-kit"];
        } catch {
          // If JSONC, check basic existence
          if (raw.includes('"kilo-kit"')) {
            kiloKitConfig = { command: "custom" };
          }
        }

        if (kiloKitConfig) {
          detectedClients++;
          let cmd = "";
          let args: string[] = [];
          if (Array.isArray(kiloKitConfig.command)) {
            cmd = kiloKitConfig.command[0] ?? "";
            args = kiloKitConfig.command.slice(1);
          } else {
            cmd = kiloKitConfig.command ?? "";
            args = Array.isArray(kiloKitConfig.args) ? kiloKitConfig.args : [];
          }
          const resolvedCmd = resolveExecutableInPath(cmd);

          let modeDesc = "";
          let status: "pass" | "warn" | "fail" = "pass";
          let details: string | undefined = undefined;

          if (cmd === "kilo-kit-mcp") {
            if (resolvedCmd) {
              modeDesc = `Local linked binary (${resolvedCmd})`;
              details = "Direct local execution with zero network latency.";
            } else {
              status = "fail";
              modeDesc = "Local binary (not found in PATH)";
              details = "Command 'kilo-kit-mcp' was not found in $PATH. Run 'npm link' inside repository.";
            }
          } else if (cmd === "npx") {
            const isKiloKitNpx = args.some((a) => a.includes("kilo-kit-mcp"));
            if (resolvedCmd) {
              if (isKiloKitNpx) {
                modeDesc = "Remote npx package (@vodailocz/kilo-kit-mcp)";
                const localBin = resolveExecutableInPath("kilo-kit-mcp");
                if (localBin) {
                  details = `Running via npx remote. Local linked binary '${localBin}' is available. Run 'kilo-kit-setup --local' to switch to local execution.`;
                }
              } else {
                modeDesc = `npx (${args.join(" ")})`;
              }
            } else {
              status = "fail";
              modeDesc = "npx (not found in PATH)";
              details = "Command 'npx' was not found in $PATH.";
            }
          } else if (cmd === "node") {
            const scriptPath = args[0] ?? "";
            if (scriptPath && existsSync(scriptPath)) {
              modeDesc = `Direct script (${scriptPath})`;
              details = "Running direct local Node script.";
            } else {
              status = "fail";
              modeDesc = `Direct script (script missing: ${scriptPath})`;
              details = `Target script ${scriptPath} does not exist on disk.`;
            }
          } else {
            if (resolvedCmd) {
              modeDesc = `Command (${cmd} -> ${resolvedCmd})`;
            } else {
              status = "warn";
              modeDesc = `Command (${cmd} not resolved in PATH)`;
            }
          }

          checks.push({
            name: `Client: ${client.name}`,
            category: "clients",
            status,
            message: `Configured in ${client.path} [${modeDesc}]`,
            details,
          });
        } else {
          checks.push({
            name: `Client: ${client.name}`,
            category: "clients",
            status: "warn",
            message: `Config exists at ${client.path} but 'kilo-kit' MCP server is not configured.`,
            details: "Run 'kilo-kit-setup' to automatically register Kilo-Kit into this client.",
          });
        }
      } catch {
        // Skip completely unreadable file
      }
    }
  }

  if (detectedClients === 0) {
    checks.push({
      name: "Client Configs",
      category: "clients",
      status: "warn",
      message: "No active host client configuration detected with 'kilo-kit' MCP server.",
    });
  }

  // 6. Individual Global Protocol Rules Check
  const globalRuleTargets = [
    { name: "Antigravity CLI", path: path.join(home, ".gemini/antigravity-cli/AGENTS.md") },
    { name: "Gemini CLI", path: path.join(home, ".gemini/config/AGENTS.md") },
    { name: "GitHub Copilot", path: path.join(home, ".copilot/AGENTS.md") },
    { name: "OpenAI Codex", path: path.join(home, ".codex/instructions.md") },
    { name: "OpenCode", path: path.join(home, ".opencode/instructions.md") },
  ];

  for (const target of globalRuleTargets) {
    const parentDir = path.dirname(target.path);
    if (!existsSync(parentDir)) {
      continue;
    }
    if (existsSync(target.path)) {
      try {
        const content = readFileSync(target.path, "utf8");
        const hasC4 = content.includes("Kilo-Kit C4 v3.0 Cognitive Protocol");
        const hasNarration = content.includes("MANDATORY INTER-TOOL NARRATION");
        if (hasC4 && hasNarration) {
          checks.push({
            name: `Rule: ${target.name}`,
            category: "clients",
            status: "pass",
            message: `Active C4 protocol & mandatory narration in ${target.path}.`,
          });
        } else if (hasC4) {
          checks.push({
            name: `Rule: ${target.name}`,
            category: "clients",
            status: "warn",
            message: `Rule exists at ${target.path} but missing mandatory inter-tool narration block. Run 'kilo-kit-setup' to sync.`,
          });
        } else {
          checks.push({
            name: `Rule: ${target.name}`,
            category: "clients",
            status: "warn",
            message: `File exists at ${target.path} but Kilo-Kit C4 protocol is missing. Run 'kilo-kit-setup' to update.`,
          });
        }
      } catch (err: any) {
        checks.push({
          name: `Rule: ${target.name}`,
          category: "clients",
          status: "warn",
          message: `Cannot read ${target.path}: ${err?.message}`,
        });
      }
    } else {
      checks.push({
        name: `Rule: ${target.name}`,
        category: "clients",
        status: "warn",
        message: `Missing rule file at ${target.path}. Run 'kilo-kit-setup' to install.`,
      });
    }
  }

  // 7. MCP Server Runtime & Functional Tool Probe
  try {
    const server = await createKiloKitServer({ repoRoot });
    const registeredTools: Record<string, any> = (server as any)._registeredTools ?? {};
    const toolCount = Object.keys(registeredTools).length;
    if (toolCount >= 24) {
      // Functional Probe: actually invoke a tool handler
      const probeTool = registeredTools["kilo_sentinel_status"];
      if (probeTool && typeof probeTool.handler === "function") {
        try {
          const probeResult = await probeTool.handler({}, { signal: new AbortController().signal });
          const hasContent = Array.isArray(probeResult?.content) && probeResult.content.length > 0;
          if (hasContent) {
            checks.push({
              name: "MCP Server Runtime",
              category: "server",
              status: "pass",
              message: `All ${toolCount} tools registered cleanly; functional probe (kilo_sentinel_status) executed and responded successfully.`,
            });
          } else {
            checks.push({
              name: "MCP Server Runtime",
              category: "server",
              status: "warn",
              message: `All ${toolCount} tools registered, but functional probe returned empty content.`,
            });
          }
        } catch (probeErr: unknown) {
          checks.push({
            name: "MCP Server Runtime",
            category: "server",
            status: "warn",
            message: `All ${toolCount} tools registered, but functional probe threw: ${(probeErr as Error).message}`,
          });
        }
      } else {
        checks.push({
          name: "MCP Server Runtime",
          category: "server",
          status: "pass",
          message: `All ${toolCount} tools registered cleanly.`,
        });
      }
    } else {
      checks.push({
        name: "MCP Server Runtime",
        category: "server",
        status: "warn",
        message: `Initialized with ${toolCount} tools (expected 24).`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "MCP Server Runtime",
      category: "server",
      status: "fail",
      message: `Server instantiation error: ${(err as Error).message}`,
    });
  }

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overallStatus = hasFail ? "broken" : hasWarn ? "degraded" : "healthy";

  return {
    overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    summary: `Kilo-Kit Doctor: ${checks.filter((c) => c.status === "pass").length}/${checks.length} checks passed. Overall Status: ${overallStatus.toUpperCase()}`,
  };
}

export function printDoctorCliReport(report: DoctorReport): void {
  const statusBadge =
    report.overallStatus === "healthy"
      ? "\x1b[92m[HEALTHY]\x1b[0m"
      : report.overallStatus === "degraded"
        ? "\x1b[93m[DEGRADED]\x1b[0m"
        : "\x1b[91m[BROKEN]\x1b[0m";

  console.log(`\n🏥 \x1b[1mKilo-Kit System Health Doctor\x1b[0m ${statusBadge}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  for (const check of report.checks) {
    const icon =
      check.status === "pass"
        ? "\x1b[92m✅ PASS\x1b[0m"
        : check.status === "warn"
          ? "\x1b[93m⚠️ WARN\x1b[0m"
          : "\x1b[91m❌ FAIL\x1b[0m";
    console.log(`  ${icon} \x1b[1m${check.name}\x1b[0m: ${check.message}`);
    if (check.details) {
      console.log(`         \x1b[90m${check.details}\x1b[0m`);
    }
  }

  console.log(`\n\x1b[1mSummary:\x1b[0m ${report.summary}\n`);
}

const isDirectlyExecuted =
  process.argv[1] &&
  (process.argv[1].endsWith("doctor.js") ||
    process.argv[1].endsWith("doctor.ts") ||
    process.argv[1].endsWith("kilo-kit-doctor"));

if (isDirectlyExecuted) {
  const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
  runKiloKitDoctor(repoRoot)
    .then((report) => {
      printDoctorCliReport(report);
      if (report.overallStatus === "broken") {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("\x1b[91mDoctor failed with unexpected error:\x1b[0m", err);
      process.exit(1);
    });
}
