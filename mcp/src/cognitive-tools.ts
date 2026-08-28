import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveInsideRepo } from "./paths.js";
import type { SkillRegistry } from "./registry.js";
import { validateSkills } from "./validator.js";

export interface ThinkStepInput {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  isRevision?: boolean | undefined;
  revisesThought?: number | undefined;
  branchFromThought?: number | undefined;
  branchId?: string | undefined;
  hypothesis?: string | undefined;
  sessionId?: string | undefined;
}

export interface ThoughtRecord {
  thoughtNumber: number;
  totalThoughts: number;
  thought: string;
  isRevision: boolean;
  revisesThought?: number | undefined;
  branchFromThought?: number | undefined;
  branchId?: string | undefined;
  hypothesis?: string | undefined;
  timestamp: string;
}

export interface ThinkStepResult {
  currentThought: ThoughtRecord;
  totalRecordedThoughts: number;
  activeBranches: string[];
  chainSummary: string;
  isComplete: boolean;
}

export interface GrillPlanInput {
  plan: string;
  context?: string | undefined;
  depth?: "quick" | "deep" | "hardcore" | undefined;
}

export interface GrillQuestion {
  category: "inversion" | "simplification" | "blast_radius" | "edge_case";
  title: string;
  concern: string;
  stressTestQuestion: string;
  recommendation: string;
}

export interface GrillPlanResult {
  riskScore: number; // 0 - 100
  readinessVerdict: "APPROVED" | "REQUIRES_HARDENING" | "REVISE_ARCHITECTURE";
  summary: string;
  grillQuestions: GrillQuestion[];
  hardeningChecklist: string[];
}

export interface TraceRootCauseInput {
  errorLog: string;
  failingFile?: string | undefined;
  expectedBehavior?: string | undefined;
  actualBehavior?: string | undefined;
}

export interface CausalLevel {
  level: number;
  name: string;
  finding: string;
}

export interface TraceRootCauseResult {
  symptom: string;
  rootCause: string;
  causalChain: CausalLevel[];
  minimalFixRecommendation: string;
  regressionPreventionTest: string;
}

export interface CompactContextInput {
  content: string;
  preserveInvariants?: string[] | undefined;
  targetReduction?: "moderate" | "aggressive" | undefined;
}

export interface CompactContextResult {
  originalBytes: number;
  compactedBytes: number;
  reductionPercentage: number;
  compactedContent: string;
  lockedInvariants: string[];
}

export interface SynthesizeSkillInput {
  skillName: string;
  category?: string | undefined;
  problemDescription: string;
  solutionPattern: string;
  verificationGuidance: string;
  keywords?: string[] | undefined;
}

export interface SynthesizeSkillResult {
  skillId: string;
  skillPath: string;
  status: "created" | "updated";
  validationPassed: boolean;
  message: string;
}

// In-memory cognitive thoughts store per session
// In-memory cognitive thoughts store per session
const sessionThoughts = new Map<string, ThoughtRecord[]>();

