---
name: "context-optimization"
description: >-
  Use when optimizing token usage, KV cache efficiency, or context window management for LLM agents. Keywords: context optimization, KV cache, prompt caching, token budget, semantic pruning, lost-in-the-middle.
---

# Context Optimization Skill

This skill provides methodologies and best practices for maximizing context window efficiency, reducing token costs, and improving the performance of LLM-based agentic workflows.

## 1. Prompt Cache Alignment

To maximize Key-Value (KV) cache hits, prioritize stability in the early parts of the prompt.

- **Static Prefixes**: Design system prompts to remain identical across agent turns.
- **Tool Order**: Sort tool definitions alphabetically or by frequency of use. Keep this ordering constant.
- **Prefix Consistency**: Reserve the top 70% of the KV cache for global system instructions and tool definitions.
- **Avoid Dynamic Data**: Move dynamic session-specific data (dates, current file list) to the end of the context window.

## 2. Semantic Pruning & AST Compaction

Reduce unnecessary data before sending it to the model.

- **Removal of Non-Essentials**: Strip comments, debug logs, and unused boilerplate code.
- **AST Compaction**: Convert deep code structures into simplified, representative summaries or pseudocode.
- **Whitespace Stripping**: Use minification for configuration files (JSON, YAML) and standard code.
- **Irrelevant Body Dropping**: Replace large, irrelevant function bodies with docstrings or signatures if the model doesn't need to reason about the implementation details.

## 3. Lost-in-the-Middle Mitigation

LLMs often suffer from recall degradation for information in the center of the context window.

- **Boundary Priority**: Place high-priority constraints, critical instructions, and schema definitions at the very beginning (Head) or the very end (Tail) of the context.
- **Sandwich Strategy**: If critical information must be in the middle, sandwich it between two clear, high-level summary points that repeat its purpose.

## 4. Sliding Windows & Recursive Summarization

Manage long-running conversations without exceeding token thresholds.

- **Sliding Window**: Keep only the N most recent turns for immediate interaction.
- **Recursive Summarization**: Periodically collapse historical turns into a compressed "Session State Summary".
- **State Archiving**: Store older, less relevant interactions in a side-car file (e.g., `archive.md`) that the agent can read only when necessary.

## 5. Token Budget Allocation

Implement a disciplined token distribution:

| Category | Typical % | Goal |
| :--- | :--- | :--- |
| System Prompt | 10-15% | Definition of role & constraints |
| Tool Definitions | 15-20% | Capability exposure |
| Interaction History | 30-40% | Context for current turn |
| Reserved (Drafting) | 25-45% | Headroom for generation |

## 6. Context Freshness Decisions

Determine when to act on history:

- **Summarize**: When history exceeds 50% of the token budget and requires long-term context.
- **Truncate**: When history is irrelevant to the current task or contains repetitive technical noise.
- **Archive**: When information must be preserved (e.g., decisions, ADRs) but is not needed for the immediate turn.

## 7. Measuring Cache Hit Rate

Continuous improvement relies on telemetry.

- **Monitoring**: Track Cache Hit Rate (CHR) metrics provided by the API provider.
- **Iteration**: Analyze sessions with low CHR. Are the system prompts shifting? Is tool definition order inconsistent?
- **Optimization Loop**:
  1. Measure performance per turn.
  2. Identify volatility in the prefix.
  3. Refactor static content to improve cache stability.
  4. Re-measure.

## Best Practices Checklist

- [ ] Does my system prompt remain stable across requests?
- [ ] Are tools sorted consistently?
- [ ] Is critical information pinned to the Head or Tail?
- [ ] Have I pruned unused code/data from the ingestion stream?
- [ ] Is there an automated summarization step for history?
