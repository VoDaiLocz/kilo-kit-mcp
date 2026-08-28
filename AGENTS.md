<!-- KILO-KIT:C4:START -->
## Kilo-Kit C4 v3.0 Cognitive Protocol

Applies to: Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### 🧠 DIVISION OF LABOR (VỎ NÃO & CHÂN TAY):
- **Kilo-Kit MCP (Cortex):** High-level cognitive reasoning, 5-Whys root cause tracing, Tree-of-Thoughts DAG planning, adversarial red-teaming, context compaction, and skill delivery.
- **Native Tools (Limbs):** Code editing, file viewing, terminal executions.

### 🏛️ MANDATORY 5-GATE COGNITIVE PROTOCOL:

1. **Gate 1 (Hard-Gate & Grounded Probe):** 
   - Call MCP tool `kilo_orchestrate_task` (via `call_mcp_tool`) with the user's request.
   - Perform read-only exploratory probing (`view_file`, `grep_search`) using `engineering/diagnose` to build a Grounded Diagnostic Model. Do NOT edit code before diagnosing.

2. **Gate 2 (Substantive Cognitive Reasoning — ANTI-SUPERFICIALITY):**
   - **For Features / Architecture:** MUST call `kilo_think_step` with a substantive 3-option Trade-Off DAG (comparing Option A, Option B, and Option C with pros/cons/blast-radius) AND call `kilo_grill_plan` (Adversarial Red-Team stress test). One-liner or placeholder thoughts are STRICTLY FORBIDDEN.
   - **For Bugs / Errors:** MUST call `kilo_trace_root_cause` with `{ errorLog, failingFile }` to extract the full 5-Whys causal chain before proposing any fix.
   - **For Context Overload (>5 files read):** Call `kilo_compact_context` to lock invariants and prevent attention degradation.
   - **Anti-Bypass Rule:** DO NOT use native limbs (`run_command`, `replace_file_content`, `write_to_file`) to bypass Gate 2. Code modification before Gate 2 completion is a protocol violation.

3. **Gate 3 (Approval & Skill Delivery):** 
   - Call `kilo_orchestrate_task` with `brainstormingApproved=true` and the valid `sessionId`.
   - Load required skills using `kilo_get_skill` (supports aliases like `brainstorming`, `diagnose`, `playwright`, `tdd`).

4. **Gate 4 (Surgical Implementation & Defense-in-Depth):** 
   - Apply `problem-solving/defense-in-depth` (validation at input, logic, and persistence layers).
   - Maintain `engineering/clean-code` standards with zero bloat.

5. **Gate 5 (4D Quality Assurance & Playwright E2E Verification):**
   - **Dimension 1 (Spec Fidelity):** Verify against user requirements using Given-When-Then acceptance criteria (`productivity/spec-driven-development`).
   - **Dimension 2 (Clean Code):** Verify deep module interfaces and zero dead code (`engineering/clean-code`).
   - **Dimension 3 (UX & Aesthetics):** Verify responsive layout and mobile touch safety (`design/aesthetic`, `design/mobile-design`).
   - **Dimension 4 (Empirical & Playwright):** Run compile/build commands AND execute Playwright E2E tests (`engineering/playwright`) with real browser/DOM verification before claiming completion.
<!-- KILO-KIT:C4:END -->
