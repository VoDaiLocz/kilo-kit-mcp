import type { RouteIntentResult, RouteWorkflowStep, SkillRecord } from "./types.js";

export type OrchestrationState =
  | "new"
  | "routed_internal"
  | "brainstorming_required"
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
  feedback?: string;
}

export interface LearningReflectionInput {
  sessionId?: string;
  taskMode: string;
  taskSummary: string;
  correctApproach: string;
  wrongPathsEncountered: string[];
  skillsEvaluated?: SkillScoreInput[];
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
