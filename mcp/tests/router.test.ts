import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

import { createInMemoryRouteAnalytics } from "../src/route-analytics.js";
import { createSkillRegistry } from "../src/registry.js";
import { routeIntent } from "../src/router.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("intent router", () => {
  it("routes workflow optimization requests to architecture and skill-authoring workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message:
        "Clone project and optimize rule effectiveness and shared workflow so skills are easier to apply",
      context: {
        files: ["src/core/KILO_MASTER.md", "mcp/src/router.ts", "skills/SKILLS_INDEX.md"],
        mode: "architecture",
      },
      limit: 5,
    });

    const recommendedIds = result.recommended.map((item) => item.skill.id);
    const workflowIds = (result as any).workflow?.map((step: any) => step.skill.id);

    expect(recommendedIds).toContain("engineering/improve-codebase-architecture");
    expect(recommendedIds).toContain("engineering/context-engineering");
    expect(recommendedIds).toContain("productivity/writing-skills");
    expect(workflowIds).toEqual([
      "engineering/improve-codebase-architecture",
      "engineering/context-engineering",
      "productivity/writing-skills",
      "productivity/verification-before-completion",
    ]);
    expect((result as any).ruleHierarchy).toEqual([
      "user-instructions",
      "platform-safety",
      "kilo-global",
      "task-mode",
      "selected-skill",
      "on-demand-reference",
      "verification",
    ]);
    expect((result as any).decisionTrail?.[0]).toMatchObject({
      skillId: "engineering/improve-codebase-architecture",
      matchedSignals: expect.arrayContaining(["workflow-optimization"]),
    });
  });

  it("applies bounded analytics feedback without changing workflow order", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const analytics = createInMemoryRouteAnalytics([
      {
        timestamp: "2026-05-30T00:00:00.000Z",
        message: "Optimize skill routing context",
        taskMode: "workflow-optimization",
        recommendedSkillIds: ["engineering/context-engineering"],
        workflowSkillIds: ["engineering/context-engineering"],
        decisionTrail: [],
      },
      {
        timestamp: "2026-05-30T00:01:00.000Z",
        message: "Improve agent context routing",
        taskMode: "workflow-optimization",
        recommendedSkillIds: ["engineering/context-engineering"],
        workflowSkillIds: ["engineering/context-engineering"],
        decisionTrail: [],
      },
    ]);

    const result = routeIntent(
      registry,
      {
        message: "Optimize rule effectiveness and workflow for skills",
        context: { files: ["mcp/src/routing-policy.ts"], mode: "architecture" },
        limit: 5,
      },
      { analytics },
    );

    const contextCandidate = result.decisionTrail.find(
      (entry) => entry.skillId === "engineering/context-engineering",
    );

    expect(contextCandidate?.scoreBreakdown.analytics).toBeGreaterThan(0);
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "engineering/improve-codebase-architecture",
      "engineering/context-engineering",
      "productivity/writing-skills",
      "productivity/verification-before-completion",
    ]);
    expect(analytics.report().totalEvents).toBe(3);
  });

  it("routes test-first bug fixes to TDD and diagnosis skills", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Fix bug login, viết test trước",
      context: {
        files: ["src/auth/login.ts"],
        mode: "coding",
        previousErrors: "authentication test failing",
      },
      limit: 3,
    });

    expect(result.recommended[0]?.skill.id).toBe("engineering/tdd");
    expect(result.recommended.map((item) => item.skill.id)).toContain("engineering/diagnose");
    expect((result as any).workflow?.map((step: any) => step.skill.id)).toEqual([
      "engineering/diagnose",
      "engineering/tdd",
      "engineering/lint-and-validate",
      "productivity/verification-before-completion",
    ]);
    expect(result.nextAction).toContain("Load");
  });

  it("routes UI work to design skills", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Build a polished responsive dashboard UI in React",
      context: { files: ["src/components/Dashboard.tsx"], mode: "coding" },
      limit: 2,
    });

    expect(result.recommended[0]?.skill.category).toBe("design");
    expect((result as any).workflow?.map((step: any) => step.skill.id)).toEqual([
      "productivity/brainstorming",
      "design/frontend-design",
      "design/ui-styling",
      "productivity/verification-before-completion",
    ]);
  });

  it("routes PR review requests to review and verification workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Review this PR before merge and catch missing tests",
      context: { files: ["src/router.ts", "mcp/tests/router.test.ts"], mode: "review" },
      limit: 4,
    });

    expect(result.recommended[0]?.skill.id).toBe("engineering/code-review");
    expect((result as any).workflow?.map((step: any) => step.skill.id)).toEqual([
      "engineering/code-review",
      "productivity/verification-before-completion",
    ]);
    expect((result as any).nextAction).toContain("workflow order");
  });

  it("routes feature build requests to brainstorming, planning, and SDD workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Build feature authentication system with passkey support",
      context: { mode: "coding" },
      limit: 3,
    });

    expect(result.taskMode).toBe("feature-build");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "productivity/brainstorming",
      "productivity/writing-plans",
      "productivity/subagent-driven-development",
      "productivity/verification-before-completion",
    ]);
  });

  it("routes spec-driven planning requests to spec-driven-development workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Viết PRD và spec-driven feature specification với user stories và acceptance criteria",
      context: { mode: "spec" },
      limit: 3,
    });

    expect(result.taskMode).toBe("spec");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "productivity/brainstorming",
      "productivity/spec-driven-development",
      "engineering/to-tickets",
      "productivity/writing-plans",
    ]);
  });

  it("routes multi-agent architecture requests to agent-system workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Design multi-agent orchestration state machine with agent memory and evals",
      context: { mode: "architecture" },
      limit: 3,
    });

    expect(result.taskMode).toBe("agent-system");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "agent-frameworks/multi-agent-orchestration",
      "agent-frameworks/workflow-state-machines",
      "agent-frameworks/agent-memory",
      "operations/agent-observability",
    ]);
  });

  it("routes security audit requests to security and vulnerability scan workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Perform security audit, scan vulnerabilities and guardrails against prompt injection",
      context: { mode: "security" },
      limit: 3,
    });

    expect(result.taskMode).toBe("security");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "security/ai-guardrails",
      "kilo-kit/security",
      "engineering/vulnerability-scanner",
      "productivity/verification-before-completion",
    ]);
  });

  it("routes domain modeling requests to wayfinder, domain-modeling and codebase-design", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Extract domain model, ubiquitous language, and entity aggregate boundaries",
      context: { mode: "architecture" },
      limit: 3,
    });

    expect(result.taskMode).toBe("domain-modeling");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "engineering/wayfinder",
      "engineering/domain-modeling",
      "engineering/codebase-design",
      "productivity/verification-before-completion",
    ]);
  });

  it("routes backend API requests to backend development and database design workflow", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Build backend API endpoint with database schema migration",
      context: { mode: "coding" },
      limit: 3,
    });

    expect(result.taskMode).toBe("backend-api");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "productivity/brainstorming",
      "engineering/backend-development",
      "engineering/database-design",
      "productivity/verification-before-completion",
    ]);
  });

  it("routes technical research requests to wayfinder, research and domain-modeling", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const result = routeIntent(registry, {
      message: "Research and investigate upstream library compatibility for the project",
      context: { mode: "research" },
      limit: 3,
    });

    expect(result.taskMode).toBe("research");
    expect(result.workflow.map((step) => step.skill.id)).toEqual([
      "engineering/wayfinder",
      "engineering/research",
      "engineering/domain-modeling",
    ]);
  });
});

