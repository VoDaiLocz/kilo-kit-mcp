import type { RouteIntentResult, RouteWorkflowStep, SkillRecord } from "./types.js";

export type OrchestrationState =
  | "new"
  | "routed_internal"
  | "brainstorming_required"
  | "cognitive_required"
  | "questioning"
  | "memory_check"
  | "awaiting_memory_confirmation"
  | "ready"
  | "blocked";

export type QuestionKind = "text" | "choice" | "confirmation";

export interface OrchestrationQuestion {
  id: string;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  category?: string;
  skillId?: string;
  choices?: string[];
}

export interface QuestionTemplate {
  id: string;
  label: string;
  questions: OrchestrationQuestion[];
}

export interface QuestionTemplateInput {
  taskMode: string;
  workflowSkillIds: string[];
  recommendedSkillIds: string[];
}

export interface MemoryFactInput {
  kind: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string;
}

export interface MemoryFact extends MemoryFactInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySuggestion {
  key: string;
  title: string;
  reason: string;
  value: Record<string, unknown>;
  confidence: number;
  requiresConfirmation: boolean;
  applied: boolean;
}

export interface MemorySuggestionInput {
  taskMode: string;
  workflowSkillIds: string[];
  projectFingerprint?: string;
}

export interface MemoryDecision {
  suggestionKey: string;
  decision: "accepted" | "rejected";
  reason?: string;
}

export interface SkillScoreInput {
  skillId: string;
  score: number;
  feedback?: string | undefined;
}

export interface LearningReflectionInput {
  sessionId?: string | undefined;
  taskMode: string;
  taskSummary: string;
  correctApproach: string;
  wrongPathsEncountered: string[];
  skillsEvaluated?: SkillScoreInput[] | undefined;
  lessonsLearned: string;
}

export interface LearningReflectionRecord extends LearningReflectionInput {
  id: string;
  createdAt: string;
}

export interface MemoryReport {
  facts: MemoryFact[];
  decisions: MemoryDecision[];
  suggestions: MemorySuggestion[];
  sessions: OrchestrationSessionRecord[];
  outcomes: WorkflowOutcomeRecord[];
  reflections: LearningReflectionRecord[];
}

export interface OrchestrationSessionRecord {
  id: string;
  state: string;
  message: string;
  taskMode: string;
  route: Record<string, unknown>;
  questions: unknown[];
  answers: Record<string, string>;
  memorySuggestions: MemorySuggestion[];
  finalWorkflow: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowOutcomeRecord {
  id: string;
  sessionId: string;
  taskMode: string;
  workflow: unknown[];
  verification: VerificationGate;
  outcome: string;
  createdAt: string;
}

export interface VerificationGate {
  commands: string[];
  reason: string;
}

export type CircuitBreakerState = "CLOSED" | "HALF_OPEN" | "OPEN";

export interface SentinelInspectionResult {
  allowed: boolean;
  circuitState: CircuitBreakerState;
  code?: "CIRCUIT_BREAKER_OPEN" | "PREFLIGHT_GROUNDING_VIOLATION" | "EDIT_THRASHING_LOOP_DETECTED" | "EXACT_REPETITION_TRIPPED" | "STEP_BUDGET_EXHAUSTED" | undefined;
  reason?: string | undefined;
  suggestedAction?: string | undefined;
}

export interface SentinelSessionStatus {
  sessionId: string;
  circuitState: CircuitBreakerState;
  tripReason?: string | undefined;
  stepsRecorded: number;
  maxStepBudget: number;
  consecutiveFailures: number;
  groundedFiles: string[];
  totalProbes: number;
}

export interface TrajectoryInput {
  sessionId: string;
  stepNumber: number;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolArgsHash: string;
  toolResultSummary: string;
  status: "success" | "failure" | "blocked" | "tripped";
  durationMs: number;
  sentinelVerdict?: Record<string, unknown> | undefined;
}

export interface TrajectoryRecord extends TrajectoryInput {
  id: string;
  createdAt: string;
}

export interface CheckpointInput {
  sessionId: string;
  checkpointName: string;
  state: string;
  groundedFiles: string[];
  circuitBreakerState: CircuitBreakerState;
  metadata?: Record<string, unknown> | undefined;
}

export interface CheckpointRecord extends CheckpointInput {
  id: string;
  createdAt: string;
}

export interface BenchmarkReport {
  sessionId: string;
  verdict: "ALIGNED" | "REPLAN_TRIGGERED";
  summary: string;
  keyDifferences: string[];
  recommendations: string[];
  suggestedSkills: string[];
  timestamp: string;
}

export interface OrchestrationInput {
  message: string;
  context?: {
    files?: string[];
    mode?: string;
    previousErrors?: string;
    projectFingerprint?: string;
  };
  sessionId?: string;
  brainstormingApproved?: boolean;
  answers?: Record<string, string>;
  memoryConfirmations?: Record<string, "accepted" | "rejected">;
}

export interface OrchestrationResult {
  sessionId: string;
  state: OrchestrationState;
  message: string;
  taskMode: string;
  questions: OrchestrationQuestion[];
  missingInfo: string[];
  route: RouteIntentResult;
  workflow: RouteWorkflowStep[];
  memorySuggestions: MemorySuggestion[];
  finalWorkflow?: RouteWorkflowStep[];
  firstSkillToLoad?: SkillRecord;
  verificationGate: VerificationGate;
  nextAction: string;
  auditRef?: string;
}
