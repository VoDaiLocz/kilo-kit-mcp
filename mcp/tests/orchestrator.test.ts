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

    const ready = orchestrator.orchestrate({
      message: first.message,
      sessionId: first.sessionId,
      memoryConfirmations: { "typescript-quality-gate": "accepted" },
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
});
