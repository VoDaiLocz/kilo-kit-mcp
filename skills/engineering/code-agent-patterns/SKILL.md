---
name: "code-agent-patterns"
description: >-
  Use when building autonomous code editing, bug fixing, or software engineering agents. Keywords: SWE-agent, code agent, bug localization, patch generation, AST, diff, TDD loop, repository indexing.
---
# Autonomous Code Agent Patterns

## Overview
The `code-agent-patterns` skill provides a standardized architectural framework for building, maintaining, and scaling autonomous Software Engineering (SWE) agents. It focuses on reliability, precision, and contextual awareness, drawing heavily from industry benchmarks like SWE-Bench and modern LLM-driven development tools.

## When To Use
- Implementing autonomous code editing agents.
- Designing specialized agents for bug localization or patch generation.
- Orchestrating multi-agent systems for code review or testing.
- Building tools that need to interface with existing large codebases.

## Core Patterns
### 1. Minimal Context Assembly
Avoid dumping the entire repository into the LLM context. Instead:
- Use dependency graph analysis to identify "impact zones."
- Implement "Breadth-First Context Discovery" (start with high-level symbols, drill down only when necessary).
- Support dynamic file inclusion based on the specific task (e.g., test files, related interfaces).

### 2. Symbol-Level Repository Indexing
Build a robust index that enables the agent to navigate the codebase as a human developer would:
- **Symbol Maps**: Index classes, functions, and interfaces along with their file locations.
- **Call Graphs**: Track function calls and dependencies to understand side effects.
- **AST Analysis**: Utilize Abstract Syntax Tree (AST) parsing to ensure structural awareness during code modifications.

### 3. Unified Diff & Search-Replace Patching
To minimize hallucination and merge conflicts:
- Prefer "Search-Replace" blocks over entire file rewrites.
- Validate that the "Search" block matches exact file content before applying the "Replace" content.
- Use unified diffs as a secondary representation for human review.

## TDD Fix Loop Workflow
Agents must follow a strict "Red-Green-Refactor" loop for any bug fix:
1. **Reproduce**: Write a test case that captures the reported bug (assert failure).
2. **Localize**: Identify the source using logs, stack traces, or symbol-level search.
3. **Patch**: Apply minimal code changes to satisfy the failing test.
4. **Verify**: Run the test suite.
5. **Rollback**: If tests fail after patching, discard changes and restart the process.

## Multi-Agent Coding Triad
To ensure high-quality output, structure teams as:
- **Coder**: Responsible for reading the codebase and proposing patches.
- **Code Reviewer**: Audits patches for logic errors, style violations, and architecture alignment.
- **Test Engineer**: Manages test execution and ensures sufficient coverage for the change.

## Patch Validation Pipeline
Every proposed change must survive an automated gauntlet:
1. **Syntax Check**: Ensure the code is parsable.
2. **Type Check**: Validate against TypeScript/Python type definitions.
3. **Unit Tests**: Pass local unit tests.
4. **Lint**: Adhere to project linting standards.
5. **Security Scan**: Check against common patterns like OWASP Top 10.

## SWE-Bench Lessons
- **Mitigation Strategy**: The most common failure mode is "blind editing" without understanding global constraints. Ensure agents have access to `ADR` (Architecture Decision Records).
- **Hard Fixes**: Avoid over-complex regex. Use AST-based transformations whenever possible.
- **Context Drift**: Periodically refresh context maps when making many changes in a single session.

## References
- [SWE-Bench](https://www.swebench.com/)
- [KILO-KIT Documentation](https://github.com/vodailoc/KILO-KIT)
- [Aider: AI Pair Programming](https://aider.chat/)
