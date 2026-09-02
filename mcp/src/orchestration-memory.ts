import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  CheckpointInput,
  CheckpointRecord,
  LearningReflectionInput,
  LearningReflectionRecord,
  MemoryDecision,
  MemoryFact,
  MemoryFactInput,
  MemoryReport,
  MemorySuggestion,
  MemorySuggestionInput,
  OrchestrationSessionRecord,
  TrajectoryInput,
  TrajectoryRecord,
  WorkflowOutcomeRecord,
} from "./orchestration-types.js";

export interface OrchestrationMemoryStore {
  rememberFact(fact: MemoryFactInput): void;
  suggest(input: MemorySuggestionInput): MemorySuggestion[];
  recordDecision(decision: MemoryDecision): void;
  recordSession(session: OrchestrationSessionRecord): void;
  recordOutcome(outcome: WorkflowOutcomeRecord): void;
  recordReflection(reflection: LearningReflectionInput): LearningReflectionRecord;
  getReflections(filter?: { taskMode?: string; limit?: number }): LearningReflectionRecord[];
  recordTrajectory(trajectory: TrajectoryInput): TrajectoryRecord;
  getTrajectories(sessionId: string, limit?: number): TrajectoryRecord[];
  recordCheckpoint(checkpoint: CheckpointInput): CheckpointRecord;
  getCheckpoints(sessionId: string): CheckpointRecord[];
  report(): MemoryReport;
}

export interface SqliteOrchestrationMemoryOptions {
  filePath: string;
}

export function createInMemoryOrchestrationMemory(initialFacts: MemoryFact[] = []): OrchestrationMemoryStore {
  const facts = new Map<string, MemoryFact>(initialFacts.map((fact) => [fact.key, clone(fact)]));
  const decisions: MemoryDecision[] = [];
  const suggestions: MemorySuggestion[] = [];
  const sessions = new Map<string, OrchestrationSessionRecord>();
  const outcomes: WorkflowOutcomeRecord[] = [];
  const reflections: LearningReflectionRecord[] = [];
  const trajectories: TrajectoryRecord[] = [];
  const checkpoints: CheckpointRecord[] = [];

  return {
    rememberFact(fact) {
      facts.set(fact.key, normalizeFact(fact, facts.get(fact.key)));
    },
    suggest(input) {
      const produced = buildSuggestions([...facts.values()], reflections, input);
      suggestions.splice(0, suggestions.length, ...produced.map(clone));
      return produced;
    },
    recordDecision(decision) {
      decisions.push({ ...decision });
    },
    recordSession(session) {
      sessions.set(session.id, clone(session));
    },
    recordOutcome(outcome) {
      outcomes.push(clone(outcome));
    },
    recordReflection(reflection) {
      const record: LearningReflectionRecord = {
        id: randomUUID(),
        sessionId: reflection.sessionId,
        taskMode: reflection.taskMode,
        taskSummary: reflection.taskSummary,
        correctApproach: reflection.correctApproach,
        wrongPathsEncountered: [...reflection.wrongPathsEncountered],
        skillsEvaluated: reflection.skillsEvaluated ? clone(reflection.skillsEvaluated) : [],
        lessonsLearned: reflection.lessonsLearned,
        createdAt: new Date().toISOString(),
      };
      reflections.push(record);
      return clone(record);
    },
    getReflections(filter) {
      let filtered = [...reflections];
      if (filter?.taskMode) {
        filtered = filtered.filter((r) => r.taskMode === filter.taskMode);
      }
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return filtered.slice(0, filter?.limit ?? 50).map(clone);
    },
    recordTrajectory(trajectory) {
      const record: TrajectoryRecord = {
        id: randomUUID(),
        sessionId: trajectory.sessionId,
        stepNumber: trajectory.stepNumber,
        toolName: trajectory.toolName,
        toolArgs: clone(trajectory.toolArgs),
        toolArgsHash: trajectory.toolArgsHash,
        toolResultSummary: trajectory.toolResultSummary,
        status: trajectory.status,
        durationMs: trajectory.durationMs,
        sentinelVerdict: trajectory.sentinelVerdict ? clone(trajectory.sentinelVerdict) : undefined,
        createdAt: new Date().toISOString(),
      };
      trajectories.push(record);
      if (trajectories.length > 5000) {
        trajectories.shift();
      }
      return clone(record);
    },
    getTrajectories(sessionId, limit = 50) {
      return trajectories
        .filter((t) => t.sessionId === sessionId)
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .slice(0, limit)
        .map(clone);
    },
    recordCheckpoint(checkpoint) {
      const record: CheckpointRecord = {
        id: randomUUID(),
        sessionId: checkpoint.sessionId,
        checkpointName: checkpoint.checkpointName,
        state: checkpoint.state,
        groundedFiles: [...checkpoint.groundedFiles],
        circuitBreakerState: checkpoint.circuitBreakerState,
        metadata: checkpoint.metadata ? clone(checkpoint.metadata) : undefined,
        createdAt: new Date().toISOString(),
      };
      checkpoints.push(record);
      return clone(record);
    },
    getCheckpoints(sessionId) {
      return checkpoints
        .filter((c) => c.sessionId === sessionId)
        .map(clone);
    },
    report() {
      return {
        facts: [...facts.values()].map(clone),
        decisions: decisions.map((decision) => ({ ...decision })),
        suggestions: suggestions.map(clone),
        sessions: [...sessions.values()].map(clone),
        outcomes: outcomes.map(clone),
        reflections: reflections.map(clone),
      };
    },
  };
}

