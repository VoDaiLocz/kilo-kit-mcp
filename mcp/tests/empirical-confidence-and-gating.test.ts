import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createInMemoryOrchestrationMemory } from "../src/orchestration-memory.js";
import { createOrchestrator } from "../src/orchestrator.js";
import { createSkillRegistry } from "../src/registry.js";
import { routeIntent } from "../src/router.js";
import { smartTruncateOutput } from "../src/formatters.js";
import { executeGrillPlan } from "../src/cognitive-tools.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("Empirical Real-World Verification: Calibrated Confidence & 4-Tier Gating", () => {
  it("verifies calibrated confidence differentiates strong signals from ambiguous queries (no static 35%)", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    // Strong signal query
    const strongResult = routeIntent(registry, {
      message: "Fix bug null pointer exception in login authentication flow",
    });
    const strongTop = strongResult.recommended[0];
    expect(strongTop).toBeDefined();
    // Confidence must be well above arbitrary 35%
    expect(strongTop!.confidence).toBeGreaterThan(0.50);

    // Vague / ambiguous single-word query
    const vagueResult = routeIntent(registry, {
      message: "kiểm tra",
    });
    const vagueTop = vagueResult.recommended[0];
    expect(vagueTop).toBeDefined();
    // Vague query must have lower confidence because signals are weak
    expect(vagueTop!.confidence).toBeLessThan(0.45);

    // Both confidences must be distinct and non-identical
    expect(strongTop!.confidence).not.toEqual(vagueTop!.confidence);
  });

  it("verifies 4-Tier Fast-Path: Tier 0 (inspect) and Tier 1 (micro) are ready immediately without ritual lock", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const orchestrator = createOrchestrator({
      registry,
      memory: createInMemoryOrchestrationMemory(),
    });

    // Tier 0: Pure inspection query
    const inspectResult = orchestrator.orchestrate({
      message: "kiểm tra trạng thái hệ thống và xem git status",
    });
    expect(inspectResult.taskTier?.tier).toBe("tier_0_inspect");
    expect(inspectResult.state).toBe("ready");

    // Tier 1: Micro fix (single file typo)
    const microResult = orchestrator.orchestrate({
      message: "sửa lỗi typo chính tả trong tài liệu",
      context: { files: ["README.md"] },
    });
    expect(microResult.taskTier?.tier).toBe("tier_1_micro");
    expect(microResult.state).toBe("ready");

    // Tier 2: Standard substantive feature (still requires brainstorming and cognitive gate)
    const featureResult = orchestrator.orchestrate({
      message: "tạo tính năng giỏ hàng checkout thanh toán mới",
    });
    expect(featureResult.taskTier?.tier).toBe("tier_2_standard");
    expect(featureResult.state).toBe("brainstorming_required");
  });

  it("verifies Memory Reflection relevance: only suggests matching lessons with real overlap, not fake 95%", () => {
    const memory = createInMemoryOrchestrationMemory();

    // Store a Docker/pnpm build reflection
    memory.recordReflection({
      taskMode: "bug",
      taskSummary: "Khắc phục lỗi docker build thiếu package pnpm",
      correctApproach: "Thêm pnpm setup vào Dockerfile trước khi run build",
      wrongPathsEncountered: ["chạy docker mà không có pnpm install"],
      lessonsLearned: "Luôn bảo đảm cài đặt pnpm và copy pnpm-lock trong Docker context",
    });

    // Case 1: Query matches 'docker build'
    const matchSuggestions = memory.suggest({
      taskMode: "bug",
      workflowSkillIds: ["engineering/diagnose"],
      message: "Lỗi docker build container thất bại",
    });
    const dockerLesson = matchSuggestions.find((s) => s.key.startsWith("lesson:"));
    expect(dockerLesson).toBeDefined();
    expect(dockerLesson!.title).toContain("Khớp từ khóa");
    // Confidence must be calculated realistically from token overlap, not a hardcoded 0.95
    expect(dockerLesson!.confidence).toBeGreaterThan(0.20);
    expect(dockerLesson!.confidence).toBeLessThan(0.90);

    // Case 2: Query about React CSS flexbox styling (completely unrelated)
    const unrelatedSuggestions = memory.suggest({
      taskMode: "ui",
      workflowSkillIds: ["design/frontend-design"],
      message: "Thay đổi màu sắc nút bấm CSS flexbox",
    });
    const unrelatedLesson = unrelatedSuggestions.find((s) => s.key.startsWith("lesson:"));
    // Unrelated lesson must NOT be suggested
    expect(unrelatedLesson).toBeUndefined();
  });

  it("verifies Smart Truncation extracts intermediate error context without losing stack traces", () => {
    // Generate a 200-line output with an error in the middle (line 80)
    const lines: string[] = [];
    for (let i = 1; i <= 200; i++) {
      if (i === 80) {
        lines.push("TypeError: Cannot read properties of undefined (reading 'token')");
        lines.push("    at AuthService.authenticate (/app/src/auth.ts:45:12)");
      } else {
        lines.push(`Log entry line ${i}: compilation step passing normally`);
      }
    }
    const longOutput = lines.join("\n");

    const result = smartTruncateOutput(longOutput, {
      maxChars: 2000,
      headLines: 15,
      tailLines: 30,
      errorWindowLines: 5,
    });

    expect(result.truncated).toBe(true);
    // Must preserve head
    expect(result.text).toContain("Log entry line 1:");
    // Must capture intermediate error snippet
    expect(result.text).toContain("TypeError: Cannot read properties of undefined");
    expect(result.text).toContain("AuthService.authenticate");
    // Must preserve tail
    expect(result.text).toContain("Log entry line 200:");
  });

  it("verifies executeGrillPlan calculates evidence-based risk score (no static 35/100)", () => {
    // Plan A: Dangerous database schema overhaul with NO tests and NO rollback
    const dangerousPlan = executeGrillPlan({
      plan: "Refactor global database schema migration, drop table old_users and override state without backup",
    });
    // High risk because it mutates persistent DB and global state with zero mitigation
    expect(dangerousPlan.riskScore).toBeGreaterThan(40);
    expect(dangerousPlan.readinessVerdict).not.toBe("APPROVED");

    // Plan B: Safe, well-tested plan with unit test, Zod validation, and rollback
    const safePlan = executeGrillPlan({
      plan: "Update login handler with Zod schema validation, full vitest unit test coverage, and git worktree rollback",
    });
    // Low risk because it includes tests, validation, and rollback
    expect(safePlan.riskScore).toBeLessThan(25);
    expect(safePlan.readinessVerdict).toBe("APPROVED");

    // Scores must be distinct and non-identical to 35
    expect(dangerousPlan.riskScore).not.toEqual(safePlan.riskScore);
  });
});
