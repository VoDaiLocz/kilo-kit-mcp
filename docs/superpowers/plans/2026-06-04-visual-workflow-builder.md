# Visual Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v2.0 local-only Kilo-Kit dashboard that visualizes C4 workflow sessions, memory, audit logs, and runtime health.

**Architecture:** Add a separate `dashboard/` TypeScript package with a small Node HTTP server, read-only data adapters for SQLite/JSONL, and a Vite React UI served by the same local server. The dashboard reads existing C4 artifacts and never mutates memory, audit files, or workflow state.

**Tech Stack:** Node.js >=20, TypeScript, Vitest, Vite, React, React DOM, local Node HTTP server, optional dynamic `node:sqlite` support.

---

## File Structure

Create:

- `dashboard/package.json` - private dashboard package scripts and dependencies.
- `dashboard/tsconfig.json` - TypeScript build config for server/data code.
- `dashboard/vite.config.ts` - Vite config that builds UI assets into `dashboard/dist/public`.
- `dashboard/index.html` - Vite HTML entry.
- `dashboard/src/server.ts` - CLI entry and local HTTP server.
- `dashboard/src/config.ts` - port/path/env resolution.
- `dashboard/src/api.ts` - read-only API routing.
- `dashboard/src/types.ts` - shared dashboard API/view-model types.
- `dashboard/src/data/jsonl-store.ts` - capped JSONL reader with malformed-line reporting.
- `dashboard/src/data/sqlite-store.ts` - read-only SQLite reader with dynamic `node:sqlite` fallback.
- `dashboard/src/data/workflow-view-model.ts` - normalized C4 workflow board model.
- `dashboard/src/ui/main.tsx` - React entry.
- `dashboard/src/ui/App.tsx` - app shell and state loading.
- `dashboard/src/ui/WorkflowBoard.tsx` - C4 session workflow board.
- `dashboard/src/ui/SessionDetail.tsx` - session flow details.
- `dashboard/src/ui/MemoryAuditViewer.tsx` - memory/audit tables and filters.
- `dashboard/src/ui/HealthPanel.tsx` - local runtime health display.
- `dashboard/tests/jsonl-store.test.ts` - JSONL parsing tests.
- `dashboard/tests/workflow-view-model.test.ts` - C4 gate/view-model tests.
- `dashboard/tests/api.test.ts` - API routing tests.
- `dashboard/tests/workflow-board-ui.test.tsx` - React workflow board render tests.
- `dashboard/tests/fixtures/audit.jsonl` - audit fixture.
- `dashboard/tests/fixtures/decision-trail.jsonl` - route fixture.
- `dashboard/tests/fixtures/sessions.json` - normalized session fixture.
- `dashboard/src/smoke.ts` - dashboard smoke test.

Modify:

- `package.json` - add dashboard binary, files, scripts, and release checks.
- `package-lock.json` - update after installing dashboard dependencies.
- `.github/workflows/publish.yml` - install dashboard dependencies before release verification.
- `README.md` - document `kilo-kit-dashboard`.
- `mcp/README.md` - mention dashboard as local inspector for C4 artifacts.

Do not modify:

- `mcp/src/orchestrator.ts` - v2.0 dashboard must not change C4 state behavior.
- `mcp/src/server.ts` - v2.0 dashboard is a separate binary.

## Task 1: Scaffold Dashboard Package

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/tsconfig.json`
- Create: `dashboard/vite.config.ts`
- Create: `dashboard/index.html`
- Create: `dashboard/src/types.ts`

- [ ] **Step 1: Create dashboard package metadata**

Create `dashboard/package.json`:

```json
{
  "name": "@kilo-kit/dashboard",
  "version": "2.0.0",
  "description": "Local-only Kilo-Kit visual workflow dashboard.",
  "type": "module",
  "private": true,
  "bin": {
    "kilo-kit-dashboard": "./dist/server.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "start": "node dist/server.js",
    "smoke": "node dist/smoke.js"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "vite": "^7.2.6",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.9.3",
    "vitest": "^4.1.5"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `dashboard/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vite/client"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create Vite config**

Create `dashboard/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist/public",
    emptyOutDir: false,
  },
});
```

- [ ] **Step 4: Create HTML entry**

Create `dashboard/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kilo-Kit Workflow Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ui/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create shared types**

Create `dashboard/src/types.ts`:

```ts
export interface DashboardConfig {
  host: string;
  port: number;
  memoryPath: string;
  auditPath?: string;
  decisionTrailPath?: string;
  packageVersion: string;
}

export interface HealthStatus {
  packageVersion: string;
  nodeVersion: string;
  host: string;
  port: number;
  memoryPath: PathStatus;
  auditPath?: PathStatus;
  decisionTrailPath?: PathStatus;
  latestSessionTimestamp?: string;
  sqliteAvailable: boolean;
  warnings: string[];
}

export interface PathStatus {
  path: string;
  exists: boolean;
  readable: boolean;
  sizeBytes?: number;
  warning?: string;
}

export interface DashboardSession {
  id: string;
  state: string;
  message: string;
  taskMode: string;
  route: Record<string, unknown>;
  questions: unknown[];
  answers: Record<string, string>;
  memorySuggestions: unknown[];
  finalWorkflow: WorkflowSkillStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSkillStep {
  skill?: {
    id?: string;
    title?: string;
    category?: string;
    name?: string;
  };
  role?: string;
  reason?: string;
}

export interface WorkflowOutcome {
  id: string;
  sessionId: string;
  taskMode: string;
  workflow: WorkflowSkillStep[];
  verification: {
    commands?: string[];
    reason?: string;
  };
  outcome: string;
  createdAt: string;
}

export interface MemoryRecord {
  table: "memory_facts" | "memory_decisions";
  id: string;
  key?: string;
  suggestionKey?: string;
  kind?: string;
  decision?: string;
  value?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditEntry {
  line: number;
  valid: boolean;
  value?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowBoardItem {
  session: DashboardSession;
  stateTimeline: string[];
  brainstormingGate: {
    required: boolean;
    approved: boolean;
    blocked: boolean;
  };
  releasedWorkflow: WorkflowSkillStep[];
  verificationGate?: WorkflowOutcome["verification"];
  auditEntries: AuditEntry[];
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  truncated: boolean;
}
```

