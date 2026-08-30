import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createInMemoryOrchestrationMemory } from "../src/orchestration-memory.js";
import { createOrchestrator } from "../src/orchestrator.js";
import { createSkillRegistry } from "../src/registry.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("C4 orchestrator", () => {
  it("requires brainstorming before implementation workflows", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    const result = orchestrator.orchestrate({
      message: "Fix bug login, viết test trước",
      context: { files: ["src/auth/login.ts"], mode: "coding" },
    });

    expect(result.state).toBe("brainstorming_required");
    expect(result.finalWorkflow).toBeUndefined();
    expect(result.workflow.map((step) => step.skill.id)[0]).toBe("productivity/brainstorming");
    expect(result.questions).toEqual([]);
    expect(result.missingInfo).toEqual([]);
    expect(result.firstSkillToLoad?.id).toBe("productivity/brainstorming");
    expect(result.nextAction).toContain("kilo_get_skill");
  });

  it("does not duplicate brainstorming when brainstorming is already active", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    const result = orchestrator.orchestrate({
      message: "Brainstorm spec for C4 orchestration",
      context: { mode: "brainstorming" },
    });

    const brainstormingSteps = result.workflow.filter((step) => step.skill.id === "productivity/brainstorming");
    expect(brainstormingSteps).toHaveLength(1);
  });

  it("returns ready only after brainstorming approval and memory confirmations are provided", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const memory = createInMemoryOrchestrationMemory();
    memory.rememberFact({
      kind: "verification-default",
      key: "typescript-quality-gate",
      value: { commands: ["npm --prefix mcp test", "npm --prefix mcp run typecheck"] },
      confidence: 0.95,
      source: "accepted-user-default",
    });
    const orchestrator = createOrchestrator({ registry, memory });

    const first = orchestrator.orchestrate({
      message: "Fix bug login, viết test trước",
      context: { files: ["src/auth/login.ts"], mode: "coding" },
    });

    const answered = orchestrator.orchestrate({
      message: first.message,
      sessionId: first.sessionId,
      brainstormingApproved: true,
    });

    expect(answered.state).toBe("awaiting_memory_confirmation");

    const cognitivePending = orchestrator.orchestrate({
      message: first.message,
      sessionId: first.sessionId,
      memoryConfirmations: { "typescript-quality-gate": "accepted" },
    });

    // Substantive bug task requires kilo_trace_root_cause before reaching ready state
    expect(cognitivePending.state).toBe("cognitive_required");
    expect(cognitivePending.nextAction).toContain("COGNITIVE REASONING GATE");

    // Record the required cognitive tool
    orchestrator.recordCognitiveTool(first.sessionId, "kilo_trace_root_cause");

    const ready = orchestrator.orchestrate({
      message: first.message,
      sessionId: first.sessionId,
    });

    expect(ready.state).toBe("ready");
    expect(ready.firstSkillToLoad?.id).toBe("engineering/diagnose");
    expect(ready.finalWorkflow?.map((step) => step.skill.id)).not.toContain("productivity/brainstorming");
    expect(ready.verificationGate.commands).toContain("npm --prefix mcp test");
  });

  it("treats 'explain how to fix' as substantive work requiring brainstorming", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    const result = orchestrator.orchestrate({
      message: "explain how to fix this bug in the router",
      context: { mode: "coding" },
    });

    expect(result.state).toBe("brainstorming_required");
    expect(result.taskMode).toBe("bug");
  });

  it("infers project-specific verification commands based on project context files", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    const pyResult = orchestrator.orchestrate({
      message: "Build feature user authentication",
      context: { files: ["pyproject.toml", "src/auth.py"] },
      brainstormingApproved: true,
    });
    expect(pyResult.verificationGate.commands).toEqual(["pytest"]);

    const nodeResult = orchestrator.orchestrate({
      message: "tạo trang login với React và Tailwind",
      context: { files: ["package.json", "src/Login.tsx"] },
      brainstormingApproved: true,
    });
    expect(nodeResult.verificationGate.commands).toEqual(["npm test"]);

    const genericResult = orchestrator.orchestrate({
      message: "General task without files",
      brainstormingApproved: true,
    });
    expect(genericResult.verificationGate.commands).toEqual([]);
    expect(genericResult.verificationGate.reason).toContain("native verification");
  });

  it("strictly enforces full cognitive lifecycle: brainstorming -> cognitive_required -> ready", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    // 1. Initial request -> brainstorming_required
    const step1 = orchestrator.orchestrate({
      message: "Build a new payment gateway integration",
      context: { mode: "coding" },
    });
    expect(step1.state).toBe("brainstorming_required");
    expect(orchestrator.isSessionReady(step1.sessionId).ready).toBe(false);

    // 2. User approves brainstorming -> state becomes cognitive_required (NOT ready!)
    const step2 = orchestrator.orchestrate({
      message: step1.message,
      sessionId: step1.sessionId,
      brainstormingApproved: true,
    });
    expect(step2.state).toBe("cognitive_required");
    expect(orchestrator.isSessionReady(step1.sessionId).ready).toBe(false);
    expect(orchestrator.isSessionReady(step1.sessionId).state).toBe("cognitive_required");

    // 3. Perform 1st cognitive tool (kilo_think_step) -> still cognitive_required because kilo_grill_plan is missing
    orchestrator.recordCognitiveTool(step1.sessionId, "kilo_think_step", { thoughtLength: 100 });
    const step3 = orchestrator.orchestrate({
      message: step1.message,
      sessionId: step1.sessionId,
    });
    expect(step3.state).toBe("cognitive_required");
    expect(orchestrator.isSessionReady(step1.sessionId).ready).toBe(false);

    // 4. Perform 2nd cognitive tool (kilo_grill_plan) -> state becomes ready!
    orchestrator.recordCognitiveTool(step1.sessionId, "kilo_grill_plan", { planLength: 100, riskScore: 10 });
    const step4 = orchestrator.orchestrate({
      message: step1.message,
      sessionId: step1.sessionId,
    });
    expect(step4.state).toBe("ready");
    expect(orchestrator.isSessionReady(step1.sessionId).ready).toBe(true);
    expect(orchestrator.isSessionReady(step1.sessionId).state).toBe("ready");
  });
});
