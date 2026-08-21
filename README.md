[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/vodailocz-kilo-kit-mcp-badge.png)](https://mseep.ai/app/vodailocz-kilo-kit-mcp)

<p align="center">
  <img src="assets/social-preview.png" alt="Kilo-Kit social preview" width="100%">
</p>

<p align="center">
  <a href="https://github.com/VoDaiLocz/KILO-KIT/stargazers"><img src="https://img.shields.io/github/stars/VoDaiLocz/KILO-KIT?style=for-the-badge&logo=github&label=Stars&color=18181b&labelColor=0f172a" alt="GitHub stars"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT/commits/main"><img src="https://img.shields.io/github/last-commit/VoDaiLocz/KILO-KIT?style=for-the-badge&logo=git&label=Last%20commit&color=22c55e&labelColor=0f172a" alt="Last commit"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT/graphs/contributors"><img src="https://img.shields.io/github/contributors/VoDaiLocz/KILO-KIT?style=for-the-badge&logo=github&label=Contributors&color=f97316&labelColor=0f172a" alt="Contributors"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT/actions/workflows/publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/VoDaiLocz/KILO-KIT/publish.yml?style=for-the-badge&logo=githubactions&label=Publish&color=22c55e&labelColor=0f172a" alt="Publish workflow"></a>
  <a href="https://www.npmjs.com/package/@vodailoc/kilo-kit-mcp"><img src="https://img.shields.io/npm/v/@vodailoc/kilo-kit-mcp?style=for-the-badge&logo=npm&label=npm&color=ef4444&labelColor=0f172a" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@vodailoc/kilo-kit-mcp"><img src="https://img.shields.io/npm/dm/@vodailoc/kilo-kit-mcp?style=for-the-badge&logo=npm&label=downloads&color=0284c7&labelColor=0f172a" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/VoDaiLocz/KILO-KIT?style=for-the-badge&label=License&color=64748b&labelColor=0f172a" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/skills-172-06b6d4?style=for-the-badge&labelColor=0f172a" alt="172 skills">
  <img src="https://img.shields.io/badge/MCP-ready-14b8a6?style=for-the-badge&logo=modelcontextprotocol&labelColor=0f172a" alt="MCP ready">
  <img src="https://img.shields.io/badge/Codex-ready-111827?style=for-the-badge&logo=openai&labelColor=0f172a" alt="Codex ready">
  <img src="https://img.shields.io/badge/Trusted%20Publishing-OIDC-8b5cf6?style=for-the-badge&logo=githubactions&labelColor=0f172a" alt="Trusted publishing">
  <img src="https://img.shields.io/badge/Node-%3E%3D20-339933?style=for-the-badge&logo=nodedotjs&labelColor=0f172a" alt="Node >=20">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&labelColor=0f172a" alt="TypeScript 5.9">
</p>

# Kilo-Kit: MCP Workflow Gates for Coding Agents

> **Version:** 1.4.0
> **Author:** Kilo-Kit Team
> **License:** Apache 2.0

Kilo-Kit is a local-first MCP server and skill library for making coding agents follow safer, repeatable workflows before they touch code.

Use it when your agent skips planning, ignores project workflow rules, forgets useful context, or claims work is done before verification.

It packages a curated `skills/` library, an MCP server, and a C4 workflow gate that turns a user request into an auditable loop:

```text
request -> route -> planning gate -> memory check -> workflow release -> verification gate
```

The published package is `@vodailoc/kilo-kit-mcp`.

## Why Use It

| Problem | Kilo-Kit behavior |
| --- | --- |
| Agent starts coding too early | C4 requires planning/brainstorming before substantive work. |
| Agent forgets repo-specific preferences | Optional memory suggests prior decisions before execution. |
| Agent chooses random instructions | Skill routing returns the workflow and first skill to load. |
| Agent says "done" without proof | Verification gate must be satisfied before completion. |
| Different agents behave differently | `kilo-kit-init` writes the same C4 rule for Gemini, Codex, and Claude. |

## What It Provides

| Area | Purpose |
| --- | --- |
| Skill library | Installable `SKILL.md` workflows grouped by engineering, productivity, debugging, design, operations, docs, and more. |
| MCP server | stdio server exposing routing, skill loading, validation, C4 orchestration, memory, and route reports. |
| C4 gate | A closed-loop workflow gate that blocks substantive work until the real brainstorming skill has been followed and approved. |
| Memory | Optional SQLite-backed facts, decisions, sessions, and workflow outcomes. |
| Audit | Optional JSONL trail for C4 state transitions and route decisions. |
| Verification | A returned verification gate that agents must satisfy before claiming completion. |

## Install In Two Steps

Step 1: install the MCP server in your client.

Use the published package in any MCP-capable host:

```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "npx",
      "args": ["-y", "@vodailoc/kilo-kit-mcp"]
    }
  }
}
```

Step 2: bootstrap the host-agent rule in your project.

```bash
npx -y --package=@vodailoc/kilo-kit-mcp kilo-kit-init init --client gemini
npx -y --package=@vodailoc/kilo-kit-mcp kilo-kit-init init --client codex
npx -y --package=@vodailoc/kilo-kit-mcp kilo-kit-init init --client claude
```

Or initialize all supported host files:

```bash
npx -y --package=@vodailoc/kilo-kit-mcp kilo-kit-init init --client all
```

This writes an idempotent Kilo-Kit C4 block to:

| Client | File |
| --- | --- |
| Gemini CLI | `GEMINI.md` |
| OpenAI Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |

The block is wrapped in `KILO-KIT:C4` markers, so running the command again updates the Kilo-Kit section without deleting your existing project rules.

For Codex CLI on Windows, use an npm prefix outside the source checkout so npm does not resolve a local checkout:

```toml
[mcp_servers.kilo-kit]
command = "npm"
args = ["exec", "--prefix", "C:\\Users\\Admin", "--yes", "--package=@vodailoc/kilo-kit-mcp", "--", "kilo-kit-mcp"]
startup_timeout_sec = 60
enabled = true
```

## Why Bootstrap Is Needed

MCP exposes tools, prompts, resources, and server instructions. It does not force every host agent to call those tools automatically.

Kilo-Kit ships the C4 rule in four places:

- MCP server instructions.
- MCP resource `kilo://rules/c4`.
- MCP prompt `kilo-c4-workflow`.
- Host bootstrap files created by `kilo-kit-init`.

The bootstrap file is the reliable part. It tells the host agent to call C4 before implementation instead of waiting for the user to manually request MCP usage.

## C4 Workflow

`kilo_orchestrate_task` is the main C4 entry point. It does not execute code. It routes the request, records state, and releases the next workflow only when the gate conditions are satisfied.

The intended flow is:

```text
1. User sends a substantive task.
2. Agent calls kilo_orchestrate_task(message, context).
3. C4 routes the task and injects productivity/brainstorming first.
4. State becomes brainstorming_required.
5. Agent loads productivity/brainstorming with kilo_get_skill.
6. Agent follows that skill and gets user approval.
7. Agent calls kilo_orchestrate_task again with the same sessionId and brainstormingApproved=true.
8. C4 checks memory suggestions.
9. If suggestions exist, state becomes awaiting_memory_confirmation.
10. Agent accepts or rejects suggestions with memoryConfirmations.
11. State becomes ready.
12. C4 returns finalWorkflow without productivity/brainstorming.
13. Agent loads the first workflow skill with kilo_get_skill.
14. Agent also checks its internal skill list for other relevant skills before coding.
15. Agent executes the workflow and satisfies the returned verificationGate before completion.
```

Read-only requests such as status, show, read, or explain can skip the brainstorming gate.

### C4 States

| State | Meaning |
| --- | --- |
| `brainstorming_required` | Substantive work is blocked until `productivity/brainstorming` is loaded, followed, and approved by the user. |
| `awaiting_memory_confirmation` | C4 found remembered operating preferences. The agent must accept or reject them before execution. |
| `ready` | C4 has released the post-brainstorming workflow and verification gate. |

### Returned Workflow

When C4 is ready, it returns:

- `finalWorkflow`: ordered Kilo-Kit skill steps for the task mode.
- `firstSkillToLoad`: first skill the agent should load with `kilo_get_skill`.
- `verificationGate`: commands and rationale that must pass before completion.
- `nextAction`: the immediate instruction for the agent.
- `auditRef`: present when orchestration audit JSONL is enabled.

The returned workflow is a primary route, not the only context source. Agents must also inspect their own available skill list and load any other relevant skills before implementation.

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `kilo_orchestrate_task` | C4 gate for substantive work. Routes internally, enforces brainstorming first, checks memory, and releases the final workflow. |
| `kilo_route_intent` | Routes a request to recommended skills, task mode, workflow order, rule hierarchy, and decision trail. |
| `kilo_search_skills` | Searches the skill catalog by natural-language query. |
| `kilo_get_skill` | Loads one exact `SKILL.md` with context-safe truncation. |
| `kilo_route_report` | Reports route telemetry, top skills, workflows, score averages, and conflict penalties. |
| `kilo_memory_report` | Reports C4 memory facts, decisions, suggestions, sessions, and workflow outcomes. |
| `kilo_validate_skills` | Runs the skill validation gate. |

## MCP Resources

| Resource | Purpose |
| --- | --- |
| `kilo://skills/index` | Lightweight skill index for discovery. |
| `kilo://core/master` | Core Kilo-Kit master instructions. |
| `kilo://rules/c4` | Minimal host-agent operating rules for the C4 workflow. |
| `kilo://skills/{category}/{skill}` | Dynamic skill resource for one skill. |

## Persistence

Route telemetry is in memory by default. Enable JSONL decision persistence with:

```bash
KILO_KIT_WRITE_DECISIONS=true
KILO_KIT_DECISION_TRAIL_PATH=/absolute/path/decision-trail.jsonl
```

If `KILO_KIT_DECISION_TRAIL_PATH` is not set, route decisions are written to `.kilo/decision-trail.jsonl` under `KILO_KIT_REPO_ROOT`.

C4 memory uses `node:sqlite` when available and defaults to:

```text
~/.kilo-kit/orchestrator.sqlite
```

Override C4 paths with:

```bash
KILO_KIT_MEMORY_PATH=/absolute/path/orchestrator.sqlite
KILO_KIT_ORCHESTRATION_AUDIT_PATH=/absolute/path/orchestration-audit.jsonl
```

C4 memory stores structured facts, decisions, orchestration sessions, and workflow outcomes. The audit file stores append-only state transition events.

## Skill Library

`skills/` is the workflow surface shipped with the package.

| Path | Purpose |
| --- | --- |
| `skills/SKILLS_INDEX.md` | Lightweight index for routing and discovery. |
| `skills/agent-frameworks/` | Multi-agent orchestration, state machines, memory, and MCP patterns. |
| `skills/engineering/` | Engineering architectures, testing, TDD, APIs, databases, and evaluation. |
| `skills/productivity/` | Spec-driven development, planning, and agent coordination. |
| `skills/security/` | AI guardrails, threat modeling, and vulnerability scanning. |
| `skills/problem-solving/` | Root-cause analysis, debugging, and sequential reasoning. |
| `skills/design/` | Frontend design, UI styling, Tailwind, and aesthetic systems. |
| `skills/operations/` | DevOps, MCP management, observability, and server infrastructure. |
| `skills/ai-media/` | Multimodal AI processing, media encoding, and search optimization. |
| `skills/games/` | 2D/3D, Web, and mobile game development workflows. |
| `skills/writing-docs/` | Structured technical documentation, specifications, and slide decks. |
| `skills/kilo-kit/` | Core Kilo-Kit framework and C4 protocol gates. |

Install the full skill library (172 skills):

```bash
npx skills@latest add VoDaiLocz/KILO-KIT
```

Install one category:

```bash
npx skills@latest add VoDaiLocz/KILO-KIT/skills/engineering
```

Install one skill:

```bash
npx skills@latest add VoDaiLocz/KILO-KIT/skills/engineering/tdd
```

## Repository Layout

```text
.
|-- .claude-plugin/       Claude Code entry instructions
|-- .codex/               Codex entry instructions
|-- .cursor-plugin/       Cursor entry instructions
|-- .mcp/                 MCP config examples
|-- .opencode/            OpenCode entry instructions
|-- commands/             Reusable workflow commands
|-- docs/                 Architecture and planning documents
|-- examples/             Example workflows
|-- mcp/                  TypeScript MCP server
|-- skills/               Installable skill library
|-- src/core/             Core framework docs and validator entry files
`-- src/tools/            Skill initialization and validation tools
```

## Local Development

Install, build, test, and smoke-check the MCP server:

```bash
npm --prefix mcp install
npm --prefix mcp run build
npm --prefix mcp run typecheck
npm --prefix mcp test
npm --prefix mcp run smoke
node src/tools/validate-skill.js --all skills
```

Use a local MCP server during development:

```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "node",
      "args": ["/absolute/path/to/KILO-KIT/mcp/dist/server.js"],
      "env": {
        "KILO_KIT_REPO_ROOT": "/absolute/path/to/KILO-KIT"
      }
    }
  }
}
```

## Release

The root package publishes through npm Trusted Publishing from GitHub Actions.

Configure npm once:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `VoDaiLocz/kilo-kit-mcp` |
| Workflow filename | `publish.yml` |

Then run the `Publish Packages` workflow or push a version tag:

```bash
git tag v1.4.0
git push origin v1.4.0
```

The release workflow runs build, typecheck, tests (35/35 passed), smoke check, skill validation (177/177 passed), package dry-run, and publishes to GitHub Packages & npm.

## Roadmap

- v1.4.0: 12 Standardized Workflow DAG pipelines, 172 curated skills catalog, GitHub Packages integration.
- v2.0.0: Local Visual Workflow Builder for C4 sessions, memory, and audit review.

## License

Apache 2.0. See [LICENSE](./LICENSE).
