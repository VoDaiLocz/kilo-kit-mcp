import { describe, expect, it } from "vitest";
import { createInMemoryOrchestrationMemory } from "../src/orchestration-memory.js";
import {
  canonicalizeJson,
  computeLevenshteinDistance,
  computeStringSimilarity,
  KiloSentinel,
} from "../src/sentinel.js";

describe("KiloSentinel Core Algorithms", () => {
  it("computes exact Levenshtein distance and similarity", () => {
    expect(computeLevenshteinDistance("kitten", "sitting")).toBe(3);
    expect(computeLevenshteinDistance("hello", "hello")).toBe(0);
    expect(computeLevenshteinDistance("", "abc")).toBe(3);

    expect(computeStringSimilarity("test", "test")).toBe(1.0);
    expect(computeStringSimilarity("abc", "xyz")).toBe(0.0);
    expect(computeStringSimilarity("function hello() {}", "function hello() {}")).toBe(1.0);
    expect(computeStringSimilarity("function hello() { return 1; }", "function hello() { return 2; }")).toBeGreaterThan(0.8);
  });

  it("canonicalizes JSON with deterministic key order", () => {
    const a = { b: 2, a: 1, c: { z: 9, y: 8 } };
    const b = { c: { y: 8, z: 9 }, a: 1, b: 2 };
    expect(canonicalizeJson(a)).toBe(canonicalizeJson(b));
  });
});

