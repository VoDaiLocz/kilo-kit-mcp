# 🧰 Kilo-Kit 24 MCP Tools Suite Reference Manual

## 1. Gating & Orchestration Core (8 tools)
- `kilo_orchestrate_task`: Closed-loop C4 state machine gatekeeper.
- `kilo_route_intent`: Dynamic task routing and workflow selection.
- `kilo_get_skill`: Token-safe skill instruction loader with alias resolution.
- `kilo_search_skills`: Semantic and keyword skill search engine.
- `kilo_memory_report`: Persistent memory inspector.
- `kilo_remember_fact`: Pins long-term rules to SQLite `memory_facts`.
- `kilo_record_reflection`: Persists lessons and wrong paths to SQLite.
- `kilo_validate_skills`: Verifies quality gates for all 180 skills.

## 2. Cognitive Reasoning Engines (6 tools)
- `kilo_triangulate_research`: Grounded ToT DAG synthesis & low-confidence escalator.
- `kilo_think_step`: Sequential thinking with hypothesis branching.
- `kilo_grill_plan`: Adversarial red-teaming (inversion, simplification, blast radius).
- `kilo_trace_root_cause`: 5-Whys root cause analyzer.
- `kilo_compact_context`: Semantic invariant compressor.
- `kilo_synthesize_skill`: Transforms solved patterns into reusable skills.

## 3. Kilo-Sentinel Supervisor (3 tools)
- `kilo_sentinel_status`: Real-time supervisor telemetry.
- `kilo_reset_circuit_breaker`: Supervised breaker reset with root cause.
- `kilo_benchmark_solution`: Audits trajectory against GitHub standards.

## 4. Safe Execution Limbs (7 tools)
- `kilo_read_file`: Line-sliced read with boundary sandboxing.
- `kilo_search_files`: File glob locator.
- `kilo_grep_code`: Fast code pattern search.
- `kilo_write_file`: Atomic write with pre-flight hard-gate check.
- `kilo_edit_file`: Bracket-balanced, targeted search-and-replace.
- `kilo_run_command`: Terminal execution with injection protection.
