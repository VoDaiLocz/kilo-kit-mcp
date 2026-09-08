#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

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

  // 2. SQLite Database Check
  const sqlitePath = path.resolve(
    process.env.KILO_KIT_MEMORY_PATH ?? path.join(os.homedir(), ".kilo-kit/orchestrator.sqlite"),
  );
  try {
    mkdirSync(path.dirname(sqlitePath), { recursive: true });
    const db = new DatabaseSync(sqlitePath);
    try {
      const tableCount = db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table'").get() as {
        cnt: number;
      };
      checks.push({
        name: "SQLite Persistence",
        category: "database",
        status: "pass",
        message: `SQLite database accessible at ${sqlitePath} (${tableCount?.cnt ?? 0} tables).`,
      });
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

  // 3. Skill Library Discovery (Expect 180 skills)
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

  // 4. Host Client Configurations (Multi-Platform: macOS, Linux, Windows)
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
    { name: "GitHub Copilot", path: path.join(home, ".copilot/mcp-config.json") },
    { name: "OpenCode", path: path.join(home, ".config/opencode/opencode.jsonc") },
  ];

  let detectedClients = 0;
  for (const client of clientConfigs) {
    if (existsSync(client.path)) {
      try {
        const raw = readFileSync(client.path, "utf8");
        let hasKiloKit = false;
        try {
          const parsed = JSON.parse(raw);
          hasKiloKit =
            parsed.mcpServers?.["kilo-kit"] !== undefined ||
            parsed.mcp?.["kilo-kit"] !== undefined;
        } catch {
          // If file is JSONC with comments or trailing commas, verify key existence
          hasKiloKit =
            raw.includes('"kilo-kit"') &&
            (raw.includes('"mcpServers"') || raw.includes('"mcp"'));
        }
        if (hasKiloKit) {
          detectedClients++;
          checks.push({
            name: `Client: ${client.name}`,
            category: "clients",
            status: "pass",
            message: `Configured in ${client.path}.`,
          });
        } else {
          checks.push({
            name: `Client: ${client.name}`,
            category: "clients",
            status: "warn",
            message: `Config exists at ${client.path} but 'kilo-kit' server is missing.`,
          });
        }
      } catch {
        // Skip malformed JSON
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

  // 5. Global Protocol Rules Check
  const globalRulePaths = [
    path.join(home, ".gemini/antigravity-cli/AGENTS.md"),
    path.join(home, ".gemini/config/AGENTS.md"),
    path.join(home, ".codex/instructions.md"),
    path.join(home, ".copilot/AGENTS.md"),
    path.join(home, ".opencode/instructions.md"),
  ];
  let globalRuleFound = false;
  let hasNarration = false;
  for (const grPath of globalRulePaths) {
    if (existsSync(grPath)) {
      try {
        const content = readFileSync(grPath, "utf8");
        if (content.includes("Kilo-Kit C4 v3.0 Cognitive Protocol")) {
          globalRuleFound = true;
          if (content.includes("MANDATORY INTER-TOOL NARRATION")) {
            hasNarration = true;
            break;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (globalRuleFound && hasNarration) {
    checks.push({
      name: "Global Protocol Rules",
      category: "clients",
      status: "pass",
      message: "Global C4 v3.0 rules active with mandatory inter-tool narration across projects.",
    });
  } else if (globalRuleFound) {
    checks.push({
      name: "Global Protocol Rules",
      category: "clients",
      status: "warn",
      message: "Global C4 rules detected but missing mandatory inter-tool narration block. Run 'kilo-kit-init global' to sync.",
    });
  } else {
    checks.push({
      name: "Global Protocol Rules",
      category: "clients",
      status: "warn",
      message: "No global C4 rules found. Run 'kilo-kit-init global' to enable across all projects.",
    });
  }

  // 6. MCP 24-Tools Discovery Check
  try {
    const server = await createKiloKitServer({ repoRoot });
    const registeredTools: string[] = Object.keys((server as any)._registeredTools ?? {});
    const toolCount = registeredTools.length;
    if (toolCount >= 24) {
      checks.push({
        name: "MCP Server Runtime",
        category: "server",
        status: "pass",
        message: `All ${toolCount} tools, resources, and prompts initialized cleanly.`,
      });
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
