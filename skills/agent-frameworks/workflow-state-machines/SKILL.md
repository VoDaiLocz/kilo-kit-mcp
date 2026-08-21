---
name: "workflow-state-machines"
description: >-
  Use when designing, implementing, or debugging complex agentic workflows using state machine patterns. 
  Keywords: state machine, durable execution, agent orchestration, graph-based agents, workflow checkpoints, C4 protocol.
---

# Workflow State Machines

## Overview
This skill provides a structured framework for building resilient, predictable agentic workflows using directed graph-based state machines. It emphasizes durable execution, explicit state transitions, and auditability to ensure complex agent interactions remain stable and debuggable.

## When To Use
- When orchestrating multi-step, multi-agent processes that require durability and fault tolerance.
- When you need to integrate human-in-the-loop (HITL) checkpoints into long-running tasks.
- When debugging non-deterministic agent behavior through state history inspection.
- When enforcing KILO-KIT C4 Runtime Protocol stages as formal state transitions.

## Core Concepts
### Directed Graph Topologies
- **Nodes**: Represent distinct agent actions, tool executions, or decision points.
- **Edges**: Define the transition logic based on input, output, or conditions.
- **Immutable State**: Workflow state is treated as immutable, with transitions resulting in new state snapshots to ensure clean history.

### Durable Execution & Checkpointing
- Workflows automatically persist the state after every transition.
- **Resumption**: Failed workflows can resume precisely from the last successful node (checkpoint) without re-executing completed prior computations.

### Human-in-the-Loop (HITL) Interrupts
- **Pause States**: Workflows can enter a suspended state to await external input, human approval, or parameter adjustments.
- **Manual Overrides**: Operators can inject or edit state data while the workflow is paused before triggering the next transition.

### Time-Travel Debugging
- All state changes are logged as events in a durable store.
- **Replay**: Developers can isolate a failing branch, modify inputs, and re-execute that specific subgraph to verify fixes without running the entire workflow from scratch.

## Workflow
1. **Define State Schema**: Identify all necessary data attributes required for the entire lifecycle.
2. **Decompose into Nodes**: Break down the process into atomic, idempotent functions.
3. **Map Edges**: Implement conditional routing logic (e.g., success paths, failure paths, human-approval branches).
4. **Configure Persistence**: Set up a store for state snapshots and execution history.
5. **Implement HITL Points**: Add explicit breakpoints where the workflow yields control to the user.

## Key Patterns
- **LangGraph Integration**: Use Graph-based definitions for complex stateful loops and branching.
- **Temporal/Workflow Separation**: Decouple task execution (activities) from orchestration logic (workflow).
- **C4 Protocol Mapping**:
  - `Brainstorming Gate` → Entry Node (Validation of Intent)
  - `Workflow Execution` → Graph Traversal
  - `Verification Gate` → Terminal Validation Node (Ensures success criteria)

## Quality Gates
- **Loop Prevention**: Every cycle must have an exit condition or max-depth limit defined.
- **Terminal States**: Every graph MUST have defined success and failure termination nodes.
- **Shared State Safety**: Never share mutable state between parallel branches; always rely on state reducers or explicit state merging.
- **Idempotency**: All node-level functions must be idempotent to support safe retries.

## Anti-patterns
- **Unchecked Loops**: Infinite recursion in agent planning steps.
- **Implicit State**: Relying on global variables instead of the explicit State Schema.
- **Missing Terminal States**: Workflows that hang without finishing or erroring out.
- **Heavy Side-Effects in Nodes**: Side effects that are difficult to rollback or reconcile during state replay.

## References
- [KILO-KIT Documentation](https://kilo-kit.dev/docs)
- [C4 Runtime Protocol Specification](https://kilo-kit.dev/protocol/c4)
- [LangGraph Patterns](https://langchain-ai.github.io/langgraph/)
- [Durable Execution Principles](https://temporal.io/docs)
