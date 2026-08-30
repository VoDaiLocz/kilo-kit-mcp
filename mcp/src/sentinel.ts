import { createHash } from "node:crypto";
import path from "node:path";
import { resolveWorkspacePath } from "./paths.js";
import type { OrchestrationMemoryStore } from "./orchestration-memory.js";
import type {
  BenchmarkReport,
  CheckpointRecord,
  CircuitBreakerState,
  SentinelInspectionResult,
  SentinelSessionStatus,
} from "./orchestration-types.js";

export interface SentinelOptions {
  memory: OrchestrationMemoryStore;
  maxConsecutiveIdenticalCalls?: number;
  similarityThreshold?: number;
  maxConsecutiveFailures?: number;
  maxSessionStepBudget?: number;
}

export interface ToolInvocationContext {
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface PostExecutionReport {
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  exitCode?: number;
  durationMs: number;
  summary: string;
  errorMessage?: string;
}

export class KiloSentinel {
  private memory: OrchestrationMemoryStore;
  private maxConsecutiveIdentical: number;
  private similarityThreshold: number;
  private maxConsecutiveFailures: number;
  private maxStepBudget: number;

  // In-memory session tracking
  private sessionHistory = new Map<string, Array<{ toolName: string; argsHash: string; payloadSummary: string; timestamp: number }>>();
  private groundedFiles = new Map<string, Set<string>>();
  private probeCounts = new Map<string, number>();
  private failureStreaks = new Map<string, number>();
  private circuitStates = new Map<string, CircuitBreakerState>();
  private tripReasons = new Map<string, string>();
  private sessionSteps = new Map<string, number>();

  constructor(options: SentinelOptions) {
    this.memory = options.memory;
    this.maxConsecutiveIdentical = options.maxConsecutiveIdenticalCalls ?? 3;
    this.similarityThreshold = options.similarityThreshold ?? 0.85;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    this.maxStepBudget = options.maxSessionStepBudget ?? 40;
  }

