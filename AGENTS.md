<!-- KILO-KIT:C4:START -->
## Kilo-Kit C4 v3.0 Cognitive Protocol

Applies to: Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### 🧠 DIVISION OF LABOR (VỎ NÃO & CHÂN TAY):
- **Kilo-Kit MCP (Cortex):** High-level cognitive reasoning, 5-Whys root cause tracing, Tree-of-Thoughts DAG planning, adversarial red-teaming, context compaction, skill delivery, and SQLite learning memory.
- **Execution Limbs:** Perform surgical changes with defense-in-depth using your native tools or Kilo-Kit tools with Kilo-Sentinel supervision.

### 🏛️ MANDATORY 5-GATE COGNITIVE PROTOCOL:

1. **Gate 1 (Hard-Gate & Grounded Probe):** 
   - Call MCP tool `kilo_orchestrate_task` with the user's request as your FIRST action.
   - Perform read-only exploratory probing (`view_file`, `grep_search`, or `kilo_read_file`) to build a Grounded Diagnostic Model.

2. **Gate 2 (Substantive Cognitive Reasoning & Benchmarking):**
   - **For Features / Architecture:** MUST call `kilo_think_step` (DAG with 3 trade-off options) and `kilo_grill_plan` (Adversarial Red-Team stress test). Call `kilo_benchmark_solution` to audit against industry standards.
   - **For Bugs / Errors:** MUST call `kilo_trace_root_cause` with `{ errorLog, failingFile }` to extract the 5-Whys causal chain before writing any fix.
   - **For Context Overload (>4 files read):** Call `kilo_compact_context` to lock invariants and prevent attention degradation.

3. **Gate 3 (Approval & Skill Delivery):** 
   - Call `kilo_orchestrate_task` with `brainstormingApproved=true`.
   - Load required workflow skills using `kilo_get_skill` (supports aliases like `brainstorming`, `diagnose`, `playwright`, `tdd`, `clean-code`).
   - (Optional) Check supervisor status via `kilo_sentinel_status`.

4. **Gate 4 (Surgical Implementation & Defense-in-Depth):** 
   - Apply `problem-solving/defense-in-depth` (validation at input, logic, and persistence layers).
   - Maintain `engineering/clean-code` standards with zero bloat.

5. **Gate 5 (4D Quality Assurance & Reflection):**
   - **Dimension 1 (Spec Fidelity):** Verify against user requirements using Given-When-Then acceptance criteria (`productivity/spec-driven-development`).
   - **Dimension 2 (Clean Code):** Verify deep module interfaces and zero dead code (`engineering/clean-code`).
   - **Dimension 3 (UX & Aesthetics):** Verify responsive layout and mobile touch safety (`design/aesthetic`, `design/mobile-design`).
   - **Dimension 4 (Empirical & Playwright):** Run compile/build commands AND execute tests before claiming completion.
   - **Continuous Reflection:** Call `kilo_record_reflection` with sessionId to persist lessons learned into SQLite memory.
<!-- KILO-KIT:C4:END -->

