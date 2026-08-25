import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import type { KiloOrchestrator } from "./orchestrator.js";
import { resolveInsideRepo } from "./paths.js";

const execAsync = promisify(exec);

const DANGEROUS_COMMAND_PATTERNS = [
  /\brm\s+-[rf]*\s+[\/\~]/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /:(){ :\|:& };:/, // fork bomb
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\binit\s+0\b/i,
  /\bchmod\s+-[rR]*\s+777\s+\//i,
];

export interface ReadFileInput {
  filePath: string;
  startLine?: number | undefined;
  endLine?: number | undefined;
  maxBytes?: number | undefined;
}

export interface ReadFileResult {
  filePath: string;
  totalLines: number;
  startLine: number;
  endLine: number;
  content: string;
  truncated: boolean;
}

export interface WriteFileInput {
  filePath: string;
  content: string;
  overwrite?: boolean | undefined;
  sessionId: string;
}

export interface WriteFileResult {
  filePath: string;
  bytesWritten: number;
  action: "created" | "overwritten";
}

export interface EditFileInput {
  filePath: string;
  targetContent: string;
  replacementContent: string;
  allowMultiple?: boolean | undefined;
  sessionId: string;
}

export interface EditFileResult {
  filePath: string;
  replacements: number;
  syntaxStatus: "valid" | "warning" | "unsupported";
  message: string;
}

export interface SearchFilesInput {
  pattern: string;
  rootDir?: string | undefined;
  maxResults?: number | undefined;
}

export interface SearchFilesResult {
  pattern: string;
  totalMatches: number;
  files: string[];
}

export interface GrepCodeInput {
  query: string;
  rootDir?: string | undefined;
  isRegex?: boolean | undefined;
  caseSensitive?: boolean | undefined;
  maxResults?: number | undefined;
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface GrepCodeResult {
  query: string;
  totalMatches: number;
  matches: GrepMatch[];
}

export interface RunCommandInput {
  command: string;
  cwd?: string | undefined;
  timeoutMs?: number | undefined;
  sessionId: string;
}

export interface RunCommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function executeReadFile(repoRoot: string, input: ReadFileInput): ReadFileResult {
  const resolved = resolveInsideRepo(repoRoot, input.filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${input.filePath}`);
  }

  const raw = readFileSync(resolved, "utf8");
  const allLines = raw.split(/\r?\n/);
  const totalLines = allLines.length;

  const startLine = Math.max(1, Math.min(totalLines, input.startLine ?? 1));
  const endLine = Math.max(startLine, Math.min(totalLines, input.endLine ?? totalLines));

  const selectedLines = allLines.slice(startLine - 1, endLine);
  let content = selectedLines
    .map((line, idx) => `${startLine + idx}: ${line}`)
    .join("\n");

  const maxBytes = input.maxBytes ?? 32 * 1024;
  let truncated = false;
  if (Buffer.byteLength(content, "utf8") > maxBytes) {
    content = content.slice(0, maxBytes);
    truncated = true;
  }

  return {
    filePath: path.relative(repoRoot, resolved) || resolved,
    totalLines,
    startLine,
    endLine,
    content,
    truncated,
  };
}

export function executeWriteFile(
  repoRoot: string,
  orchestrator: KiloOrchestrator,
  input: WriteFileInput,
): WriteFileResult {
  const gateCheck = orchestrator.isSessionReady(input.sessionId);
  if (!gateCheck.ready) {
    throw new Error(`[KILO-KIT HARD-GATE VIOLATION] ${gateCheck.reason}`);
  }

  const resolved = resolveInsideRepo(repoRoot, input.filePath);
  const exists = existsSync(resolved);

  if (exists && !input.overwrite) {
    throw new Error(`File already exists: ${input.filePath}. Specify overwrite=true to overwrite.`);
  }

  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, input.content, "utf8");

  return {
    filePath: path.relative(repoRoot, resolved) || resolved,
    bytesWritten: Buffer.byteLength(input.content, "utf8"),
    action: exists ? "overwritten" : "created",
  };
}

export function executeEditFile(
  repoRoot: string,
  orchestrator: KiloOrchestrator,
  input: EditFileInput,
): EditFileResult {
  const gateCheck = orchestrator.isSessionReady(input.sessionId);
  if (!gateCheck.ready) {
    throw new Error(`[KILO-KIT HARD-GATE VIOLATION] ${gateCheck.reason}`);
  }

  const resolved = resolveInsideRepo(repoRoot, input.filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${input.filePath}`);
  }

