---
name: "agentic-rag"
description: >-
  Use when building self-correcting retrieval systems for AI agents. Keywords: RAG, retrieval, Corrective RAG, Self-RAG, query decomposition, reranking, hallucination, grounding.
---
# Agentic RAG - Self-Correcting Retrieval

## Overview
Agentic RAG evolves beyond static information retrieval by embedding autonomous agents within the retrieval and generation pipeline. Unlike "Naive RAG" which assumes a direct mapping from query to document chunk, Agentic RAG employs iterative reasoning, self-correction, and multi-step workflows to ensure answers are grounded, accurate, and comprehensive. It treats retrieval as a dynamic task-oriented process.

## When To Use
- When dealing with multi-hop questions requiring information synthesis from disparate sources.
- When existing RAG pipelines suffer from high hallucination rates or low retrieval precision.
- When the domain requires "Codebase RAG" that understands syntax, imports, and symbol definitions rather than just text semantic similarity.
- When you need systems that can autonomously fall back to web search or tool execution when internal knowledge is insufficient.

## Architecture Patterns
1. **Query Decomposition & Routing**: Breaking down complex, high-level questions into focused sub-queries. Agents route these sub-queries to appropriate specialized indexes (e.g., code-index, docs-index, general-web).
2. **Hybrid Retrieval + RRF**: Combining lexical search (BM25 for acronyms/technical IDs) with dense embedding search (vector similarity), merged using Reciprocal Rank Fusion (RRF) to boost ranking robustness.
3. **Corrective RAG (CRAG)**: Implementing a relevance grader that evaluates retrieved docs. If quality is low, the agent triggers a fallback workflow (e.g., web search, re-phrasing).
4. **Self-RAG Reflection Loops**: Generation output is passed through an evaluator agent that checks for groundedness and relevance. If it fails, the system triggers a re-retrieval or re-generation cycle.
5. **Codebase RAG (AST-aware)**: Rather than naive chunking, use AST (Abstract Syntax Tree) parsing to extract class/function definitions and method signatures, ensuring the retriever captures the structural context of the codebase.

## Implementation Workflow
1. **Data Ingestion**:
   - Parse documents with layout-aware tools.
   - For code: extract symbols, classes, and dependencies using tree-sitter.
   - Generate embeddings using multi-modal or code-specialized models (e.g., text-embedding-3-large).
2. **Retrieval**:
   - Apply hybrid search (BM25 + Vectors).
   - Use cross-encoder rerankers (e.g., Cohere Rerank, BGE-Reranker) to refine the top-k results.
3. **Agentic Processing**:
   - **Decomposition Phase**: Use LLM to split user query into atomic tasks.
   - **Retrieval Phase**: Fetch data for each task independently.
   - **Grading Phase**: Use a "Critic" agent to grade relevance/faithfulness.
   - **Generation Phase**: Synthesize the answer.
4. **Validation**:
   - Hallucination Detection: Compare generation against original retrieved contexts using NLI (Natural Language Inference) models or LLM-as-a-judge.

## Quality Gates
- **Grounding Gate**: Reject any answer where the supporting evidence score is below a predefined threshold (e.g., 0.8 on a 0-1 scale).
- **Retrieval Quality Gate**: If all retrieved segments have low relevance scores, block generation and trigger an automated refinement or search process.
- **Syntactic Integrity Gate (Code RAG)**: Verify that retrieved code snippets can be resolved/linked back to real codebase identifiers.
- **Confidence Scoring**: Require agents to output a confidence score; if low, provide a disclaimer or suggest human intervention.

## References
- [CRAG (Corrective RAG)](https://arxiv.org/abs/2401.15884)
- [Self-RAG: Learning to Retrieve, Generate, and Critique](https://arxiv.org/abs/2310.11511)
- [Reciprocal Rank Fusion (RRF)](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Agentic Retrieval-Augmented Generation](https://docs.llamaindex.ai/)

---
> [!NOTE]
> Agentic RAG introduces latency overhead. Always measure RTT (Round Trip Time) during the evaluation phase to ensure acceptable UX.

> [!TIP]
> For codebase RAG, prefer tool-based indexing (e.g., repomix) over raw file chunking to preserve module boundaries.

> [!WARNING]
> Ensure PI-masking is performed before indexing private repositories, especially when using third-party embedding providers.
