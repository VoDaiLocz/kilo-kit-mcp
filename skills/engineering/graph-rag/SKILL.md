---
name: "graph-rag"
description: >-
  Use when needing global or relational understanding of codebases or knowledge corpora. Keywords: GraphRAG, knowledge graph, entity extraction, community summarization, graph traversal, Microsoft GraphRAG.
---

# GraphRAG Skill

The `graph-rag` skill provides structured methods for building and querying Knowledge Graphs (KG) from text and code. Unlike standard RAG, which relies on vector similarity, GraphRAG leverages structural relationships between entities to answer complex, multi-hop, and global queries.

## When to Use This Skill

- When you need to understand the "big picture" of a massive repository or documentation set.
- When standard semantic search (vector-only) fails to retrieve relevant information for relational or aggregate questions (e.g., "What are the common design patterns used in this project?").
- When you need to trace dependencies across codebases for safe refactoring.
- When you need to generate high-quality summaries of knowledge clusters (communities).

## Limitations of Standard Vector-Only RAG

Standard RAG (Retrieval-Augmented Generation) has significant blind spots:
1. **Global Aggregation**: It cannot easily answer questions requiring knowledge synthesis across the entire corpus (e.g., "Summarize all major architectural decisions").
2. **Relational Depth**: Vector similarity often misses multi-hop relationships between disparate files or concepts.
3. **Information Density**: Vector chunking can lose the context of how entities are linked, leading to hallucinated or fragmented answers.

## Core Capabilities

### 1. Entity-Relation Extraction
Ingest unstructured text or source code and transform it into a structured graph:
- **Entities**: Identify classes, functions, modules, concepts, or business objects.
- **Edges**: Map interactions (calls, imports, implements, extends, contains).
- **Claims**: Capture assertions made in docstrings or documentation.

### 2. Hierarchical Community Summarization (Leiden Algorithm)
Enable global reasoning by creating levels of abstraction:
- Detect communities using the Leiden algorithm to cluster related entities.
- Generate hierarchical summaries for each community.
- Allow the LLM to query these summaries for high-level synthesis rather than searching millions of raw vectors.

### 3. AST & Codebase Dependency Graphing
Deep analysis for software engineering tasks:
- **Call Graphs**: Track function execution flows.
- **Dependency Graphs**: Visualize imports and module coupling.
- **Class Hierarchies**: Map inheritance and implementation patterns.
- **Refactoring Support**: Use graph traversal to identify impact zones before applying changes.

### 4. Hybrid Graph + Vector Retrieval
Combine the best of both worlds:
- **Structural Traversal**: Follow links between nodes to gather context.
- **Semantic Similarity**: Use vectors to bridge gaps or locate starting points in the graph.

### 5. Search Modes
- **Local Search**: Focuses on specific entities and their immediate neighbors (1-2 hops). Best for technical questions like "How does the `UserAuth` service interact with the `Database` provider?"
- **Global Search**: Operates at the community report level to synthesize information across the entire dataset. Best for strategic questions like "What are the core architectural risks identified in the code?"

## Microsoft GraphRAG Patterns

Follow established industry patterns for implementation:
1. **Index Construction**: Build the graph iteratively from codebase files or documentation.
2. **Query Engine**: Implement adaptive retrieval that selects the appropriate search mode (Local vs Global) based on the user's intent.
3. **Community Reports**: Maintain up-to-date summaries of graph partitions to accelerate global queries.

## Implementation Steps

1. **Extraction**: Run parser agents on the target corpus to build nodes and edges.
2. **Clustering**: Apply graph algorithms (Leiden) to identify knowledge communities.
3. **Summarization**: Generate reports for each cluster level.
4. **Retrieval**: Direct the user's prompt to either local graph walking or global community synthesis.
5. **Synthesis**: Combine retrieved evidence into a grounded, comprehensive response.

## Best Practices
- **Schema Design**: Clearly define your entity and relation types before indexing.
- **Quality Control**: Validate extracted edges against the source code/text to minimize noise.
- **Iterative Refinement**: Re-index parts of the graph when the codebase changes significantly.

---
*For more information on implementation, refer to the `resources/` folder in this skill.*
