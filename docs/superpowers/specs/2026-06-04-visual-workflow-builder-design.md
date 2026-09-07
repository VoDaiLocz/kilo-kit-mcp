# Visual Workflow Builder v2.0 Design

## Goal

Build a local-only web dashboard for Kilo-Kit that lets a user inspect how C4 is operating in practice: which sessions are blocked at the real `/brainstorming` gate, which sessions reached `ready`, which workflow skills were released after approval, and what memory/audit data was recorded.

The v2.0 dashboard is an operator view, not a remote SaaS product and not a replacement for MCP orchestration. It should make the current C4 system visible and reviewable so the user can trust, debug, and tune the skill workflow.

## Non-Goals

- Do not add login, accounts, remote hosting, or cloud sync in v2.0.
- Do not mutate SQLite memory or audit files from the UI.
- Do not add dashboard controls for approving brainstorming or accepting memory suggestions in v2.0.
- Do not create a second workflow engine separate from the MCP/C4 router.
- Do not require a browser extension or IDE-specific integration.

## Core Decision

v2.0 will ship as a local web server inside the npm package.

The package will expose a new CLI command:

```text
kilo-kit-dashboard --port 4377
```

The dashboard server reads existing local C4 artifacts:

- `KILO_KIT_MEMORY_PATH` or `~/.kilo-kit/orchestrator.sqlite`
- `KILO_KIT_ORCHESTRATION_AUDIT_PATH` when configured
- `KILO_KIT_DECISION_TRAIL_PATH` when configured

The server is read-only by default and binds to localhost unless explicitly configured otherwise.

## User Experience

### Workflow Board

The primary screen is a workflow board grouped by C4 session.

Each session row/card shows:

- session id
- task mode
- current state
- original message
- created/updated time
- next action
- audit references when available

For each session, the visual flow shows:

```text
User request
-> brainstorming_required
-> productivity/brainstorming
-> brainstormingApproved=true
-> ready
-> final workflow skills
-> verification gate
```

If a session is still blocked at brainstorming, the board must show that no implementation workflow has been released. If a session is `ready`, the board must show the post-brainstorming workflow without repeating `productivity/brainstorming`.

### Memory/Audit Viewer

The second screen lets the user inspect recorded operating data:

- memory facts
- memory decisions
- orchestration sessions
- workflow outcomes
- orchestration audit JSONL entries
- route decision trail JSONL entries

This view is for review and debugging. It should support filtering by state, task mode, skill id, session id, and text search.

### Health Panel

The dashboard includes a compact health panel:

- package version
- Node version
- memory DB path
- audit path
- route decision trail path
- file readability status
- latest session timestamp

If a path is missing, unreadable, or not configured, the UI should show a precise warning without crashing.

## Architecture

### Package Surface

Add a second binary to the root package:

```json
{
  "bin": {
    "kilo-kit-mcp": "mcp/dist/server.js",
    "kilo-kit-dashboard": "dashboard/dist/server.js"
  }
}
```

The dashboard should live under a new top-level `dashboard/` package to keep UI/server dependencies out of the MCP server source:

```text
dashboard/
|-- package.json
|-- tsconfig.json
|-- src/
|   |-- server.ts
|   |-- data/
|   |   |-- sqlite-store.ts
|   |   |-- jsonl-store.ts
|   |   `-- workflow-view-model.ts
|   |-- api/
|   |   |-- sessions.ts
|   |   |-- audit.ts
|   |   |-- memory.ts
|   |   `-- health.ts
|   `-- ui/
|       |-- App.tsx
|       |-- WorkflowBoard.tsx
|       |-- SessionDetail.tsx
|       |-- MemoryAuditViewer.tsx
|       `-- HealthPanel.tsx
`-- tests/
```

The root release workflow should build both `mcp/` and `dashboard/` before publishing.

### Local API

The local server exposes read-only JSON endpoints:

- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `GET /api/memory`
- `GET /api/audit`
- `GET /api/route-report`

All endpoints should cap output size and support pagination or `limit` parameters where data can grow.

### Data Model

The dashboard should not invent new persistence for v2.0. It reads and normalizes existing records:

- `orchestration_sessions`
- `workflow_outcomes`
- `memory_facts`
- `memory_decisions`
- orchestration audit JSONL
- route decision JSONL

The normalized view model should include:

- `session`
- `stateTimeline`
- `brainstormingGate`
- `releasedWorkflow`
- `verificationGate`
- `memorySuggestions`
- `auditEntries`

The `brainstormingGate` model is explicit because it is the main policy the user wants to verify.

## Error Handling

- If SQLite is unavailable in the current Node runtime, return a health warning and keep the UI usable for JSONL files.
- If the DB file does not exist, show an empty state with the resolved path.
- If JSONL contains malformed lines, skip bad lines, report their line numbers, and continue.
- If a session references workflow data that cannot be parsed, show the raw session metadata and mark the workflow panel as invalid.
- If a request would return too much data, truncate with a visible `truncated=true` flag.

## Security Posture

- Bind to `127.0.0.1` by default.
- Read only the configured memory/audit files.
- Do not expose arbitrary filesystem browsing.
- Do not write to SQLite, JSONL, project files, or package config.
- Do not include raw chat history beyond what C4 already stores in session messages and audit entries.

## Testing Strategy

Unit tests:

- SQLite session parsing
- JSONL audit parsing
- workflow view-model conversion
- health diagnostics for missing/unreadable paths

API tests:

- `/api/health` reports paths and version
- `/api/sessions` returns state summaries
- `/api/sessions/:id` returns workflow detail
- `/api/audit` handles malformed JSONL safely

UI tests:

- workflow board renders `brainstorming_required` sessions as blocked
- workflow board renders `ready` sessions with post-brainstorming skills
- memory/audit viewer filters by state/task mode/session id

Smoke test:

- run `kilo-kit-dashboard --port 4377`
- load `/api/health`
- load the dashboard HTML
- verify it can render seeded fixture data

## Release Criteria

v2.0 is ready when:

- `npm i @vodailocz/kilo-kit-mcp` installs both `kilo-kit-mcp` and `kilo-kit-dashboard`.
- `kilo-kit-dashboard --port 4377` starts a localhost server.
- The dashboard reads the same C4 DB/audit paths used by OpenCode and AGY.
- A real C4 smoke session appears as `brainstorming_required`, then `ready` after `brainstormingApproved=true`.
- All root release checks build, typecheck, test, smoke, validate skills, pack dry-run, and publish through the existing Trusted Publishing workflow.

## Future Work

After v2.0, later versions can add:

- Live Control Panel for orchestrating a prompt from the dashboard.
- Accept/reject memory suggestions from the dashboard.
- Mermaid/React Flow export for workflow diagrams.
- Multi-project switching.
- Optional remote mode with authentication.
