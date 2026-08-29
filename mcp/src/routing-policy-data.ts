import type { RouteWorkflowStep } from "./types.js";

export interface SignalPattern {
  signal: string;
  patterns: RegExp[];
}

export interface WorkflowDefinition {
  id: string;
  role: RouteWorkflowStep["role"];
  reason: string;
}

export const RULE_HIERARCHY = [
  "user-instructions",
  "platform-safety",
  "kilo-global",
  "task-mode",
  "selected-skill",
  "on-demand-reference",
  "verification",
];

export const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    signal: "workflow-optimization",
    patterns: [
      /\boptimi[sz]e\b/i,
      /\btoi uu\b/i,
      /\btối ưu\b/i,
      /\bworkflow\b/i,
      /\bwordflow\b/i,
      /\brules?\b/i,
      /\bskill(?:s)?\b/i,
      /\bchong cheo\b/i,
      /\bchồng chéo\b/i,
      /\bquy trình\b/i,
      /\bcải tiến quy trình\b/i,
      /\bchạy chậm\b/i,
      /\bchay cham\b/i,
      /\bchậm quá\b/i,
      /\bcham qua\b/i,
      /\bperformance\b/i,
      /\bhiệu năng\b/i,
      /\bhieu nang\b/i,
    ],
  },
  {
    signal: "architecture",
    patterns: [
      /\barchitecture\b/i,
      /\brefactor\b/i,
      /\bstructure\b/i,
      /\brouting\b/i,
      /\bkernel\b/i,
      /\btái cấu trúc\b/i,
      /\btai cau truc\b/i,
      /\bkiến trúc\b/i,
      /\bkien truc\b/i,
      /\bcấu trúc lại\b/i,
      /\btách nhỏ\b/i,
      /\btach nho\b/i,
      /\btách file\b/i,
      /\btách module\b/i,
      /\bviết lại cho sạch\b/i,
      /\bcode rối\b/i,
      /\blàm sạch\b/i,
      /\bdễ bảo trì\b/i,
      /\bclean code\b/i,
    ],
  },
  {
    signal: "context-engineering",
    patterns: [/\bcontext\b/i, /\btoken\b/i, /\bagent\b/i, /\badaptive\b/i, /\bpredictive\b/i, /\bngữ cảnh\b/i],
  },
  {
    signal: "skill-authoring",
    patterns: [/\bSKILL\.md\b/i, /\bskill(?:s)?\b/i, /\brules?\b/i, /\bworkflow\b/i],
  },
  {
    signal: "bug-fix",
    patterns: [
      /\bbugs?\b/i,
      /\bfix\b/i,
      /\bfailing\b/i,
      /\berrors?\b/i,
      /\bbroken\b/i,
      /\bcrash(?:es|ing)?\b/i,
      /\bsửa\s*(?:lỗi|bug)?\b/i,
      /\bsua\s*(?:loi|bug)?\b/i,
      /\blỗi\b/i,
      /\bloi\b/i,
      /\bbị\s*lỗi\b/i,
      /\bbi\s*loi\b/i,
      /\bhỏng\b/i,
      /\bhong\b/i,
      /\bkhông\s*chạy\b/i,
      /\bk\s*chạy\b/i,
      /\bbị\s*kéo\b/i,
      /\bbi\s*keo\b/i,
      /\bkhông\s*nhìn\s*thấy\b/i,
      /\bk\s*nhìn\s*thấy\b/i,
      /\bbị\s*mất\b/i,
      /\bbi\s*mat\b/i,
      /\bvỡ\s*layout\b/i,
      /\btràn\s*màn\s*hình\b/i,
      /\bbị\s*che\b/i,
      /\bbi\s*che\b/i,
      /\blỗi\s*hiển\s*thị\b/i,
    ],
  },
  {
    signal: "test-first",
    patterns: [
      /\btdd\b/i,
      /\btest[- ]first\b/i,
      /\btest trước\b/i,
      /\bviết test trước\b/i,
      /\bviet test truoc\b/i,
      /\bkiểm tra tự động\b/i,
      /\bkiem tra tu dong\b/i,
      /\bbài kiểm tra\b/i,
      /\bviết test\b/i,
      /\bunit test\b/i,
      /\btest suite\b/i,
    ],
  },
  {
    signal: "ui-work",
    patterns: [
      /\bui\b/i,
      /\bdashboard\b/i,
      /\breact\b/i,
      /\bfrontend\b/i,
      /\binterface\b/i,
      /\bgiao diện\b/i,
      /\bgiao dien\b/i,
      /\bmàn hình\b/i,
      /\bman hinh\b/i,
      /\btrang\b/i,
      /\bcomponent\b/i,
      /\btailwind\b/i,
      /\bcss\b/i,
      /\bvideo\b/i,
      /\bsong ngữ\b/i,
      /\bsong ngu\b/i,
      /\blayout\b/i,
      /\boverflow\b/i,
      /\bplayer\b/i,
      /\bphụ đề\b/i,
      /\bhiển thị\b/i,
    ],
  },
  {
    signal: "review",
    patterns: [
      /\breview\b/i,
      /\bPR\b/,
      /\bpull request\b/i,
      /\bmerge\b/i,
      /\bcode review\b/i,
      /\bđánh giá\b/i,
      /\bdanh gia\b/i,
      /\bxem lại\b/i,
      /\bxem lai\b/i,
      /\bkiểm tra code\b/i,
      /\bkiem tra code\b/i,
    ],
  },
  {
    signal: "mcp",
    patterns: [/\bmcp\b/i, /\bmodel context protocol\b/i],
  },
  {
    signal: "verification",
    patterns: [/\bverify\b/i, /\bverification\b/i, /\bvalidate\b/i, /\blint\b/i, /\bcomplete\b/i, /\bdone\b/i],
  },
  {
    signal: "feature-build",
    patterns: [
      /\bbuild feature\b/i,
      /\bimplement feature\b/i,
      /\bnew feature\b/i,
      /\badd feature\b/i,
      /\bcreate feature\b/i,
      /\bxây dựng tính năng\b/i,
      /\btính năng mới\b/i,
      /\btinh nang moi\b/i,
      /\bthêm chức năng\b/i,
      /\bthem chuc nang\b/i,
      /\bchức năng mới\b/i,
      /\bchuc nang moi\b/i,
      /\btạo trang\b/i,
      /\btao trang\b/i,
      /\bthêm tính năng\b/i,
      /\bphát triển tính năng\b/i,
      /\bviết logic\b/i,
      /\bviet logic\b/i,
      /\bviết hàm\b/i,
      /\bviet ham\b/i,
      /\btính tổng tiền\b/i,
      /\btạo mới\b/i,
      /\btao moi\b/i,
    ],
  },
  {
    signal: "spec-planning",
    patterns: [
      /\bspec\b/i,
      /\bprd\b/i,
      /\bspec-driven\b/i,
      /\buser stor(?:y|ies)\b/i,
      /\bacceptance criteria\b/i,
      /\bđặc tả\b/i,
      /\bdac ta\b/i,
      /\byêu cầu kỹ thuật\b/i,
    ],
  },
  {
    signal: "agent-system",
    patterns: [/\bmulti-agent\b/i, /\borchestrat(?:e|ion)\b/i, /\bstate machine\b/i, /\bagent memory\b/i, /\beval(?:s|uation)\b/i, /\bguardrail\b/i],
  },
  {
    signal: "security",
    patterns: [
      /\bsecurity\b/i,
      /\bvulnerabilit(?:y|ies)\b/i,
      /\bowasp\b/i,
      /\bpenetration\b/i,
      /\bguardrails?\b/i,
      /\bbảo mật\b/i,
      /\bbao mat\b/i,
      /\ban toàn\b/i,
      /\blỗ hổng\b/i,
      /\brò rỉ\b/i,
      /\bro ri\b/i,
    ],
  },
  {
    signal: "domain-design",
    patterns: [/\bdomain model\b/i, /\bddd\b/i, /\bentit(?:y|ies)\b/i, /\baggregate\b/i, /\bcodebase design\b/i],
  },
  {
    signal: "backend-api",
    patterns: [
      /\bbackend api\b/i,
      /\brest api\b/i,
      /\bdatabase schema\b/i,
      /\bmigration\b/i,
      /\bendpoint\b/i,
      /\bjwt\b/i,
      /\brefresh tokens?\b/i,
      /\bauth\b/i,
      /\bauthentication\b/i,
      /\bxác thực\b/i,
      /\bxac thuc\b/i,
      /\bđăng nhập\b/i,
      /\bdang nhap\b/i,
    ],
  },
  {
    signal: "research",
    patterns: [
      /\bresearch\b/i,
      /\binvestigat(?:e|ion)\b/i,
      /\bfind out\b/i,
      /\btìm hiểu\b/i,
      /\btim hieu\b/i,
      /\bnghiên cứu\b/i,
      /\bnghien cuu\b/i,
    ],
  },
];

