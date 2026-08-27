#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const START_MARKER = "<!-- KILO-KIT:C4:START -->";
const END_MARKER = "<!-- KILO-KIT:C4:END -->";
const MAX_BOOTSTRAP_FILE_BYTES = 256 * 1024;

export type BootstrapClient = "gemini" | "codex" | "claude";

export interface BootstrapTarget {
  client: BootstrapClient;
  filePath: string;
  displayName: string;
}

export interface BootstrapOptions {
  client: BootstrapClient | "all";
  cwd: string;
}

export interface BootstrapResult {
  client: BootstrapClient;
  filePath: string;
  action: "created" | "updated";
}

const CLIENT_FILES: Record<BootstrapClient, { fileName: string; displayName: string }> = {
  gemini: {
    fileName: "GEMINI.md",
    displayName: "Gemini CLI",
  },
  codex: {
    fileName: "AGENTS.md",
    displayName: "OpenAI Codex",
  },
  claude: {
    fileName: "CLAUDE.md",
    displayName: "Claude Code",
  },
};

export function bootstrap(options: BootstrapOptions): BootstrapResult[] {
  validateTargetDirectory(options.cwd);
  const targets = resolveTargets(options);
  return targets.map((target) => writeBootstrapBlock(target));
}

function resolveTargets(options: BootstrapOptions): BootstrapTarget[] {
  const clients = options.client === "all" ? (Object.keys(CLIENT_FILES) as BootstrapClient[]) : [options.client];
  return clients.map((client) => {
    const config = CLIENT_FILES[client];
    return {
      client,
      filePath: path.resolve(options.cwd, config.fileName),
      displayName: config.displayName,
    };
  });
}

