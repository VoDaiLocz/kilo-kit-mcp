---
name: "multi-agent-orchestration"
description: >-
  Use when coordinating multiple specialized agents for complex distributed tasks. Keywords: multi-agent, orchestrator, subagent, handoff, swarm, supervisor, agent topology, coordination.
---

# Multi-Agent Orchestration

## Overview
This skill provides a framework for designing and managing multi-agent systems where specialized agents collaborate on complex, multi-stage workflows. It emphasizes clear agent boundaries, structured communication, and robust error isolation.

## When To Use
- When tasks are too large or diverse for a single agent (scope creep).
- When specific domain expertise (e.g., database design, UI/UX, security) is required in separate, modular contexts.
- To maintain clean separation of concerns and reduce context window degradation.
- When you need to delegate parallelizable work to maximize throughput.

## Topology Patterns
- **Hierarchical Supervisor**: A central supervisor agent delegates sub-tasks to specialized workers, aggregates their results, and provides final synthesis.
- **Swarm Handoffs**: Agents pass tasks directly to the next appropriate agent based on completion criteria, forming a chain or graph of expertise.
- **Router-Worker**: A router analyzes incoming requests and dispatches them to a specific pool of workers based on classification.
- **Blackboard**: Multiple agents read from and write to a shared persistent state (the "blackboard") until a task objective is satisfied.
- **Round-Robin Debate**: Agents with opposing viewpoints propose solutions, iterate, and refine based on peer criticism to improve quality.

## Communication Protocols
- **Agent-to-Agent (A2A)**: Always use structured message framing.
- **Structured Payloads**: Encapsulate tasks, constraints, and dependencies in a common JSON format or structured Markdown.
- **Return Summaries**: Every subagent MUST return a concise summary of work done, resources created, and final status (SUCCESS/FAIL/BLOCKED) before closing the conversation.

## Context Isolation & Boundary Hand-offs
- **Ephemeral Context**: Spawn subagents with only the minimal, high-signal information needed for their specific task.
- **Avoid Token Bloat**: Do not pass the entire parent conversation history unless strictly necessary. Pass pointers to file locations or artifact links instead.
- **Clean State**: Each subagent should operate within its own branched workspace to prevent side effects on the parent or other subagents.

## Failure Isolation
- **Localized Faults**: Subagent crashes must be caught by the parent via message timeout or error reporting mechanisms.
- **Graceful Retries**: Implement retry logic for discrete sub-tasks. If a worker fails, the supervisor should attempt to diagnose the root cause (using Root Cause Tracing) before retrying or pivoting strategy.
- **Never Crash Parent**: A subagent failure should trigger an alert in the parent agent, not an unhandled exception that propagates to the user.

## Task Decomposition Strategies
- **Parallel Execution**: Use when tasks are independent (e.g., unit tests for different modules, gathering info from multiple docs).
- **Sequential Execution**: Use when tasks have strict causal dependencies (e.g., design -> implement -> review -> deploy).
- **Merge Points**: Define clear synchronization points where context from different agents is consolidated, validated, and refined by the supervisor.

## State Sharing Patterns
- **Shared Artifacts**: Write common results to files in the shared artifacts/ directory.
- **Blackboard Memory**: Use shared databases or documented state files for common configurations or global project context.
- **Message Bus**: Use the parent agent as the hub for all inter-agent messages.

## Anti-patterns
- **God Orchestrator**: A single agent attempting to do everything; leads to poor specialization and context degradation.
- **Circular Dependencies**: Agents waiting on each other indefinitely; always define a clear directed acyclic graph (DAG) of task flow.
- **Context Explosion**: Passing the entire project state to every subagent; use selective scoping instead.
- **Silent Failures**: Subagents finishing without reporting status; every interaction must have an explicit "done" or "blocked" signal.

## Quality Gates
- **Pre-Handoff Check**: Does the subagent have everything it needs? (Requirements, constraints, deadline).
- **Post-Handoff Review**: Does the output meet the original task intent? Does it need further refinement before the next step?
- **Final Integration**: Verify the combined results of all subagents against original user acceptance criteria.

## References
- KILO-KIT Core Principles (file:///home/vodailoc/.gemini/config/skills/kilo-kit/SKILL.md)
- Systematic Debugging (file:///home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/systematic-debugging/SKILL.md)
- Architecture Decision Making (file:///home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/architecture/SKILL.md)
