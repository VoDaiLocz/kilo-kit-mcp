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

export interface CognitiveToolMetadata {
  thoughtLength?: number;
  isSuperficial?: boolean;
  riskScore?: number;
  planLength?: number;
  errorLogLength?: number;
}

export interface KiloOrchestrator {
  orchestrate(input: OrchestrationInput): OrchestrationResult;
  getSession(sessionId: string): OrchestrationSession | undefined;
  isSessionReady(sessionId?: string): { ready: boolean; state: OrchestrationState | "missing"; reason?: string };
  recordCognitiveTool(sessionId: string, toolName: string, meta?: CognitiveToolMetadata): void;
}

export interface OrchestrationSession {
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
  cognitiveToolsUsed: Set<string>;
  cognitiveMeta: Map<string, CognitiveToolMetadata>;
}

export function createOrchestrator(options: CreateOrchestratorOptions): KiloOrchestrator {
  const sessions = new Map<string, OrchestrationSession>();
  const audit = options.audit ?? createNoopOrchestrationAudit();

  return {
    getSession(sessionId: string) {
      return sessions.get(sessionId);
    },
    recordCognitiveTool(sessionId: string, toolName: string, meta?: CognitiveToolMetadata) {
      const session = sessions.get(sessionId);
      if (session) {
        session.cognitiveToolsUsed.add(toolName);
        if (meta) {
          session.cognitiveMeta.set(toolName, meta);
        }
      }
    },
    isSessionReady(sessionId?: string) {
      if (!sessionId) {
        return {
          ready: false,
          state: "missing",
          reason: "No sessionId provided. You must call kilo_orchestrate_task to obtain a valid sessionId before writing/editing files or executing commands.",
        };
      }
      const session = sessions.get(sessionId);
      if (!session) {
        return {
          ready: false,
          state: "missing",
          reason: `Session '${sessionId}' not found. You must initialize the task with kilo_orchestrate_task first.`,
        };
      }
      const suggestions = ensureMemorySuggestions(options.memory, session);
      const pendingSuggestions = suggestions.filter(
        (suggestion) => session.memoryConfirmations[suggestion.key] === undefined,
      );
      const state = selectState(session, pendingSuggestions);
      if (state === "brainstorming_required") {
        return {
          ready: false,
          state,
          reason: `Session '${sessionId}' is in state 'brainstorming_required'. You must get user approval (brainstormingApproved=true) via kilo_orchestrate_task before code modification or command execution.`,
        };
      }
      if (state === "awaiting_memory_confirmation") {
        return {
          ready: false,
          state,
          reason: `Session '${sessionId}' is awaiting memory confirmation. Accept or reject memory suggestions via kilo_orchestrate_task before proceeding.`,
        };
      }
      if (state === "cognitive_required") {
        const cognitiveGate = checkCognitiveGate(session);
        return {
          ready: false,
          state: "cognitive_required",
          reason: cognitiveGate.reason,
        };
      }
      return { ready: true, state: "ready" };
    },
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
    cognitiveToolsUsed: new Set<string>(),
    cognitiveMeta: new Map<string, CognitiveToolMetadata>(),
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
  if (isSubstantiveWork(session)) {
    const cognitiveGate = checkCognitiveGate(session);
    if (!cognitiveGate.passed) {
      return "cognitive_required";
    }
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
  if (state === "cognitive_required") {
    const req = COGNITIVE_REQUIREMENTS[session.route.taskMode] ?? {
      required: ["kilo_think_step", "kilo_grill_plan"],
      label: session.route.taskMode || "development",
    };
    const missing = req.required.filter((tool) => !session.cognitiveToolsUsed.has(tool));
    const toolList = missing.map((t) => `\`${t}\``).join(" and ");
    return [
      `[COGNITIVE REASONING GATE] Brainstorming approved, but cognitive reasoning is mandatory before writing code or running commands.`,
      `You MUST call ${toolList} with sessionId "${session.sessionId}".`,
      `CRITICAL RULE: Do NOT use native tools (ListDir, Search, Find, grep_search, view_file, Edit, Bash). Use ONLY Kilo-Kit tools (kilo_read_file, kilo_search_files, kilo_grep_code, kilo_write_file, kilo_edit_file, kilo_run_command), and ALWAYS pass sessionId: "${session.sessionId}".`,
    ].join("\n");
  }
  if (state === "ready") {
    const workflow = executableWorkflow(session);
    if (workflow.length > 0) {
      const order = workflow.map((step) => step.skill.id).join(" -> ");
      const stepLines = workflow
        .map((step, idx) => `${idx + 1}. [${step.role}] ${step.skill.id}: ${step.reason}`)
        .join("\n");
      return [
        `[ALL GATES PASSED - READY TO EXECUTE]`,
        `Load skills in workflow order: ${order}. Start with ${workflow[0]?.skill.id} using kilo_get_skill.`,
        `Execute the workflow steps in order:`,
        stepLines,
        `CRITICAL RULE: Do NOT use native tools (ListDir, Search, Find, grep_search, view_file, Edit, Bash). Use ONLY Kilo-Kit tools (kilo_read_file, kilo_search_files, kilo_grep_code, kilo_write_file, kilo_edit_file, kilo_run_command) with sessionId: "${session.sessionId}".`,
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
  return /\b(status|show|read|explain|what is|what's|la sao|là sao|giải thích|là gì|list|view|inspect|describe|check|compare|search|kiểm tra|xem)\b/i.test(message);
}

function toJsonObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toJsonArray(value: unknown): unknown[] {
  return JSON.parse(JSON.stringify(value)) as unknown[];
}

// ---------------------------------------------------------------------------
// Cognitive Gate — enforced at MCP protocol level (not markdown hints)
// ---------------------------------------------------------------------------

const COGNITIVE_REQUIREMENTS: Record<string, { required: string[]; label: string }> = {
  "bug":                   { required: ["kilo_trace_root_cause"],                           label: "bug fix" },
  "bug-test-first":        { required: ["kilo_trace_root_cause"],                           label: "bug fix with TDD" },
  "feature-build":         { required: ["kilo_think_step", "kilo_grill_plan"],              label: "feature build" },
  "workflow-optimization": { required: ["kilo_think_step", "kilo_grill_plan"],              label: "workflow optimization" },
  "architecture":          { required: ["kilo_think_step", "kilo_grill_plan"],              label: "architecture" },
  "ui":                    { required: ["kilo_think_step", "kilo_grill_plan"],              label: "UI & frontend design" },
  "mcp":                   { required: ["kilo_think_step", "kilo_grill_plan"],              label: "MCP development" },
  "spec":                  { required: ["kilo_think_step", "kilo_grill_plan"],              label: "spec planning" },
  "security":              { required: ["kilo_trace_root_cause", "kilo_grill_plan"],        label: "security hardening" },
  "backend-api":           { required: ["kilo_think_step", "kilo_grill_plan"],              label: "backend API development" },
  "research":              { required: ["kilo_think_step", "kilo_grill_plan"],              label: "deep research & data synthesis" },
  "general":               { required: ["kilo_think_step", "kilo_grill_plan"],              label: "general development" },
};

function checkCognitiveGate(session: OrchestrationSession): { passed: boolean; reason: string } {
  const req = COGNITIVE_REQUIREMENTS[session.route.taskMode] ?? {
    required: ["kilo_think_step", "kilo_grill_plan"],
    label: session.route.taskMode || "development",
  };

  // 1. Substance validation: verify that think_step (if called) was not just a placeholder
  const thinkMeta = session.cognitiveMeta.get("kilo_think_step");
  if (thinkMeta && thinkMeta.isSuperficial) {
    return {
      passed: false,
      reason: `[KILO-KIT COGNITIVE GATE] Thought submitted to kilo_think_step was superficial or placeholder (< 30 chars). You must articulate a substantive 3-option Trade-Off DAG (comparing Option A, Option B, and Option C with pros/cons/blast-radius) before code modification is unlocked.`,
    };
  }

  // 2. Substance validation: verify that grill_plan (if called) received a real plan
  const grillMeta = session.cognitiveMeta.get("kilo_grill_plan");
  if (grillMeta && grillMeta.planLength !== undefined && grillMeta.planLength < 30) {
    return {
      passed: false,
      reason: `[KILO-KIT COGNITIVE GATE] Plan submitted to kilo_grill_plan was too brief (< 30 chars). Provide a concrete architecture or implementation plan for adversarial red-teaming.`,
    };
  }

  // 3. Required tools presence check
  const missing = req.required.filter((tool) => !session.cognitiveToolsUsed.has(tool));
  if (missing.length > 0) {
    const toolList = missing.map((t) => `\`${t}\``).join(" and ");
    return {
      passed: false,
      reason: `[KILO-KIT COGNITIVE GATE] Task mode '${session.route.taskMode}' (${req.label}) requires ${toolList} before writing or executing code. Call ${toolList} with the current plan/error, then retry.`,
    };
  }

  return { passed: true, reason: "" };
}
