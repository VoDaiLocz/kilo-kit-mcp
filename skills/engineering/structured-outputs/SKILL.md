---
name: "structured-outputs"
description: >-
  Use when needing 100% type-safe, schema-valid data extraction from LLMs. Keywords: structured output, JSON schema, Pydantic, Zod, type-safe, constrained decoding, validation, tool use.
---

# Structured Outputs & Type-Safe Extraction

## Overview
The `structured-outputs` skill provides a framework for ensuring that language models produce data in deterministic, valid, and type-safe formats. This is essential for building robust AI-driven systems where LLM outputs must be consumed by downstream services, databases, or UI components.

## When To Use
- When extracting structured data from unstructured text (e.g., invoices, logs, emails).
- When controlling tool call arguments to guarantee they meet internal API specifications.
- When you need to bridge the gap between non-deterministic LLM generation and deterministic software logic.
- Whenever you see developers relying on regex parsing of unstructured model text.

## Core Concepts
1. **Schema Definition**: Defining the expected structure using JSON Schema, Pydantic (Python), or Zod (TypeScript).
2. **Validation**: Enforcing schema constraints at generation time or post-generation.
3. **Recovery**: Handling failures gracefully using self-healing loops.
4. **Constraint Generation**: Using techniques to force compliance during the generation process itself.

## Patterns

### 1. Strict Schema Contracts
- Use **Pydantic v2** for Python and **Zod** for TypeScript to create strongly-typed classes that represent your domain entities.
- Ensure all fields are explicitly defined with types and, where necessary, constraints (e.g., `Field(min_length=1, ...)`).

### 2. Parse-Validate-Retry (Instructor Pattern)
When an LLM fails to match the schema:
- Catch the validation error.
- Extract the specific path of the error (e.g., `user.address.zipcode`).
- Re-prompt the model by injecting the original prompt, the failed output, and the validation error traceback.
- **Goal**: Enable the model to "self-heal" by correcting its own structural mistakes.

### 3. Token-Level Constrained Decoding (Outlines/CFG)
Instead of relying on retries, constrain the generation at the token level:
- Use Finite State Machines (FSM) to mask invalid tokens during the generation process.
- This guarantees 100% schema compliance by definition, effectively eliminating "JSON parsing errors".

### 4. Schema-Aligned Streaming
- Implement partial JSON parsing for long-form generations.
- Use libraries that can identify and stream partial objects (e.g., completing an array element before the next token arrives).

### 5. BAML Polyglot Contracts
- Use [BAML](https://boundaryml.com/) or similar DSLs to define schemas once.
- Automatically generate client libraries (Python, TS, Go) to keep the backend and frontend in sync with the LLM schema.

### 6. Tool Use Schema Design
- Follow the "KISS" (Keep It Simple, Stupid) principle for tools.
- Avoid deeply nested schemas unless absolutely necessary.
- Use meaningful descriptions for every field—the model relies on these descriptions to decide what to populate.

## Quality Gates
- **Validation Check**: Every LLM output must pass a schema validation function before being treated as trusted data.
- **No Markdown Fences**: In production, ensure the pipeline does not depend on looking for ` ```json ` blocks. Configure the API to return the raw JSON body if possible, or build robust "json-blobs-only" extractors.
- **Type-Safety**: Code using the extracted data should fail to compile (if using TS) or fail during static analysis (if using Python) if it doesn't align with the generated class.

## Anti-patterns
- **Un-typed string returns**: Using generic `text` outputs and trying to parse them later.
- **"JSON in markdown fences" dependence**: Assuming the model will always use correct markdown tags.
- **Over-nested schemas**: Forcing the model to maintain complex hierarchical state, which increases the likelihood of halluncinations.
- **Silent failure**: Swallowing JSON parsing errors or schema validation errors instead of logging/retrying/failing the task.
- **Implicit Schemas**: Relying on prompt engineering to "describe" the schema instead of providing a formal, machine-readable JSON Schema.

## References
- [Instructor (Python)](https://github.com/jxnl/instructor)
- [Zod (TypeScript)](https://zod.dev/)
- [Pydantic (Python)](https://docs.pydantic.dev/)
- [Outlines (Constrained Generation)](https://github.com/outlines-dev/outlines)
- [BAML (Polyglot Schemas)](https://boundaryml.com/)
