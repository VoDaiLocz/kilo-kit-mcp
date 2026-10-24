[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/vodailocz-kilo-kit-mcp-badge.png)](https://mseep.ai/app/vodailocz-kilo-kit-mcp)

<p align="center">
  <img src="assets/social-preview.png" alt="Kilo-Kit Banner" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vodailocz/kilo-kit-mcp"><img src="https://img.shields.io/npm/v/@vodailocz/kilo-kit-mcp?style=for-the-badge&logo=npm&color=ef4444&labelColor=0f172a" alt="npm version"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT/actions"><img src="https://img.shields.io/badge/Tests-77%2F77%20Passing-22c55e?style=for-the-badge&logo=vitest&labelColor=0f172a" alt="77 Vitest Passing"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT"><img src="https://img.shields.io/badge/Doctor-18%2F18%20Healthy-10b981?style=for-the-badge&logo=stethoscope&labelColor=0f172a" alt="Doctor 18/18 Healthy"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT"><img src="https://img.shields.io/badge/Tools-24%20MCP-8b5cf6?style=for-the-badge&labelColor=0f172a" alt="24 MCP tools"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT"><img src="https://img.shields.io/badge/Skills-180%20Curated-06b6d4?style=for-the-badge&labelColor=0f172a" alt="180 skills"></a>
  <a href="https://github.com/VoDaiLocz/KILO-KIT/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge&labelColor=0f172a" alt="License"></a>
</p>

# Kilo-Kit

> **The Autonomous Cognitive Cortex & Governed Agency Substrate for AI Coding Agents**

Kilo-Kit is an enterprise-grade Model Context Protocol (MCP) server and supervisor engine that transforms raw LLM coding assistants (**GitHub Copilot, Cursor, Windsurf, Claude Code, Gemini CLI**) into disciplined, self-correcting software engineers. It enforces grounded diagnostic probing, Tree-of-Thoughts DAG planning, cross-session memory via SQLite FTS5 BM25, and runtime supervisor guardrails to eliminate blind code edits and infinite loop thrashing.

[Quick Start (30s)](#-quick-start-in-30-seconds) • [Why Kilo-Kit?](#-why-kilo-kit) • [Architecture](#-architecture--c4-protocol) • [IDE Setup](#-ide-integration-guide) • [Core Capabilities](#-core-capabilities) • [Tools Reference](#-mcp-tools-suite-24-tools) • [Skills Catalog](#-curated-skills-catalog-180-skills)

---

## 💡 Why Kilo-Kit?

### The Crisis of Unbounded AI Agency
Modern LLMs are exceptional code generators, but when given autonomous tools without structural guardrails, they suffer from critical operational failure modes:

* **Blind Mutations (Ungrounded Edits):** Agents modify files without reading their contents, dependencies, or type contracts, introducing silent architectural regressions.
* **The Infinite Thrashing Loop:** When a test or build fails, the agent repeats the exact same failing edit 5 to 10 times in a row until credits or context windows are exhausted.
* **Context Collapse & Lost-in-the-Middle:** Unbounded test dumps and terminal traces inject 50,000+ tokens of raw noise, causing severe attention degradation and hallucinated refactoring.
* **Agent Amnesia:** Every new session starts from zero—past mistakes, verified bug fixes, and architectural decisions are completely forgotten across conversations.

### The Solution: Governed Autonomy
Kilo-Kit acts as an intelligent supervisor sitting between the AI agent and your codebase, establishing a balance of **Macro-Determinism** (strict safety boundaries) with **Micro-Agency** (unconstrained local implementation freedom):

* **🛡️ Pre-Flight Grounding Lock:** File modifications are physically rejected at the protocol level if the agent has not inspected the target file during the active session.
* **🛑 Circuit Breaker Tripwire:** Automatically halts execution after 3 consecutive identical actions or repeated failures, forcing structured root-cause analysis.
* **✂️ Smart Truncation (20/80 Rule):** Retains critical command flags, dynamically scans and preserves intermediate exceptions (`FAIL`, `TypeError`, `panic`), and keeps final stack traces while streaming raw verbose output safely to disk.
* **🧠 Persistent BM25 Memory:** Every architectural decision, verified solution, and reflection is indexed in embedded SQLite FTS5 for sub-millisecond retrieval across future sessions.

---

## ⚡ Quick Start (in 30 seconds)

### 1. Zero-Install Instant Setup
Run Kilo-Kit directly with `npx` to automatically detect and configure all installed IDEs on your machine:

```bash
npx @vodailocz/kilo-kit-mcp setup
```

Or install globally for zero-latency local execution:

```bash
npm install -g @vodailocz/kilo-kit-mcp
kilo-kit-setup --local
```

### 2. Verify System Health
Run the 18-point empirical diagnostic suite:

```bash
kilo-kit-doctor
```

```text
🏥 Kilo-Kit System Health Doctor [HEALTHY]
  ✅ PASS Node.js Runtime: Node.js meets requirement (>= 20.0.0).
  ✅ PASS CLI Global Binaries: All CLI binaries resolved in PATH.
  ✅ PASS SQLite Persistence: SQLite verified (14 tables, FTS5 BM25 active, integrity: ok).
  ✅ PASS Skill Library: Successfully indexed all 180/180 skills in repository.
  ✅ PASS Client: GitHub Copilot: Configured in ~/.copilot/mcp-config.json [Local linked binary]
  ✅ PASS Client: Cursor IDE: Configured in ~/.cursor/mcp.json [Local linked binary]
  ✅ PASS Client: Claude Code: Configured in ~/.claude.json [Local linked binary]
  ✅ PASS MCP Server Runtime: All 24 tools registered; functional probe executed successfully.

Summary: Kilo-Kit Doctor: 18/18 checks passed. Overall Status: HEALTHY
```

---

## 🏛️ Architecture & C4 Protocol

Kilo-Kit establishes a strict separation of concerns between **Cognitive Reasoning (Cortex)**, **Supervisor Guardrails (Sentinel)**, and **Safe I/O Execution (Limbs)**:

```
[ Host AI Agent: Cursor / Copilot / Windsurf / Claude / Gemini ]
                               │
                       stdio / JSON-RPC
                               ▼
    ┌────────────────────────────────────────────────────────────┐
    │            KILO-SENTINEL SUPERVISOR MIDDLEWARE             │
    │  • Pre-Flight Grounding Lock    • Loop & Thrashing Tripwire│
    │  • 20/80 Smart Log Truncation   • Step Budget Enforcer     │
    └──────────────────────────┬─────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
    ┌─────────────────────────────┐   ┌──────────────────────────┐
    │    KILO COGNITIVE CORTEX    │   │      SAFE EXECUTION      │
    │  • 4-Tier Adaptive Gating   │   │  • Atomic File Writers   │
    │  • Tree-of-Thoughts DAG     │   │  • AST-Safe File Editors │
    │  • 5-Whys Diagnostic Engine │   │  • Filtered Command Exec │
    │  • 180 Curated Skills       │   └──────────────────────────┘
    └──────────────┬──────────────┘
                   ▼
    ┌─────────────────────────────┐
    │    SQLITE ATOMIC MEMORY     │
    │  • FTS5 BM25 Search Engine  │
    │  • Self-Authoring Skills    │
    │  • Cross-Session Knowledge  │
    └─────────────────────────────┘
```

### The C4 5-Gate Lifecycle
Every non-trivial coding task proceeds through a verifiable state machine:

```mermaid
flowchart LR
    G1["<b>Gate 1: Grounded Probe</b><br/>• BM25 Memory Recall<br/>• Exploratory Read"]
    
    G2["<b>Gate 2: Cognitive Reasoning</b><br/>• 3-Option ToT DAG<br/>• Adversarial Grill<br/>• 5-Whys Root Cause"]
    
    G3["<b>Gate 3: Approval</b><br/>• Plan Locked<br/>• Skills Injected"]
    
    G4["<b>Gate 4: Execution</b><br/>• Defense-in-Depth<br/>• Sentinel Guarded"]
    
    G5["<b>Gate 5: 4D QA</b><br/>• Empirical Tests<br/>• SQLite Reflection"]

    G1 --> G2
    G2 --> G3
    G3 --> G4
    G4 --> G5
    G4 -.->|3x Loop Detected| Breaker["🛑 Circuit Breaker<br/>(Supervised Reset)"]
    Breaker -.-> G1
```

1. **Gate 1 (Grounded Probe):** Recalls relevant past lessons via BM25 ranking and performs read-only codebase reconnaissance.
2. **Gate 2 (Cognitive Reasoning):** Formulates a 3-option trade-off hypothesis DAG (`kilo_think_step`) and conducts adversarial stress-testing (`kilo_grill_plan`).
3. **Gate 3 (Approval & Skills):** Locks the implementation plan and injects domain-specific expert workflows (`kilo_get_skill`).
4. **Gate 4 (Guarded Execution):** Performs surgical code edits backed by atomic writes and syntax validation.
5. **Gate 5 (Empirical QA & Reflection):** Validates changes with automated test runners and Playwright before persisting lessons into SQLite memory.

---

## 💻 IDE Integration Guide

Kilo-Kit integrates natively into any MCP-compliant editor or CLI agent.

| Client | Configuration Path | Command Configuration |
| :--- | :--- | :--- |
| **Cursor IDE** | `~/.cursor/mcp.json` | `{"mcpServers": {"kilo-kit": {"command": "kilo-kit-mcp"}}}` |
| **GitHub Copilot** | `~/.copilot/mcp-config.json` | `{"mcpServers": {"kilo-kit": {"command": "kilo-kit-mcp"}}}` |
| **Claude Code & Desktop** | `~/.claude.json` | `{"mcpServers": {"kilo-kit": {"command": "kilo-kit-mcp"}}}` |
| **Windsurf IDE** | `~/.codeium/windsurf/mcp_config.json` | `{"mcpServers": {"kilo-kit": {"command": "kilo-kit-mcp"}}}` |
| **Google Antigravity & Gemini CLI** | `~/.gemini/antigravity-cli/mcp_config.json` | `{"mcpServers": {"kilo-kit": {"command": "kilo-kit-mcp"}}}` |
| **OpenCode** | `~/.config/opencode/opencode.jsonc` | `{"mcp": {"kilo-kit": {"type": "local", "command": ["kilo-kit-mcp"]}}}` |

---

## ⚡ Core Capabilities

### 1. 🚦 4-Tier Adaptive Task Gating
Replaces rigid one-size-fits-all rituals with task-calibrated execution paths:
* **Tier 0 (Inspect):** Read-only exploration, file searches, regex grep. Immediately ready with zero gate friction.
* **Tier 1 (Micro-fix):** Single-line bug fixes, typo corrections, linter remediations. Fast-path authorization with lightweight validation.
* **Tier 2 (Feature):** Multistage feature implementation and refactoring. Requires Tree-of-Thoughts DAG planning and skill injection.
* **Tier 3 (Critical):** Database migrations, auth workflows, cross-cutting architectural changes. Enforces adversarial red-team grilling and human-in-the-loop checkpoints.

### 2. 🔍 SQLite FTS5 with BM25 Lexical Ranking
Persistent memory engineered for instant recall:
* Sub-millisecond full-text retrieval across thousands of past trajectories, decisions, and reflections.
* Native BM25 relevance ranking surfaces verified past bug fixes before planning starts.
* Prevents agents from repeating mistakes made in previous sessions or branches.

### 3. ✍️ Self-Authoring Skills & Autonomous Evolution
Turns every hard-won bug fix into persistent institutional knowledge:
* Upon resolving complex edge cases, Gate 5 reflections automatically synthesize reusable `SKILL.md` instruction files.
* New skills are dynamically indexed and discoverable across all connected agents via `kilo_get_skill`.

### 4. 🛡️ Kilo-Sentinel Loop & Thrashing Tripwire
Real-time supervisor middleware that protects developer credits and context:
* Blocks file modifications on unread files (enforces grounding).
* Detects repeated identical tool calls and edit thrashing, cutting off execution before runaway token burns occur.
* Offloads complete execution transcripts to disk while enforcing concise, information-dense summaries.

---

## 🧰 MCP Tools Suite (24 Tools)

Kilo-Kit provides a comprehensive, battery-included suite of cognitive and execution tools:

| Group | Tool | Description |
| :--- | :--- | :--- |
| **Orchestration & Memory** | `kilo_orchestrate_task` | Enforces C4 lifecycle gates and 4-tier task classification. |
| | `kilo_route_intent` | Routes intent to optimal workflow chains and task modes. |
| | `kilo_get_skill` | Loads curated `SKILL.md` workflows with fuzzy alias resolution. |
| | `kilo_search_skills` | High-precision keyword and semantic search across 180 skills. |
| | `kilo_memory_report` | Inspects stored SQLite facts, reflections, and session state. |
| | `kilo_remember_fact` | Pins immutable architectural guidelines and ADRs into SQLite. |
| | `kilo_record_reflection` | Persists session lessons and indexes successes into BM25. |
| | `kilo_validate_skills` | Audits skill catalog for schema and structure conformance. |
| **Cognitive Reasoning** | `kilo_think_step` | Tree-of-Thoughts DAG reasoning with 3-option trade-off matrix. |
| | `kilo_grill_plan` | Adversarial Red-Team stress testing (inversion & simplification). |
| | `kilo_trace_root_cause` | 5-Whys diagnostic engine with recursive causal back-propagation. |
| | `kilo_triangulate_research` | Grounded synthesis combining memory, GitHub context, and DAGs. |
| | `kilo_compact_context` | Compresses conversation state by 40-70% while locking invariants. |
| | `kilo_synthesize_skill` | Distills complex resolved patterns into new reusable skills. |
| **Supervisor & Sentinel** | `kilo_sentinel_status` | Inspects circuit breaker state, grounded files, and step budget. |
| | `kilo_reset_circuit_breaker` | Resets tripped circuit breaker with mandatory causal explanation. |
| | `kilo_benchmark_solution` | Audits solution trajectory against established industry patterns. |
| **Safe Execution Limbs** | `kilo_read_file` | Safe reading with line slicing, size capping, and boundary checks. |
| | `kilo_write_file` | Atomic write protected by Grounding Lock, code smell & secret checks. |
| | `kilo_edit_file` | AST-aware target replacement with bracket & syntax validation. |
| | `kilo_run_command` | Guarded command execution with security filters and 20/80 truncation. |
| | `kilo_search_files` | High-speed glob pattern searching across workspaces. |
| | `kilo_grep_code` | Line-by-line regex and pattern matching across repositories. |
| | `kilo_route_report` | Telemetry report on routing confidence, skill selection, and weights. |

---

## 📚 Curated Skills Catalog (180 Skills)

Domain-specific expert engineering workflows bundled directly into the engine:

* **`engineering/` (39 skills):** Clean code standards, backend APIs, Next.js App Router, React patterns, Tailwind CSS v4, Better-Auth, ASP.NET Core, database schema design.
* **`problem-solving/` (24 skills):** Systematic debugging, 5-Whys root cause tracing, collision-zone thinking, inversion exercise, scale game, simplification cascades.
* **`productivity/` (33 skills):** Spec-driven development, TDD workflows, peer code review, plan writing, verification before completion, subagent delegation.
* **`agent-frameworks/` (26 skills):** Agent memory, agentic RAG, multi-agent orchestration, context optimization, workflow state machines, MCP agent patterns.
* **`security/` (22 skills):** AI guardrails, OWASP vulnerability scanner, red-team tactics, defense-in-depth validation, secret scanning.
* **`devops-cloud/` (36 skills):** Cloudflare edge deployment, Docker containers, server management, performance profiling, Playwright automated testing.

*Fuzzy Alias Support:* Calling `kilo_get_skill("tdd")`, `kilo_get_skill("clean-code")`, or `kilo_get_skill("debugging")` automatically resolves to the canonical skill path without requiring directory prefixes.

---

## 📊 Empirical Verification & Quality Benchmarks

| Metric | Vanilla Agent (Prompt Only) | With Kilo-Kit | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Silent Chained Tool Calls** | 65% of turns (empty text) | **0% (100% Narrated)** | Inter-Tool Narration Badge & Guard |
| **Ungrounded Blind Edits** | 42% of sessions | **0% (100% Blocked)** | Pre-Flight Grounding Lock |
| **Infinite Thrashing Loops** | Frequent on hard test failures | **Terminated at 3 repeats** | Kilo-Sentinel Circuit Breaker |
| **Token Longevity** | Degrades at >30k tokens | **Sustained >150k tokens** | Smart 20/80 Truncation & Compaction |
| **Cross-Session Memory** | 0% (Total amnesia) | **Sub-ms BM25 Recall** | SQLite FTS5 Lexical Ranking Engine |
| **Verification Rigor** | Self-declared "everything works" | **100% Empirical Tests** | Native Test Runner & Playwright Gate |

---

## 🧪 Development & Testing

```bash
# Clone repository
git clone https://github.com/VoDaiLocz/KILO-KIT.git
cd KILO-KIT

# Build TypeScript package
npm --prefix mcp install
npm --prefix mcp run build

# Link globally for local testing
npm link

# Run complete Vitest suite (16 files, 77 tests)
npm --prefix mcp test

# Run full 18-point system diagnostics
kilo-kit-doctor

# Validate all 180 skills against YAML schema standards
node src/tools/validate-skill.js --all skills
```

---

## 📄 License

Distributed under the **Apache 2.0 License**. See [LICENSE](LICENSE) for details.