- [ ] **Step 6: Install dashboard dependencies**

Run:

```bash
npm --prefix dashboard install
```

Expected: `dashboard/package-lock.json` is created and install exits 0.

- [ ] **Step 7: Run dashboard typecheck to confirm scaffold baseline**

Run:

```bash
npm --prefix dashboard run typecheck
```

Expected: FAIL because server/UI entry files are not created yet. This confirms the package script is wired and will be made green in later tasks.

- [ ] **Step 8: Commit scaffold**

```bash
git add dashboard/package.json dashboard/package-lock.json dashboard/tsconfig.json dashboard/vite.config.ts dashboard/index.html dashboard/src/types.ts
git commit -m "feat: scaffold dashboard package"
```

## Task 2: Implement Read-Only Data Readers

**Files:**
- Create: `dashboard/src/config.ts`
- Create: `dashboard/src/data/jsonl-store.ts`
- Create: `dashboard/src/data/sqlite-store.ts`
- Test: `dashboard/tests/jsonl-store.test.ts`
- Test fixture: `dashboard/tests/fixtures/audit.jsonl`

- [ ] **Step 1: Write JSONL fixture**

Create `dashboard/tests/fixtures/audit.jsonl`:

```jsonl
{"auditRef":"a1","timestamp":"2026-06-04T00:00:00.000Z","sessionId":"s1","state":"brainstorming_required","taskMode":"bug-test-first","message":"Fix login","nextAction":"Load productivity/brainstorming"}
{"auditRef":"a2","timestamp":"2026-06-04T00:01:00.000Z","sessionId":"s1","state":"ready","taskMode":"bug-test-first","message":"Fix login","nextAction":"Load engineering/diagnose"}
{bad json
```

- [ ] **Step 2: Write failing JSONL tests**

Create `dashboard/tests/jsonl-store.test.ts`:

```ts
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readJsonlFile } from "../src/data/jsonl-store.js";

const fixture = fileURLToPath(new URL("fixtures/audit.jsonl", import.meta.url));

describe("readJsonlFile", () => {
  it("returns valid entries and malformed-line warnings", async () => {
    const result = await readJsonlFile(fixture, { limit: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ line: 1, valid: true });
    expect(result.items[1]).toMatchObject({ line: 2, valid: true });
    expect(result.items[2]).toMatchObject({ line: 3, valid: false });
    expect(result.items[2].error).toContain("Unexpected");
    expect(result.truncated).toBe(false);
  });

  it("truncates when the limit is reached", async () => {
    const result = await readJsonlFile(fixture, { limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.truncated).toBe(true);
  });
});
```

- [ ] **Step 3: Run JSONL tests and verify failure**

Run:

```bash
npm --prefix dashboard test -- jsonl-store
```

Expected: FAIL because `dashboard/src/data/jsonl-store.ts` does not exist.

- [ ] **Step 4: Implement JSONL reader**

Create `dashboard/src/data/jsonl-store.ts`:

```ts
import { readFile } from "node:fs/promises";

import type { AuditEntry, ListResponse } from "../types.js";

export interface JsonlReadOptions {
  limit?: number;
}

export async function readJsonlFile(filePath: string, options: JsonlReadOptions = {}): Promise<ListResponse<AuditEntry>> {
  const limit = options.limit ?? 200;
  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const items: AuditEntry[] = [];

  for (const [index, line] of lines.entries()) {
    if (items.length >= limit) {
      break;
    }

    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      items.push({ line: index + 1, valid: true, value: parsed });
    } catch (error) {
      items.push({
        line: index + 1,
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSONL line",
      });
    }
  }

  return {
    items,
    total: lines.length,
    truncated: lines.length > items.length,
  };
}
```

- [ ] **Step 5: Implement config resolver**

Create `dashboard/src/config.ts`:

```ts
import os from "node:os";
import path from "node:path";

import type { DashboardConfig } from "./types.js";

const DEFAULT_PORT = 4377;
const DEFAULT_HOST = "127.0.0.1";
const PACKAGE_VERSION = "2.0.0";

export function resolveDashboardConfig(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): DashboardConfig {
  return {
    host: readFlag(argv, "--host") ?? env.KILO_KIT_DASHBOARD_HOST ?? DEFAULT_HOST,
    port: Number(readFlag(argv, "--port") ?? env.KILO_KIT_DASHBOARD_PORT ?? DEFAULT_PORT),
    memoryPath: path.resolve(env.KILO_KIT_MEMORY_PATH ?? path.join(os.homedir(), ".kilo-kit/orchestrator.sqlite")),
    ...(env.KILO_KIT_ORCHESTRATION_AUDIT_PATH ? { auditPath: path.resolve(env.KILO_KIT_ORCHESTRATION_AUDIT_PATH) } : {}),
    ...(env.KILO_KIT_DECISION_TRAIL_PATH ? { decisionTrailPath: path.resolve(env.KILO_KIT_DECISION_TRAIL_PATH) } : {}),
    packageVersion: PACKAGE_VERSION,
  };
}

function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return argv[index + 1];
}
```

- [ ] **Step 6: Implement SQLite reader**

Create `dashboard/src/data/sqlite-store.ts`:

