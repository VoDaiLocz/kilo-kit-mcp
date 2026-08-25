<!-- KILO-KIT:C4:START -->
## Kilo-Kit C4 Workflow Protocol

Applies to: Gemini CLI, Antigravity, Gemini CLI, Claude Code, OpenAI Codex

### CRITICAL HARD-GATE:
BEFORE reading, diagnosing, or editing any file with native tools (Read/Edit/Bash), you MUST call MCP tool `kilo_orchestrate_task` (via `call_mcp_tool`) with the user's request.

1. **Gate 1 (Hard-Gate):** Call `kilo_orchestrate_task` first on every non-trivial task.
2. **Gate 2 (Brainstorming):** If state is `brainstorming_required`, load `productivity/brainstorming` with `kilo_get_skill`, present diagnosis/plan, and get approval.
3. **Gate 3 (Approval):** Call `kilo_orchestrate_task` again with the same `sessionId` and `brainstormingApproved=true`.
4. **Gate 4 (Execution):** When state is `ready`, load workflow skills with `kilo_get_skill` in order.
5. **Gate 5 (Verification):** Run `verificationGate` commands before claiming completion.

Do NOT bypass KILO-KIT orchestration to jump directly into editing code or modifying CSS/JS files.
<!-- KILO-KIT:C4:END -->
