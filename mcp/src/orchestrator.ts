import { randomUUID } from "node:crypto";

import type { OrchestrationAuditWriter } from "./orchestration-audit.js";
import { createNoopOrchestrationAudit } from "./orchestration-audit.js";
import type { OrchestrationMemoryStore } from "./orchestration-memory.js";
import type {
  MemorySuggestion,
  OrchestrationInput,
  OrchestrationResult,
  OrchestrationState,
  VerificationGate,
} from "./orchestration-types.js";
import type { SkillRegistry } from "./registry.js";
import { routeIntent } from "./router.js";
import type { RouteIntentResult, RouteWorkflowStep, SkillRecord } from "./types.js";

export interface CreateOrchestratorOptions {
  registry: SkillRegistry;
  memory: OrchestrationMemoryStore;
  audit?: OrchestrationAuditWriter;
}

export interface KiloOrchestrator {
  orchestrate(input: OrchestrationInput): OrchestrationResult;
}

interface OrchestrationSession {
  sessionId: string;
  message: string;
  createdAt: string;
  route: RouteIntentResult;
  workflow: RouteWorkflowStep[];
  brainstormingApproved: boolean;
  answers: Record<string, string>;
  memorySuggestions: MemorySuggestion[];
  memoryConfirmations: Record<string, "accepted" | "rejected">;
  context?: OrchestrationInput["context"];
}

export function createOrchestrator(options: CreateOrchestratorOptions): KiloOrchestrator {
  const sessions = new Map<string, OrchestrationSession>();
  const audit = options.audit ?? createNoopOrchestrationAudit();

  return {
    orchestrate(input) {
      const session = getOrCreateSession(sessions, options.registry, input);
      mergeInput(session, input);

      const missingInfo: string[] = [];
      const suggestions = ensureMemorySuggestions(options.memory, session);
      const pendingSuggestions = suggestions.filter(
        (suggestion) => session.memoryConfirmations[suggestion.key] === undefined,
      );
      const acceptedSuggestions = suggestions.filter(
        (suggestion) => session.memoryConfirmations[suggestion.key] === "accepted",
      );

      const state = selectState(session, pendingSuggestions);
      for (const [suggestionKey, decision] of Object.entries(input.memoryConfirmations ?? {})) {
        options.memory.recordDecision({ suggestionKey, decision });
      }

      const verificationGate = buildVerificationGate(acceptedSuggestions, session);
      const finalWorkflow = state === "ready" ? executableWorkflow(session) : undefined;
      const firstSkillToLoad =
        state === "brainstorming_required" ? findSkillById(options.registry, "productivity/brainstorming") : finalWorkflow?.[0]?.skill;
      const nextAction = buildNextAction(state, session, pendingSuggestions, firstSkillToLoad);
      persistSession(options.memory, session, state, verificationGate, finalWorkflow);
      const auditRef = audit.record({
        sessionId: session.sessionId,
        state,
        taskMode: session.route.taskMode,
        message: session.message,
        nextAction,
      });

      return {
        sessionId: session.sessionId,
        state,
        message: session.message,
        taskMode: session.route.taskMode,
        questions: [],
        missingInfo,
        route: session.route,
        workflow: session.workflow,
        memorySuggestions: suggestions,
        ...(finalWorkflow ? { finalWorkflow } : {}),
        ...(firstSkillToLoad ? { firstSkillToLoad } : {}),
        verificationGate,
        nextAction,
        ...(auditRef ? { auditRef } : {}),
      };
    },
  };
}

