---
name: "prompt-engineering"
description: >-
  Use when designing, optimizing, testing, or deploying robust prompt systems for AI agents.
  This skill provides frameworks for structured prompt engineering, meta-prompting, and automated optimization workflows.
---

# Prompt Engineering Skill

## Overview
The `prompt-engineering` skill establishes a disciplined approach to LLM instruction design within the KILO-KIT ecosystem. Moving beyond ad-hoc prompting, this skill treats prompts as first-class code, emphasizing contract-based structures, declarative signatures, and rigorous validation loops to ensure reproducible, high-quality AI behavior.

## When To Use
- When developing new LLM-powered features or agents.
- When existing prompts produce inconsistent, fragile, or hallucinated outputs.
- When implementing complex reasoning tasks that require strict output formatting.
- When you need to scale prompt maintenance across a team or large codebase.
- When setting up automated prompt optimization or regression testing pipelines.

## Core Concepts

### Contract-First Prompt Architecture
Prompts are defined using a 5-part structure to ensure clarity and modularity:
1. **Identity**: Define the persona, expertise, and operational boundaries.
2. **Context Boundaries**: Explicitly define what data is in-scope and what is off-limits.
3. **Operational Rules**: Step-by-step logic and prioritized directives.
4. **Edge Cases**: Explicit handling of ambiguous, empty, or adversarial inputs.
5. **Output Schemas**: Declarative JSON, XML, or Pydantic schemas to enforce structured output.

### Reasoning Model Steerability
Optimizing for advanced reasoning models (e.g., o1, o3, Gemini 2.0+):
- **Reasoning Effort Control**: Explicitly specify constraints to trade-off speed vs. reasoning depth.
- **Chain-of-Symbol (CoS)**: Use compact symbol-based notation for complex logic to minimize token usage and improve coherence.
- **XML/Markdown Boundary Formatting**: Utilize strict XML tags (e.g., <thought>, <logic>, <result>) to segment reasoning from content.

### DSPy Integration
Leverage programmatic prompt optimization:
- **Signatures**: Define declarative Input/Output contracts.
- **Optimizers**: Apply `BootstrapFewShot`, `MIPROv2`, or `COPRO` to automatically refine prompts based on validation datasets.

## Workflow
1. **Define**: Create a declarative signature for the task.
2. **Draft**: Implement using the Contract-First structure.
3. **Optimize**: Run meta-prompting loops (using `pro` models) to critique and refine.
4. **Validate**: Test against a set of representative inputs and boundary cases.
5. **Iterate**: Use DSPy optimizers to refine instruction logic.
6. **Deploy & Monitor**: Version control the final prompt as code.

## Key Patterns
- **Semantic Diversity**: Select Few-Shot examples based on embedding-space diversity rather than arbitrary selection.
- **Negative Constraint Prioritization**: Explicitly list what NOT to do, placing these at the beginning of the operational rules.
- **Structured Output First**: Enforce JSON/Schema output early in the instruction stream to prevent preamble bloat.
- **Self-Correction Loops**: Instruct the model to critique its own intermediate steps before generating the final output.

## Quality Gates
- **Contract Adherence**: Does the output strictly follow the schema?
- **Ambiguity Check**: Can the prompt produce valid responses for empty or malformed input?
- **Few-Shot Quality**: Are examples diverse, representative, and error-free?
- **Regression Testing**: Does this version outperform the previous version on the golden test set?
- **Token Efficiency**: Have unnecessary filler instructions been removed?

## References
- [DSPy Documentation](https://dspy-docs.vercel.app/)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [OpenAI Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- KILO-KIT Architecture ADRs on Prompt Versioning
