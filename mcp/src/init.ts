#!/usr/bin/env node
import { lstatSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
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
## Kilo-Kit C4 Workflow Protocol

Applies to: ${target.displayName}, Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### CRITICAL HARD-GATE:
BEFORE reading, diagnosing, or editing any file with native tools (Read/Edit/Bash), you MUST call MCP tool \`kilo_orchestrate_task\` (via \`call_mcp_tool\`) with the user's request.

1. **Gate 1 (Hard-Gate):** Call \`kilo_orchestrate_task\` first on every non-trivial task.
2. **Gate 2 (Brainstorming):** If state is \`brainstorming_required\`, load \`productivity/brainstorming\` with \`kilo_get_skill\`, present diagnosis/plan, and get approval.
3. **Gate 3 (Approval):** Call \`kilo_orchestrate_task\` again with the same \`sessionId\` and \`brainstormingApproved=true\`.
4. **Gate 4 (Execution):** When state is \`ready\`, load workflow skills with \`kilo_get_skill\` in order.
5. **Gate 5 (Verification):** Run \`verificationGate\` commands before claiming completion.

Do NOT bypass KILO-KIT orchestration to jump directly into editing code or modifying CSS/JS files.
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

function parseArgs(argv: string[]): BootstrapOptions {
  const command = argv[0];
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
    client: client ?? "all",
    cwd,
  };
}

function isClient(value: string): value is BootstrapOptions["client"] {
  return value === "gemini" || value === "codex" || value === "claude" || value === "all";
}

function usage(): string {
  return [
    "Usage:",
    "  kilo-kit-init init [--client gemini|codex|claude|all] [--dir <path>]",
    "",
    "Examples:",
    "  kilo-kit-init init --client gemini",
    "  kilo-kit-init init --client codex --dir /path/to/project",
    "  kilo-kit-init init --client all",
  ].join("\n");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const results = bootstrap(options);
  for (const result of results) {
    console.log(`${result.action}: ${result.filePath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