```ts
import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";

import type { DashboardSession, HealthStatus, PathStatus, WorkflowOutcome } from "../types.js";
import type { DashboardConfig } from "../config.js";

interface SqliteDatabase {
  prepare(sql: string): {
    all(): unknown[];
    get(): unknown;
  };
}

export async function readSessions(memoryPath: string): Promise<DashboardSession[]> {
  const db = await openReadonlyDatabase(memoryPath);
  if (!db) {
    return [];
  }

  return db
    .prepare("SELECT * FROM orchestration_sessions ORDER BY updated_at DESC LIMIT 200")
    .all()
    .map(rowToSession);
}

export async function readOutcomes(memoryPath: string): Promise<WorkflowOutcome[]> {
  const db = await openReadonlyDatabase(memoryPath);
  if (!db) {
    return [];
  }

  return db
    .prepare("SELECT * FROM workflow_outcomes ORDER BY created_at DESC LIMIT 200")
    .all()
    .map(rowToOutcome);
}

export async function readMemoryRecords(memoryPath: string): Promise<MemoryRecord[]> {
  const db = await openReadonlyDatabase(memoryPath);
  if (!db) {
    return [];
  }

  const facts = db
    .prepare("SELECT * FROM memory_facts ORDER BY updated_at DESC LIMIT 200")
    .all()
    .map((row) => {
      const value = row as Record<string, unknown>;
      return {
        table: "memory_facts" as const,
        id: String(value.id),
        key: String(value.key),
        kind: String(value.kind),
        value: parseJsonObject(value.value_json),
        createdAt: String(value.created_at),
        updatedAt: String(value.updated_at),
      };
    });

  const decisions = db
    .prepare("SELECT * FROM memory_decisions ORDER BY created_at DESC LIMIT 200")
    .all()
    .map((row) => {
      const value = row as Record<string, unknown>;
      return {
        table: "memory_decisions" as const,
        id: String(value.id),
        suggestionKey: String(value.suggestion_key),
        decision: String(value.decision),
        createdAt: String(value.created_at),
      };
    });

  return [...facts, ...decisions];
}

export async function buildHealth(config: DashboardConfig): Promise<HealthStatus> {
  const sqliteAvailable = (await importSqlite()) !== undefined;
  const memoryPath = await pathStatus(config.memoryPath);
  const auditPath = config.auditPath ? await pathStatus(config.auditPath) : undefined;
  const decisionTrailPath = config.decisionTrailPath ? await pathStatus(config.decisionTrailPath) : undefined;
  const sessions = await readSessions(config.memoryPath);
  const warnings = [
    ...(!sqliteAvailable ? ["node:sqlite is unavailable; SQLite-backed session data cannot be read."] : []),
    ...(!memoryPath.exists ? [`Memory DB does not exist: ${memoryPath.path}`] : []),
    ...(auditPath && !auditPath.exists ? [`Audit JSONL does not exist: ${auditPath.path}`] : []),
    ...(decisionTrailPath && !decisionTrailPath.exists ? [`Route decision JSONL does not exist: ${decisionTrailPath.path}`] : []),
  ];

  return {
    packageVersion: config.packageVersion,
    nodeVersion: process.version,
    host: config.host,
    port: config.port,
    memoryPath,
    ...(auditPath ? { auditPath } : {}),
    ...(decisionTrailPath ? { decisionTrailPath } : {}),
    latestSessionTimestamp: sessions[0]?.updatedAt,
    sqliteAvailable,
    warnings,
  };
}

async function openReadonlyDatabase(filePath: string): Promise<SqliteDatabase | undefined> {
  const sqlite = await importSqlite();
  if (!sqlite) {
    return undefined;
  }

  try {
    return new sqlite.DatabaseSync(filePath, { readOnly: true }) as SqliteDatabase;
  } catch {
    return undefined;
  }
}

async function importSqlite(): Promise<typeof import("node:sqlite") | undefined> {
  try {
    return await import("node:sqlite");
  } catch {
    return undefined;
  }
}

async function pathStatus(filePath: string): Promise<PathStatus> {
  try {
    const info = await stat(filePath);
    await access(filePath, constants.R_OK);
    return { path: filePath, exists: true, readable: true, sizeBytes: info.size };
  } catch (error) {
    return {
      path: filePath,
      exists: false,
      readable: false,
      warning: error instanceof Error ? error.message : "Path is not readable",
    };
  }
}

function rowToSession(row: unknown): DashboardSession {
  const value = row as Record<string, unknown>;
  return {
    id: String(value.id),
    state: String(value.state),
    message: String(value.message),
    taskMode: String(value.task_mode),
    route: parseJsonObject(value.route_json),
    questions: parseJsonArray(value.questions_json),
    answers: parseJsonObject(value.answers_json) as Record<string, string>,
    memorySuggestions: parseJsonArray(value.memory_suggestions_json),
    finalWorkflow: parseJsonArray(value.final_workflow_json),
    createdAt: String(value.created_at),
    updatedAt: String(value.updated_at),
  };
}

function rowToOutcome(row: unknown): WorkflowOutcome {
  const value = row as Record<string, unknown>;
  return {
    id: String(value.id),
    sessionId: String(value.session_id),
    taskMode: String(value.task_mode),
    workflow: parseJsonArray(value.workflow_json),
    verification: parseJsonObject(value.verification_json),
    outcome: String(value.outcome),
    createdAt: String(value.created_at),
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  return typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : {};
}

function parseJsonArray<T = never>(value: unknown): T[] {
  return typeof value === "string" ? (JSON.parse(value) as T[]) : [];
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
npm --prefix dashboard test -- jsonl-store
npm --prefix dashboard run typecheck
```

Expected: JSONL tests PASS. Typecheck may still fail until UI/server entry files exist in later tasks.

- [ ] **Step 8: Commit data readers**

```bash
git add dashboard/src/config.ts dashboard/src/data/jsonl-store.ts dashboard/src/data/sqlite-store.ts dashboard/tests/jsonl-store.test.ts dashboard/tests/fixtures/audit.jsonl
git commit -m "feat: add dashboard data readers"
```

## Task 3: Build Workflow View Model

**Files:**
- Create: `dashboard/src/data/workflow-view-model.ts`
- Test: `dashboard/tests/workflow-view-model.test.ts`
- Test fixture: `dashboard/tests/fixtures/sessions.json`

- [ ] **Step 1: Write session fixture**

Create `dashboard/tests/fixtures/sessions.json`:

```json
[
  {
    "id": "s1",
    "state": "brainstorming_required",
    "message": "Fix login",
    "taskMode": "bug-test-first",
    "route": {},
    "questions": [],
    "answers": {},
    "memorySuggestions": [],
    "finalWorkflow": [],
    "createdAt": "2026-06-04T00:00:00.000Z",
    "updatedAt": "2026-06-04T00:00:00.000Z"
  },
  {
    "id": "s2",
    "state": "ready",
    "message": "Fix login",
    "taskMode": "bug-test-first",
    "route": {},
    "questions": [],
    "answers": {},
    "memorySuggestions": [],
    "finalWorkflow": [
      {
        "skill": { "id": "engineering/diagnose" },
        "role": "prepare",
        "reason": "Reproduce first"
      },
      {
        "skill": { "id": "engineering/tdd" },
        "role": "primary",
        "reason": "Write regression test"
      }
    ],
    "createdAt": "2026-06-04T00:01:00.000Z",
    "updatedAt": "2026-06-04T00:02:00.000Z"
  }
]
```