function getOrCreateSession(
  sessions: Map<string, OrchestrationSession>,
  registry: SkillRegistry,
  input: OrchestrationInput,
): OrchestrationSession {
  if (input.sessionId && sessions.has(input.sessionId)) {
    return sessions.get(input.sessionId)!;
  }

  const route = routeIntent(registry, {
    message: input.message,
    ...(input.context
      ? {
          context: {
            ...(input.context.files ? { files: input.context.files } : {}),
            ...(input.context.mode ? { mode: input.context.mode } : {}),
            ...(input.context.previousErrors ? { previousErrors: input.context.previousErrors } : {}),
          },
        }
      : {}),
    limit: 5,
  });
  const workflow = ensureBrainstormingFirst(registry, route.workflow, input);
  const session: OrchestrationSession = {
    sessionId: input.sessionId ?? randomUUID(),
    message: input.message,
    createdAt: new Date().toISOString(),
    route,
    workflow,
    brainstormingApproved: input.brainstormingApproved === true,
    answers: {},
    memorySuggestions: [],
    memoryConfirmations: {},
    ...(input.context ? { context: input.context } : {}),
  };

  sessions.set(session.sessionId, session);
  return session;
}

function persistSession(
  memory: OrchestrationMemoryStore,
  session: OrchestrationSession,
  state: OrchestrationState,
  verificationGate: VerificationGate,
  finalWorkflow: RouteWorkflowStep[] | undefined,
): void {
  const now = new Date().toISOString();
  memory.recordSession({
    id: session.sessionId,
    state,
    message: session.message,
    taskMode: session.route.taskMode,
    route: toJsonObject(session.route),
    questions: [],
    answers: { ...session.answers },
    memorySuggestions: session.memorySuggestions.map((suggestion) => ({ ...suggestion })),
    finalWorkflow: toJsonArray(finalWorkflow ?? []),
    createdAt: session.createdAt,
    updatedAt: now,
  });

  if (state === "ready" && finalWorkflow) {
    memory.recordOutcome({
      id: randomUUID(),
      sessionId: session.sessionId,
      taskMode: session.route.taskMode,
      workflow: toJsonArray(finalWorkflow),
      verification: verificationGate,
      outcome: "workflow-released",
      createdAt: now,
    });
  }
}

function mergeInput(session: OrchestrationSession, input: OrchestrationInput): void {
  session.message = input.message || session.message;
  session.answers = { ...session.answers, ...(input.answers ?? {}) };
  session.brainstormingApproved = session.brainstormingApproved || input.brainstormingApproved === true;
  session.memoryConfirmations = { ...session.memoryConfirmations, ...(input.memoryConfirmations ?? {}) };
  if (input.context) {
    session.context = input.context;
  }
}

function ensureMemorySuggestions(
  memory: OrchestrationMemoryStore,
  session: OrchestrationSession,
): MemorySuggestion[] {
  if (session.memorySuggestions.length > 0) {
    return session.memorySuggestions;
  }

  session.memorySuggestions = memory.suggest({
    taskMode: session.route.taskMode,
    workflowSkillIds: session.workflow.map((step) => step.skill.id),
    ...(session.context?.projectFingerprint ? { projectFingerprint: session.context.projectFingerprint } : {}),
  });
  return session.memorySuggestions;
}

function selectState(
  session: OrchestrationSession,
  pendingSuggestions: MemorySuggestion[],
): OrchestrationState {
  if (isSubstantiveWork(session) && !session.brainstormingApproved) {
    return "brainstorming_required";
  }
  if (pendingSuggestions.length > 0) {
    return "awaiting_memory_confirmation";
  }
  return "ready";
}

function ensureBrainstormingFirst(
  registry: SkillRegistry,
  workflow: RouteWorkflowStep[],
  input: OrchestrationInput,
): RouteWorkflowStep[] {
  const existing = workflow.filter((step) => step.skill.id !== "productivity/brainstorming");
  const brainstorming = findSkillById(registry, "productivity/brainstorming");
  if (!brainstorming) {
    return workflow;
  }

  const step = {
    skill: brainstorming,
    role: "prepare" as const,
    reason: "Load and follow the real /brainstorming skill before substantive work.",
  };

  if (input.context?.mode === "brainstorming" || /\bbrainstorm(?:ing)?\b/i.test(input.message)) {
    return [step, ...existing];
  }

  if (isReadOnlyRequest(input.message)) {
    return workflow;
  }

  return [step, ...existing];
}