export function executeThinkStep(input: ThinkStepInput): ThinkStepResult {
  const sessionKey = input.sessionId ?? "default_session";
  if (!sessionThoughts.has(sessionKey)) {
    sessionThoughts.set(sessionKey, []);
  }

  const thoughts = sessionThoughts.get(sessionKey)!;

  // Anti-superficiality check: detect placeholder or trivial thoughts
  const isSuperficial = input.thought.trim().length < 30 || /^(prepare|ready|next step|file creation|start coding)$/i.test(input.thought.trim());

  const record: ThoughtRecord = {
    thoughtNumber: input.thoughtNumber,
    totalThoughts: input.totalThoughts,
    thought: input.thought,
    isRevision: input.isRevision === true,
    ...(input.revisesThought !== undefined ? { revisesThought: input.revisesThought } : {}),
    ...(input.branchFromThought !== undefined ? { branchFromThought: input.branchFromThought } : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
    ...(input.hypothesis ? { hypothesis: input.hypothesis } : {}),
    timestamp: new Date().toISOString(),
  };

  // If revision, mark or replace
  if (record.isRevision && record.revisesThought) {
    const targetIdx = thoughts.findIndex((t) => t.thoughtNumber === record.revisesThought);
    if (targetIdx >= 0) {
      thoughts[targetIdx] = record;
    } else {
      thoughts.push(record);
    }
  } else {
    thoughts.push(record);
  }

  const branches = [...new Set(thoughts.map((t) => t.branchId).filter(Boolean))] as string[];

  let chainSummary = `Thought ${record.thoughtNumber}/${record.totalThoughts}${
    record.branchId ? ` [Branch: ${record.branchId}]` : ""
  }: ${record.thought.slice(0, 150)}...`;

  if (isSuperficial) {
    chainSummary += " ⚠️ [NOTICE: Thought is brief. Ensure you articulate 3 distinct trade-off options (Option A vs B vs C) before code modification.]";
  }

  return {
    currentThought: record,
    totalRecordedThoughts: thoughts.length,
    activeBranches: branches.length > 0 ? branches : ["main"],
    chainSummary,
    isComplete: !input.nextThoughtNeeded,
  };
}

export function executeGrillPlan(input: GrillPlanInput): GrillPlanResult {
  const depth = input.depth ?? "deep";
  const planText = input.plan.toLowerCase();
  const contextText = (input.context ?? "").toLowerCase();
  const combined = `${planText} ${contextText}`;

  const questions: GrillQuestion[] = [];
  let riskScore = 15; // baseline

  // 1. Inversion / Catastrophic Failure Analysis (Luôn có)
  questions.push({
    category: "inversion",
    title: "Inversion / Catastrophic Failure Analysis",
    concern: "Assumes happy path where dependencies, network, and inputs are always valid.",
    stressTestQuestion:
      "What if input data is corrupted, empty, or 100x larger than expected? At what exact line/boundary will this fail first?",
    recommendation: "Introduce defensive validation at every IO boundary and ensure graceful fallbacks exist.",
  });

  // 2. Simplification cascade
  if (combined.length > 200 || combined.includes("middleware") || combined.includes("database") || combined.includes("service") || combined.includes("manager") || combined.includes("provider")) {
    questions.push({
      category: "simplification",
      title: "Simplification Cascade Check",
      concern: "Plan may introduce unnecessary indirection, wrapper bloat, or over-engineering.",
      stressTestQuestion:
        "If you had to implement this cleanly in under 50 lines of code without extra helper abstractions, how would the architecture look?",
      recommendation: "Eliminate shallow wrapper layers and consolidate tightly-coupled logic into deep, concise modules.",
    });
    riskScore += 20;
  }

  // 3. Blast radius & State Invalidation
  if (combined.includes("delete") || combined.includes("remove") || combined.includes("override") || combined.includes("global") || combined.includes("state") || combined.includes("store") || combined.includes("context") || combined.includes("cache")) {
    questions.push({
      category: "blast_radius",
      title: "Blast Radius & State Invalidation",
      concern: "Mutating shared, global, or persistent state can trigger cascading side-effects in dependent components.",
      stressTestQuestion:
        "Which other modules or UI views subscribe to or read this state? How is isolation and immutability guaranteed during updates?",
      recommendation: "Keep changes localized, use immutable transitions, and write regression checks for all dependent consumers.",
    });
    riskScore += 25;
  }

  // 4. Async Race Conditions & Error Boundaries
  if (combined.includes("async") || combined.includes("promise") || combined.includes("fetch") || combined.includes("api") || combined.includes("stream") || combined.includes("effect") || combined.includes("load")) {
    questions.push({
      category: "edge_case",
      title: "Async Race Conditions & Network Glitches",
      concern: "Uncaught promise rejections, un-awaited operations, or race conditions when rapid user events occur.",
      stressTestQuestion: "What happens if the user triggers a second action or navigates away before the pending async operation completes?",
      recommendation: "Use AbortController, cleanup callbacks in useEffect/lifecycle, and guarantee idempotency.",
    });
    riskScore += 20;
  }

  // 5. UI / UX / Mobile Safety (Nếu là task UI / Frontend)
  if (combined.includes("ui") || combined.includes("component") || combined.includes("react") || combined.includes("view") || combined.includes("button") || combined.includes("modal") || combined.includes("render") || combined.includes("layout")) {
    questions.push({
      category: "edge_case",
      title: "UI Responsiveness, Layout Shift & Touch Safety",
      concern: "Potential layout breaking on small screens, missing loading/error skeleton states, or unreachable touch targets.",
      stressTestQuestion: "Does the UI remain functional and legible on 360px mobile viewports? Are touch targets at least 44x44px?",
      recommendation: "Apply design/aesthetic standards, ensure fluid responsive layouts, and include clear loading/empty/error states.",
    });
    riskScore += 15;
  }

  let verdict: GrillPlanResult["readinessVerdict"] = "APPROVED";
  if (riskScore >= 40) {
    verdict = "REQUIRES_HARDENING";
  }
  if (riskScore > 80) {
    verdict = "REVISE_ARCHITECTURE";
  }

  const checklist = [
    "Verify inputs with strict runtime schema checks (e.g. Zod or type guards).",
    "Ensure graceful degradation when external calls, network, or disk IO fail.",
    "Add automated unit/integration or Playwright E2E verification covering edge cases.",
    "Confirm no global state or shared memory is mutated unexpectedly.",
    "Verify responsive layout and mobile touch safety for all UI touchpoints.",
  ];

  return {
    riskScore: Math.min(100, riskScore),
    readinessVerdict: verdict,
    summary: `Grilling assessment completed (${depth} mode). ${questions.length} critical stress-test areas identified. Risk score: ${Math.min(100, riskScore)}/100 (Verdict: ${verdict}).`,
    grillQuestions: questions,
    hardeningChecklist: checklist,
  };
}

export function executeTraceRootCause(input: TraceRootCauseInput): TraceRootCauseResult {
  const lines = input.errorLog.split(/\r?\n/).filter(Boolean);
  const topError = lines[0] ?? "Unknown Error";

  let detectedSymptom = topError;
  let rootCauseHypothesis = "Logic flaw or unhandled edge case in initialization flow.";

  if (topError.includes("TypeError") || topError.includes("Cannot read property") || topError.includes("undefined")) {
    detectedSymptom = "Null / Undefined reference exception";
    rootCauseHypothesis = "An object or property was accessed before initialization or after an unexpected async resolution.";
  } else if (topError.includes("ENOENT") || topError.includes("not found")) {
    detectedSymptom = "Missing resource or invalid file path";
    rootCauseHypothesis = "Relative path resolution mismatch across different working directories.";
  } else if (topError.includes("HARD-GATE")) {
    detectedSymptom = "Protocol-level Hard Gate violation";
    rootCauseHypothesis = "Attempted code modification or command execution without an approved C4 session.";
  }

  const causalChain: CausalLevel[] = [
    { level: 1, name: "Immediate Symptom", finding: detectedSymptom },
    { level: 2, name: "Direct Trigger", finding: `Triggered at: ${lines.slice(1, 3).join(" | ") || "Call stack top"}` },
    { level: 3, name: "State Invalidation", finding: "Intermediate state invariant violated during runtime execution." },
    { level: 4, name: "Underlying Flaw", finding: rootCauseHypothesis },
    { level: 5, name: "Systemic Root Cause", finding: "Missing upstream pre-condition guard and defensive contract verification." },
  ];

  const minimalFix = `1. Add strict assertion/null-check in ${input.failingFile ?? "the calling function"}.\n2. Ensure async dependencies are awaited in bootstrap order.\n3. Return a clean fallback error rather than uncaught exception.`;
  const regressionTest = `Write a test case reproducing this exact payload and assert that it handles gracefully without crashing.`;

  return {
    symptom: detectedSymptom,
    rootCause: rootCauseHypothesis,
    causalChain,
    minimalFixRecommendation: minimalFix,
    regressionPreventionTest: regressionTest,
  };
}

export function executeCompactContext(input: CompactContextInput): CompactContextResult {
  const originalBytes = Buffer.byteLength(input.content, "utf8");
  const target = input.targetReduction ?? "moderate";
  const invariants = input.preserveInvariants ?? [];

  const lines = input.content.split(/\r?\n/);
  const compactedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Always preserve lines matching user invariants
    const matchesInvariant = invariants.some((inv) => line.toLowerCase().includes(inv.toLowerCase()));
    if (matchesInvariant) {
      compactedLines.push(`[INVARIANT] ${line}`);
      continue;
    }

    // Filter noisy stack traces, package dumps, repetitive passes
    if (/^\s+at\s+/.test(line) && !line.includes("server.ts") && !line.includes("orchestrator.ts")) {
      if (compactedLines[compactedLines.length - 1] !== "   ... [stack trace collapsed]") {
        compactedLines.push("   ... [stack trace collapsed]");
      }
      continue;
    }

    if (line.includes("node_modules") || line.includes("dist/") || line.length > 500) {
      if (target === "aggressive") {
        continue;
      }
      compactedLines.push(line.slice(0, 160) + " ... [truncated]");
      continue;
    }

    compactedLines.push(line);
  }

  const compactedContent = compactedLines.join("\n");
  const compactedBytes = Buffer.byteLength(compactedContent, "utf8");
  const reductionPercentage = Math.max(0, Math.round(((originalBytes - compactedBytes) / originalBytes) * 100));

  return {
    originalBytes,
    compactedBytes,
    reductionPercentage,
    compactedContent,
    lockedInvariants: invariants,
  };
}