  /**
   * Pre-flight inspection: Executed BEFORE any execution or modifying tool.
   * Enforces Grounding Lock, Step Budget, and Circuit Breaker state.
   */
  public inspectPreFlight(context: ToolInvocationContext): SentinelInspectionResult {
    const { sessionId, toolName, args } = context;
    const currentState = this.circuitStates.get(sessionId) ?? "CLOSED";
    const currentSteps = (this.sessionSteps.get(sessionId) ?? 0) + 1;
    this.sessionSteps.set(sessionId, currentSteps);

    // 1. Step Budget Exhaustion Check
    if (currentSteps > this.maxStepBudget && toolName !== "kilo_record_reflection") {
      this.tripCircuit(sessionId, `Session step budget exhausted (${currentSteps}/${this.maxStepBudget} steps).`);
      return {
        allowed: false,
        circuitState: "OPEN",
        code: "STEP_BUDGET_EXHAUSTED",
        reason: `[KILO-SENTINEL] Maximum step budget (${this.maxStepBudget}) exceeded. You must call 'kilo_record_reflection' to summarize findings and lessons learned.`,
        suggestedAction: "Call kilo_record_reflection with your lessons learned and summary.",
      };
    }

    // 2. Circuit Breaker OPEN check
    if (currentState === "OPEN") {
      const allowedCognitiveTools = [
        "kilo_trace_root_cause",
        "kilo_compact_context",
        "kilo_think_step",
        "kilo_record_reflection",
        "kilo_sentinel_status",
        "kilo_reset_circuit_breaker",
      ];
      if (!allowedCognitiveTools.includes(toolName)) {
        return {
          allowed: false,
          circuitState: "OPEN",
          code: "CIRCUIT_BREAKER_OPEN",
          reason: `[KILO-SENTINEL CIRCUIT BREAKER TRIPPED] Execution blocked: ${this.tripReasons.get(sessionId) ?? "Anomaly loop or consecutive failure detected."}`,
          suggestedAction: "Call 'kilo_trace_root_cause' to analyze 5-Whys root cause or 'kilo_reset_circuit_breaker' with justification.",
        };
      }
    }

    // 3. Pre-flight Grounding Lock check for Edit tools
    if (toolName === "kilo_edit_file") {
      const filePath = String(args.filePath || "").trim();
      const canonical = resolveWorkspacePath(filePath);
      const normalizedPath = path.normalize(filePath);
      const sessionGrounded = this.groundedFiles.get(sessionId) ?? new Set<string>();

      const isGrounded = sessionGrounded.has(canonical) || sessionGrounded.has(normalizedPath);

      if (!isGrounded) {
        // Fallback: check if the file was probed in the "default" session (agent omitted sessionId in kilo_read_file)
        const defaultGrounded = this.groundedFiles.get("default");
        if (defaultGrounded && (defaultGrounded.has(canonical) || defaultGrounded.has(normalizedPath))) {
          this.registerGroundedFile(sessionId, canonical);
        } else {
          return {
            allowed: false,
            circuitState: currentState,
            code: "PREFLIGHT_GROUNDING_VIOLATION",
            reason: `[KILO-SENTINEL PRE-FLIGHT GROUNDING LOCK] Attempted to edit '${filePath}' without prior reading/probing. You MUST inspect the file using 'kilo_read_file' or 'kilo_grep_code' first.`,
            suggestedAction: `Call kilo_read_file with filePath: "${filePath}" and sessionId: "${sessionId}" to inspect actual source code.`,
          };
        }
      }

      // Check for Edit Thrashing
      if (args.targetContent) {
        const thrashingCheck = this.checkEditThrashing(sessionId, canonical, String(args.targetContent));
        if (!thrashingCheck.allowed) {
          this.tripCircuit(sessionId, thrashingCheck.reason);
          return {
            allowed: false,
            circuitState: "OPEN",
            code: "EDIT_THRASHING_LOOP_DETECTED",
            reason: `[KILO-SENTINEL LOOP DETECTOR] ${thrashingCheck.reason}`,
            suggestedAction: "Call 'kilo_trace_root_cause' to diagnose the true underlying bug before modifying code again.",
          };
        }
      }
    }

    // 4. Exact Consecutive Tool Repetition Check
    const argsHash = this.computeArgsHash(toolName, args);
    const history = this.sessionHistory.get(sessionId) ?? [];
    if (this.maxConsecutiveIdentical > 1 && history.length >= this.maxConsecutiveIdentical - 1) {
      const recentCalls = history.slice(-(this.maxConsecutiveIdentical - 1));
      const allIdentical = recentCalls.length > 0 && recentCalls.every((call) => call.toolName === toolName && call.argsHash === argsHash);
      if (allIdentical) {
        const reason = `Detected ${this.maxConsecutiveIdentical} consecutive identical invocations of tool '${toolName}'.`;
        this.tripCircuit(sessionId, reason);
        return {
          allowed: false,
          circuitState: "OPEN",
          code: "EXACT_REPETITION_TRIPPED",
          reason: `[KILO-SENTINEL CIRCUIT BREAKER] ${reason} Infinite loop prevented.`,
          suggestedAction: "Pause repetitive calls. Inspect previous tool outputs or branch into another approach.",
        };
      }
    }

    return {
      allowed: true,
      circuitState: currentState,
    };
  }

  /**
   * Post-execution recording: Executed AFTER tool completes.
   * Updates grounding state, failure streaks, and writes Katl Trajectory Log into SQLite.
   */
  public recordPostExecution(report: PostExecutionReport): void {
    const { sessionId, toolName, args, success, exitCode, durationMs, summary, errorMessage } = report;

    // 1. Update Grounding state for probe tools
    if (toolName === "kilo_read_file" && args.filePath) {
      this.registerGroundedFile(sessionId, String(args.filePath));
    } else if (toolName === "kilo_grep_code" || toolName === "kilo_search_files") {
      this.incrementProbeCount(sessionId);
    }

    // 2. Track Failure Streaks for Commands/Edits
    if (!success || (exitCode !== undefined && exitCode !== 0)) {
      const streak = (this.failureStreaks.get(sessionId) ?? 0) + 1;
      this.failureStreaks.set(sessionId, streak);
      if (streak >= this.maxConsecutiveFailures) {
        this.tripCircuit(sessionId, `Execution failed ${streak} times consecutively (Last error: ${errorMessage || summary}).`);
      }
    } else {
      this.failureStreaks.set(sessionId, 0);
      if (this.circuitStates.get(sessionId) === "HALF_OPEN") {
        this.circuitStates.set(sessionId, "CLOSED");
        this.tripReasons.delete(sessionId);
      }
    }

    // 3. Update In-memory history
    const history = this.sessionHistory.get(sessionId) ?? [];
    const argsHash = this.computeArgsHash(toolName, args);
    let payloadSummary = "";
    if (toolName === "kilo_edit_file") {
      payloadSummary = `${args.filePath} | target:${String(args.targetContent || "").slice(0, 500)}`;
    } else if (toolName === "kilo_run_command") {
      payloadSummary = String(args.command || "");
    }
    history.push({ toolName, argsHash, payloadSummary, timestamp: Date.now() });
    if (history.length > 50) history.shift();
    this.sessionHistory.set(sessionId, history);

    // 4. Persist Trajectory to SQLite
    const stepNumber = this.sessionSteps.get(sessionId) ?? 1;
    this.memory.recordTrajectory({
      sessionId,
      stepNumber,
      toolName,
      toolArgs: args,
      toolArgsHash: argsHash,
      toolResultSummary: summary.slice(0, 1000),
      status: success ? "success" : "failure",
      durationMs,
      sentinelVerdict: {
        circuitState: this.circuitStates.get(sessionId) ?? "CLOSED",
        failureStreak: this.failureStreaks.get(sessionId) ?? 0,
        groundedFilesCount: (this.groundedFiles.get(sessionId) ?? new Set()).size,
      },
    });
  }

