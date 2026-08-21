import type { RouteIntentInput, SkillRecord } from "./types.js";
import { SIGNAL_PATTERNS, SKILL_SIGNAL_WEIGHTS, WORKFLOWS, type WorkflowDefinition } from "./routing-policy-data.js";

export { RULE_HIERARCHY } from "./routing-policy-data.js";

export interface RouteProfile {
  mode: string;
  signals: Set<string>;
}

export interface RouteCandidate {
  skill: SkillRecord;
  score: number;
  matchedSignals: string[];
  scoreBreakdown: Record<string, number>;
  reason: string;
}

export function analyzeIntent(input: RouteIntentInput): RouteProfile {
  const signals = new Set<string>();
  const message = input.message;
  const contextText = [input.context?.mode, input.context?.previousErrors].filter(Boolean).join(" ");
  const files = input.context?.files ?? [];

  for (const { signal, patterns } of SIGNAL_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(message))) {
      signals.add(signal);
    }
  }

  if (/\barchitecture\b/i.test(contextText)) {
    signals.add("architecture");
  }
  if (/\breview\b/i.test(contextText)) {
    signals.add("review");
  }
  if (/\bcoding\b/i.test(contextText) && signals.has("bug-fix")) {
    signals.add("verification");
  }
  if (files.some((file) => file.endsWith(".tsx") || file.endsWith(".jsx"))) {
    signals.add("ui-work");
  }
  if (files.some((file) => /KILO_MASTER|SKILLS_INDEX|router\.ts|SKILL\.md/.test(file))) {
    signals.add("architecture");
    signals.add("context-engineering");
  }

  if (signals.has("review")) {
    return { mode: "review", signals };
  }
  if (signals.has("workflow-optimization")) {
    return { mode: "workflow-optimization", signals };
  }
  if (signals.has("ui-work")) {
    return { mode: "ui", signals };
  }
  if (signals.has("bug-fix") && signals.has("test-first")) {
    return { mode: "bug-test-first", signals };
  }
  if (signals.has("bug-fix")) {
    return { mode: "bug", signals };
  }
  if (signals.has("mcp")) {
    return { mode: "mcp", signals };
  }
  if (signals.has("agent-system")) {
    return { mode: "agent-system", signals };
  }
  if (signals.has("security")) {
    return { mode: "security", signals };
  }
  if (signals.has("spec-planning")) {
    return { mode: "spec", signals };
  }
  if (signals.has("domain-design")) {
    return { mode: "domain-modeling", signals };
  }
  if (signals.has("backend-api")) {
    return { mode: "backend-api", signals };
  }
  if (signals.has("research")) {
    return { mode: "research", signals };
  }
  if (signals.has("feature-build")) {
    return { mode: "feature-build", signals };
  }

  return { mode: "general", signals };
}

export function scoreSkillForRoute(skill: SkillRecord, input: RouteIntentInput, profile: RouteProfile): RouteCandidate {
  const matchedSignals: string[] = [];
  const scoreBreakdown: Record<string, number> = {};
  const policy = SKILL_SIGNAL_WEIGHTS[skill.id] ?? {};

  for (const signal of profile.signals) {
    const signalScore = policy[signal] ?? 0;
    if (signalScore > 0) {
      matchedSignals.push(signal);
      scoreBreakdown[signal] = signalScore;
    }
  }

  const metadataScore = scoreMetadata(skill, input);
  if (metadataScore > 0) {
    scoreBreakdown.metadata = metadataScore;
  }

  const workflowScore = workflowPriorityScore(skill.id, profile.mode);
  if (workflowScore > 0) {
    scoreBreakdown.workflow = workflowScore;
  }

  const penalty = conflictPenalty(skill.id, profile.mode);
  if (penalty < 0) {
    scoreBreakdown.conflict = penalty;
  }

  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);

  return {
    skill,
    score,
    matchedSignals,
    scoreBreakdown,
    reason: explainRoute(skill, profile.mode, matchedSignals, scoreBreakdown),
  };
}

export function workflowForMode(mode: string): WorkflowDefinition[] {
  return WORKFLOWS[mode] ?? [];
}

export function explainRoute(
  skill: SkillRecord,
  mode: string,
  matchedSignals: string[],
  scoreBreakdown: Record<string, number>,
): string {
  const reasons: string[] = [];

  if (matchedSignals.length > 0) {
    reasons.push(`matched ${matchedSignals.join(", ")}`);
  }
  if (scoreBreakdown.workflow) {
    reasons.push(`belongs to the ${mode} workflow`);
  }
  if (scoreBreakdown.metadata) {
    reasons.push("matched skill metadata");
  }
  if (scoreBreakdown.analytics) {
    reasons.push("has positive route analytics");
  }
  if (scoreBreakdown.conflict) {
    reasons.push("received a conflict penalty");
  }

  return reasons.length > 0
    ? `Selected because it ${reasons.join(" and ")}.`
    : `Selected from fallback ranking for ${skill.id}.`;
}

function scoreMetadata(skill: SkillRecord, input: RouteIntentInput): number {
  const query = normalizeText(buildQuery(input));
  if (!query) {
    return 0;
  }

  const haystack = normalizeText([skill.id, skill.title, skill.description, skill.category].join(" "));
  const tokens = query.split(" ").filter((token) => token.length >= 3);
  const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
  const exactBoost = haystack.includes(query) ? 10 : 0;

  return Math.min(18, exactBoost + tokenHits * 2);
}

function workflowPriorityScore(skillId: string, mode: string): number {
  const workflow = workflowForMode(mode);
  const index = workflow.findIndex((step) => step.id === skillId);

  if (index === -1) {
    return 0;
  }

  return 24 - index * 3;
}

function conflictPenalty(skillId: string, mode: string): number {
  if (mode === "review" && (skillId.includes("tdd") || skillId.includes("testing"))) {
    return -45;
  }

  if (mode === "workflow-optimization" && skillId.startsWith("operations/mcp")) {
    return -10;
  }

  return 0;
}

function buildQuery(input: RouteIntentInput): string {
  return [
    input.message,
    input.context?.mode,
    input.context?.previousErrors,
    ...(input.context?.files ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
