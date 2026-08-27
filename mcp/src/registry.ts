import { promises as fs } from "node:fs";
import path from "node:path";

import { parseSkillFrontmatter } from "./frontmatter.js";
import { assertSafeSegment, normalizeRepoRoot, resolveInsideRepo, toPosixPath } from "./paths.js";
import type { LoadedSkill, SearchSkillsInput, SkillRecord } from "./types.js";

export interface SkillRegistryOptions {
  repoRoot: string;
}

export interface LoadSkillInput {
  category?: string;
  skill: string;
  maxChars?: number;
}

export interface SkillRegistry {
  readonly repoRoot: string;
  listSkills(): SkillRecord[];
  searchSkills(input: SearchSkillsInput): SkillRecord[];
  getSkill(category?: string, skill?: string): SkillRecord;
  loadSkill(input: LoadSkillInput): Promise<LoadedSkill>;
  reload(): Promise<void>;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_MAX_CHARS = 12_000;

export async function createSkillRegistry(options: SkillRegistryOptions): Promise<SkillRegistry> {
  const repoRoot = normalizeRepoRoot(options.repoRoot);
  const skillsRoot = resolveInsideRepo(repoRoot, "skills");
  const records = await discoverSkills(repoRoot, skillsRoot);
  return new FileSystemSkillRegistry(repoRoot, records);
}

class FileSystemSkillRegistry implements SkillRegistry {
  readonly #recordsById: Map<string, SkillRecord>;

  constructor(
    readonly repoRoot: string,
    records: SkillRecord[],
  ) {
    this.#recordsById = new Map(records.map((record) => [record.id, record]));
  }

  async reload(): Promise<void> {
    const skillsRoot = resolveInsideRepo(this.repoRoot, "skills");
    const records = await discoverSkills(this.repoRoot, skillsRoot);
    this.#recordsById.clear();
    for (const record of records) {
      this.#recordsById.set(record.id, record);
    }
  }

  listSkills(): SkillRecord[] {
    return [...this.#recordsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  searchSkills(input: SearchSkillsInput): SkillRecord[] {
    const query = input.query.trim();
    const limit = clampLimit(input.limit);
    const category = input.category?.trim();

    if (category) {
      assertSafeSegment(category, "category");
    }

    const scored = this.listSkills()
      .filter((skill) => !category || skill.category === category)
      .map((skill) => ({ skill, score: scoreSkill(skill, query) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id));

    return scored.slice(0, limit).map((entry) => entry.skill);
  }

  getSkill(category?: string, skill?: string): SkillRecord {
    const rawCategory = category?.trim() ?? "";
    const rawSkill = skill?.trim() ?? "";

    if (rawCategory) {
      for (const segment of rawCategory.split("/")) {
        assertSafeSegment(segment, "category");
      }
    }
    if (rawSkill) {
      for (const segment of rawSkill.split("/")) {
        assertSafeSegment(segment, "skill");
      }
    }

    // 1. If skill has slash (e.g. "productivity/brainstorming"), parse it directly
    if (rawSkill.includes("/")) {
      const direct = this.#recordsById.get(rawSkill);
      if (direct) return direct;
      const [c, s] = rawSkill.split("/", 2);
      const subDirect = this.#recordsById.get(`${c}/${s}`);
      if (subDirect) return subDirect;
    }

    // 2. If category has slash (e.g. "productivity/brainstorming")
    if (rawCategory.includes("/")) {
      const direct = this.#recordsById.get(rawCategory);
      if (direct) return direct;
      const [c, s] = rawCategory.split("/", 2);
      const subDirect = this.#recordsById.get(`${c}/${s}`);
      if (subDirect) return subDirect;
    }

    // 3. Direct match with both category and skill
    if (rawCategory && rawSkill) {
      const direct = this.#recordsById.get(`${rawCategory}/${rawSkill}`);
      if (direct) return direct;
    }

    // 4. Target name search (supports short names like 'brainstorming', 'diagnose', 'playwright', 'tdd')
    const target = (rawSkill || rawCategory).toLowerCase();
    if (!target) {
      throw new Error("No skill name or identifier provided. Specify a skill name to load.");
    }

    // Exact match on skill folder name or record name
    for (const record of this.#recordsById.values()) {
      if (record.name.toLowerCase() === target || record.id.toLowerCase() === target || record.title.toLowerCase() === target) {
        return record;
      }
    }

    // Endswith match (e.g. 'brainstorming' matches 'productivity/brainstorming')
    for (const record of this.#recordsById.values()) {
      if (record.id.toLowerCase().endsWith(`/${target}`) || record.skillPath.toLowerCase().includes(`/${target}/`)) {
        return record;
      }
    }

    // Substring / fuzzy match fallback
    const candidates = [...this.#recordsById.values()].filter(
      (r) => r.id.toLowerCase().includes(target) || r.name.toLowerCase().includes(target)
    );
    const candidate = candidates[0];
    if (candidate) {
      return candidate;
    }

    throw new Error(`Skill '${rawCategory ? `${rawCategory}/` : ""}${rawSkill}' was not found in Kilo-Kit library. Search available skills with kilo_search_skills.`);
  }

  async loadSkill(input: LoadSkillInput): Promise<LoadedSkill> {
    const record = this.getSkill(input.category, input.skill);
    const maxChars = Math.max(100, Math.min(input.maxChars ?? DEFAULT_MAX_CHARS, 50_000));
    const absoluteSkillPath = resolveInsideRepo(this.repoRoot, record.skillPath);
    const content = await fs.readFile(absoluteSkillPath, "utf8");
    const truncated = content.length > maxChars;

    return {
      skill: {
        ...record,
        references: await listReferenceFiles(this.repoRoot, resolveInsideRepo(this.repoRoot, record.directoryPath)),
      },
      content: truncated ? content.slice(0, maxChars) : content,
      truncated,
      maxChars,
    };
  }
}

async function discoverSkills(repoRoot: string, skillsRoot: string): Promise<SkillRecord[]> {
  const skillFiles = await findSkillFiles(skillsRoot);
  const records = await Promise.all(skillFiles.map((skillFile) => readSkillRecord(repoRoot, skillFile)));

  return (records.filter((r): r is SkillRecord => r !== undefined)).sort((left, right) => left.id.localeCompare(right.id));
}

async function findSkillFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const skillFiles: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      skillFiles.push(...(await findSkillFiles(absolute)));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      skillFiles.push(absolute);
    }
  }

