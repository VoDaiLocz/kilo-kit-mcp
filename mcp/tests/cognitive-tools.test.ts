import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import {
  executeCompactContext,
  executeGrillPlan,
  executeSynthesizeSkill,
  executeThinkStep,
  executeTraceRootCause,
} from "../src/cognitive-tools.js";
import { createSkillRegistry } from "../src/registry.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const testLearnedDir = path.join(repoRoot, "skills/learned/fastify-rate-limiting");

describe("Kilo-Kit Cognitive Tools & Reasoning Suite", () => {
  afterAll(() => {
    if (existsSync(testLearnedDir)) {
      rmSync(testLearnedDir, { recursive: true, force: true });
    }
  });

  describe("kilo_think_step (Sequential Thinking Engine)", () => {
    it("records sequential thought steps and tracks completion", () => {
      const sessionId = "test-session-1";

      const t1 = executeThinkStep({
        thought: "Step 1: Analyzing performance bottleneck in database connection pool.",
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        hypothesis: "Exhausted connections due to unclosed cursors.",
        sessionId,
      });

      expect(t1.currentThought.thoughtNumber).toBe(1);
      expect(t1.totalRecordedThoughts).toBe(1);
      expect(t1.isComplete).toBe(false);

      // Step 2 with revision
      const t2 = executeThinkStep({
        thought: "Step 2 (Revised): Bottleneck is actually caused by synchronous bcrypt in auth loop.",
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: false,
        isRevision: true,
        revisesThought: 1,
        branchId: "approach-b",
        sessionId,
      });

      expect(t2.currentThought.isRevision).toBe(true);
      expect(t2.activeBranches).toContain("approach-b");
      expect(t2.isComplete).toBe(true);
    });
  });

  describe("kilo_grill_plan (Red-Team Adversarial Grilling)", () => {
    it("analyzes architectural plan and computes risk score and stress-test questions", () => {
      const plan = `
        We will delete the old database schema, remove the authentication middleware, 
        and introduce a new global state variable to fetch and cache user profiles asynchronously.
      `;

      const result = executeGrillPlan({ plan, depth: "deep" });

      expect(result.grillQuestions.length).toBeGreaterThanOrEqual(3);
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.readinessVerdict).toBe("REQUIRES_HARDENING");
      expect(result.hardeningChecklist.length).toBeGreaterThan(0);
      expect(result.grillQuestions.some((q) => q.category === "inversion")).toBe(true);
      expect(result.grillQuestions.some((q) => q.category === "blast_radius")).toBe(true);
    });
  });

  describe("kilo_trace_root_cause (5-Whys Diagnostic Tracer)", () => {
    it("constructs causal hierarchy from error stack trace", () => {
      const errorLog = `TypeError: Cannot read property 'accessToken' of undefined\n    at AuthService.validateToken (src/auth/service.ts:45:12)\n    at LoginController.handle (src/auth/controller.ts:18:9)`;

      const result = executeTraceRootCause({
        errorLog,
        failingFile: "src/auth/service.ts",
        expectedBehavior: "Return 401 Unauthorized",
        actualBehavior: "500 Internal Server Crash",
      });

      expect(result.symptom).toContain("Null / Undefined");
      expect(result.causalChain.length).toBe(5);
      expect(result.causalChain[0]?.level).toBe(1);
      expect(result.causalChain[4]?.level).toBe(5);
      expect(result.minimalFixRecommendation).toContain("src/auth/service.ts");
    });
  });

  describe("kilo_compact_context (Context Compactor & Invariant Lock)", () => {
    it("compacts noisy logs while strictly locking user invariants", () => {
      const rawLog = `
        Running test suite...
        at Object.run (/home/node_modules/vitest/dist/index.js:100:15)
        at async Runner.execute (/home/node_modules/vitest/dist/runner.js:24:9)
        at Context.evaluate (/home/node_modules/vitest/dist/context.js:12:4)
        [CRITICAL ARCHITECTURE INVARIANT]: Never mutate global state directly!
        Test passed in 45ms.
      `;

      const result = executeCompactContext({
        content: rawLog,
        preserveInvariants: ["CRITICAL ARCHITECTURE INVARIANT"],
        targetReduction: "moderate",
      });

      expect(result.reductionPercentage).toBeGreaterThan(0);
      expect(result.compactedContent).toContain("[INVARIANT]         [CRITICAL ARCHITECTURE INVARIANT]");
      expect(result.lockedInvariants).toContain("CRITICAL ARCHITECTURE INVARIANT");
    });
  });

  describe("kilo_synthesize_skill (Autonomous Self-Evolution)", () => {
    it("synthesizes a valid new SKILL.md into the registry", async () => {
      const registry = await createSkillRegistry({ repoRoot });

      const result = await executeSynthesizeSkill(repoRoot, registry, {
        skillName: "fastify-rate-limiting",
        category: "learned",
        problemDescription: "How to safely implement sliding-window rate limiting in Fastify backend services.",
        solutionPattern: "Use @fastify/rate-limit plugin with Redis store backend. Configure allowList for internal healthchecks.",
        verificationGuidance: "Run integration test hitting 101 requests within 60s and verify HTTP 429 response.",
        keywords: ["fastify", "rate-limit", "security"],
      });

      expect(result.status).toBe("created");
      expect(result.validationPassed).toBe(true);
      expect(result.skillId).toBe("learned/fastify-rate-limiting");
      expect(existsSync(path.join(repoRoot, result.skillPath))).toBe(true);

      // Verify registry reloaded with the new skill
      const loaded = registry.getSkill("learned", "fastify-rate-limiting");
      expect(loaded).toBeDefined();
      expect(loaded.description).toContain("Fastify");
    });
  });
});