- [ ] **Step 2: Write failing view-model tests**

Create `dashboard/tests/workflow-view-model.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildWorkflowBoard } from "../src/data/workflow-view-model.js";
import type { DashboardSession } from "../src/types.js";

const fixture = fileURLToPath(new URL("fixtures/sessions.json", import.meta.url));

describe("buildWorkflowBoard", () => {
  it("marks brainstorming_required sessions as blocked", async () => {
    const sessions = JSON.parse(await readFile(fixture, "utf8")) as DashboardSession[];
    const board = buildWorkflowBoard({ sessions, outcomes: [], auditEntries: [] });

    expect(board.items[0].session.id).toBe("s1");
    expect(board.items[0].brainstormingGate).toEqual({ required: true, approved: false, blocked: true });
    expect(board.items[0].releasedWorkflow).toEqual([]);
  });

  it("marks ready sessions as approved and keeps post-brainstorming workflow only", async () => {
    const sessions = JSON.parse(await readFile(fixture, "utf8")) as DashboardSession[];
    const board = buildWorkflowBoard({ sessions, outcomes: [], auditEntries: [] });

    expect(board.items[1].session.id).toBe("s2");
    expect(board.items[1].brainstormingGate).toEqual({ required: true, approved: true, blocked: false });
    expect(board.items[1].releasedWorkflow.map((step) => step.skill?.id)).toEqual(["engineering/diagnose", "engineering/tdd"]);
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm --prefix dashboard test -- workflow-view-model
```

Expected: FAIL because `workflow-view-model.ts` does not exist.

- [ ] **Step 4: Implement workflow view model**

Create `dashboard/src/data/workflow-view-model.ts`:

```ts
import type { AuditEntry, DashboardSession, ListResponse, WorkflowBoardItem, WorkflowOutcome } from "../types.js";

export interface BuildWorkflowBoardInput {
  sessions: DashboardSession[];
  outcomes: WorkflowOutcome[];
  auditEntries: AuditEntry[];
}

export function buildWorkflowBoard(input: BuildWorkflowBoardInput): ListResponse<WorkflowBoardItem> {
  const items = input.sessions.map((session) => {
    const sessionAuditEntries = input.auditEntries.filter((entry) => entry.value?.sessionId === session.id);
    const outcome = input.outcomes.find((item) => item.sessionId === session.id);
    const releasedWorkflow = session.finalWorkflow.filter((step) => step.skill?.id !== "productivity/brainstorming");
    const ready = session.state === "ready";

    return {
      session,
      stateTimeline: buildStateTimeline(session, sessionAuditEntries),
      brainstormingGate: {
        required: true,
        approved: ready,
        blocked: session.state === "brainstorming_required",
      },
      releasedWorkflow,
      ...(outcome?.verification ? { verificationGate: outcome.verification } : {}),
      auditEntries: sessionAuditEntries,
    };
  });

  return {
    items,
    total: items.length,
    truncated: false,
  };
}

function buildStateTimeline(session: DashboardSession, auditEntries: AuditEntry[]): string[] {
  const states = auditEntries
    .map((entry) => entry.value?.state)
    .filter((state): state is string => typeof state === "string");

  if (states.length === 0) {
    return [session.state];
  }

  return [...new Set(states)];
}
```

- [ ] **Step 5: Run view-model tests**

Run:

```bash
npm --prefix dashboard test -- workflow-view-model
```

Expected: PASS.

- [ ] **Step 6: Commit view model**

```bash
git add dashboard/src/data/workflow-view-model.ts dashboard/tests/workflow-view-model.test.ts dashboard/tests/fixtures/sessions.json
git commit -m "feat: model dashboard workflow board"
```

## Task 4: Add Local API and Static Server

**Files:**
- Create: `dashboard/src/api.ts`
- Create: `dashboard/src/server.ts`
- Test: `dashboard/tests/api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `dashboard/tests/api.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createApiHandler } from "../src/api.js";

