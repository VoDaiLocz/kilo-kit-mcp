# 🔌 Kilo-Kit MCP Server

> **Version:** 1.8.0  
> **Mode:** C4 Cognitive Gate + Safe Execution Suite + Skill Registry  
> **Transport:** stdio  

The Kilo-Kit MCP server exposes 22 specialized tools, dynamic resources, and prompts for AI coding agents. It enforces server-side hard-gating, cognitive Tree-of-Thoughts reasoning, 5-Whys root cause tracing, clean-code audits, and SQLite memory persistence.

---

## 🎯 22 Tools Suite

| Category | MCP Tool | Purpose |
| :--- | :--- | :--- |
| **Gating & Orchestration** | `kilo_orchestrate_task` | C4 closed-loop gate. Enforces brainstorming and cognitive steps before code mutation |
| | `kilo_route_intent` | Recommend skills, workflow order, rule hierarchy, and decision trail for chat context |
| | `kilo_get_skill` | Load one exact `SKILL.md` with output limits, aliases, and session delivery tracking |
| | `kilo_search_skills` | High-precision semantic and keyword search across 177 skills |
| | `kilo_memory_report` | Inspect persistent SQLite decisions, facts, and sessions |
| | `kilo_record_reflection` | Persist reflections, correct/wrong paths, and lessons to SQLite |
| | `kilo_route_report` | Summarize route telemetry, top skills, workflows, scores, and conflict penalties |
| | `kilo_validate_skills` | Run the Kilo-Kit skill validator summary |
| **Safe Execution Suite** | `kilo_read_file` | Line slicing, size capping, and repository boundary enforcement |
| | `kilo_search_files` | Glob pattern search across directory trees |
| | `kilo_grep_code` | Line-by-line regex and substring search |
| | `kilo_write_file` | Atomic write with Protocol Hard-Gate, clean-code smell audit, and secret detection |
| | `kilo_edit_file` | Targeted search-and-replace with JSON syntax & bracket balancing audit |
| | `kilo_run_command` | Defense-in-depth terminal execution with security guardrails & command filtering |
| **Cognitive Reasoning** | `kilo_think_step` | Tree of Thoughts DAG: Step-by-step reasoning, 3-option trade-off matrix & hypothesis branching |
| | `kilo_grill_plan` | Adversarial Red-Teaming: Inversion, simplification, mobile touch & concurrency stress testing |
| | `kilo_trace_root_cause` | 5-Whys Diagnostic Engine: Recursive causal back-propagation with regression test scaffolding |
| | `kilo_compact_context` | Cognitive Compactor: 40-70% token savings while locking invariants |
| | `kilo_synthesize_skill` | Self-Evolution: Distills solved patterns into reusable skills |
| **Sentinel & Supervision** | `kilo_sentinel_status` | Supervisor Telemetry: Inspects circuit breaker state, step budget, and grounded files list |
| | `kilo_reset_circuit_breaker` | Supervised Reset: Resets tripped circuit breaker with root-cause justification |
| | `kilo_benchmark_solution` | Industry Benchmark: Audits trajectory against GitHub standards and triggers re-planning |

Resources:

| Resource | Purpose |
|----------|---------|
| `kilo://skills/index` | Lightweight skill index |
| `kilo://core/master` | Kilo-Kit master skill |
| `kilo://rules/c4` | Minimal host-agent operating rules for the C4 workflow |
| `kilo://skills/{category}/{skill}` | Dynamic skill resource |

Prompts:

| Prompt | Purpose |
|--------|---------|
| `kilo-c4-workflow` | Run a request through the C4 gate before substantive implementation |
| `kilo-select-skill` | Route a request before implementation |
| `kilo-validate-library` | Run the validation quality gate |

---

## 🚀 Build and Verify

```bash
cd mcp
npm install
npm run build
npm test
npm run smoke
```

Expected verification:

```text
Test Files  14 passed (14)
Tests       62 passed (62)
MCP smoke check passed.
```

---

## 🚀 Industry-Standard Team Rollout (Configuration as Code)