  /**
   * Reset Circuit Breaker (Supervised Reset)
   */
  public resetCircuit(sessionId: string, justification: string): SentinelSessionStatus {
    this.circuitStates.set(sessionId, "HALF_OPEN");
    this.failureStreaks.set(sessionId, 0);
    this.tripReasons.delete(sessionId);

    this.createCheckpoint(sessionId, "SUPERVISED_RESET", { justification });
    return this.getStatus(sessionId);
  }

  /**
   * Get Sentinel session status and statistics
   */
  public getStatus(sessionId: string): SentinelSessionStatus {
    const grounded = this.groundedFiles.get(sessionId) ?? new Set<string>();
    return {
      sessionId,
      circuitState: this.circuitStates.get(sessionId) ?? "CLOSED",
      tripReason: this.tripReasons.get(sessionId),
      stepsRecorded: this.sessionSteps.get(sessionId) ?? 0,
      maxStepBudget: this.maxStepBudget,
      consecutiveFailures: this.failureStreaks.get(sessionId) ?? 0,
      groundedFiles: Array.from(grounded),
      totalProbes: this.probeCounts.get(sessionId) ?? 0,
    };
  }

  /**
   * Create checkpoint snapshot in SQLite
   */
  public createCheckpoint(sessionId: string, name: string, metadata: Record<string, unknown> = {}): CheckpointRecord {
    const grounded = Array.from(this.groundedFiles.get(sessionId) ?? new Set<string>());
    return this.memory.recordCheckpoint({
      sessionId,
      checkpointName: name,
      state: this.circuitStates.get(sessionId) ?? "CLOSED",
      groundedFiles: grounded,
      circuitBreakerState: this.circuitStates.get(sessionId) ?? "CLOSED",
      metadata,
    });
  }

  /**
   * Benchmark current session trajectory against industry standard / GitHub patterns
   */
  public benchmarkSolution(sessionId: string, proposedApproach: string, industryBestPractice: string): BenchmarkReport {
    const trajectories = this.memory.getTrajectories(sessionId, 20);
    const hasFailures = trajectories.some((t) => t.status === "failure");
    const similarity = computeStringSimilarity(proposedApproach.toLowerCase(), industryBestPractice.toLowerCase());

    const isAligned = similarity >= 0.6 && !hasFailures;
    const verdict = isAligned ? "ALIGNED" : "REPLAN_TRIGGERED";

    const report: BenchmarkReport = {
      sessionId,
      verdict,
      summary: isAligned
        ? `Proposed approach aligns well with industry best practices (${(similarity * 100).toFixed(0)}% alignment).`
        : `Potential architectural divergence detected. Proposed approach has significant differences from standard GitHub/industry patterns (${(similarity * 100).toFixed(0)}% alignment).`,
      keyDifferences: [
        `Local Approach: ${proposedApproach.slice(0, 200)}`,
        `Industry Standard: ${industryBestPractice.slice(0, 200)}`,
      ],
      recommendations: isAligned
        ? ["Proceed with implementation and Playwright E2E verification."]
        : [
            "Trigger Re-planning loop (Gate 1/Gate 2).",
            "Consider adopting standard library or well-tested community pattern.",
            "Record reflection into learning memory before continuing.",
          ],
      suggestedSkills: isAligned ? ["engineering/clean-code", "engineering/playwright"] : ["productivity/brainstorming", "engineering/diagnose"],
      timestamp: new Date().toISOString(),
    };

    if (verdict === "REPLAN_TRIGGERED") {
      this.createCheckpoint(sessionId, "BENCHMARK_REPLAN_TRIGGERED", { report });
    }

    return report;
  }