describe("dashboard API", () => {
  it("returns health JSON", async () => {
    const handler = createApiHandler({
      health: async () => ({
        packageVersion: "2.0.0",
        nodeVersion: "v24.0.0",
        host: "127.0.0.1",
        port: 4377,
        memoryPath: { path: "/tmp/memory.sqlite", exists: false, readable: false },
        sqliteAvailable: false,
        warnings: ["Memory DB does not exist: /tmp/memory.sqlite"],
      }),
      sessions: async () => ({ items: [], total: 0, truncated: false }),
      sessionById: async () => undefined,
      memory: async () => ({ items: [], total: 0, truncated: false }),
      audit: async () => ({ items: [], total: 0, truncated: false }),
      routeReport: async () => ({ items: [], total: 0, truncated: false }),
    });

    const response = await handler(new Request("http://127.0.0.1/api/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.packageVersion).toBe("2.0.0");
  });

  it("returns 404 for unknown API routes", async () => {
    const handler = createApiHandler({
      health: async () => {
        throw new Error("not used");
      },
      sessions: async () => ({ items: [], total: 0, truncated: false }),
      sessionById: async () => undefined,
      memory: async () => ({ items: [], total: 0, truncated: false }),
      audit: async () => ({ items: [], total: 0, truncated: false }),
      routeReport: async () => ({ items: [], total: 0, truncated: false }),
    });

    const response = await handler(new Request("http://127.0.0.1/api/missing"));

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run API tests and verify failure**

Run:

```bash
npm --prefix dashboard test -- api
```

Expected: FAIL because `dashboard/src/api.ts` does not exist.

- [ ] **Step 3: Implement API handler**

Create `dashboard/src/api.ts`:

```ts
import type { AuditEntry, HealthStatus, ListResponse, MemoryRecord, WorkflowBoardItem } from "./types.js";

export interface DashboardDataSources {
  health(): Promise<HealthStatus>;
  sessions(): Promise<ListResponse<WorkflowBoardItem>>;
  sessionById(id: string): Promise<WorkflowBoardItem | undefined>;
  memory(): Promise<ListResponse<MemoryRecord>>;
  audit(): Promise<ListResponse<AuditEntry>>;
  routeReport(): Promise<ListResponse<AuditEntry>>;
}

export function createApiHandler(sources: DashboardDataSources): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        return json(await sources.health());
      }
      if (url.pathname === "/api/sessions") {
        return json(await sources.sessions());
      }
      if (url.pathname.startsWith("/api/sessions/")) {
        const id = decodeURIComponent(url.pathname.replace("/api/sessions/", ""));
        const session = await sources.sessionById(id);
        return session ? json(session) : json({ error: "Session not found" }, 404);
      }
      if (url.pathname === "/api/memory") {
        return json(await sources.memory());
      }
      if (url.pathname === "/api/audit") {
        return json(await sources.audit());
      }
      if (url.pathname === "/api/route-report") {
        return json(await sources.routeReport());
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Dashboard API error" }, 500);
    }
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
```

- [ ] **Step 4: Implement local server**

Create `dashboard/src/server.ts`:

```ts
#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApiHandler } from "./api.js";
import { resolveDashboardConfig } from "./config.js";
import { readJsonlFile } from "./data/jsonl-store.js";
import { buildHealth, readMemoryRecords, readOutcomes, readSessions } from "./data/sqlite-store.js";
import { buildWorkflowBoard } from "./data/workflow-view-model.js";

const config = resolveDashboardConfig();
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public");

const api = createApiHandler({
  health: () => buildHealth(config),
  sessions: async () => {
    const sessions = await readSessions(config.memoryPath);
    const outcomes = await readOutcomes(config.memoryPath);
    const auditEntries = config.auditPath ? (await readJsonlFile(config.auditPath, { limit: 500 })).items : [];
    return buildWorkflowBoard({ sessions, outcomes, auditEntries });
  },
  sessionById: async (id) => {
    const board = await apiSources.sessions();
    return board.items.find((item) => item.session.id === id);
  },
  memory: async () => {
    const items = await readMemoryRecords(config.memoryPath);
    return { items, total: items.length, truncated: false };
  },
  audit: async () => (config.auditPath ? readJsonlFile(config.auditPath, { limit: 500 }) : { items: [], total: 0, truncated: false }),
  routeReport: async () =>
    config.decisionTrailPath ? readJsonlFile(config.decisionTrailPath, { limit: 500 }) : { items: [], total: 0, truncated: false },
});

const apiSources = {
  sessions: async () => {
    const sessions = await readSessions(config.memoryPath);
    const outcomes = await readOutcomes(config.memoryPath);
    const auditEntries = config.auditPath ? (await readJsonlFile(config.auditPath, { limit: 500 })).items : [];
    return buildWorkflowBoard({ sessions, outcomes, auditEntries });
  },
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${config.host}:${config.port}`}`);

  if (url.pathname.startsWith("/api/")) {
    const apiResponse = await api(new Request(url));
    response.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers.entries()));
    response.end(await apiResponse.text());
    return;
  }

  const asset = await readStaticAsset(url.pathname);
  response.writeHead(asset.status, asset.headers);
  response.end(asset.body);
});

server.listen(config.port, config.host, () => {
  process.stderr.write(`Kilo-Kit dashboard listening on http://${config.host}:${config.port}\n`);
});

async function readStaticAsset(urlPath: string): Promise<{ status: number; headers: Record<string, string>; body: string | Buffer }> {
  const relativePath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(publicDir, relativePath);

  if (!filePath.startsWith(publicDir)) {
    return { status: 403, headers: { "content-type": "text/plain" }, body: "Forbidden" };
  }

  try {
    const body = await readFile(filePath);
    return { status: 200, headers: { "content-type": contentType(filePath) }, body };
  } catch {
    const body = await readFile(path.join(publicDir, "index.html"), "utf8");
    return { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body };
  }
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm --prefix dashboard test -- api
```

Expected: PASS.

- [ ] **Step 6: Commit API/server**

```bash
git add dashboard/src/api.ts dashboard/src/server.ts dashboard/tests/api.test.ts
git commit -m "feat: add dashboard local API"
```

## Task 5: Build React Dashboard UI

**Files:**
- Create: `dashboard/src/ui/main.tsx`
- Create: `dashboard/src/ui/App.tsx`
- Create: `dashboard/src/ui/WorkflowBoard.tsx`
- Create: `dashboard/src/ui/SessionDetail.tsx`
- Create: `dashboard/src/ui/MemoryAuditViewer.tsx`
- Create: `dashboard/src/ui/HealthPanel.tsx`

- Test: `dashboard/tests/workflow-board-ui.test.tsx`

- [ ] **Step 1: Create React entry**

Create `dashboard/src/ui/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Dashboard root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Create app shell**

Create `dashboard/src/ui/App.tsx`:

```tsx
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { AuditEntry, HealthStatus, ListResponse, MemoryRecord, WorkflowBoardItem } from "../types.js";
import { HealthPanel } from "./HealthPanel.js";
import { MemoryAuditViewer } from "./MemoryAuditViewer.js";
import { WorkflowBoard } from "./WorkflowBoard.js";

type Tab = "workflow" | "audit";

export function App() {
  const [tab, setTab] = useState<Tab>("workflow");
  const [health, setHealth] = useState<HealthStatus | undefined>();
  const [board, setBoard] = useState<ListResponse<WorkflowBoardItem>>({ items: [], total: 0, truncated: false });
  const [audit, setAudit] = useState<ListResponse<AuditEntry>>({ items: [], total: 0, truncated: false });
  const [memory, setMemory] = useState<ListResponse<MemoryRecord>>({ items: [], total: 0, truncated: false });

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(): Promise<void> {
    const [healthResponse, sessionsResponse, auditResponse, memoryResponse] = await Promise.all([
      fetch("/api/health"),
      fetch("/api/sessions"),
      fetch("/api/audit"),
      fetch("/api/memory"),
    ]);
    setHealth((await healthResponse.json()) as HealthStatus);
    setBoard((await sessionsResponse.json()) as ListResponse<WorkflowBoardItem>);
    setAudit((await auditResponse.json()) as ListResponse<AuditEntry>);
    setMemory((await memoryResponse.json()) as ListResponse<MemoryRecord>);
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Kilo-Kit Workflow Dashboard</h1>
          <p style={styles.subtitle}>Local C4 sessions, workflow gates, memory, and audit visibility.</p>
        </div>
        <button onClick={() => void refresh()} style={styles.button}>Refresh</button>
      </header>
      {health ? <HealthPanel health={health} /> : null}
      <nav style={styles.tabs}>
        <button onClick={() => setTab("workflow")} style={tab === "workflow" ? styles.activeTab : styles.tab}>Workflow Board</button>
        <button onClick={() => setTab("audit")} style={tab === "audit" ? styles.activeTab : styles.tab}>Memory/Audit Viewer</button>
      </nav>
      {tab === "workflow" ? <WorkflowBoard board={board} /> : <MemoryAuditViewer audit={audit} memory={memory} />}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { fontFamily: "Inter, system-ui, sans-serif", margin: 0, padding: 24, color: "#172033", background: "#f7f8fa", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: "6px 0 0", color: "#5f6b7a" },
  button: { border: "1px solid #ccd3dd", background: "#ffffff", borderRadius: 6, padding: "8px 12px", cursor: "pointer" },
  tabs: { display: "flex", gap: 8, margin: "18px 0" },
  tab: { border: "1px solid #ccd3dd", background: "#ffffff", borderRadius: 6, padding: "8px 12px", cursor: "pointer" },
  activeTab: { border: "1px solid #294c7a", background: "#294c7a", color: "#ffffff", borderRadius: 6, padding: "8px 12px", cursor: "pointer" },
};
```

- [ ] **Step 3: Create health panel**

Create `dashboard/src/ui/HealthPanel.tsx`:

```tsx
import type { HealthStatus } from "../types.js";
import type { CSSProperties } from "react";

export function HealthPanel({ health }: { health: HealthStatus }) {
  return (
    <section style={styles.panel}>
      <strong>Health</strong>
      <div style={styles.grid}>
        <span>Package: {health.packageVersion}</span>
        <span>Node: {health.nodeVersion}</span>
        <span>Memory: {health.memoryPath.path}</span>
        <span>SQLite: {health.sqliteAvailable ? "available" : "unavailable"}</span>
      </div>
      {health.warnings.length > 0 ? (
        <ul style={styles.warnings}>
          {health.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#ffffff", border: "1px solid #d9dee7", borderRadius: 8, padding: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 10, color: "#334155" },
  warnings: { color: "#9a3412", margin: "10px 0 0" },
};
```

- [ ] **Step 4: Create workflow board**

Create `dashboard/src/ui/WorkflowBoard.tsx`:

```tsx
import type { ListResponse, WorkflowBoardItem } from "../types.js";
import type { CSSProperties } from "react";
import { SessionDetail } from "./SessionDetail.js";

export function WorkflowBoard({ board }: { board: ListResponse<WorkflowBoardItem> }) {
  if (board.items.length === 0) {
    return <section style={styles.empty}>No C4 sessions found.</section>;
  }

  return (
    <section style={styles.list}>
      {board.items.map((item) => (
        <article key={item.session.id} style={styles.card}>
          <header style={styles.cardHeader}>
            <div>
              <strong>{item.session.taskMode}</strong>
              <div style={styles.message}>{item.session.message}</div>
            </div>
            <span style={item.brainstormingGate.blocked ? styles.blocked : styles.ready}>{item.session.state}</span>
          </header>
          <SessionDetail item={item} />
        </article>
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  list: { display: "grid", gap: 12 },
  empty: { background: "#ffffff", border: "1px solid #d9dee7", borderRadius: 8, padding: 18 },
  card: { background: "#ffffff", border: "1px solid #d9dee7", borderRadius: 8, padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 12 },
  message: { color: "#5f6b7a", marginTop: 4 },
  blocked: { color: "#9a3412", fontWeight: 700 },
  ready: { color: "#166534", fontWeight: 700 },
};
```

- [ ] **Step 5: Create session detail**

Create `dashboard/src/ui/SessionDetail.tsx`:

```tsx
import type { WorkflowBoardItem } from "../types.js";
import type { CSSProperties } from "react";

export function SessionDetail({ item }: { item: WorkflowBoardItem }) {
  const workflow = item.releasedWorkflow.length > 0 ? item.releasedWorkflow : [];

  return (
    <div style={styles.detail}>
      <div style={styles.meta}>Session: {item.session.id}</div>
      <div style={styles.flow}>
        <span>User request</span>
        <span>{item.brainstormingGate.blocked ? "brainstorming_required" : "brainstorming approved"}</span>
        {workflow.map((step, index) => (
          <span key={`${step.skill?.id ?? "skill"}-${index}`}>{step.skill?.id ?? "unknown skill"}</span>
        ))}
        {item.verificationGate?.commands?.length ? <span>verification gate</span> : null}
      </div>
      {item.brainstormingGate.blocked ? <p style={styles.warning}>Implementation workflow has not been released.</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  detail: { marginTop: 12 },
  meta: { color: "#64748b", fontSize: 13, marginBottom: 10 },
  flow: { display: "flex", flexWrap: "wrap", gap: 8 },
  warning: { color: "#9a3412" },
};
```

- [ ] **Step 6: Create audit viewer**

Create `dashboard/src/ui/MemoryAuditViewer.tsx`:

```tsx
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { AuditEntry, ListResponse, MemoryRecord } from "../types.js";

export function MemoryAuditViewer({ audit, memory }: { audit: ListResponse<AuditEntry>; memory: ListResponse<MemoryRecord> }) {
  const [query, setQuery] = useState("");
  const filteredAudit = useMemo(
    () => audit.items.filter((entry) => JSON.stringify(entry).toLowerCase().includes(query.toLowerCase())),
    [audit.items, query],
  );
  const filteredMemory = useMemo(
    () => memory.items.filter((entry) => JSON.stringify(entry).toLowerCase().includes(query.toLowerCase())),
    [memory.items, query],
  );

  return (
    <section style={styles.panel}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter memory and audit entries" style={styles.input} />
      <div style={styles.count}>Memory: {filteredMemory.length} of {memory.total} records</div>
      <pre style={styles.log}>{JSON.stringify(filteredMemory, null, 2)}</pre>
      <div style={styles.count}>Audit: {filteredAudit.length} of {audit.total} entries</div>
      <pre style={styles.log}>{JSON.stringify(filteredAudit, null, 2)}</pre>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#ffffff", border: "1px solid #d9dee7", borderRadius: 8, padding: 16 },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #ccd3dd", borderRadius: 6, padding: 10 },
  count: { margin: "10px 0", color: "#64748b" },
  log: { overflow: "auto", maxHeight: 520, background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 6 },
};
```

- [ ] **Step 7: Add UI render test**

Create `dashboard/tests/workflow-board-ui.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WorkflowBoard } from "../src/ui/WorkflowBoard.js";
import type { WorkflowBoardItem } from "../src/types.js";

describe("WorkflowBoard UI", () => {
  it("renders blocked brainstorming sessions", () => {
    const item: WorkflowBoardItem = {
      session: {
        id: "s1",
        state: "brainstorming_required",
        message: "Fix login",
        taskMode: "bug-test-first",
        route: {},
        questions: [],
        answers: {},
        memorySuggestions: [],
        finalWorkflow: [],
        createdAt: "2026-06-04T00:00:00.000Z",
        updatedAt: "2026-06-04T00:00:00.000Z",
      },
      stateTimeline: ["brainstorming_required"],
      brainstormingGate: { required: true, approved: false, blocked: true },
      releasedWorkflow: [],
      auditEntries: [],
    };

    const html = renderToStaticMarkup(<WorkflowBoard board={{ items: [item], total: 1, truncated: false }} />);

    expect(html).toContain("brainstorming_required");
    expect(html).toContain("Implementation workflow has not been released.");
  });
});
```

- [ ] **Step 8: Build dashboard and run UI test**

Run:

```bash
npm --prefix dashboard run build
npm --prefix dashboard test -- workflow-board-ui
```

Expected: PASS and creates `dashboard/dist/server.js` plus `dashboard/dist/public/index.html`.

- [ ] **Step 9: Commit UI**

```bash
git add dashboard/src/ui dashboard/tests/workflow-board-ui.test.tsx dashboard/dist
git commit -m "feat: add dashboard UI"
```

## Task 6: Add Dashboard Smoke Test

**Files:**
- Create: `dashboard/src/smoke.ts`

- [ ] **Step 1: Create smoke script**

Create `dashboard/src/smoke.ts`:

```ts
import { spawn } from "node:child_process";

const port = Number(process.env.KILO_KIT_DASHBOARD_SMOKE_PORT ?? 4388);
const child = spawn(process.execPath, ["dist/server.js", "--port", String(port)], {
  cwd: new URL("..", import.meta.url),
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    KILO_KIT_MEMORY_PATH: process.env.KILO_KIT_MEMORY_PATH ?? "/tmp/kilo-kit-dashboard-smoke.sqlite",
  },
});

try {
  await waitForHealth(port);
  const page = await fetch(`http://127.0.0.1:${port}/`);
  if (!page.ok) {
    throw new Error(`Dashboard page failed: ${page.status}`);
  }
  process.stdout.write("Dashboard smoke check passed.\n");
} finally {
  child.kill();
}

async function waitForHealth(port: number): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Dashboard health endpoint did not become ready.");
}
```

- [ ] **Step 2: Run build and smoke**

Run:

```bash
npm --prefix dashboard run build
npm --prefix dashboard run smoke
```

Expected: both PASS and smoke prints `Dashboard smoke check passed.`

- [ ] **Step 3: Commit smoke**

```bash
git add dashboard/src/smoke.ts dashboard/dist
git commit -m "test: add dashboard smoke check"
```

## Task 7: Wire Dashboard Into Root Package and Release Flow

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Update root package surface**

Modify root `package.json`:

```json
{
  "bin": {
    "kilo-kit-mcp": "mcp/dist/server.js",
    "kilo-kit-dashboard": "dashboard/dist/server.js"
  },
  "files": [
    "LICENSE",
    "README.md",
    "QUICKSTART.md",
    ".mcp/kilo-kit.example.json",
    ".mcp/kilo-kit.codex-windows.toml",
    "mcp/README.md",
    "mcp/package.json",
    "mcp/dist/",
    "dashboard/package.json",
    "dashboard/dist/",
    "skills/",
    "src/core/KILO_MASTER.md",
    "src/tools/validate-skill.js"
  ],
  "scripts": {
    "mcp:install": "npm --prefix mcp install",
    "mcp:build": "npm --prefix mcp run build",
    "mcp:test": "npm --prefix mcp test",
    "mcp:typecheck": "npm --prefix mcp run typecheck",
    "mcp:smoke": "npm --prefix mcp run smoke",
    "dashboard:install": "npm --prefix dashboard install",
    "dashboard:build": "npm --prefix dashboard run build",
    "dashboard:test": "npm --prefix dashboard test",
    "dashboard:typecheck": "npm --prefix dashboard run typecheck",
    "dashboard:smoke": "npm --prefix dashboard run smoke",
    "pack:dry-run": "npm pack --dry-run",
    "prepack": "npm --prefix mcp ci && npm --prefix mcp run build && npm --prefix dashboard ci && npm --prefix dashboard run build",
    "prepublishOnly": "npm run mcp:build && npm run mcp:typecheck && npm run mcp:test && npm run mcp:smoke && npm run dashboard:build && npm run dashboard:typecheck && npm run dashboard:test && npm run dashboard:smoke && node src/tools/validate-skill.js --all skills"
  }
}
```

Keep the existing root package metadata, dependencies, engines, publish config, and keywords.

- [ ] **Step 2: Update root lockfile**

Run:

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` updates without installing unrelated root dependencies.

- [ ] **Step 3: Update publish workflow**

Modify `.github/workflows/publish.yml` after the MCP install step:

```yaml
      - name: Install dashboard dependencies
        run: npm --prefix dashboard install --no-save --package-lock=false
```

- [ ] **Step 4: Run full release verification**

Run:

```bash
npm run prepublishOnly
npm pack --dry-run --ignore-scripts
```

Expected: both PASS. `npm pack` output includes `dashboard/dist/server.js` and dashboard public assets.

- [ ] **Step 5: Commit release wiring**

```bash
git add package.json package-lock.json .github/workflows/publish.yml dashboard/package.json dashboard/package-lock.json
git commit -m "chore: wire dashboard into release"
```

## Task 8: Document v2.0 Dashboard Usage

**Files:**
- Modify: `README.md`
- Modify: `mcp/README.md`

- [ ] **Step 1: Update README MCP section**

Add this capability row in `README.md` near the MCP surface table:

```markdown
| `kilo-kit-dashboard` | Local-only web dashboard for inspecting C4 sessions, workflow gates, memory, audit logs, and runtime health |
```

Add this usage block near MCP installation:

````markdown
### Local Workflow Dashboard

Run the read-only local dashboard:

```bash
npx -y @vodailocz/kilo-kit-mcp kilo-kit-dashboard --port 4377
```

Open `http://127.0.0.1:4377`.

The dashboard reads the same C4 artifacts used by MCP:

- `KILO_KIT_MEMORY_PATH`
- `KILO_KIT_ORCHESTRATION_AUDIT_PATH`
- `KILO_KIT_DECISION_TRAIL_PATH`

It is read-only in v2.0 and does not approve brainstorming, accept memory suggestions, or modify project files.
````

- [ ] **Step 2: Update MCP README**

Add a `Local Dashboard` section in `mcp/README.md`:

````markdown
## Local Dashboard

The package also includes `kilo-kit-dashboard`, a local-only read-only web dashboard for inspecting C4 operation.

```bash
npx -y @vodailocz/kilo-kit-mcp kilo-kit-dashboard --port 4377
```

The dashboard shows:

- workflow board for C4 sessions
- brainstorming gate status
- post-brainstorming workflow skills
- memory/audit viewer
- local health panel

It binds to `127.0.0.1` by default and reads the configured C4 SQLite/JSONL artifacts.
````

- [ ] **Step 3: Run docs and package checks**

Run:

```bash
git diff --check
npm pack --dry-run --ignore-scripts
```

Expected: both PASS and package contents include dashboard files.

- [ ] **Step 4: Commit docs**

```bash
git add README.md mcp/README.md
git commit -m "docs: add dashboard usage"
```

## Task 9: Final Verification and v2.0 Release Prep

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `mcp/package.json`
- Modify: `mcp/package-lock.json`
- Modify: `dashboard/package.json`
- Modify: `dashboard/package-lock.json`
- Modify: `mcp/src/server.ts`
- Modify: `README.md`
- Modify: `mcp/README.md`

- [ ] **Step 1: Bump versions to 2.0.0**

Run:

```bash
npm version 2.0.0 --no-git-tag-version
npm --prefix mcp version 2.0.0 --no-git-tag-version
npm --prefix dashboard version 2.0.0 --no-git-tag-version
```

Expected: package files update to `2.0.0`.

- [ ] **Step 2: Update MCP server version**

Modify `mcp/src/server.ts`:

```ts
const SERVER_VERSION = "2.0.0";
```

- [ ] **Step 3: Update docs version text**

Update `README.md` and `mcp/README.md` visible version references from `1.3.0` to `2.0.0` where they describe the current release.

- [ ] **Step 4: Run final verification**

Run:

```bash
git diff --check
npm run prepublishOnly
npm pack --dry-run --ignore-scripts
```

Expected:

- `git diff --check` exits 0.
- `npm run prepublishOnly` exits 0.
- `npm pack --dry-run --ignore-scripts` exits 0 and lists `kilo-kit-dashboard` files.

- [ ] **Step 5: Test against real local C4 artifacts**

Run:

```bash
KILO_KIT_MEMORY_PATH=/home/vodailoc/.kilo-kit/kilo-memory.sqlite \
KILO_KIT_ORCHESTRATION_AUDIT_PATH=/home/vodailoc/.kilo-kit/orchestration-audit.jsonl \
KILO_KIT_DECISION_TRAIL_PATH=/home/vodailoc/.kilo-kit/decision-trail.jsonl \
npm --prefix dashboard run start -- --port 4377
```

In another terminal or browser automation, verify:

```bash
curl -s http://127.0.0.1:4377/api/health
curl -s http://127.0.0.1:4377/api/sessions
```

Expected:

- `/api/health` returns path statuses.
- `/api/sessions` returns at least one C4 session when local DB has sessions.
- Ready sessions do not repeat `productivity/brainstorming` in `releasedWorkflow`.

- [ ] **Step 6: Commit release prep**

```bash
git add package.json package-lock.json mcp/package.json mcp/package-lock.json dashboard/package.json dashboard/package-lock.json mcp/src/server.ts README.md mcp/README.md
git commit -m "chore: release 2.0.0"
```

- [ ] **Step 7: Push and publish**

Run only after final verification passes:

```bash
git push origin main
git tag v2.0.0
git push origin v2.0.0
gh run watch --repo VoDaiLocz/KILO-KIT --exit-status
npm view @vodailocz/kilo-kit-mcp version
```

Expected:

- GitHub Actions publish workflow succeeds.
- `npm view @vodailocz/kilo-kit-mcp version` returns `2.0.0`.

## Self-Review Checklist

- Spec coverage: The plan covers local server, workflow board, memory/audit viewer, health panel, read-only posture, tests, release wiring, docs, and npm publish.
- Placeholder scan: The plan contains no TBD/TODO placeholders and no open-ended implementation steps.
- Type consistency: Shared types in Task 1 are used by data readers, view model, API, and UI tasks with matching names.
- Scope control: v2.0 excludes remote auth, mutable dashboard controls, and a second workflow engine.
