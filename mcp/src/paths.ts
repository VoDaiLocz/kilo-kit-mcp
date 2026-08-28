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