export const SKILL_SIGNAL_WEIGHTS: Record<string, Record<string, number>> = {
  "engineering/improve-codebase-architecture": {
    "workflow-optimization": 58,
    architecture: 35,
    "context-engineering": 8,
    "skill-authoring": 12,
  },
  "engineering/context-engineering": {
    "workflow-optimization": 46,
    "context-engineering": 42,
    architecture: 12,
    mcp: 6,
  },
  "productivity/writing-skills": {
    "workflow-optimization": 44,
    "skill-authoring": 42,
    "context-engineering": 6,
  },
  "engineering/diagnose": {
    "bug-fix": 44,
    "test-first": 8,
    verification: 6,
  },
  "engineering/tdd": {
    "test-first": 58,
    "bug-fix": 22,
    verification: 5,
  },
  "engineering/lint-and-validate": {
    verification: 28,
    "bug-fix": 10,
    "test-first": 10,
    review: 5,
  },
  "productivity/verification-before-completion": {
    verification: 34,
    "bug-fix": 12,
    "test-first": 10,
    "workflow-optimization": 10,
    review: 18,
    "ui-work": 8,
  },
  "productivity/brainstorming": {
    "ui-work": 34,
    "workflow-optimization": 8,
    architecture: 5,
    "feature-build": 20,
    "spec-planning": 25,
  },
  "design/frontend-design": {
    "ui-work": 58,
  },
  "design/ui-styling": {
    "ui-work": 46,
  },
  "engineering/code-review": {
    review: 68,
    verification: 10,
  },
  "operations/mcp-builder": {
    mcp: 42,
    architecture: 6,
  },
  "operations/mcp-management": {
    mcp: 32,
    "context-engineering": 8,
  },
  "productivity/subagent-driven-development": {
    "feature-build": 48,
    architecture: 10,
  },
  "productivity/spec-driven-development": {
    "spec-planning": 58,
    "feature-build": 16,
  },
  "agent-frameworks/multi-agent-orchestration": {
    "agent-system": 56,
    architecture: 14,
  },
  "agent-frameworks/workflow-state-machines": {
    "agent-system": 50,
    architecture: 18,
  },
  "security/ai-guardrails": {
    security: 54,
    "agent-system": 24,
  },
  "kilo-kit/development/security": {
    security: 48,
  },
  "engineering/domain-modeling": {
    "domain-design": 56,
    architecture: 20,
  },
  "engineering/backend-development": {
    "backend-api": 54,
    architecture: 12,
  },
  "engineering/research": {
    research: 54,
  },
};

