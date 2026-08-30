import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const SEGMENT_PATTERN = /^[a-z0-9_][a-z0-9_-]*$/;

export function normalizeRepoRoot(repoRoot: string): string {
  return path.resolve(repoRoot);
}

export function assertSafeSegment(value: string, label: string): void {
  if (!SEGMENT_PATTERN.test(value)) {
    throw new Error(
      `Invalid ${label} '${value}'. Use a single kebab-case path segment such as 'engineering' or 'tdd'.`,
    );
  }
}

export function toPosixPath(repoRoot: string, absolutePath: string): string {
  const relative = path.relative(repoRoot, absolutePath);
  return relative.split(path.sep).join("/");
}

export function resolveInsideRepo(repoRoot: string, relativePath: string): string {
  const resolved = path.resolve(repoRoot, relativePath);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access path outside repository: ${relativePath}`);
  }

  return resolved;
}

export function resolveWorkspacePath(targetPath: string, customBaseDir?: string): string {
  let normalized = targetPath.trim();

  // Support tilde (~) expansion
  if (normalized === "~") {
    return os.homedir();
  }
  if (normalized.startsWith("~/") || normalized.startsWith("~\\")) {
    normalized = path.join(os.homedir(), normalized.slice(2));
  }

  if (path.isAbsolute(normalized)) {
    return path.resolve(normalized);
  }

  // 1. If customBaseDir is provided and path exists there, use it
  if (customBaseDir) {
    const fromBase = path.resolve(customBaseDir, normalized);
    if (existsSync(fromBase)) {
      return fromBase;
    }
  }

  // 2. Check if file exists relative to process.cwd()
  const fromCwd = path.resolve(process.cwd(), normalized);
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  // 3. For new files: default to customBaseDir if provided, else process.cwd()
  return customBaseDir ? path.resolve(customBaseDir, normalized) : fromCwd;
}

