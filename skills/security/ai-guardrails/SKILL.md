---
name: "ai-guardrails"
description: >-
  Use when building autonomous LLM agents operating in live environments. Protects against prompt injection, tool abuse, data exfiltration, and runaway loops. Keywords: guardrails, prompt injection, IPI, safety, sandboxing, NeMo, LLM Guard.
---

# AI Guardrails & Defense-in-Depth

## Overview
The `ai-guardrails` skill provides a comprehensive framework for securing autonomous LLM agents. As agents interact with untrusted external data sources and perform actions on behalf of users, the attack surface expands significantly. This skill focuses on implementing multi-layered defenses to ensure agent safety, reliability, and integrity in live environments.

## Threat Model
Autonomous agents face unique security challenges that require a proactive defense strategy:
1. **Direct Prompt Injection (DPI)**: Malicious input explicitly attempting to hijack the agent's core instructions.
2. **Indirect Prompt Injection (IPI)**: Injected instructions hidden in retrieved web pages, emails, or files that the agent processes.
3. **Prompt Leaking**: Attempts to extract system instructions, internal reasoning paths, or proprietary data.
4. **Data Exfiltration**: Unauthorized access and transfer of PII or sensitive internal data to external endpoints.
5. **SSRF (Server-Side Request Forgery) via Tool Use**: Leveraging agent-enabled tools to probe internal networks or access forbidden resources.
6. **Agent Loop Exploitation**: Crafting inputs that force the agent into infinite loops or resource-exhaustion scenarios.
7. **Tool Abuse**: Circumventing intended tool usage patterns to execute malicious commands.

## Core Defenses
### Dual-LLM & Context Boundary Isolation
- **Pattern**: Isolate instructions from data.
- **Implementation**: Separate the *Instruction Stream* (system prompts, task logic) from the *Content Stream* (retrieved data).
- **Mechanism**: Use a secondary, smaller "Sanitizer LLM" to filter untrusted content before it reaches the main reasoning engine.

### Indirect Prompt Injection (IPI) Defenses
- **Detection**: Utilize structured markup (e.g., XML tags like `<untrusted_content>`) to wrap retrieved data.
- **Neutralization**: Instruct the agent to strictly ignore any instructions contained within tagged content blocks.

### Runtime Input/Output Validation
- **Scan**: Implement real-time scanning for PII, toxic payloads, and jailbreak patterns.
- **Tools**: Integrate with established safety frameworks like [LLM Guard](https://llm-guard.com/) or [Llama Guard](https://www.llama.com/docs/how-to-guides/llama-guard/) at both input and output boundaries.

### Programmable Dialog Rails
- **Statefulness**: Use [NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) or [Colang](https://github.com/NVIDIA/NeMo-Guardrails/blob/main/docs/user_guides/colang-introduction.md) to define strict state machines.
- **Boundaries**: Explicitly define allowed transitions and prohibit restricted behaviors (e.g., "The agent must never disclose system version information").

### Tool Authorization & Sandboxing
- **Least-Privilege**: Map tools to specific user roles; strictly limit agent access to the filesystem, APIs, and network.
- **Dry-Runs**: Implement a mandatory human-in-the-loop (HITL) step for critical actions (e.g., file deletion, database writes).
- **Circuit Breakers**: Introduce automated execution limits that pause tool calls if suspicious patterns are detected.

### Rate Limiting & Loop Detection
- **Monitoring**: Track token consumption and step latency.
- **Detection**: Use sequence analysis to identify repetitive or circular reasoning paths.
- **Intervention**: Immediately terminate agents exhibiting abnormal token spikes or infinite loops.

## Implementation Patterns
1. **The Wrapper Pattern**: Wrap all tool inputs and outputs with validation middleware.
2. **The "Human-in-the-loop" Gate**: Require manual approval for all side-effecting operations.
3. **Strict Schema Enforcement**: Use Pydantic or similar libraries to enforce rigid structure for all tool arguments.

## Quality Gates
- **Red-Teaming**: Before deployment, run automated IPI and jailbreak attempts against the agent.
- **Regression Testing**: Maintain a test suite of known malicious inputs that the agent must correctly identify and reject.
- **Observability**: Log all agent decisions, especially those where a guardrail triggered a block.

## References
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NVIDIA NeMo Guardrails Documentation](https://github.com/NVIDIA/NeMo-Guardrails)
- [LLM Guard Documentation](https://llm-guard.com/)
- [Llama Guard Technical Report](https://arxiv.org/abs/2312.06674)
- [Human-in-the-Loop AI Principles](https://example.com/hitl-principles)

---
*End of AI Guardrails Skill Documentation*