export async function createSqliteOrchestrationMemory(
  options: SqliteOrchestrationMemoryOptions,
): Promise<OrchestrationMemoryStore> {
  let sqlite: typeof import("node:sqlite") | undefined;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    return createInMemoryOrchestrationMemory();
  }

  mkdirSync(path.dirname(options.filePath), { recursive: true });
  const database = new sqlite.DatabaseSync(options.filePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS memory_facts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      value_json TEXT NOT NULL,
      confidence REAL NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memory_decisions (
      id TEXT PRIMARY KEY,
      suggestion_key TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orchestration_sessions (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      message TEXT NOT NULL,
      task_mode TEXT NOT NULL,
      route_json TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      memory_suggestions_json TEXT NOT NULL,
      final_workflow_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workflow_outcomes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      task_mode TEXT NOT NULL,
      workflow_json TEXT NOT NULL,
      verification_json TEXT NOT NULL,
      outcome TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_reflections (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      task_mode TEXT NOT NULL,
      task_summary TEXT NOT NULL,
      correct_approach TEXT NOT NULL,
      wrong_paths_json TEXT NOT NULL,
      skills_evaluated_json TEXT NOT NULL,
      lessons_learned TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS katl_trajectories (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      tool_args_json TEXT NOT NULL,
      tool_args_hash TEXT NOT NULL,
      tool_result_summary TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      sentinel_verdict_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_katl_trajectories_session ON katl_trajectories(session_id, step_number);

    CREATE TABLE IF NOT EXISTS katl_checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      checkpoint_name TEXT NOT NULL,
      state TEXT NOT NULL,
      grounded_files_json TEXT NOT NULL,
      circuit_breaker_state TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_katl_checkpoints_session ON katl_checkpoints(session_id, created_at);
  `);

  return {
    rememberFact(fact) {
      const existing = factByKey(database, fact.key);
      const normalized = normalizeFact(fact, existing);
      database
        .prepare(
          `INSERT INTO memory_facts (id, kind, key, value_json, confidence, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             kind = excluded.kind,
             value_json = excluded.value_json,
             confidence = excluded.confidence,
             source = excluded.source,
             updated_at = excluded.updated_at`,
        )
        .run(
          normalized.id,
          normalized.kind,
          normalized.key,
          JSON.stringify(normalized.value),
          normalized.confidence,
          normalized.source,
          normalized.createdAt,
          normalized.updatedAt,
        );
    },
    suggest(input) {
      return buildSuggestions(allFacts(database), allReflections(database), input);
    },
    recordDecision(decision) {
      database
        .prepare(
          `INSERT INTO memory_decisions (id, suggestion_key, decision, reason, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(randomUUID(), decision.suggestionKey, decision.decision, decision.reason ?? null, new Date().toISOString());
    },
    recordSession(session) {
      database
        .prepare(
          `INSERT INTO orchestration_sessions
             (id, state, message, task_mode, route_json, questions_json, answers_json, memory_suggestions_json, final_workflow_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             state = excluded.state,
             message = excluded.message,
             task_mode = excluded.task_mode,
             route_json = excluded.route_json,
             questions_json = excluded.questions_json,
             answers_json = excluded.answers_json,
             memory_suggestions_json = excluded.memory_suggestions_json,
             final_workflow_json = excluded.final_workflow_json,
             updated_at = excluded.updated_at`,
        )
        .run(
          session.id,
          session.state,
          session.message,
          session.taskMode,
          JSON.stringify(session.route),
          JSON.stringify(session.questions),
          JSON.stringify(session.answers),
          JSON.stringify(session.memorySuggestions),
          JSON.stringify(session.finalWorkflow),
          session.createdAt,
          session.updatedAt,
        );
    },
    recordOutcome(outcome) {
      database
        .prepare(
          `INSERT INTO workflow_outcomes
             (id, session_id, task_mode, workflow_json, verification_json, outcome, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          outcome.id,
          outcome.sessionId,
          outcome.taskMode,
          JSON.stringify(outcome.workflow),
          JSON.stringify(outcome.verification),
          outcome.outcome,
          outcome.createdAt,
        );
    },
    recordReflection(reflection) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO learning_reflections
             (id, session_id, task_mode, task_summary, correct_approach, wrong_paths_json, skills_evaluated_json, lessons_learned, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          reflection.sessionId ?? null,
          reflection.taskMode,
          reflection.taskSummary,
          reflection.correctApproach,
          JSON.stringify(reflection.wrongPathsEncountered),
          JSON.stringify(reflection.skillsEvaluated ?? []),
          reflection.lessonsLearned,
          createdAt,
        );
      return {
        id,
        sessionId: reflection.sessionId,
        taskMode: reflection.taskMode,
        taskSummary: reflection.taskSummary,
        correctApproach: reflection.correctApproach,
        wrongPathsEncountered: [...reflection.wrongPathsEncountered],
        skillsEvaluated: reflection.skillsEvaluated ? clone(reflection.skillsEvaluated) : [],
        lessonsLearned: reflection.lessonsLearned,
        createdAt,
      };
    },
    getReflections(filter) {
      let query = "SELECT * FROM learning_reflections";
      const params: (string | number)[] = [];
      if (filter?.taskMode) {
        query += " WHERE task_mode = ?";
        params.push(filter.taskMode);
      }
      query += " ORDER BY created_at DESC LIMIT ?";
      params.push(filter?.limit ?? 50);

      const statement = database.prepare(query);
      const rows = (statement.all as (...args: unknown[]) => unknown[])(...params) as unknown as SqliteReflectionRow[];
      return rows.map((row) => ({
        id: row.id,
        sessionId: row.session_id ?? undefined,
        taskMode: row.task_mode,
        taskSummary: row.task_summary,
        correctApproach: row.correct_approach,
        wrongPathsEncountered: JSON.parse(row.wrong_paths_json || "[]") as string[],
        skillsEvaluated: JSON.parse(row.skills_evaluated_json || "[]") as LearningReflectionRecord["skillsEvaluated"],
        lessonsLearned: row.lessons_learned,
        createdAt: row.created_at,
      }));
    },
    recordTrajectory(trajectory) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO katl_trajectories
             (id, session_id, step_number, tool_name, tool_args_json, tool_args_hash, tool_result_summary, status, duration_ms, sentinel_verdict_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          trajectory.sessionId,
          trajectory.stepNumber,
          trajectory.toolName,
          JSON.stringify(trajectory.toolArgs),
          trajectory.toolArgsHash,
          trajectory.toolResultSummary,
          trajectory.status,
          trajectory.durationMs,
          trajectory.sentinelVerdict ? JSON.stringify(trajectory.sentinelVerdict) : null,
          createdAt,
        );
      return { id, ...trajectory, createdAt };
    },
    getTrajectories(sessionId, limit = 50) {
      const stmt = database.prepare("SELECT * FROM katl_trajectories WHERE session_id = ? ORDER BY step_number ASC LIMIT ?");
      const rows = (stmt.all as (...args: unknown[]) => unknown[])(sessionId, limit) as unknown as Array<{
        id: string;
        session_id: string;
        step_number: number;
        tool_name: string;
        tool_args_json: string;
        tool_args_hash: string;
        tool_result_summary: string;
        status: "success" | "failure" | "blocked" | "tripped";
        duration_ms: number;
        sentinel_verdict_json: string | null;
        created_at: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        stepNumber: r.step_number,
        toolName: r.tool_name,
        toolArgs: JSON.parse(r.tool_args_json || "{}") as Record<string, unknown>,
        toolArgsHash: r.tool_args_hash,
        toolResultSummary: r.tool_result_summary,
        status: r.status,
        durationMs: r.duration_ms,
        sentinelVerdict: r.sentinel_verdict_json ? (JSON.parse(r.sentinel_verdict_json) as Record<string, unknown>) : undefined,
        createdAt: r.created_at,
      }));
    },
    recordCheckpoint(checkpoint) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO katl_checkpoints
             (id, session_id, checkpoint_name, state, grounded_files_json, circuit_breaker_state, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          checkpoint.sessionId,
          checkpoint.checkpointName,
          checkpoint.state,
          JSON.stringify(checkpoint.groundedFiles),
          checkpoint.circuitBreakerState,
          checkpoint.metadata ? JSON.stringify(checkpoint.metadata) : null,
          createdAt,
        );
      return { id, ...checkpoint, createdAt };
    },
    getCheckpoints(sessionId) {
      const stmt = database.prepare("SELECT * FROM katl_checkpoints WHERE session_id = ? ORDER BY created_at DESC");
      const rows = (stmt.all as (...args: unknown[]) => unknown[])(sessionId) as unknown as Array<{
        id: string;
        session_id: string;
        checkpoint_name: string;
        state: string;
        grounded_files_json: string;
        circuit_breaker_state: "CLOSED" | "HALF_OPEN" | "OPEN";
        metadata_json: string | null;
        created_at: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        checkpointName: r.checkpoint_name,
        state: r.state,
        groundedFiles: JSON.parse(r.grounded_files_json || "[]") as string[],
        circuitBreakerState: r.circuit_breaker_state,
        metadata: r.metadata_json ? (JSON.parse(r.metadata_json) as Record<string, unknown>) : undefined,
        createdAt: r.created_at,
      }));
    },
    report() {
      return {
        facts: allFacts(database),
        decisions: allDecisions(database),
        suggestions: [],
        sessions: allSessions(database),
        outcomes: allOutcomes(database),
        reflections: allReflections(database),
      };
    },
  };
}

function buildSuggestions(
  facts: MemoryFact[],
  reflections: LearningReflectionRecord[] = [],
  input: MemorySuggestionInput,
): MemorySuggestion[] {
  const factSuggestions = facts
    .filter((fact) => fact.confidence >= 0.7)
    .filter((fact) => factApplies(fact, input))
    .map((fact) => ({
      key: fact.key,
      title: suggestionTitle(fact),
      reason: suggestionReason(fact, input),
      value: clone(fact.value),
      confidence: fact.confidence,
      requiresConfirmation: true,
      applied: false,
    }));

  const reflectionSuggestions: MemorySuggestion[] = reflections
    .filter((r) => r.lessonsLearned && r.lessonsLearned.trim().length > 0)
    .filter((r) => !input.taskMode || r.taskMode === input.taskMode || r.taskMode === "general")
    .slice(0, 3)
    .map((r) => {
      const shortSummary = r.taskSummary ? r.taskSummary.slice(0, 60) : "Previous session";
      const key = `lesson:${r.taskMode}:${r.id.slice(0, 8)}`;
      const avoids =
        r.wrongPathsEncountered && r.wrongPathsEncountered.length > 0
          ? ` Cần tránh: ${r.wrongPathsEncountered.slice(0, 2).join("; ")}.`
          : "";
      return {
        key,
        title: `💡 [Bài học kinh nghiệm] ${shortSummary}`,
        reason: `Bài học từ phiên trước: "${r.lessonsLearned.slice(0, 160)}${r.lessonsLearned.length > 160 ? "..." : ""}". Phương pháp đúng: "${r.correctApproach.slice(0, 100)}".${avoids}`,
        value: {
          reflectionId: r.id,
          taskMode: r.taskMode,
          lessonsLearned: r.lessonsLearned,
          correctApproach: r.correctApproach,
          wrongPathsEncountered: r.wrongPathsEncountered,
        },
        confidence: 0.95,
        requiresConfirmation: false,
        applied: true,
      };
    });

  return [...factSuggestions, ...reflectionSuggestions];
}

function factApplies(fact: MemoryFact, input: MemorySuggestionInput): boolean {
  if (fact.kind === "verification-default") {
    return true;
  }

  if (fact.kind === "workflow-default") {
    const skillId = fact.value.skillId;
    return typeof skillId === "string" && !input.workflowSkillIds.includes(skillId);
  }

  if (fact.kind === "task-mode-default") {
    return fact.value.taskMode === input.taskMode;
  }

  return false;
}

function suggestionTitle(fact: MemoryFact): string {
  if (fact.kind === "verification-default") {
    return "Apply remembered verification gate";
  }
  if (fact.kind === "workflow-default") {
    return "Apply remembered workflow preference";
  }
  return "Apply remembered operating preference";
}

function suggestionReason(fact: MemoryFact, input: MemorySuggestionInput): string {
  const project = input.projectFingerprint ? ` for ${input.projectFingerprint}` : "";
  return `Memory fact '${fact.key}' matched task mode '${input.taskMode}'${project}. Confirmation is required before applying it.`;
}

function normalizeFact(input: MemoryFactInput, existing?: MemoryFact): MemoryFact {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? randomUUID(),
    kind: input.kind,
    key: input.key,
    value: clone(input.value),
    confidence: input.confidence,
    source: input.source,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function factByKey(database: import("node:sqlite").DatabaseSync, key: string): MemoryFact | undefined {
  const row = database.prepare("SELECT * FROM memory_facts WHERE key = ?").get(key) as SqliteFactRow | undefined;
  return row ? rowToFact(row) : undefined;
}

function allFacts(database: import("node:sqlite").DatabaseSync): MemoryFact[] {
  return (database.prepare("SELECT * FROM memory_facts ORDER BY updated_at DESC").all() as unknown as SqliteFactRow[]).map(
    rowToFact,
  );
}

function allDecisions(database: import("node:sqlite").DatabaseSync): MemoryDecision[] {
  return (
    database.prepare("SELECT * FROM memory_decisions ORDER BY created_at DESC").all() as unknown as SqliteDecisionRow[]
  ).map((row) => ({
    suggestionKey: row.suggestion_key,
    decision: row.decision === "accepted" ? "accepted" : "rejected",
    ...(row.reason ? { reason: row.reason } : {}),
  }));
}

function allSessions(database: import("node:sqlite").DatabaseSync): OrchestrationSessionRecord[] {
  return (
    database
      .prepare("SELECT * FROM orchestration_sessions ORDER BY updated_at DESC")
      .all() as unknown as SqliteSessionRow[]
  ).map((row) => ({
    id: row.id,
    state: row.state,
    message: row.message,
    taskMode: row.task_mode,
    route: JSON.parse(row.route_json) as Record<string, unknown>,
    questions: JSON.parse(row.questions_json) as unknown[],
    answers: JSON.parse(row.answers_json) as Record<string, string>,
    memorySuggestions: JSON.parse(row.memory_suggestions_json) as MemorySuggestion[],
    finalWorkflow: JSON.parse(row.final_workflow_json) as unknown[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function allOutcomes(database: import("node:sqlite").DatabaseSync): WorkflowOutcomeRecord[] {
  return (
    database.prepare("SELECT * FROM workflow_outcomes ORDER BY created_at DESC").all() as unknown as SqliteOutcomeRow[]
  ).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    taskMode: row.task_mode,
    workflow: JSON.parse(row.workflow_json) as unknown[],
    verification: JSON.parse(row.verification_json) as WorkflowOutcomeRecord["verification"],
    outcome: row.outcome,
    createdAt: row.created_at,
  }));
}

interface SqliteFactRow {
  id: string;
  kind: string;
  key: string;
  value_json: string;
  confidence: number;
  source: string;
  created_at: string;
  updated_at: string;
}

interface SqliteDecisionRow {
  suggestion_key: string;
  decision: string;
  reason: string | null;
}

interface SqliteSessionRow {
  id: string;
  state: string;
  message: string;
  task_mode: string;
  route_json: string;
  questions_json: string;
  answers_json: string;
  memory_suggestions_json: string;
  final_workflow_json: string;
  created_at: string;
  updated_at: string;
}

interface SqliteOutcomeRow {
  id: string;
  session_id: string;
  task_mode: string;
  workflow_json: string;
  verification_json: string;
  outcome: string;
  created_at: string;
}

interface SqliteReflectionRow {
  id: string;
  session_id: string | null;
  task_mode: string;
  task_summary: string;
  correct_approach: string;
  wrong_paths_json: string;
  skills_evaluated_json: string;
  lessons_learned: string;
  created_at: string;
}

function allReflections(database: import("node:sqlite").DatabaseSync): LearningReflectionRecord[] {
  return (
    database.prepare("SELECT * FROM learning_reflections ORDER BY created_at DESC").all() as unknown as SqliteReflectionRow[]
  ).map((row) => ({
    id: row.id,
    sessionId: row.session_id ?? undefined,
    taskMode: row.task_mode,
    taskSummary: row.task_summary,
    correctApproach: row.correct_approach,
    wrongPathsEncountered: JSON.parse(row.wrong_paths_json || "[]") as string[],
    skillsEvaluated: JSON.parse(row.skills_evaluated_json || "[]") as LearningReflectionRecord["skillsEvaluated"],
    lessonsLearned: row.lessons_learned,
    createdAt: row.created_at,
  }));
}

function rowToFact(row: SqliteFactRow): MemoryFact {
  return {
    id: row.id,
    kind: row.kind,
    key: row.key,
    value: JSON.parse(row.value_json) as Record<string, unknown>,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fallback for non-serializable objects
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
