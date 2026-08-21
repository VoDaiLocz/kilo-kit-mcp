---
name: "agent-observability"
description: >-
  Use when monitoring, tracing, or debugging agentic workflows in production. Keywords: observability, tracing, OpenTelemetry, Langfuse, latency, token cost, loop detection, telemetry.
---

# Agent Observability & Telemetry

## Overview
This skill defines the operational standards and instrumentation requirements for monitoring agentic workflows. It ensures that complex, multi-agent systems built within KILO-KIT remain transparent, debuggable, and cost-effective. Observability in this context spans from real-time tracing of individual subagent reasoning to macro-level analysis of cost-per-task and loop-detection across distributed systems.

## When To Use
Activate this skill when:
- Designing new complex agent workflows requiring distributed tracing.
- Debugging performance regressions or unexplained agent failures.
- Implementing production monitoring for cost optimization.
- Setting up feedback loops for regression testing based on real production traces.
- Configuring OpenTelemetry or integrating with observability platforms like Langfuse/Helicone.

## Core Pillars
1. **Traceability**: Capturing parent-child relationships across subagent calls and tool invocations.
2. **Quantification**: Measuring latency, token consumption, and cache effectiveness.
3. **Detection**: Identifying anomalies in agent behavior (e.g., infinite recursion, repetitive tool errors).
4. **Learning**: Converting trace data into gold-standard datasets for future regression testing.

## Instrumentation Workflow
To maintain high observability, follow this workflow:
1. **Context Propagation**: Always pass `trace_id` and `span_id` headers through all agent boundaries.
2. **Structured Logging**: Log all input/output payloads at the start and end of every tool call or reasoning step.
3. **Telemetry Standards**: Use OpenTelemetry semantic conventions for LLM operations (e.g., `llm.request.model`, `llm.usage.completion_tokens`).
4. **Platform Integration**: Configure the agent SDKs to push spans directly to backend exporters (Langfuse/Helicone/Jaeger).
5. **Session Aggregation**: Group all traces belonging to a single user task under a persistent `session_id`.

## Key Metrics
- **Token Efficiency**: Completion tokens vs. prompt tokens ratio.
- **Cost per Task**: Real-time dollar cost of the entire agentic conversation.
- **Latency Breakdown**: Time spent in LLM inference vs. external tool execution.
- **Cache Hit Ratio**: Effectiveness of persistent caching layers for repetitive queries.
- **Reasoning Depth**: Number of steps taken to arrive at a solution.

## Loop Detection & Anomaly Alerts
To prevent runaway costs and infinite loops:
- **Depth Limiter**: Enforce a maximum stack depth for agent recursion.
- **Repetition Threshold**: Monitor for semantic similarity in back-to-back agent turns.
- **Tool Error Rate**: Alert when a specific tool returns consecutive non-transient errors.
- **Spike Detection**: Trigger alerts for sudden surges in token consumption that deviate from the 3-day rolling average.

## Quality Gates
- **Trace Coverage**: All tool calls and subagent invocations must be wrapped in spans.
- **Cost Budgeting**: Automated failure if a single task exceeds the `max_cost` threshold.
- **Feedback Validation**: Any trace flagged by a user as "incorrect" must automatically trigger the generation of a potential regression test case.

## Instrumentation Best Practices
- Avoid logging sensitive user data (PII) by sanitizing inputs before sending to external observability backends.
- Use asynchronous telemetry exporters to ensure observability does not contribute to agent latency.
- Periodically sample traces in high-traffic environments to balance overhead and visibility.

## Golden Dataset Extraction
The system should implement a mechanism to:
1. Export flagged traces (user corrections).
2. Clean and format the input context and reasoning path.
3. Store as a YAML-based test case in `tests/regression/`.
4. Automatically run against the agent whenever the system prompt is updated.

## Integration Patterns
- **Langfuse**: Use for session-level grouping, evaluation scores, and prompt management.
- **Helicone**: Leverage for caching, load balancing, and real-time observability at the proxy level.
- **OpenTelemetry**: The foundation for trace propagation and multi-service correlation.

## KPI Definition
- **First-Call Resolution**: Percentage of tasks completed without secondary user intervention.
- **Tool Success Rate**: Ratio of successful tool invocations to total attempts.
- **System Stability**: Ratio of "completed" status to "errored/interrupted" status per session.
- **Agent Throughput**: Average time-to-completion for standard task types.

## References
- [OpenTelemetry LLM Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/llm/)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Helicone Documentation](https://docs.helicone.ai/)
- [KILO-KIT Observability Best Practices](file:///home/vodailoc/KILO-KIT/docs/observability.md)
