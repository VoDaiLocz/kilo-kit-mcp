import type {
  RouteDecisionEntry,
  RouteIntentInput,
  RouteIntentResult,
  RouteRecommendation,
  RouteWorkflowStep,
  SkillRecord,
} from "./types.js";
import type { SkillRegistry } from "./registry.js";
import type { RouteAnalyticsStore } from "./route-analytics.js";
import {
  analyzeIntent,
  explainRoute,
  RULE_HIERARCHY,
  scoreSkillForRoute,
  workflowForMode,
  type RouteCandidate,
} from "./routing-policy.js";

export interface RouteIntentOptions {
  analytics?: RouteAnalyticsStore;
}

export function routeIntent(
  registry: SkillRegistry,
  input: RouteIntentInput,
  options: RouteIntentOptions = {},
): RouteIntentResult {
  const profile = analyzeIntent(input);
  const limit = Math.max(1, Math.min(input.limit ?? 5, 10));
  const ranked = registry
    .listSkills()
    .map((skill) => applyAnalyticsAdjustment(scoreSkillForRoute(skill, input, profile), profile.mode, options.analytics))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id));

  const recommended: RouteRecommendation[] = ranked.slice(0, limit).map((candidate, index) => ({
    skill: candidate.skill,
    confidence: Math.max(0.1, Math.min(0.99, candidate.score / (candidate.score + 18 + index * 3))),
    reason: candidate.reason,
    score: candidate.score,
  }));

  const workflow = buildWorkflow(registry, profile.mode, ranked);
  const decisionTrail = ranked.slice(0, 10).map<RouteDecisionEntry>((candidate) => ({
    skillId: candidate.skill.id,
    score: candidate.score,
    matchedSignals: candidate.matchedSignals,
    scoreBreakdown: candidate.scoreBreakdown,
    reason: candidate.reason,
  }));

  const result = {
    recommended,
    taskMode: profile.mode,
    workflow,
    ruleHierarchy: RULE_HIERARCHY,
    decisionTrail,
    nextAction: buildNextAction(recommended, workflow),
  };

  options.analytics?.record({
    timestamp: new Date().toISOString(),
    message: input.message,
    taskMode: result.taskMode,
    recommendedSkillIds: recommended.map((item) => item.skill.id),
    workflowSkillIds: workflow.map((step) => step.skill.id),
    decisionTrail,
  });

  return result;
}

function applyAnalyticsAdjustment(
  candidate: RouteCandidate,
  taskMode: string,
  analytics: RouteAnalyticsStore | undefined,
): RouteCandidate {
  const adjustment = analytics?.scoreAdjustment(candidate.skill.id, taskMode) ?? 0;
  if (adjustment <= 0) {
    return candidate;
  }

  const scoreBreakdown = { ...candidate.scoreBreakdown, analytics: adjustment };
  return {
    ...candidate,
    score: candidate.score + adjustment,
    scoreBreakdown,
    reason: explainRoute(candidate.skill, taskMode, candidate.matchedSignals, scoreBreakdown),
  };
}

function buildWorkflow(registry: SkillRegistry, mode: string, ranked: RouteCandidate[]): RouteWorkflowStep[] {
  const workflowDefinition = workflowForMode(mode);

  if (workflowDefinition.length === 0) {
    return ranked.slice(0, 1).map((candidate) => ({
      skill: candidate.skill,
      role: "primary",
      reason: "Best available skill from metadata and signal scoring.",
    }));
  }

  return workflowDefinition
    .map((step) => {
      const skill = findSkillById(registry, step.id);
      return skill ? { skill, role: step.role, reason: step.reason } : null;
    })
    .filter((step): step is RouteWorkflowStep => step !== null);
}

function findSkillById(registry: SkillRegistry, id: string): SkillRecord | undefined {
  if (!id) {
    return undefined;
  }

  try {
    return registry.getSkill(id);
  } catch {
    return undefined;
  }
}

function buildNextAction(recommended: RouteRecommendation[], workflow: RouteWorkflowStep[]): string {
  if (workflow.length > 0) {
    const workflowOrder = workflow.map((step) => step.skill.id).join(" -> ");
    return `Load skills in workflow order: ${workflowOrder}. Start with ${workflow[0]?.skill.id} using kilo_get_skill.`;
  }

  return recommended[0]
    ? `Load ${recommended[0].skill.id} with kilo_get_skill before executing the workflow.`
    : "No strong skill match found. Search with more specific task keywords or inspect skills/SKILLS_INDEX.md.";
}