Kilo-Kit follows the industry standard for AI Agent configuration (similar to Aider, Cline, and Claude Code). We strictly separate **Global Tooling** (installed on each developer's machine) from **Project Rules** (committed to your Git repository).

### Step 1: Global Tooling (For all Developers)
Every developer on the team runs this command **once** to install the Kilo-Kit MCP Server globally into their IDEs (Cursor, Claude Code, Windsurf, Antigravity):

```bash
npm install -g @vodailoc/kilo-kit-mcp
kilo-kit-init global
```
*(This sets up the `mcpServers` configurations and global Git aliases `git kilo-init` / `git kilo-clone` on the host machine).*

### Step 2: Project Rules (For Tech Leads)
When setting up a new repository, the Tech Lead generates the C4 Protocol rules for the project:

```bash
kilo-kit-init init --client all
```
This generates `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`. **You must commit these files to your Git repository.** 

### 🔄 The Zero-Config Workflow
When a new developer joins the team and clones the repository, **they do not need to configure anything**. Their globally installed Agent (from Step 1) will automatically read the committed `CLAUDE.md` (from Step 2), binding the local project securely to the Kilo-Kit cognitive engine.

Route telemetry is in-memory by default. To persist route decisions between server runs, set:

```bash
KILO_KIT_WRITE_DECISIONS=true
# optional override:
KILO_KIT_DECISION_TRAIL_PATH=/absolute/path/decision-trail.jsonl
```

When persistence is enabled and no override is provided, decisions are written to `.kilo/decision-trail.jsonl` under the configured repository root.

C4 orchestration memory is global by default at `~/.kilo-kit/orchestrator.sqlite` when Node's SQLite runtime is available. Override it with:

```bash
KILO_KIT_MEMORY_PATH=/absolute/path/orchestrator.sqlite
KILO_KIT_ORCHESTRATION_AUDIT_PATH=/absolute/path/orchestration-audit.jsonl
```

`kilo_orchestrate_task` uses the C4 Brainstorming-First Gate as a skill gate, not a separate C4 questionnaire. Substantive work starts by loading and following `productivity/brainstorming`. After the user approves the brainstorming direction, call `kilo_orchestrate_task` again with `brainstormingApproved=true`; C4 then checks memory suggestions and releases the post-brainstorming workflow.

The released workflow is the primary C4 route, not an exclusive context source. After loading the first C4-selected skill, the agent must still inspect its own available skill list and load any other relevant skills before coding.

Installing the MCP server exposes tools, prompts, resources, and server instructions. It does not force every MCP host to call those tools automatically. If a client does not reliably follow MCP server instructions, use `kilo-kit-init` or add one bootstrap rule to the local agent configuration:

```text
For substantive project work, call kilo_orchestrate_task before implementation and follow the returned C4 state, workflow, and verificationGate.
```

### Codex CLI on Windows

When Codex is opened inside the Kilo-Kit source checkout, `npx -y @vodailoc/kilo-kit-mcp` can resolve the local package instead of the published package. Use an npm prefix outside the repository:

```toml
[mcp_servers.kilo-kit]
command = "npm"
args = ["exec", "--prefix", "C:\\Users\\Admin", "--yes", "--package=@vodailoc/kilo-kit-mcp", "--", "kilo-kit-mcp"]
startup_timeout_sec = 60
enabled = true
```

### Publishing

Kilo-Kit publishes through npm Trusted Publishing, so releases do not require a long-lived npm token or an interactive OTP.

Configure the npm package once:

1. Open `@vodailoc/kilo-kit-mcp` on npm.
2. Go to `Settings` -> `Trusted publishing`.
3. Select `GitHub Actions`.
4. Use repository `VoDaiLocz/KILO-KIT`.
5. Use workflow filename `publish.yml`.

Then publish by running the GitHub Actions workflow `Publish npm package`, or by pushing a version tag:

```bash
git tag v1.3.1
git push origin v1.3.1
```

The workflow runs build, typecheck, tests, smoke, skill validation, package dry-run, and then `npm publish --access public --ignore-scripts` through OIDC.

### Local Development

Build first:

```bash
cd mcp
npm install
npm run build
```

Then configure your MCP-capable client with stdio:

```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "node",
      "args": ["D:/skill/mcp/dist/server.js"],
      "env": {
        "KILO_KIT_REPO_ROOT": "D:/skill"
      }
    }
  }
}
```

Use `.mcp/kilo-kit.example.json` as the portable template.

---

## 🛡️ Security Posture

- Externally read-only by default.
- Route telemetry is in-memory by default; JSONL persistence is opt-in with `KILO_KIT_WRITE_DECISIONS=true`.
- C4 memory stores structured facts and decisions, not raw chat logs.
- No arbitrary filesystem reads.
- Category and skill names must be single kebab-case path segments.
- Repository paths are resolved through an allowlist boundary.
- Tool output is capped to protect context budget.
- Validation runs the existing Kilo-Kit validator and returns a concise summary.

---

## 🧠 Recommended Agent Flow

```text
User request
→ kilo_get_skill(productivity, brainstorming)
→ follow the real /brainstorming hard gate and get user approval
→ kilo_orchestrate_task(message, context, brainstormingApproved=true)
→ accept/reject memory suggestions when relevant
→ kilo_get_skill(category, skill) for the first post-brainstorming workflow skill
→ inspect the agent's internal skill list and load any other relevant skills
→ follow final workflow skills in order
→ kilo_route_report when you need routing analytics
→ kilo_memory_report when you need memory analytics
→ kilo_validate_skills before claiming the skill library is healthy
```
