---
name: "llm-evals"
description: >-
  Use when validating, benchmarking, or monitoring LLM application performance. 
  Keywords: RAG evaluation, LLM-as-a-judge, CI/CD gating, trajectory scoring, test suites, prompt quality.
---

# LLM Evaluation & Validation Framework

## Overview
The `llm-evals` skill provides a systematic framework for evaluating and monitoring Large Language Model (LLM) applications throughout the development lifecycle. It bridges the gap between ad-hoc testing and production-grade reliability by implementing rigorous evaluation pipelines, metric-driven gating, and dataset versioning.

## When To Use
* Setting up automated evaluation pipelines for LLM chains.
* Developing or refining RAG (Retrieval-Augmented Generation) systems.
* Preparing LLM applications for production deployment.
* Investigating performance regressions in complex, multi-step agent trajectories.
* Defining custom rubrics for LLM-as-a-Judge scenarios.

## Core Concepts
* **Trajectory-Level Evaluation**: Scoring intermediate reasoning steps, tool choices, and argument precision, moving beyond just final output metrics.
* **LLM-as-a-Judge**: Using capable models (e.g., GPT-4o, Claude 3.5 Sonnet) as automated judges to score outputs based on user-defined rubrics.
* **Metric Tiers**:
    * **Unit**: Single prompt/completion pairs.
    * **Integration**: Individual chains or multi-step logic.
    * **System**: End-to-end user intent fulfillment evaluation.
* **Golden Datasets**: Version-controlled suites containing ground-truth, negative test cases, and edge cases to ensure consistent benchmarks.
* **Calibration**: Ensuring LLM judges align with human grading, including inter-rater reliability checks.

## Workflow
1. **Dataset Curation**: Create and version control evaluation suites using JSON/YAML formats, incorporating synthetic failure injections.
2. **Metric Definition**: Define evaluation criteria (e.g., faithfulness, relevancy, G-Eval) using established frameworks.
3. **Execution**: Run evaluations locally or in CI environments using tools like `promptfoo` or `deepeval`.
4. **Analysis**: Review evaluation reports to identify bottlenecks or high-error clusters.
5. **CI/CD Integration**: Incorporate gating steps in deployment pipelines to automatically block commits failing established regression thresholds.
6. **Continuous Monitoring**: Shift evaluation metrics into production monitoring (e.g., Langfuse) to track drift.

## Key Patterns
* **G-Eval Implementation**: Define specific rubrics in code, providing chain-of-thought instructions to the judge model.
* **Negative Case Injection**: Always include scenarios where the model SHOULD refuse to answer or identify missing context.
* **Pipeline Gating Example**:
  ```yaml
  # promptfoo.yaml
  prompts: [prompt.txt]
  providers: [openai:gpt-4o]
  tests:
    - vars: {query: "..."}
      assert:
        - type: llm-rubric
          value: "response must accurately cite the provided context"
        - type: g-eval
          criteria: "conciseness"
  ```
* **Trajectory Scoring**: Log intermediate tool call history and validate against expected sequences.

## Quality Gates
* **Regression Thresholds**: Strict pass/fail criteria on defined metrics (e.g., Faithfulness > 0.85).
* **Inter-rater Reliability**: Ensure judge model scores correlate highly (Pearson/Spearman > 0.7) with human samples.
* **Coverage**: Evaluation suite must cover 100% of defined edge cases before major version releases.
* **Latency Constraints**: Evaluation must complete within acceptable CI time-windows (e.g., < 10 minutes for full test suites).

## References
* [DeepEval](https://github.com/confident-ai/deepeval) - Unit testing for LLMs.
* [Promptfoo](https://github.com/promptfoo/promptfoo) - Command-line tool for test and evaluate LLM prompts.
* [Langfuse](https://github.com/langfuse/langfuse) - Open-source observability and analytics for LLM apps.
* [Ragas](https://github.com/explodinggradients/ragas) - RAG evaluation metrics (Faithfulness, Relevancy, Context Precision/Recall).
