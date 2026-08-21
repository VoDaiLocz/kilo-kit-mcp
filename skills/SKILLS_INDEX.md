# Skills Index

Lightweight index for agents. Load only the `SKILL.md` files relevant to the task.

Total imported skills: 164

## agent-frameworks
- `agent-memory` -> `skills/agent-frameworks/agent-memory/SKILL.md`: Use when implementing or managing persistent, hierarchical memory systems for AI agents. Covers cross-session state, fact supersession, and self-managed memory tools to enable long-term recall and ada
- `claukit` -> `skills/agent-frameworks/claukit/SKILL.md`: Advanced Agentic Coding framework providing mission briefs, guardrails, and integration hints for complex tasks. This skill ensures high-quality output through disciplined automation and systematic wo
- `mcp-agent-patterns` -> `skills/agent-frameworks/mcp-agent-patterns/SKILL.md`: Use when integrating or optimizing Model Context Protocol (MCP) servers and clients. Keywords: MCP, Model Context Protocol, tool discovery, lazy loading, sampling, resource subscription, MCP server.
- `multi-agent-orchestration` -> `skills/agent-frameworks/multi-agent-orchestration/SKILL.md`: Use when coordinating multiple specialized agents for complex distributed tasks. Keywords: multi-agent, orchestrator, subagent, handoff, swarm, supervisor, agent topology, coordination.
- `workflow-state-machines` -> `skills/agent-frameworks/workflow-state-machines/SKILL.md`: Use when designing, implementing, or debugging complex agentic workflows using state machine patterns. Keywords: state machine, durable execution, agent orchestration, graph-based agents, workflow che