export const WORKFLOWS: Record<string, WorkflowDefinition[]> = {
  "workflow-optimization": [
    {
      id: "engineering/improve-codebase-architecture",
      role: "primary",
      reason: "Find the modules where workflow and rule responsibilities are shallow or duplicated.",
    },
    {
      id: "engineering/context-engineering",
      role: "support",
      reason: "Tune context loading, routing metadata, and token-aware skill selection.",
    },
    {
      id: "productivity/writing-skills",
      role: "support",
      reason: "Improve rule wording, trigger metadata, and skill authoring discipline.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Require evidence before claiming workflow improvements are complete.",
    },
  ],
  "bug-test-first": [
    {
      id: "engineering/diagnose",
      role: "prepare",
      reason: "Reproduce and rank hypotheses before changing behavior.",
    },
    {
      id: "engineering/tdd",
      role: "primary",
      reason: "Write the failing regression test before implementation.",
    },
    {
      id: "engineering/lint-and-validate",
      role: "quality",
      reason: "Run static checks after implementation changes.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify tests and requirements before making completion claims.",
    },
  ],
  review: [
    {
      id: "engineering/code-review",
      role: "primary",
      reason: "Prioritize defects, regressions, and missing tests before summary.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Require fresh evidence before accepting review or merge readiness.",
    },
  ],
  ui: [
    {
      id: "productivity/brainstorming",
      role: "prepare",
      reason: "Resolve design intent before creating or modifying UI behavior.",
    },
    {
      id: "design/frontend-design",
      role: "primary",
      reason: "Design the production-grade frontend experience.",
    },
    {
      id: "design/ui-styling",
      role: "support",
      reason: "Apply accessible styling, component, and responsive layout patterns.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify UI implementation evidence before completion claims.",
    },
  ],
  bug: [
    {
      id: "engineering/diagnose",
      role: "primary",
      reason: "Reproduce, minimize, hypothesize, instrument, fix, and regression-test.",
    },
    {
      id: "engineering/lint-and-validate",
      role: "quality",
      reason: "Run static checks after implementation changes.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify the fix before claiming success.",
    },
  ],
  mcp: [
    {
      id: "operations/mcp-builder",
      role: "primary",
      reason: "Design or update MCP tools/resources/prompts with clear interfaces.",
    },
    {
      id: "operations/mcp-management",
      role: "support",
      reason: "Inspect and manage MCP server capabilities efficiently.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Run MCP build/test/smoke evidence before completion claims.",
    },
  ],
  "feature-build": [
    {
      id: "productivity/brainstorming",
      role: "prepare",
      reason: "Clarify user intent, requirements, and design boundaries before writing code.",
    },
    {
      id: "productivity/writing-plans",
      role: "prepare",
      reason: "Create structured implementation plan with task dependencies and checkpoints.",
    },
    {
      id: "productivity/subagent-driven-development",
      role: "primary",
      reason: "Execute implementation tasks with independent review loops.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify tests and requirements before making completion claims.",
    },
  ],
  spec: [
    {
      id: "productivity/brainstorming",
      role: "prepare",
      reason: "Align on feature scope and user journeys.",
    },
    {
      id: "productivity/spec-driven-development",
      role: "primary",
      reason: "Structure executable specifications with Given/When/Then acceptance criteria.",
    },
    {
      id: "engineering/to-tickets",
      role: "support",
      reason: "Decompose specification into independently testable vertical slices.",
    },
    {
      id: "productivity/writing-plans",
      role: "support",
      reason: "Generate concrete implementation plan from the approved specification.",
    },
  ],
  "agent-system": [
    {
      id: "agent-frameworks/multi-agent-orchestration",
      role: "primary",
      reason: "Define multi-agent topology, supervisor routing, and handoff protocols.",
    },
    {
      id: "agent-frameworks/workflow-state-machines",
      role: "support",
      reason: "Model agent transitions, checkpointing, and durable execution state machines.",
    },
    {
      id: "agent-frameworks/agent-memory",
      role: "support",
      reason: "Configure hierarchical memory and fact supersession loops.",
    },
    {
      id: "operations/agent-observability",
      role: "quality",
      reason: "Trace tool calls, token budgets, and loop detection metrics.",
    },
  ],
  security: [
    {
      id: "security/ai-guardrails",
      role: "prepare",
      reason: "Evaluate threat models, prompt injection risks, and sandbox boundaries.",
    },
    {
      id: "kilo-kit/development/security",
      role: "primary",
      reason: "Apply secure coding principles and OWASP mitigations.",
    },
    {
      id: "engineering/vulnerability-scanner",
      role: "support",
      reason: "Scan attack surface and prioritize security remediation.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Run automated security checks and verification gates.",
    },
  ],
  "domain-modeling": [
    {
      id: "engineering/wayfinder",
      role: "prepare",
      reason: "Navigate codebase orientation and discover domain boundaries.",
    },
    {
      id: "engineering/domain-modeling",
      role: "primary",
      reason: "Extract ubiquitous language, entity relationships, and aggregate boundaries.",
    },
    {
      id: "engineering/codebase-design",
      role: "support",
      reason: "Design deep module interfaces and decoupled seam boundaries.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify model consistency against codebase implementation.",
    },
  ],
  "backend-api": [
    {
      id: "productivity/brainstorming",
      role: "prepare",
      reason: "Clarify API contracts, request/response schemas, and data boundaries.",
    },
    {
      id: "engineering/backend-development",
      role: "primary",
      reason: "Implement robust API endpoints, middleware, and business logic.",
    },
    {
      id: "engineering/database-design",
      role: "support",
      reason: "Optimize schema design, indexing strategy, and database access patterns.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Run integration tests and static analysis before completion.",
    },
  ],
  research: [
    {
      id: "engineering/wayfinder",
      role: "prepare",
      reason: "Locate primary entry points and relevant architectural components.",
    },
    {
      id: "engineering/research",
      role: "primary",
      reason: "Investigate against high-trust primary sources and record findings.",
    },
    {
      id: "engineering/domain-modeling",
      role: "support",
      reason: "Refine domain definitions and update project documentation.",
    },
  ],
  general: [
    {
      id: "productivity/brainstorming",
      role: "prepare",
      reason: "Clarify user intent, requirements, and design boundaries before writing code.",
    },
    {
      id: "productivity/writing-plans",
      role: "prepare",
      reason: "Create structured implementation plan with task dependencies and checkpoints.",
    },
    {
      id: "productivity/verification-before-completion",
      role: "quality",
      reason: "Verify tests and requirements before making completion claims.",
    },
  ],
};