function writeBootstrapBlock(target: BootstrapTarget): BootstrapResult {
  assertSafeTarget(target.filePath);

  const block = buildBootstrapBlock(target);
  let action: BootstrapResult["action"] = "created";
  let nextContent = block;

  try {
    const current = readFileSync(target.filePath, "utf8");
    action = "updated";
    nextContent = replaceOrAppendBlock(current, block);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  writeFileAtomic(target.filePath, nextContent);

  return {
    client: target.client,
    filePath: target.filePath,
    action,
  };
}

function replaceOrAppendBlock(current: string, block: string): string {
  const start = current.indexOf(START_MARKER);
  const end = current.indexOf(END_MARKER);
  const hasStart = start >= 0;
  const hasEnd = end >= 0;

  if (hasStart !== hasEnd || (hasStart && end < start)) {
    throw new Error(
      `Refusing to update bootstrap file because the Kilo-Kit marker block is malformed. Fix or remove ${START_MARKER} / ${END_MARKER} manually.`,
    );
  }

  if (start >= 0 && end > start) {
    const afterEnd = end + END_MARKER.length;
    return `${current.slice(0, start)}${block}${current.slice(afterEnd)}`;
  }

  const separator = current.endsWith("\n") ? "\n" : "\n\n";
  return `${current}${separator}${block}`;
}

function buildBootstrapBlock(target: BootstrapTarget): string {
  return `${START_MARKER}
## Kilo-Kit C4 v3.0 Cognitive Protocol

Applies to: ${target.displayName}, Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### 🧠 DIVISION OF LABOR (VỎ NÃO & CHÂN TAY):
- **Kilo-Kit MCP (Cortex):** High-level cognitive reasoning, 5-Whys root cause tracing, Tree-of-Thoughts DAG planning, adversarial red-teaming, context compaction, and skill delivery.
- **Native Tools (Limbs):** Code editing, file viewing, terminal executions.

### 🏛️ MANDATORY 2-STAGE COGNITIVE FLOW:

1. **Gate 1 (Hard-Gate & Grounded Probe):** 
   - Call MCP tool \`kilo_orchestrate_task\` (via \`call_mcp_tool\`) with the user's request.
   - Perform read-only exploratory probing (\`view_file\`, \`grep_search\`) using \`engineering/diagnose\` to build a Grounded Diagnostic Model. Do NOT edit code before diagnosing.

2. **Gate 2 (Cognitive Reasoning Dispatch):**
   - **For Bugs / Errors:** MUST call \`kilo_trace_root_cause\` with \`{ errorLog, failingFile }\` to extract the 5-Whys causal chain before writing any fix.
   - **For Features / Architecture:** MUST call \`kilo_think_step\` (DAG with 3 trade-off options) and \`kilo_grill_plan\` (Adversarial Red-Team stress test) before modification.
   - **For Context Overload (>5 files read):** Call \`kilo_compact_context\` to lock invariants and prevent attention degradation.

3. **Gate 3 (Approval & Skill Delivery):** 
   - Call \`kilo_orchestrate_task\` with \`brainstormingApproved=true\`.
   - Load required skills using \`kilo_get_skill\` (supports aliases like \`brainstorming\`, \`diagnose\`, \`playwright\`, \`tdd\`).

4. **Gate 4 (Surgical Implementation & Defense-in-Depth):** 
   - Apply \`problem-solving/defense-in-depth\` (validation at input, logic, and persistence layers).
   - Maintain \`engineering/clean-code\` standards with zero bloat.

5. **Gate 5 (4D Quality Assurance & Playwright E2E Verification):**
   - **Dimension 1 (Spec Fidelity):** Verify against user requirements using Given-When-Then acceptance criteria (\`productivity/spec-driven-development\`).
   - **Dimension 2 (Clean Code):** Verify deep module interfaces and zero dead code (\`engineering/clean-code\`).
   - **Dimension 3 (UX & Aesthetics):** Verify responsive layout and mobile touch safety (\`design/aesthetic\`, \`design/mobile-design\`).
   - **Dimension 4 (Empirical & Playwright):** Run compile/build commands AND execute Playwright E2E tests (\`engineering/playwright\`) with real browser/DOM verification before claiming completion.
${END_MARKER}
`;
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function validateTargetDirectory(cwd: string): void {
  let stats;
  try {
    stats = statSync(cwd);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`Target directory does not exist: ${cwd}`);
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(`Target path is not a directory: ${cwd}`);
  }

  if (lstatSync(cwd).isSymbolicLink()) {
    throw new Error(`Refusing to write bootstrap files through a symlinked directory: ${cwd}`);
  }
}

function assertSafeTarget(filePath: string): void {
  try {
    const stats = lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to update symlinked bootstrap file: ${filePath}`);
    }
    if (!stats.isFile()) {
      throw new Error(`Refusing to update non-file bootstrap target: ${filePath}`);
    }
    if (stats.size > MAX_BOOTSTRAP_FILE_BYTES) {
      throw new Error(
        `Refusing to update bootstrap file larger than ${MAX_BOOTSTRAP_FILE_BYTES} bytes: ${filePath}`,
      );
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
}

function writeFileAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tempPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

  try {
    writeFileSync(tempPath, content, { encoding: "utf8", flag: "wx", mode: 0o644 });
    renameSync(tempPath, filePath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

export interface SetupResult {
  client: string;
  configPath: string;
  action: "configured" | "already_configured" | "skipped";
  error?: string;
}

export function setupClientMcpConfigs(): SetupResult[] {
  const home = os.homedir();
  const results: SetupResult[] = [];

  const kiloKitMcpEntry = {
    command: "npx",
    args: ["-y", "@vodailoc/kilo-kit-mcp"],
  };

  const clientTargets = [
    {
      name: "Antigravity CLI",
      path: path.join(home, ".gemini/antigravity-cli/mcp_config.json"),
    },
    {
      name: "Gemini CLI",
      path: path.join(home, ".gemini/config/mcp_config.json"),
    },
    {
      name: "Cursor IDE",
      path: path.join(home, ".cursor/mcp.json"),
    },
    {
      name: "Windsurf IDE",
      path: path.join(home, ".codeium/windsurf/mcp_config.json"),
    },
    {
      name: "Claude Code",
      path: path.join(home, ".claude.json"),
    },
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
          ? path.join(home, "Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json")
          : process.platform === "win32" && process.env.APPDATA
            ? path.join(process.env.APPDATA, "Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json")
            : path.join(home, ".config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json"),
      onlyIfParentExists: true,
    },
    {
      name: "VS Code (Cline)",
      path:
        process.platform === "darwin"
          ? path.join(home, "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json")
          : process.platform === "win32" && process.env.APPDATA
            ? path.join(process.env.APPDATA, "Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json")
            : path.join(home, ".config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"),
      onlyIfParentExists: true,
    },
  ];

  for (const target of clientTargets) {
    try {
      const configDir = path.dirname(target.path);
      if (target.onlyIfParentExists && !existsSync(path.dirname(configDir))) {
        continue;
      }
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      let configObj: any = { mcpServers: {} };
      if (existsSync(target.path)) {
        try {
          const raw = readFileSync(target.path, "utf8");
          configObj = JSON.parse(raw);
          if (!configObj.mcpServers || typeof configObj.mcpServers !== "object") {
            configObj.mcpServers = {};
          }
        } catch {
          configObj = { mcpServers: {} };
        }
      }

      const existing = configObj.mcpServers?.["kilo-kit"];
      configObj.mcpServers["kilo-kit"] = kiloKitMcpEntry;

      writeFileSync(target.path, JSON.stringify(configObj, null, 2) + "\n", "utf8");
      results.push({
        client: target.name,
        configPath: target.path,
        action: existing ? "already_configured" : "configured",
      });
    } catch (err: any) {
      results.push({
        client: target.name,
        configPath: target.path,
        action: "skipped",
        error: err?.message,
      });
    }
  }

  return results;
}

type CliCommand =
  | { type: "init"; options: BootstrapOptions }
  | { type: "setup" };

function parseArgs(argv: string[]): CliCommand {
  const command = argv[0];
  if (command === "setup" || command === "install") {
    return { type: "setup" };
  }

  if (command !== "init") {
    throw new Error(usage());
  }

  let client: BootstrapOptions["client"] | undefined;
  let cwd = process.cwd();

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--client") {
      const value = argv[index + 1];
      if (!value || !isClient(value)) {
        throw new Error("Expected --client to be one of: gemini, codex, claude, all.");
      }
      client = value;
      index += 1;
      continue;
    }

    if (arg === "--dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected --dir to receive a path.");
      }
      cwd = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
  }

  return {
    type: "init",
    options: {
      client: client ?? "all",
      cwd,
    },
  };
}

function isClient(value: string): value is BootstrapOptions["client"] {
  return value === "gemini" || value === "codex" || value === "claude" || value === "all";
}

function usage(): string {
  return [
    "🚀 Kilo-Kit CLI",
    "",
    "Commands:",
    "  kilo-kit-init setup",
    "    Automatically detects & registers Kilo-Kit MCP into Antigravity, Cursor, Claude Code, Windsurf & Claude Desktop.",
    "",
    "  kilo-kit-init init [--client gemini|codex|claude|all] [--dir <path>]",
    "    Bootstraps C4 protocol rule files into target project workspace.",
    "",
    "Examples:",
    "  npx -y @vodailoc/kilo-kit-mcp setup",
    "  kilo-kit-init setup",
    "  kilo-kit-init init --client all",
    "  kilo-kit-init init --client gemini --dir /path/to/project",
  ].join("\n");
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.type === "setup") {
    console.log("🚀 Running Kilo-Kit Auto-Setup across AI clients...\n");
    const results = setupClientMcpConfigs();
    for (const r of results) {
      const icon = r.action === "configured" ? "✅ Added" : r.action === "already_configured" ? "🔄 Updated" : "⚠️ Skipped";
      console.log(`${icon} [${r.client}]: ${r.configPath}`);
    }
    console.log("\n🎉 Setup complete! All AI clients are ready to use Kilo-Kit v1.7.0.");
    return;
  }

  const results = bootstrap(parsed.options);
  for (const result of results) {
    console.log(`${result.action}: ${result.filePath}`);
  }
}

function isCurrentModuleMain(): boolean {
  if (!process.argv[1]) return false;
  const target = fileURLToPath(import.meta.url);
  const directPath = path.resolve(process.argv[1]);
  if (directPath === target) return true;
  try {
    return realpathSync(process.argv[1]) === target;
  } catch {
    return false;
  }
}

if (isCurrentModuleMain()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
