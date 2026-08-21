---
name: "agent-memory"
description: >-
  Use when implementing or managing persistent, hierarchical memory systems for AI agents. 
  Covers cross-session state, fact supersession, and self-managed memory tools to enable long-term recall and adaptive agent behavior.
---

# Agent Memory Framework

## Overview
The `agent-memory` skill provides a standardized architectural approach to building intelligent memory systems for agents within the KILO-KIT ecosystem. It bridges the gap between ephemeral context windows and durable, long-term storage, enabling agents to maintain user preferences, project-specific conventions, and debugging history across multiple sessions.

## When To Use
- When designing systems that must persist state across independent interaction sessions.
- When an agent needs to manage large volumes of user-specific facts that exceed the context window.
- When implementing self-managed memory tools (MemGPT/Letta patterns) to allow agents to control their own knowledge base.
- When building systems requiring automatic entity updates (Mem0 pattern) to resolve conflicting or stale information.

## Core Concepts
- **Memory Hierarchy**: Differentiating between transient working context and persistent knowledge.
- **Fact Extraction**: Identifying core entities, preferences, and relationships from conversational flow.
- **Supersession**: Automatically replacing outdated facts with new information to maintain "ground truth."
- **Temporal Validity**: Tracking the lifespan and relevance of memory entries over time.
- **Persistence**: Ensuring data survives agent resets or session termination.

## Memory Architecture
The framework defines four distinct tiers of memory:
1. **Working Context (RAM)**: The immediate token window. Ephemeral, high-speed, and limited in capacity.
2. **Episodic Memory**: Logged history of past interactions, enabling agents to query "what we discussed last time."
3. **Semantic Vector Store**: Long-term storage for semantic concepts, documentation snippets, and project conventions, retrieved via similarity search.
4. **Archival Storage (Disk)**: Cold storage for large documents or historical artifacts that are rarely needed but must be maintained.

## Implementation Patterns
### Fact Extraction & Supersession (Mem0 Pattern)
- Implement extraction loops that analyze messages for key-value pairs (e.g., `user_preference: dark_mode`).
- When a new fact conflicts with an old one, perform an "update" (supersession) rather than appending duplicates. This ensures the agent always acts on the most recent truth.

### Temporal Validity Windows (Zep/Graphiti Pattern)
- Annotate memory items with timestamps and `TTL` (Time-To-Live).
- Implement background cleanup processes to purge or archive expired or invalidated information based on these windows.

### Self-Managed Memory Tools (Letta/MemGPT Pattern)
- Equip agents with dedicated function calls:
  - `memory_write(key, value, importance)`
  - `memory_read(query)`
  - `memory_archive(id)`
- Empower the agent to decide when to offload items from the working context to memory storage.

## CRUD Operations
- **Create**: Automatically extract new knowledge from successful interactions and persist to storage.
- **Read**: Perform semantic search across the vector store and episodic history to augment the current context.
- **Update**: Supersede stale facts with verified new information to prevent hallucinations or conflicting behavior.
- **Delete/Archive**: Offload deprecated or low-value information to archival storage to maintain high-signal density in memory.

## Context Window Management
Use the following heuristic for resource allocation:
1. **Critical Path**: Keep in active context if needed for the current turn.
2. **Supportive Memory**: Fetch from vector store if the task requires historical context.
3. **Episodic Recall**: Search past logs only when explicitly prompted or when a long-term pattern is requested.
4. **Avoid Bloat**: Do not put long documents directly into the prompt; use `read_resource` or semantic retrieval instead.

## Quality Gates
- **Consistency Check**: Run automated verification to detect conflicting memory entries.
- **Persistence Test**: Verify that user-defined preferences are available after agent restart.
- **Signal-to-Noise Ratio**: Periodically audit the memory store to remove redundant, outdated, or low-relevance facts.
- **Latency Monitoring**: Ensure that retrieving from memory does not introduce unacceptable delays in response time.

## References
- [Mem0 Documentation](https://mem0.ai)
- [Letta / MemGPT Architecture](https://letta.com)
- [Zep Memory Framework](https://getzep.com)
- [KILO-KIT Internal Documentation](https://kilo-kit.io)
- [Graphiti Memory Patterns](https://graphiti.dev)