describe("KiloSentinel Supervisor & Circuit Breaker", () => {
  it("registers Grounding evidence and allows valid edit", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory });
    const sessionId = "test-session-1";

    const preFlight = sentinel.inspectPreFlight({
      sessionId,
      toolName: "kilo_edit_file",
      args: { filePath: "src/utils.ts", targetContent: "foo", replacementContent: "bar" },
    });
    expect(preFlight.allowed).toBe(true);

    const status = sentinel.getStatus(sessionId);
    expect(status.groundedFiles.some((f) => f.includes("src/utils.ts"))).toBe(true);
  });

  it("trips Circuit Breaker on 3 consecutive identical tool calls", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory, maxConsecutiveIdenticalCalls: 3 });
    const sessionId = "test-session-loop";

    const callArgs = {
      sessionId,
      toolName: "kilo_run_command",
      args: { command: "npm test" },
    };

    // Call 1
    expect(sentinel.inspectPreFlight(callArgs).allowed).toBe(true);
    sentinel.recordPostExecution({ ...callArgs, success: false, exitCode: 1, durationMs: 100, summary: "Fail" });

    // Call 2
    expect(sentinel.inspectPreFlight(callArgs).allowed).toBe(true);
    sentinel.recordPostExecution({ ...callArgs, success: false, exitCode: 1, durationMs: 100, summary: "Fail" });

    // Call 3 -> TRIPPED
    const preFlight3 = sentinel.inspectPreFlight(callArgs);
    expect(preFlight3.allowed).toBe(false);
    expect(preFlight3.circuitState).toBe("OPEN");
    expect(preFlight3.code).toBe("EXACT_REPETITION_TRIPPED");

    // Status check
    const status = sentinel.getStatus(sessionId);
    expect(status.circuitState).toBe("OPEN");
  });

  it("trips Circuit Breaker on Edit Thrashing loop", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory, similarityThreshold: 0.8 });
    const sessionId = "test-session-thrash";

    // Ground the file first
    sentinel.recordPostExecution({
      sessionId,
      toolName: "kilo_read_file",
      args: { filePath: "src/index.ts" },
      success: true,
      durationMs: 5,
      summary: "Read 50 lines",
    });

    // Edit 1
    sentinel.recordPostExecution({
      sessionId,
      toolName: "kilo_edit_file",
      args: { filePath: "src/index.ts", targetContent: "const port = 3000; console.log(port);" },
      success: false,
      durationMs: 10,
      summary: "Failed edit",
    });

    // Edit 2 with very similar target content
    sentinel.recordPostExecution({
      sessionId,
      toolName: "kilo_edit_file",
      args: { filePath: "src/index.ts", targetContent: "const port = 3000; console.log(port);" },
      success: false,
      durationMs: 10,
      summary: "Failed edit",
    });

    // Edit 3 with similar target content -> TRIPPED
    const preFlight = sentinel.inspectPreFlight({
      sessionId,
      toolName: "kilo_edit_file",
      args: { filePath: "src/index.ts", targetContent: "const port = 3000; console.log(port);" },
    });
    expect(preFlight.allowed).toBe(false);
    expect(preFlight.circuitState).toBe("OPEN");
  });

  it("resets Circuit Breaker with supervised justification", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory, maxConsecutiveIdenticalCalls: 2 });
    const sessionId = "test-session-reset";

    const callArgs = { sessionId, toolName: "kilo_run_command", args: { command: "npm test" } };
    sentinel.inspectPreFlight(callArgs);
    sentinel.recordPostExecution({ ...callArgs, success: false, exitCode: 1, durationMs: 10, summary: "Fail" });

    // Trip it
    sentinel.inspectPreFlight(callArgs);
    expect(sentinel.getStatus(sessionId).circuitState).toBe("OPEN");

    // Reset with justification
    const resetStatus = sentinel.resetCircuit(sessionId, "Found root cause: Missing environment variable PORT.");
    expect(resetStatus.circuitState).toBe("HALF_OPEN");

    const checkpoints = memory.getCheckpoints(sessionId);
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.some((c) => c.checkpointName === "SUPERVISED_RESET")).toBe(true);
  });

  it("benchmarks proposed solution against industry best practices", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory });
    const sessionId = "test-session-bench";

    // Aligned approach
    const alignedReport = sentinel.benchmarkSolution(
      sessionId,
      "Use ts-fsrs library with spaced repetition parameters for flashcard scheduling",
      "Use ts-fsrs library with spaced repetition parameters for flashcard scheduling",
    );
    expect(alignedReport.verdict).toBe("ALIGNED");

    // Divergent approach -> REPLAN_TRIGGERED
    const divergentReport = sentinel.benchmarkSolution(
      sessionId,
      "Write custom timestamp math with setTimeout loops in local storage",
      "Use ts-fsrs library with spaced repetition algorithm and SQLite persistence",
    );
    expect(divergentReport.verdict).toBe("REPLAN_TRIGGERED");
  });

  it("grounds files using canonical paths across relative, tilde, and absolute paths", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory });
    const sessionId = "test-canonical-grounding";

    // Read with tilde or relative path
    sentinel.recordPostExecution({
      sessionId,
      toolName: "kilo_read_file",
      args: { filePath: "~/my-project/src/index.ts" },
      success: true,
      durationMs: 5,
      summary: "Read 10 lines",
    });

    // Edit with home-expanded absolute path -> ALLOWED
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const preFlight = sentinel.inspectPreFlight({
      sessionId,
      toolName: "kilo_edit_file",
      args: {
        filePath: `${home}/my-project/src/index.ts`,
        targetContent: "foo",
        replacementContent: "bar",
      },
    });

    expect(preFlight.allowed).toBe(true);
  });

  it("adopts grounding from default session if agent read file without sessionId", () => {
    const memory = createInMemoryOrchestrationMemory();
    const sentinel = new KiloSentinel({ memory });

    // Agent read file without sessionId -> recorded in "default"
    sentinel.recordPostExecution({
      sessionId: "default",
      toolName: "kilo_read_file",
      args: { filePath: "src/service.ts" },
      success: true,
      durationMs: 5,
      summary: "Read 15 lines",
    });

    // Agent then edits with the real session ID -> ALLOWED via fallback!
    const preFlight = sentinel.inspectPreFlight({
      sessionId: "real-session-123",
      toolName: "kilo_edit_file",
      args: {
        filePath: "src/service.ts",
        targetContent: "const x = 1;",
        replacementContent: "const x = 2;",
      },
    });

    expect(preFlight.allowed).toBe(true);
  });
});