  return skillFiles;
}

async function readSkillRecord(repoRoot: string, skillFile: string): Promise<SkillRecord | undefined> {
  let content: string;
  try {
    content = await fs.readFile(skillFile, "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }

  const frontmatter = parseSkillFrontmatter(content);
  const directory = path.dirname(skillFile);
  const relativeDirectory = toPosixPath(repoRoot, directory);
  const parts = relativeDirectory.split("/");
  const skillsIndex = parts.indexOf("skills");
  const category = parts[skillsIndex + 1];
  const folderName = parts.at(-1);

  if (!category || !folderName) {
    throw new Error(`Could not infer skill category for ${relativeDirectory}`);
  }

  const name = frontmatter.name || folderName;
  const description = frontmatter.description || "No description provided.";
  const skillPath = toPosixPath(repoRoot, skillFile);

  return {
    id: `${category}/${folderName}`,
    category,
    name: folderName,
    title: name,
    description,
    directoryPath: relativeDirectory,
    skillPath,
    references: [],
  };
}

async function listReferenceFiles(repoRoot: string, directory: string): Promise<string[]> {
  const containers = ["references", "reference", "scripts", "assets"];
  const files: string[] = [];

  for (const container of containers) {
    const containerPath = path.join(directory, container);
    try {
      const stat = await fs.stat(containerPath);
      if (!stat.isDirectory()) {
        continue;
      }
      files.push(...(await listFiles(repoRoot, containerPath)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return files.sort();
}

async function listFiles(repoRoot: string, directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(repoRoot, absolute)));
    } else if (entry.isFile()) {
      files.push(toPosixPath(repoRoot, absolute));
    }
  }

  return files;
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT));
}

function scoreSkill(skill: SkillRecord, rawQuery: string): number {
  const query = normalizeText(rawQuery);
  if (!query) {
    return 1;
  }

  const haystack = normalizeText(
    [skill.id, skill.title, skill.description, skill.category, expandSkillVocabulary(skill)].join(" "),
  );
  const tokens = query.split(" ").filter(Boolean);
  let score = 0;

  if (haystack.includes(query)) {
    score += 40;
  }

  for (const token of tokens) {
    if (skill.id.includes(token)) {
      score += 12;
    }
    if (haystack.includes(token)) {
      score += 4;
    }
  }

  if (query.includes("test driven") && skill.id === "engineering/tdd") {
    score += 80;
  }

  if (query.includes("test driven") && skill.id === "productivity/test-driven-development") {
    score -= 20;
  }

  return score;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function expandSkillVocabulary(skill: SkillRecord): string {
  const expansions: Record<string, string> = {
    "engineering/tdd": "test driven development test first red green refactor bug fix tests",
    "engineering/diagnose": "bug fix debug reproduce failing error root cause",
    "kilo-kit/debugging/systematic": "bug fix debug systematic validation",
    "design/frontend-design": "ui ux react frontend interface dashboard polished responsive",
    "design/ui-styling": "ui styling shadcn tailwind accessible responsive",
  };

  return expansions[skill.id] ?? "";
}