export async function executeSynthesizeSkill(
  repoRoot: string,
  registry: SkillRegistry,
  input: SynthesizeSkillInput,
): Promise<SynthesizeSkillResult> {
  const category = input.category ?? "learned";
  const sanitizedName = input.skillName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

  const skillDir = resolveInsideRepo(repoRoot, path.join("skills", category, sanitizedName));
  const skillFile = path.join(skillDir, "SKILL.md");

  const keywordsList = input.keywords && input.keywords.length > 0 ? input.keywords.join(", ") : sanitizedName;

  const skillContent = `---
name: "${sanitizedName}"
description: >-
  ${input.problemDescription.replace(/\n/g, " ").slice(0, 250)} Keywords: ${keywordsList}
---
# ${input.skillName}

## Overview
${input.problemDescription}

## Solution Pattern & Best Practices
${input.solutionPattern}

## Verification & Testing Strategy
${input.verificationGuidance}
`;

  mkdirSync(skillDir, { recursive: true });
  const exists = existsSync(skillFile);
  writeFileSync(skillFile, skillContent, "utf8");

  // Validate skill
  const validation = await validateSkills({ repoRoot });
  const valid = validation.invalid === 0;

  // Reload registry
  await registry.reload();

  return {
    skillId: `${category}/${sanitizedName}`,
    skillPath: path.relative(repoRoot, skillFile),
    status: exists ? "updated" : "created",
    validationPassed: valid,
    message: `Skill '${category}/${sanitizedName}' synthesized successfully. Quality gate passed: ${valid}.`,
  };
}