## ai-media
- `ai-multimodal` -> `skills/ai-media/ai-multimodal/SKILL.md`: Process and generate multimedia content using Google Gemini API. Capabilities include analyze audio files (transcription with timestamps, summarization, speech understanding, music/sound analysis up t
- `geo-fundamentals` -> `skills/ai-media/geo-fundamentals/SKILL.md`: Generative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).
- `media-processing` -> `skills/ai-media/media-processing/SKILL.md`: Process multimedia files with FFmpeg (video/audio encoding, conversion, streaming, filtering, hardware acceleration) and ImageMagick (image manipulation, format conversion, batch processing, effects, 
- `screenshot` -> `skills/ai-media/screenshot/SKILL.md`: "Use when the user explicitly asks for a desktop or system screenshot (full screen, specific app or window, or a pixel region), or when tool-specific capture capabilities are unavailable and an OS-lev
- `seo-fundamentals` -> `skills/ai-media/seo-fundamentals/SKILL.md`: SEO fundamentals, E-E-A-T, Core Web Vitals, and Google algorithm principles.
- `sora` -> `skills/ai-media/sora/SKILL.md`: "Use when the user asks to generate, remix, poll, list, download, or delete Sora videos via OpenAI\u2019s video API using the bundled CLI (`scripts/sora.py`), including requests like \u201cgenerate AI

## design
- `aesthetic` -> `skills/design/aesthetic/SKILL.md`: Create aesthetically beautiful interfaces following proven design principles. Use when building UI/UX, analyzing designs from inspiration sites, generating design images with ai-multimodal, implementi
- `figma` -> `skills/design/figma/SKILL.md`: Use the Figma MCP server to fetch design context, screenshots, variables, and assets from Figma, and to translate Figma nodes into production code. Trigger when a task involves Figma URLs, node IDs, d
- `figma-implement-design` -> `skills/design/figma-implement-design/SKILL.md`: "Translate Figma nodes into production-ready code with 1:1 visual fidelity using the Figma MCP workflow (design context, screenshots, assets, and project-convention translation). Trigger when the user
- `frontend-design` -> `skills/design/frontend-design/SKILL.md`: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code 
- `mobile-design` -> `skills/design/mobile-design/SKILL.md`: Mobile-first design thinking and decision-making for iOS and Android apps. Touch interaction, performance patterns, platform conventions. Teaches principles, not fixed values. Use when building React 
- `tailwind-patterns` -> `skills/design/tailwind-patterns/SKILL.md`: Tailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.
- `ui-styling` -> `skills/design/ui-styling/SKILL.md`: Create beautiful, accessible user interfaces with shadcn/ui components (built on Radix UI + Tailwind), Tailwind CSS utility-first styling, and canvas-based visual designs. Use when building user inter

## engineering
- `agentic-rag` -> `skills/engineering/agentic-rag/SKILL.md`: Use when building self-correcting retrieval systems for AI agents. Keywords: RAG, retrieval, Corrective RAG, Self-RAG, query decomposition, reranking, hallucination, grounding.
- `api-patterns` -> `skills/engineering/api-patterns/SKILL.md`: API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination.
- `app-builder` -> `skills/engineering/app-builder/SKILL.md`: Main application building orchestrator. Creates full-stack applications from natural language requests. Determines project type, selects tech stack, coordinates agents.
- `architecture` -> `skills/engineering/architecture/SKILL.md`: Architectural decision-making framework. Requirements analysis, trade-off evaluation, ADR documentation. Use when making architecture decisions or analyzing system design.
- `ask-matt` -> `skills/engineering/ask-matt/SKILL.md`: Ask which skill or flow fits your situation. A router over the skills in this repo.
- `aspnet-core` -> `skills/engineering/aspnet-core/SKILL.md`: Build, review, refactor, or architect ASP.NET Core web applications using current official guidance for .NET web development. Use when working on Blazor Web Apps, Razor Pages, MVC, Minimal APIs, contr
- `backend-development` -> `skills/engineering/backend-development/SKILL.md`: Build robust backend systems with modern technologies (Node.js, Python, Go, Rust), frameworks (NestJS, FastAPI, Django), databases (PostgreSQL, MongoDB, Redis), APIs (REST, GraphQL, gRPC), authenticat
- `better-auth` -> `skills/engineering/better-auth/SKILL.md`: Implement authentication and authorization with Better Auth - a framework-agnostic TypeScript authentication framework. Features include email/password authentication with verification, OAuth provider
- `clean-code` -> `skills/engineering/clean-code/SKILL.md`: Pragmatic coding standards - concise, direct, no over-engineering, no unnecessary comments
- `code-agent-patterns` -> `skills/engineering/code-agent-patterns/SKILL.md`: Use when building autonomous code editing, bug fixing, or software engineering agents. Keywords: SWE-agent, code agent, bug localization, patch generation, AST, diff, TDD loop, repository indexing.
- `code-review` -> `skills/engineering/code-review/SKILL.md`: Use when receiving code review feedback (especially if unclear or technically questionable), when completing tasks or major features requiring review before proceeding, or before making any completion
- `code-review-checklist` -> `skills/engineering/code-review-checklist/SKILL.md`: Code review guidelines covering code quality, security, and best practices.
- `codebase-design` -> `skills/engineering/codebase-design/SKILL.md`: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-n
- `context-engineering` -> `skills/engineering/context-engineering/SKILL.md`: Master context engineering for AI agent systems. Use when designing agent architectures, debugging context failures, optimizing token usage, implementing memory systems, building multi-agent coordinat
- `context-optimization` -> `skills/engineering/context-optimization/SKILL.md`: Use when optimizing token usage, KV cache efficiency, or context window management for LLM agents. Keywords: context optimization, KV cache, prompt caching, token budget, semantic pruning, lost-in-the
- `database-design` -> `skills/engineering/database-design/SKILL.md`: Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.
- `databases` -> `skills/engineering/databases/SKILL.md`: Work with MongoDB (document database, BSON documents, aggregation pipelines, Atlas cloud) and PostgreSQL (relational database, SQL queries, psql CLI, pgAdmin). Use when designing database schemas, wri
- `diagnose` -> `skills/engineering/diagnose/SKILL.md`: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", report
- `diagnosing-bugs` -> `skills/engineering/diagnosing-bugs/SKILL.md`: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
- `docs-seeker` -> `skills/engineering/docs-seeker/SKILL.md`: "Searching internet for technical documentation using llms.txt standard, GitHub repositories via Repomix, and parallel exploration. Use when user needs: (1) Latest documentation for libraries/framewor
- `domain-modeling` -> `skills/engineering/domain-modeling/SKILL.md`: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording or editing an ADR.
- `frontend-development` -> `skills/engineering/frontend-development/SKILL.md`: Frontend development guidelines for React/TypeScript applications. Modern patterns including Suspense, lazy loading, useSuspenseQuery, file organization with features directory, MUI v7 styling, TanSta
- `graph-rag` -> `skills/engineering/graph-rag/SKILL.md`: Use when needing global or relational understanding of codebases or knowledge corpora. Keywords: GraphRAG, knowledge graph, entity extraction, community summarization, graph traversal, Microsoft Graph
- `i18n-localization` -> `skills/engineering/i18n-localization/SKILL.md`: Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.
- `implement` -> `skills/engineering/implement/SKILL.md`: "Implement a piece of work based on a spec or set of tickets."
- `improve-codebase-architecture` -> `skills/engineering/improve-codebase-architecture/SKILL.md`: Find deepening opportunities in a codebase, informed by the domain language in CONTEXT.md and the decisions in docs/adr/. Use when the user wants to improve architecture, find refactoring opportunitie
- `lint-and-validate` -> `skills/engineering/lint-and-validate/SKILL.md`: Automatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, vali
- `llm-evals` -> `skills/engineering/llm-evals/SKILL.md`: Use when validating, benchmarking, or monitoring LLM application performance. Keywords: RAG evaluation, LLM-as-a-judge, CI/CD gating, trajectory scoring, test suites, prompt quality.
- `nextjs-best-practices` -> `skills/engineering/nextjs-best-practices/SKILL.md`: Next.js App Router principles. Server Components, data fetching, routing patterns.
- `nodejs-best-practices` -> `skills/engineering/nodejs-best-practices/SKILL.md`: Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.
- `openai-docs` -> `skills/engineering/openai-docs/SKILL.md`: "Use when the user asks how to build with OpenAI products or APIs and needs up-to-date official documentation with citations, help choosing the latest model for a use case, or explicit GPT-5.4 upgrade
- `performance-profiling` -> `skills/engineering/performance-profiling/SKILL.md`: Performance profiling principles. Measurement, analysis, and optimization techniques.
- `playwright` -> `skills/engineering/playwright/SKILL.md`: "Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapp
- `playwright-interactive` -> `skills/engineering/playwright-interactive/SKILL.md`: "Persistent browser and Electron interaction through `js_repl` for fast iterative UI debugging."
- `prompt-engineering` -> `skills/engineering/prompt-engineering/SKILL.md`: Use when designing, optimizing, testing, or deploying robust prompt systems for AI agents. This skill provides frameworks for structured prompt engineering, meta-prompting, and automated optimization 
- `prototype` -> `skills/engineering/prototype/SKILL.md`: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
- `python-patterns` -> `skills/engineering/python-patterns/SKILL.md`: Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.
- `react-patterns` -> `skills/engineering/react-patterns/SKILL.md`: Modern React patterns and principles. Hooks, composition, performance, TypeScript best practices.
- `render-deploy` -> `skills/engineering/render-deploy/SKILL.md`: Deploy applications to Render by analyzing codebases, generating render.yaml Blueprints, and providing Dashboard deeplinks. Use when the user wants to deploy, host, publish, or set up their applicatio
- `repomix` -> `skills/engineering/repomix/SKILL.md`: Package entire code repositories into single AI-friendly files using Repomix. Capabilities include pack codebases with customizable include/exclude patterns, generate multiple output formats (XML, Mar
- `research` -> `skills/engineering/research/SKILL.md`: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading le
- `resolving-merge-conflicts` -> `skills/engineering/resolving-merge-conflicts/SKILL.md`: "Use when you need to resolve an in-progress git merge/rebase conflict."
- `setup-matt-pocock-skills` -> `skills/engineering/setup-matt-pocock-skills/SKILL.md`: Sets up an `## Agent skills` block in AGENTS.md/CLAUDE.md and `docs/agents/` so the engineering skills know this repo's issue tracker (GitHub or local markdown), triage label vocabulary, and domain do
- `shopify` -> `skills/engineering/shopify/SKILL.md`: Build Shopify applications, extensions, and themes using GraphQL/REST APIs, Shopify CLI, Polaris UI components, and Liquid templating. Capabilities include app development with OAuth authentication, c
- `structured-outputs` -> `skills/engineering/structured-outputs/SKILL.md`: Use when needing 100% type-safe, schema-valid data extraction from LLMs. Keywords: structured output, JSON schema, Pydantic, Zod, type-safe, constrained decoding, validation, tool use.
- `tdd` -> `skills/engineering/tdd/SKILL.md`: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first develo
- `tdd-workflow` -> `skills/engineering/tdd-workflow/SKILL.md`: Test-Driven Development workflow principles. RED-GREEN-REFACTOR cycle.
- `testing-patterns` -> `skills/engineering/testing-patterns/SKILL.md`: Testing patterns and principles. Unit, integration, mocking strategies.
- `to-issues` -> `skills/engineering/to-issues/SKILL.md`: Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. Use when user wants to convert a plan into issues, create implementatio
- `to-prd` -> `skills/engineering/to-prd/SKILL.md`: Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
- `to-spec` -> `skills/engineering/to-spec/SKILL.md`: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
- `to-tickets` -> `skills/engineering/to-tickets/SKILL.md`: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locall
- `triage` -> `skills/engineering/triage/SKILL.md`: Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs.
- `vulnerability-scanner` -> `skills/engineering/vulnerability-scanner/SKILL.md`: Advanced vulnerability analysis principles. OWASP 2025, Supply Chain Security, attack surface mapping, risk prioritization.
- `wayfinder` -> `skills/engineering/wayfinder/SKILL.md`: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- `web-frameworks` -> `skills/engineering/web-frameworks/SKILL.md`: Build modern full-stack web applications with Next.js (App Router, Server Components, RSC, PPR, SSR, SSG, ISR), Turborepo (monorepo management, task pipelines, remote caching, parallel execution), and
- `webapp-testing` -> `skills/engineering/webapp-testing/SKILL.md`: Web application testing principles. E2E, Playwright, deep audit strategies.
- `wizard` -> `skills/engineering/wizard/SKILL.md`: Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-part
- `write-a-skill` -> `skills/engineering/write-a-skill/SKILL.md`: Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.

## games
- `2d-games` -> `skills/games/2d-games/SKILL.md`: 2D game development principles. Sprites, tilemaps, physics, camera.
- `3d-games` -> `skills/games/3d-games/SKILL.md`: 3D game development principles. Rendering, shaders, physics, cameras.
- `game-art` -> `skills/games/game-art/SKILL.md`: Game art principles. Visual style selection, asset pipeline, animation workflow.
- `game-audio` -> `skills/games/game-audio/SKILL.md`: Game audio principles. Sound design, music integration, adaptive audio systems.
- `game-design` -> `skills/games/game-design/SKILL.md`: Game design principles. GDD structure, balancing, player psychology, progression.
- `game-development` -> `skills/games/game-development/SKILL.md`: Game development orchestrator. Routes to platform-specific skills based on project needs.
- `mobile-games` -> `skills/games/mobile-games/SKILL.md`: Mobile game development principles. Touch input, battery, performance, app stores.
- `multiplayer` -> `skills/games/multiplayer/SKILL.md`: Multiplayer game development principles. Architecture, networking, synchronization.
- `pc-games` -> `skills/games/pc-games/SKILL.md`: PC and console game development principles. Engine selection, platform features, optimization strategies.
- `vr-ar` -> `skills/games/vr-ar/SKILL.md`: VR/AR development principles. Comfort, interaction, performance requirements.
- `web-games` -> `skills/games/web-games/SKILL.md`: Web browser game development principles. Framework selection, WebGPU, optimization, PWA.

## kilo-kit
- `root-cause` -> `skills/kilo-kit/debugging/root-cause/SKILL.md`: Deep root cause analysis using the 5 Whys and Fishbone techniques. Use when systematic debugging hasn't found the cause, or for complex systemic issues. Keywords: root cause, why, underlying, fundamen
- `systematic` -> `skills/kilo-kit/debugging/systematic/SKILL.md`: Comprehensive 4-phase debugging methodology for complex bugs. Use for bugs that aren't immediately obvious or have resisted quick fixes. Keywords: bug, error, fix, debug, broken, crash, fail, exceptio
- `verification` -> `skills/kilo-kit/debugging/verification/SKILL.md`: Comprehensive fix verification methodology to ensure bugs are truly fixed. Use after implementing any bug fix to verify it works and hasn't caused regressions. Keywords: verify, confirm, test, validat
- `backend` -> `skills/kilo-kit/development/backend/SKILL.md`: Comprehensive backend API development skill for building robust, scalable APIs. Use when creating new endpoints, services, or backend functionality. Keywords: API, backend, endpoint, service, REST, Gr
- `security` -> `skills/kilo-kit/development/security/SKILL.md`: Security-focused development skill covering OWASP Top 10 and secure coding. Use when implementing authentication, handling user data, or security review. Keywords: security, auth, authentication, auth
- `code-review` -> `skills/kilo-kit/quality/code-review/SKILL.md`: Comprehensive code review checklist and methodology. Use when reviewing PRs, conducting code audits, or assessing code quality. Keywords: review, PR, code review, audit, assess, quality, check
- `testing` -> `skills/kilo-kit/quality/testing/SKILL.md`: Comprehensive testing skill covering unit, integration, and e2e testing with TDD. Use when writing tests, improving coverage, or setting up testing infrastructure. Keywords: test, TDD, unit test, inte

## operations
- `agent-observability` -> `skills/operations/agent-observability/SKILL.md`: Use when monitoring, tracing, or debugging agentic workflows in production. Keywords: observability, tracing, OpenTelemetry, Langfuse, latency, token cost, loop detection, telemetry.
- `bash-linux` -> `skills/operations/bash-linux/SKILL.md`: Bash/Linux terminal patterns. Critical commands, piping, error handling, scripting. Use when working on macOS or Linux systems.
- `chrome-devtools` -> `skills/operations/chrome-devtools/SKILL.md`: Browser automation, debugging, and performance analysis using Puppeteer CLI scripts. Use for automating browsers, taking screenshots, analyzing performance, monitoring network traffic, web scraping, f
- `deployment-procedures` -> `skills/operations/deployment-procedures/SKILL.md`: Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.
- `devops` -> `skills/operations/devops/SKILL.md`: Deploy and manage cloud infrastructure on Cloudflare (Workers, R2, D1, KV, Pages, Durable Objects, Browser Rendering), Docker containers, and Google Cloud Platform (Compute Engine, GKE, Cloud Run, App
- `mcp-builder` -> `skills/operations/mcp-builder/SKILL.md`: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate externa
- `mcp-management` -> `skills/operations/mcp-management/SKILL.md`: Manage Model Context Protocol (MCP) servers - discover, analyze, and execute tools/prompts/resources from configured MCP servers. Use when working with MCP integrations, need to discover available MCP
- `powershell-windows` -> `skills/operations/powershell-windows/SKILL.md`: PowerShell Windows patterns. Critical pitfalls, operator syntax, error handling.
- `server-management` -> `skills/operations/server-management/SKILL.md`: Server management principles and decision-making. Process management, monitoring strategy, and scaling decisions. Teaches thinking, not commands.

## problem-solving
- `collision-zone-thinking` -> `skills/problem-solving/collision-zone-thinking/SKILL.md`: Force unrelated concepts together to discover emergent properties - "What if we treated X like Y?"
- `defense-in-depth` -> `skills/problem-solving/defense-in-depth/SKILL.md`: Validate at every layer data passes through to make bugs impossible
- `inversion-exercise` -> `skills/problem-solving/inversion-exercise/SKILL.md`: Flip core assumptions to reveal hidden constraints and alternative approaches - "what if the opposite were true?"
- `meta-pattern-recognition` -> `skills/problem-solving/meta-pattern-recognition/SKILL.md`: Spot patterns appearing in 3+ domains to find universal principles
- `root-cause-tracing` -> `skills/problem-solving/root-cause-tracing/SKILL.md`: Systematically trace bugs backward through call stack to find original trigger
- `scale-game` -> `skills/problem-solving/scale-game/SKILL.md`: Test at extremes (1000x bigger/smaller, instant/year-long) to expose fundamental truths hidden at normal scales
- `sequential-thinking` -> `skills/problem-solving/sequential-thinking/SKILL.md`: Use when complex problems require systematic step-by-step reasoning with ability to revise thoughts, branch into alternative approaches, or dynamically adjust scope. Ideal for multi-stage analysis, de
- `simplification-cascades` -> `skills/problem-solving/simplification-cascades/SKILL.md`: Find one insight that eliminates multiple components - "if this is true, we don't need X, Y, or Z"
- `systematic-debugging` -> `skills/problem-solving/systematic-debugging/SKILL.md`: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- `when-stuck` -> `skills/problem-solving/when-stuck/SKILL.md`: Dispatch to the right problem-solving technique based on how you're stuck

## productivity
- `brainstorming` -> `skills/productivity/brainstorming/SKILL.md`: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
- `caveman` -> `skills/productivity/caveman/SKILL.md`: Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries while keeping full technical accuracy. Use when user says "caveman mode", "talk like caveman",
- `claude-handoff` -> `skills/productivity/claude-handoff/SKILL.md`: Hand the current conversation off to a fresh background agent that picks up the work immediately.
- `dispatching-parallel-agents` -> `skills/productivity/dispatching-parallel-agents/SKILL.md`: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- `executing-plans` -> `skills/productivity/executing-plans/SKILL.md`: Use when you have a written implementation plan to execute in a separate session with review checkpoints
- `finishing-a-development-branch` -> `skills/productivity/finishing-a-development-branch/SKILL.md`: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
- `git-guardrails-claude-code` -> `skills/productivity/git-guardrails-claude-code/SKILL.md`: Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hoo
- `grill-me` -> `skills/productivity/grill-me/SKILL.md`: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their 
- `grill-with-docs` -> `skills/productivity/grill-with-docs/SKILL.md`: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to
- `grilling` -> `skills/productivity/grilling/SKILL.md`: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
- `handoff` -> `skills/productivity/handoff/SKILL.md`: Compact the current conversation into a handoff document for another agent to pick up.
- `human-in-the-loop` -> `skills/productivity/human-in-the-loop/SKILL.md`: Use when designing human approval gates for high-stakes agent actions. Keywords: human-in-the-loop, HITL, approval gate, checkpoint, confirmation, risk-tiered, action review.
- `loop-me` -> `skills/productivity/loop-me/SKILL.md`: Grill me about specs for the workflows I want to build, within this workspace.
- `migrate-to-shoehorn` -> `skills/productivity/migrate-to-shoehorn/SKILL.md`: Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.
- `parallel-agents` -> `skills/productivity/parallel-agents/SKILL.md`: Multi-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.
- `plan-writing` -> `skills/productivity/plan-writing/SKILL.md`: Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.
- `receiving-code-review` -> `skills/productivity/receiving-code-review/SKILL.md`: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative
- `requesting-code-review` -> `skills/productivity/requesting-code-review/SKILL.md`: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- `scaffold-exercises` -> `skills/productivity/scaffold-exercises/SKILL.md`: Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course sect
- `setup-pre-commit` -> `skills/productivity/setup-pre-commit/SKILL.md`: Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit
- `setup-ts-deep-modules` -> `skills/productivity/setup-ts-deep-modules/SKILL.md`: Wire dependency-cruiser into a TypeScript repo so each package is a deep module, with implementation hidden in subfolders and reachable only through its entry-point files. User-invoked.
- `spec-driven-development` -> `skills/productivity/spec-driven-development/SKILL.md`: Use when starting a new feature, product, or system design. Eliminates the spec-implementation gap by making specifications the primary artifact that drives code generation. Keywords: SDD, spec-driven
- `subagent-driven-development` -> `skills/productivity/subagent-driven-development/SKILL.md`: Use when executing implementation plans with independent tasks in the current session
- `teach` -> `skills/productivity/teach/SKILL.md`: Teach the user a new skill or concept, within this workspace.
- `test-driven-development` -> `skills/productivity/test-driven-development/SKILL.md`: Use when implementing any feature or bugfix, before writing implementation code
- `to-questionnaire` -> `skills/productivity/to-questionnaire/SKILL.md`: Turn a decision you can't fully answer into a questionnaire for someone else to fill in.
- `using-git-worktrees` -> `skills/productivity/using-git-worktrees/SKILL.md`: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verificat
- `using-superpowers` -> `skills/productivity/using-superpowers/SKILL.md`: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
- `verification-before-completion` -> `skills/productivity/verification-before-completion/SKILL.md`: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence
- `wait-what` -> `skills/productivity/wait-what/SKILL.md`: "Stop. That last message did not land: re-pitch it."
- `writing-beats` -> `skills/productivity/writing-beats/SKILL.md`: Writing, exploit; assemble raw material into a journey of beats, grounding each term before a beat leans on it.
- `writing-for-agents` -> `skills/productivity/writing-for-agents/SKILL.md`: Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.
- `writing-fragments` -> `skills/productivity/writing-fragments/SKILL.md`: "Writing, explore: mine raw fragments, no structure yet."
- `writing-plans` -> `skills/productivity/writing-plans/SKILL.md`: Use when you have a spec or requirements for a multi-step task, before touching code
- `writing-shape` -> `skills/productivity/writing-shape/SKILL.md`: "Writing, exploit: shape raw material into an article, paragraph by paragraph."
- `writing-skills` -> `skills/productivity/writing-skills/SKILL.md`: Use when creating new skills, editing existing skills, or verifying skills work before deployment
- `zoom-out` -> `skills/productivity/zoom-out/SKILL.md`: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.

## security
- `ai-guardrails` -> `skills/security/ai-guardrails/SKILL.md`: Use when building autonomous LLM agents operating in live environments. Protects against prompt injection, tool abuse, data exfiltration, and runaway loops. Keywords: guardrails, prompt injection, IPI
- `red-team-tactics` -> `skills/security/red-team-tactics/SKILL.md`: Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.

## writing-docs
- `behavioral-modes` -> `skills/writing-docs/behavioral-modes/SKILL.md`: AI operational modes (brainstorm, implement, debug, review, teach, ship, orchestrate). Use to adapt behavior based on task type.
- `doc` -> `skills/writing-docs/doc/SKILL.md`: "Use when the task involves reading, creating, or editing `.docx` documents, especially when formatting or layout fidelity matters; prefer `python-docx` plus the bundled `scripts/render_docx.py` for v
- `documentation-templates` -> `skills/writing-docs/documentation-templates/SKILL.md`: Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.
- `docx` -> `skills/writing-docs/docx/SKILL.md`: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When Claude needs to work with professional documents 
- `mermaidjs-v11` -> `skills/writing-docs/mermaidjs-v11/SKILL.md`: Create diagrams and visualizations using Mermaid.js v11 syntax. Use when generating flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, user journeys, timelines, 
- `pdf` -> `skills/writing-docs/pdf/SKILL.md`: Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically p
- `pptx` -> `skills/writing-docs/pptx/SKILL.md`: "Presentation creation, editing, and analysis. When Claude needs to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layout
- `slides` -> `skills/writing-docs/slides/SKILL.md`: Create and edit presentation slide decks (`.pptx`) with PptxGenJS, bundled layout helpers, and render/validation utilities. Use when tasks involve building a new PowerPoint deck, recreating slides fro
- `template-skill` -> `skills/writing-docs/template-skill/SKILL.md`: A template for creating new modular and scalable agent skills.
- `templates` -> `skills/writing-docs/templates/SKILL.md`: Project scaffolding templates for new applications. Use when creating new projects from scratch. Contains 12 templates for various tech stacks.
- `xlsx` -> `skills/writing-docs/xlsx/SKILL.md`: "Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .ts