  const originalContent = readFileSync(resolved, "utf8");
  if (!originalContent.includes(input.targetContent)) {
    throw new Error(`targetContent not found in ${input.filePath}. Ensure exact whitespace and line match.`);
  }

  const occurrences = originalContent.split(input.targetContent).length - 1;
  if (occurrences > 1 && !input.allowMultiple) {
    throw new Error(
      `targetContent matched ${occurrences} times in ${input.filePath}. Set allowMultiple=true or provide a more specific chunk.`,
    );
  }

  const newContent = input.allowMultiple
    ? originalContent.replaceAll(input.targetContent, input.replacementContent)
    : originalContent.replace(input.targetContent, input.replacementContent);

  // Syntax validation
  let syntaxStatus: EditFileResult["syntaxStatus"] = "valid";
  let message = `Successfully replaced ${occurrences} occurrence(s) in ${input.filePath}.`;

  if (resolved.endsWith(".json")) {
    try {
      JSON.parse(newContent);
    } catch (error) {
      syntaxStatus = "warning";
      message += ` (Warning: JSON syntax check failed: ${(error as Error).message})`;
    }
  }

  writeFileSync(resolved, newContent, "utf8");

  return {
    filePath: path.relative(repoRoot, resolved) || resolved,
    replacements: occurrences,
    syntaxStatus,
    message,
  };
}

export function executeSearchFiles(repoRoot: string, input: SearchFilesInput): SearchFilesResult {
  const searchRoot = input.rootDir ? resolveInsideRepo(repoRoot, input.rootDir) : repoRoot;
  const maxResults = input.maxResults ?? 50;
  const results: string[] = [];

  const patternRegex = globToRegex(input.pattern);

  function walk(dir: string): void {
    if (results.length >= maxResults) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) return;
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === "coverage") continue;

      const fullPath = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      const relPath = path.relative(repoRoot, fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (patternRegex.test(entry) || patternRegex.test(relPath)) {
        results.push(relPath);
      }
    }
  }

  walk(searchRoot);

  return {
    pattern: input.pattern,
    totalMatches: results.length,
    files: results,
  };
}

export function executeGrepCode(repoRoot: string, input: GrepCodeInput): GrepCodeResult {
  const searchRoot = input.rootDir ? resolveInsideRepo(repoRoot, input.rootDir) : repoRoot;
  const maxResults = input.maxResults ?? 50;
  const matches: GrepMatch[] = [];

  const regex = input.isRegex
    ? new RegExp(input.query, input.caseSensitive ? "g" : "gi")
    : new RegExp(escapeRegex(input.query), input.caseSensitive ? "g" : "gi");

  function walk(dir: string): void {
    if (matches.length >= maxResults) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (matches.length >= maxResults) return;
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === "coverage") continue;

      const fullPath = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && stat.size < 1024 * 1024) {
        try {
          const content = readFileSync(fullPath, "utf8");
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= maxResults) break;
            const line = lines[i];
            if (line && regex.test(line)) {
              matches.push({
                file: path.relative(repoRoot, fullPath),
                line: i + 1,
                content: line.trim().slice(0, 300),
              });
            }
          }
        } catch {
          // ignore binary or unreadable files
        }
      }
    }
  }

  walk(searchRoot);

  return {
    query: input.query,
    totalMatches: matches.length,
    matches,
  };
}

export async function executeRunCommand(
  repoRoot: string,
  orchestrator: KiloOrchestrator,
  input: RunCommandInput,
): Promise<RunCommandResult> {
  const gateCheck = orchestrator.isSessionReady(input.sessionId);
  if (!gateCheck.ready) {
    throw new Error(`[KILO-KIT HARD-GATE VIOLATION] ${gateCheck.reason}`);
  }

  for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
    if (pattern.test(input.command)) {
      throw new Error(`[KILO-KIT SECURITY VIOLATION] Refusing to execute potentially destructive command: ${input.command}`);
    }
  }

  const executionCwd = input.cwd ? resolveInsideRepo(repoRoot, input.cwd) : repoRoot;
  const timeoutMs = Math.min(120_000, Math.max(1_000, input.timeoutMs ?? 30_000));

  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(input.command, {
      cwd: executionCwd,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      command: input.command,
      exitCode: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const execError = error as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      command: input.command,
      exitCode: execError.code ?? 1,
      stdout: (execError.stdout ?? "").trim(),
      stderr: (execError.stderr ?? execError.message ?? String(error)).trim(),
      durationMs: Date.now() - startTime,
    };
  }
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
