---
name: "human-in-the-loop"
description: >-
  Use when designing human approval gates for high-stakes agent actions. Keywords: human-in-the-loop, HITL, approval gate, checkpoint, confirmation, risk-tiered, action review.
---

# Human-in-the-Loop (HITL) Patterns

## Overview
The "Human-in-the-Loop" (HITL) skill provides a standardized framework for integrating human oversight into agentic workflows. By tiering actions based on risk, we ensure autonomy is utilized safely for low-impact tasks while maintaining rigorous human control over high-impact operations. This skill aligns with the C4 Runtime Protocol to prevent "black box" agent behavior.

## When To Use
- Before performing destructive file operations (e.g., `rm -rf`, bulk overwrites).
- Before triggering deployment pipelines or infrastructure changes.
- Before making financial or security-impacting decisions.
- When an agent's confidence in a plan or outcome is below a critical threshold.
- When the user requires explicit auditability of agent intent.

## Risk-Tiered Action Matrix
To manage friction, apply the appropriate gate based on the action category:

| Tier | Category | Mechanism | User UX |
| :--- | :--- | :--- | :--- |
| **0** | **Informational** | Auto-Approve | Logged in background/console. |
| **1** | **Standard Edit** | Warn/Confirm | Inline diff preview + "Proceed". |
| **2** | **Destructive/Critical** | Hard Gate | Explicit approval required; blocked until sign-off. |
| **3** | **Financial/Deployment** | Multi-Factor/Formal Audit | Requires explicit sign-off via UI/Artifact link. |

## Checkpoint Design Patterns
1. **The Plan Preview:** Agents must expose the plan artifact before execution.
2. **Structured Clarification:** Use tool-based, multi-choice queries to reduce ambiguity, avoiding open-ended questions that fatigue users.
3. **Delta Validation:** Always present a `diff` or specific "what is changing" summary before writing.
4. **Resumption Points:** Save state tokens to ensure that if a session drops, the human can review the exact state, modify if needed, and resume.

## Implementation Workflow
1. **Identify Risk:** Evaluate the proposed task against the Risk-Tiered Action Matrix.
2. **Surface Intent:** Generate an "Action Summary" using the `ask_question` tool or an artifact.
3. **Await Authorization:** Use non-blocking pauses (or asynchronous messaging) to wait for approval.
4. **Execute with Trace:** Perform the action under a logging wrapper that records the authorized state ID.
5. **Verify:** Immediately follow with a verification check to confirm the expected outcome.

## C4 Integration
HITL checkpoints are first-class citizens in C4:
- **Brainstorming Gate:** Agents must have their proposed path confirmed by the user before transitioning to `ready`.
- **Verification Gate:** After execution, the agent must present the "result vs. expectation" for user sign-off to close the cycle.

## UX Patterns
- **Transparency:** Clearly display *why* a decision was made.
- **Micro-interactions:** Keep confirmation dialogs context-aware (e.g., provide links to the specific files being modified).
- **Rollback Safety:** Always provide an "Undo/Rollback" pathway for any high-risk action taken.

## Anti-patterns
- **Over-gating:** Asking for permission on routine/low-impact tasks (causes "alert fatigue").
- **Under-gating:** Proceeding with high-risk/destructive actions without explicit, documented user consent (unsafe autonomy).
- **Vague Prompts:** "Is this okay?" (inadequate description of change). Always use: "I am about to replace X with Y. Do you approve?"

## References
- [KILO-KIT C4 Runtime Protocol](file:///home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/kilo-kit-core/SKILL.md)
- [Systematic Debugging](file:///home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/systematic-debugging/SKILL.md)
- [Verification Before Completion](file:///home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/verification-before-completion/SKILL.md)
