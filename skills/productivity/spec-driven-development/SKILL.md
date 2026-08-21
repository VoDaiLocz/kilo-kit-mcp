---
name: "spec-driven-development"
description: >-
  Use when starting a new feature, product, or system design. Eliminates the spec-implementation gap by making specifications the primary artifact that drives code generation. Keywords: SDD, spec-driven, PRD, feature spec, user stories, implementation plan, specification, acceptance criteria, Given-When-Then.
---

# Spec-Driven Development (SDD)

SDD is the professional standard for high-assurance, agentic software engineering in 2026. It reverses the traditional "code-first" approach, elevating specifications to the primary system artifact. By ensuring code is merely a verified expression of precise specs, we eliminate ambiguity, technical debt, and misaligned requirements.

## Why SDD in 2026?

As AI agents become the primary contributors to codebases, the bottleneck has shifted from *writing code* to *defining intent*. SDD provides:
- **Alignment:** Ensures AI agents work on the exact problem identified by the human.
- **Traceability:** Every line of code can be traced back to an acceptance criterion in a spec.
- **Verification:** Specs serve as the "ground truth" for automated test suites and agent-based verification.
- **Efficiency:** Reduces the need for costly refactoring by catching logic errors at the specification phase rather than the production phase.

## When to Use

- **New Features:** Implementing non-trivial functionality.
- **System Design:** Defining architecture, data flows, or API contracts.
- **Refactoring:** When changing existing systems where behavioral preservation is critical.
- **Complex Logic:** When business rules are nuanced and prone to ambiguity.
- **Agent Orchestration:** When directing multiple agents, specs act as the shared project language.

## Core Workflow (The SDD Lifecycle)

1. **Idea → PRD:** Iterate with an AI agent to clarify the problem, user value, and constraints.
2. **PRD → Spec:** Translate the PRD into an executable feature specification using User Stories and Acceptance Scenarios.
3. **Spec → Implementation Plan:** Derive the technical approach. Ensure every technical decision is explicitly traced to a requirement in the spec.
4. **Plan → Code Generation:** Use the plan to generate, review, and integrate code.
5. **Feedback → Evolution:** Feed production metrics, user behavior, and edge-case discoveries back into the spec to keep the system's "truth" updated.

## Spec Template (`spec-template.md`)

Use this structure to define features:

```markdown
# Feature: [Name]
## Context
- Business Value: [Why are we building this?]
- Priority: [P1/P2/P3]

## User Stories
- Given [Persona/Condition], When [Action], Then [Expected Result].

## Acceptance Scenarios
1. Scenario: [Title]
   - Given: [Prerequisites]
   - When: [Trigger]
   - Then: [Outcome]

## Constraints & Edge Cases
- [Constraints]
- [Edge Cases]
```

## Implementation Plan Structure (`plan-template.md`)

```markdown
# Implementation Plan: [Feature Name]
## Objective
- [Core goal mapped to Spec requirement #]

## Technical Strategy
- [Module/Component Changes]
- [Data Flow/Schema Updates]
- [Dependencies]

## Verification Plan
- [How do we confirm this matches the Spec?]
- [Testing strategy]
```

## Quality Gates

SDD succeeds only when verified. Enforce these gates:
1. **The Independence Gate:** Every user story must be testable in isolation.
2. **The Traceability Gate:** No code change may exist without a referenced spec requirement.
3. **The Consistency Gate:** Continuous validation—every time a plan is generated, check if it contradicts existing spec constraints.

## Best Practices

- **Spec-First, Code-Last:** Never touch an editor until the spec is approved.
- **Research-First:** Use research agents to gather context, API documentation, and existing codebase constraints *before* drafting specs.
- **Bidirectional Feedback:** Treat specs as living documents. If production deviates from the spec, update the spec first.
- **Branching for Exploration:** If uncertain about technical direction, create multiple implementation plans from the same spec to evaluate trade-offs.

## References & Resources

- [spec-kit framework](https://github.com/spec-kit)
- [templates/](https://github.com/spec-kit/templates/)
- See `/home/vodailoc/.gemini/config/plugins/kilo-kit-local/skills/spec-driven-development/` for local examples.

---
*SDD: If it isn't specified, it doesn't exist.*