  private registerGroundedFile(sessionId: string, filePath: string): void {
    const canonical = resolveWorkspacePath(filePath);
    const normalized = path.normalize(filePath);
    if (!this.groundedFiles.has(sessionId)) {
      this.groundedFiles.set(sessionId, new Set<string>());
    }
    const set = this.groundedFiles.get(sessionId)!;
    set.add(canonical);
    set.add(normalized);
    this.incrementProbeCount(sessionId);
  }

  private incrementProbeCount(sessionId: string): void {
    const count = (this.probeCounts.get(sessionId) ?? 0) + 1;
    this.probeCounts.set(sessionId, count);
  }

  private tripCircuit(sessionId: string, reason: string): void {
    this.circuitStates.set(sessionId, "OPEN");
    this.tripReasons.set(sessionId, reason);
    this.createCheckpoint(sessionId, "CIRCUIT_TRIPPED", { reason });
  }

  private checkEditThrashing(sessionId: string, filePath: string, targetContent: string): { allowed: boolean; reason: string } {
    const history = this.sessionHistory.get(sessionId) ?? [];
    const recentEdits = history.slice(-10).filter((h) => h.toolName === "kilo_edit_file" && h.payloadSummary.includes(filePath));

    if (recentEdits.length >= 2) {
      const lastEdit = recentEdits[recentEdits.length - 1]!;
      const previousTarget = lastEdit.payloadSummary.split("target:")[1] || "";
      const similarity = computeStringSimilarity(targetContent.slice(0, 500), previousTarget.slice(0, 500));

      if (similarity >= this.similarityThreshold) {
        return {
          allowed: false,
          reason: `Repeated edit thrashing on file '${filePath}' (Similarity: ${(similarity * 100).toFixed(1)}%). Previous edits failed to resolve problem.`,
        };
      }
    }

    return { allowed: true, reason: "" };
  }

  private computeArgsHash(toolName: string, args: Record<string, unknown>): string {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(args)) {
      if (key !== "format" && key !== "sessionId" && key !== "timeoutMs") {
        normalized[key] = val;
      }
    }
    const json = canonicalizeJson(normalized);
    return createHash("sha256").update(`${toolName}:${json}`).digest("hex").slice(0, 16);
  }
}

/**
 * Canonical JSON serialization with sorted keys
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(record[k])}`);
  return "{" + pairs.join(",") + "}";
}

/**
 * Memory-efficient Levenshtein Distance Algorithm (O(min(M,N)) space)
 */
export function computeLevenshteinDistance(a: string, b: string): number {
  const MAX_COMPARE_LEN = 2000;
  const strA = a.length > MAX_COMPARE_LEN ? a.slice(0, MAX_COMPARE_LEN) : a;
  const strB = b.length > MAX_COMPARE_LEN ? b.slice(0, MAX_COMPARE_LEN) : b;
  if (strA === strB) return 0;
  if (strA.length === 0) return strB.length;
  if (strB.length === 0) return strA.length;

  const m = strA.length;
  const n = strB.length;
  const v0 = new Uint32Array(n + 1);
  const v1 = new Uint32Array(n + 1);

  for (let i = 0; i <= n; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < m; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < n; j++) {
      const cost = strA.charCodeAt(i) === strB.charCodeAt(j) ? 0 : 1;
      const insert = (v1[j] ?? 0) + 1;
      const del = (v0[j + 1] ?? 0) + 1;
      const sub = (v0[j] ?? 0) + cost;
      v1[j + 1] = Math.min(insert, del, sub);
    }
    for (let j = 0; j <= n; j++) {
      v0[j] = v1[j] ?? 0;
    }
  }

  return v1[n] ?? 0;
}

/**
 * Normalized string similarity ratio between 0.0 and 1.0
 */
export function computeStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = computeLevenshteinDistance(a, b);
  return Math.max(0, 1 - distance / maxLen);
}