function findSkillById(registry: SkillRegistry, id: string): SkillRecord | undefined {
  const [category, skill] = id.split("/");
  if (!category || !skill) {
    return undefined;
  }

  try {
    return registry.getSkill(category, skill);
  } catch {
    return undefined;
  }
}

function buildVerificationGate(
  acceptedSuggestions: MemorySuggestion[],
  session?: OrchestrationSession,
): VerificationGate {
  const commands = acceptedSuggestions.flatMap((suggestion) => {
    const commands = suggestion.value.commands;
    return Array.isArray(commands) ? commands.filter((command): command is string => typeof command === "string") : [];
  });

  if (commands.length > 0) {
    return {
      commands: [...new Set(commands)],
      reason: "Memory-confirmed verification commands must pass before completion.",
    };
  }

  const files = session?.context?.files ?? [];
  const projectCommands: string[] = [];

  if (files.some((f) => /package\.json|package-lock\.json|\.tsx?$|\.jsx?$/.test(f))) {
    projectCommands.push("npm test");
  } else if (files.some((f) => /pyproject\.toml|requirements\.txt|setup\.py|\.py$/.test(f))) {
    projectCommands.push("pytest");
  } else if (files.some((f) => /Cargo\.toml|\.rs$/.test(f))) {
    projectCommands.push("cargo test");
  } else if (files.some((f) => /go\.mod|\.go$/.test(f))) {
    projectCommands.push("go test ./...");
  }

  return {
    commands: projectCommands,
    reason:
      projectCommands.length > 0
        ? "Inferred project verification commands before completion."
        : "Run the project's native verification commands (test, lint, typecheck) before completion.",
  };
}

function buildNextAction(
  state: OrchestrationState,
  session: OrchestrationSession,
  pendingSuggestions: MemorySuggestion[],
  firstSkillToLoad: SkillRecord | undefined,
): string {
  if (state === "brainstorming_required") {
    return "Load productivity/brainstorming with kilo_get_skill, follow its hard-gate, get user approval, then call kilo_orchestrate_task again with brainstormingApproved=true.";
  }
  if (state === "awaiting_memory_confirmation") {
    return `Accept or reject memory suggestions before execution: ${pendingSuggestions.map((item) => item.key).join(", ")}.`;
  }
  if (state === "ready") {
    const workflow = executableWorkflow(session);
    if (workflow.length > 0) {
      const order = workflow.map((step) => step.skill.id).join(" -> ");
      const stepLines = workflow
        .map((step, idx) => `${idx + 1}. [${step.role}] ${step.skill.id}: ${step.reason}`)
        .join("\n");
      return [
        `Load skills in workflow order: ${order}. Start with ${workflow[0]?.skill.id} using kilo_get_skill.`,
        `Execute the workflow steps in order:`,
        stepLines,
        `Satisfy the verification gate before claiming completion.`,
      ].join("\n");
    }
  }
  if (firstSkillToLoad) {
    return `Load ${firstSkillToLoad.id} with kilo_get_skill, then follow the final workflow.`;
  }
  return session.route.nextAction;
}

function executableWorkflow(session: OrchestrationSession): RouteWorkflowStep[] {
  if (!session.brainstormingApproved) {
    return session.workflow;
  }

  return session.workflow.filter((step) => step.skill.id !== "productivity/brainstorming");
}

function isSubstantiveWork(session: OrchestrationSession): boolean {
  return !isReadOnlyRequest(session.message);
}

function isReadOnlyRequest(message: string): boolean {
  if (
    /(fix|sửa|build|tạo|thêm|add|implement|refactor|write|viết|update|cập nhật|change|thay đổi|delete|remove|xóa|install|cài|tối ưu|chậm|rối|bảo trì|tách|lỗ hổng|rò rỉ|test)/i.test(
      message,
    )
  ) {
    return false;
  }
  return /\b(status|show|read|explain|what is|what's|la sao|là sao|giải thích|là gì)\b/i.test(message);
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toJsonArray(value: unknown): unknown[] {
  return JSON.parse(JSON.stringify(value)) as unknown[];
}
