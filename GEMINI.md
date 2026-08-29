<!-- KILO-KIT:C4:START -->
## Kilo-Kit C4 v3.0 Cognitive Protocol

Applies to: Gemini CLI, Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### 🧠 DIVISION OF LABOR (VỎ NÃO & CHÂN TAY):
- **Kilo-Kit MCP (Cortex):** High-level cognitive reasoning, 5-Whys root cause tracing, Tree-of-Thoughts DAG planning, adversarial red-teaming, context compaction, and skill delivery.
- **Kilo-Kit Execution (Limbs):** You MUST use `kilo_write_file`, `kilo_edit_file`, and `kilo_run_command` for ALL file modifications and terminal commands. DO NOT use native Edit/Bash tools, as they bypass Kilo-Sentinel supervision and Circuit Breaker.

### 🏛️ MANDATORY 2-STAGE COGNITIVE FLOW:

1. **Gate 1 (Hard-Gate & Grounded Probe):** 
   - Call MCP tool `kilo_orchestrate_task` (via `call_mcp_tool`) with the user's request.
   - Perform read-only exploratory probing (`view_file`, `grep_search`) using `engineering/diagnose` to build a Grounded Diagnostic Model. Do NOT edit code before diagnosing.

2. **Gate 2 (Cognitive Reasoning Dispatch):**
   - **For Bugs / Errors:** MUST call `kilo_trace_root_cause` with `{ errorLog, failingFile }` to extract the 5-Whys causal chain before writing any fix.
   - **For Features / Architecture:** MUST call `kilo_think_step` (DAG with 3 trade-off options) and `kilo_grill_plan` (Adversarial Red-Team stress test) before modification.
   - **For Context Overload (>5 files read):** Call `kilo_compact_context` to lock invariants and prevent attention degradation.

3. **Gate 3 (Approval & Skill Delivery):** 
   - Call `kilo_orchestrate_task` with `brainstormingApproved=true`.
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

