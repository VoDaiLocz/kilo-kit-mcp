#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  executeEditFile,
  executeGrepCode,
  executeReadFile,
  executeRunCommand,
  executeSearchFiles,
  executeWriteFile,
} from "./execution-tools.js";
import {
  formatEditFile,
  formatGrepCode,
  formatLoadedSkill,
  formatMemoryReport,
  formatOrchestration,
  formatReadFile,
  formatRoute,
  formatRouteReport,
  formatRunCommand,
  formatSearchFiles,
  formatSkills,
  formatValidation,
  formatWriteFile,
  textResponse,
} from "./formatters.js";
import { createJsonlOrchestrationAudit, createNoopOrchestrationAudit } from "./orchestration-audit.js";
import { createSqliteOrchestrationMemory } from "./orchestration-memory.js";
import { createOrchestrator } from "./orchestrator.js";
import { resolveInsideRepo } from "./paths.js";
import { createInMemoryRouteAnalytics, createJsonlRouteAnalytics } from "./route-analytics.js";
import { createSkillRegistry } from "./registry.js";
import { routeIntent } from "./router.js";
import { validateSkills } from "./validator.js";
import type { ResponseFormat } from "./types.js";

const SERVER_VERSION = "1.5.0";
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const formatSchema = z.enum(["markdown", "json"]).default("markdown");

export interface CreateKiloKitServerOptions {
  repoRoot?: string;
}

export async function createKiloKitServer(options: CreateKiloKitServerOptions = {}): Promise<McpServer> {
  const repoRoot = path.resolve(options.repoRoot ?? process.env.KILO_KIT_REPO_ROOT ?? DEFAULT_REPO_ROOT);
  const registry = await createSkillRegistry({ repoRoot });
  const routeAnalytics =
    process.env.KILO_KIT_WRITE_DECISIONS === "true"
      ? createJsonlRouteAnalytics({
          filePath: process.env.KILO_KIT_DECISION_TRAIL_PATH
            ? path.resolve(process.env.KILO_KIT_DECISION_TRAIL_PATH)
            : resolveInsideRepo(repoRoot, ".kilo/decision-trail.jsonl"),
        })
      : createInMemoryRouteAnalytics();
  const orchestrationMemory = await createSqliteOrchestrationMemory({
    filePath: path.resolve(process.env.KILO_KIT_MEMORY_PATH ?? path.join(os.homedir(), ".kilo-kit/orchestrator.sqlite")),
  });
  const orchestrationAudit = process.env.KILO_KIT_ORCHESTRATION_AUDIT_PATH
    ? createJsonlOrchestrationAudit(path.resolve(process.env.KILO_KIT_ORCHESTRATION_AUDIT_PATH))
    : createNoopOrchestrationAudit();
  const orchestrator = createOrchestrator({
    registry,
    memory: orchestrationMemory,
    audit: orchestrationAudit,
  });

  const server = new McpServer(
    {
      name: "kilo-kit",
      version: SERVER_VERSION,
    },
    {
      instructions:
        "CRITICAL: You MUST call kilo_orchestrate_task as your FIRST action for any user request involving code, debugging, bug fixes, UI, features, refactoring, or project work. Never jump directly into reading or editing files with native tools without calling kilo_orchestrate_task first. Follow the returned nextAction and workflow skills in order.",
    },
  );

  server.registerTool(
    "kilo_orchestrate_task",
    {
      title: "Kilo-Kit C4 Orchestrate Task",
      description:
        "MANDATORY: Call this tool FIRST before diagnosing, debugging, analyzing, creating, or modifying any code, UI, backend, or project files. Determines task mode, selects required workflow skills, enforces brainstorming gating, and orchestrates the execution flow.",
      inputSchema: {
        message: z.string().min(1).max(4000).describe("Current user request or task summary."),
        context: z
          .object({
            files: z.array(z.string().max(300)).max(30).optional(),
            mode: z.string().max(80).optional(),
            previousErrors: z.string().max(2000).optional(),
            projectFingerprint: z.string().max(200).optional(),
          })
          .optional(),
        sessionId: z.string().min(1).max(120).optional(),
        brainstormingApproved: z.boolean().optional(),
        answers: z.record(z.string().max(2000)).optional(),
        memoryConfirmations: z.record(z.enum(["accepted", "rejected"])).optional(),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ message, context, sessionId, brainstormingApproved, answers, memoryConfirmations, format }) => {
      const result = orchestrator.orchestrate({
        message,
        ...(context
          ? {
              context: {
                ...(context.files ? { files: context.files } : {}),
                ...(context.mode ? { mode: context.mode } : {}),
                ...(context.previousErrors ? { previousErrors: context.previousErrors } : {}),
                ...(context.projectFingerprint ? { projectFingerprint: context.projectFingerprint } : {}),
              },
            }
          : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(brainstormingApproved !== undefined ? { brainstormingApproved } : {}),
        ...(answers ? { answers } : {}),
        ...(memoryConfirmations ? { memoryConfirmations } : {}),
      });
      return textResponse(formatOrchestration(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_memory_report",
    {
      title: "Kilo-Kit C4 Memory Report",
      description: "Read global C4 memory facts, decisions, and recent suggestions.",
      inputSchema: {
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ format }) => textResponse(formatMemoryReport(orchestrationMemory.report(), normalizeFormat(format))),
  );

  server.registerTool(
    "kilo_search_skills",
    {
      title: "Search Kilo-Kit Skills",
      description:
        "Search the Kilo-Kit skill library by natural-language query. Use this for broad discovery before loading a specific skill.",
      inputSchema: {
        query: z.string().min(1).max(500).describe("Natural-language task or keyword query."),
        category: z.string().min(1).max(80).optional().describe("Optional category such as engineering or design."),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum number of skills to return."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ query, category, limit, format }) => {
      const searchInput = {
        query,
        ...(category ? { category } : {}),
        ...(limit ? { limit } : {}),
      };
      const skills = registry.searchSkills(searchInput);
      return textResponse(formatSkills(skills, searchInput, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_get_skill",
    {
      title: "Load Kilo-Kit Skill",
      description:
        "Load one exact Kilo-Kit skill by category and skill name. Use after kilo_route_intent or kilo_search_skills.",
      inputSchema: {
        category: z.string().min(1).max(80).describe("Skill category, for example engineering."),
        skill: z.string().min(1).max(120).describe("Skill folder name, for example tdd."),
        maxChars: z.number().int().min(100).max(50000).optional().describe("Maximum SKILL.md characters to return."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ category, skill, maxChars, format }) => {
      const loaded = await registry.loadSkill({
        category,
        skill,
        ...(maxChars ? { maxChars } : {}),
      });
      return textResponse(formatLoadedSkill(loaded, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_route_intent",
    {
      title: "Route Current Intent to Skills",
      description:
        "Recommend the best Kilo-Kit skills for any user request, bug fix, feature, UI task, or coding issue. Call before selecting or executing a workflow skill.",
      inputSchema: {
        message: z.string().min(1).max(4000).describe("Current user request or task summary."),
        context: z
          .object({
            files: z.array(z.string().max(300)).max(30).optional(),
            mode: z.string().max(80).optional(),
            previousErrors: z.string().max(2000).optional(),
          })
          .optional(),
        limit: z.number().int().min(1).max(10).optional(),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ message, context, limit, format }) => {
      const routeContext = context
        ? {
            ...(context.files ? { files: context.files } : {}),
            ...(context.mode ? { mode: context.mode } : {}),
            ...(context.previousErrors ? { previousErrors: context.previousErrors } : {}),
          }
        : undefined;
      const result = routeIntent(registry, {
        message,
        ...(routeContext ? { context: routeContext } : {}),
        ...(limit ? { limit } : {}),
      }, { analytics: routeAnalytics });
      return textResponse(formatRoute(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_route_report",
    {
      title: "Kilo-Kit Route Report",
      description:
        "Summarize route telemetry: top skills, task modes, workflow chains, score averages, and conflict penalties.",
      inputSchema: {
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ format }) => textResponse(formatRouteReport(routeAnalytics.report(), normalizeFormat(format))),
  );

  server.registerTool(
    "kilo_validate_skills",
    {
      title: "Validate Kilo-Kit Skills",
      description:
        "Run the Kilo-Kit skill validator and return a concise quality-gate summary. This is read-only and does not modify files.",
      inputSchema: {
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ format }) => {
      const summary = await validateSkills({ repoRoot });
      return textResponse(formatValidation(summary, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_read_file",
    {
      title: "Read File (Kilo-Kit)",
      description:
        "Read file content safely within repository boundaries, supporting line ranges and output size capping.",
      inputSchema: {
        filePath: z.string().min(1).describe("Relative path to file in repo"),
        startLine: z.number().int().min(1).optional().describe("Starting line number (1-indexed)"),
        endLine: z.number().int().min(1).optional().describe("Ending line number (1-indexed)"),
        maxBytes: z.number().int().min(100).max(1024 * 1024).optional().describe("Max bytes to return"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ filePath, startLine, endLine, maxBytes, format }) => {
      const result = executeReadFile(repoRoot, { filePath, startLine, endLine, maxBytes });
      return textResponse(formatReadFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_search_files",
    {
      title: "Search Files (Kilo-Kit)",
      description: "Search for files matching a glob pattern across the repository.",
      inputSchema: {
        pattern: z.string().min(1).describe("Glob pattern (e.g. '*.ts', '**/*.json', 'src/**/*.tsx')"),
        rootDir: z.string().optional().describe("Subdirectory to limit search"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Maximum file matches"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ pattern, rootDir, maxResults, format }) => {
      const result = executeSearchFiles(repoRoot, { pattern, rootDir, maxResults });
      return textResponse(formatSearchFiles(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_grep_code",
    {
      title: "Grep Code (Kilo-Kit)",
      description: "Search code snippets and matching lines across repository files.",
      inputSchema: {
        query: z.string().min(1).describe("Search string or regex pattern"),
        rootDir: z.string().optional().describe("Subdirectory to limit search"),
        isRegex: z.boolean().optional().describe("Whether query is regex"),
        caseSensitive: z.boolean().optional().describe("Case-sensitive match"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Max matches to return"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ query, rootDir, isRegex, caseSensitive, maxResults, format }) => {
      const result = executeGrepCode(repoRoot, { query, rootDir, isRegex, caseSensitive, maxResults });
      return textResponse(formatGrepCode(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_write_file",
    {
      title: "Write File (Kilo-Kit Hard-Gated)",
      description:
        "Create a new file or overwrite an existing file. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
      inputSchema: {
        filePath: z.string().min(1).describe("Relative path to file"),
        content: z.string().describe("Complete file content to write"),
        overwrite: z.boolean().optional().describe("Allow overwriting existing files"),
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID (must be in ready state)"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ filePath, content, overwrite, sessionId, format }) => {
      const result = executeWriteFile(repoRoot, orchestrator, { filePath, content, overwrite, sessionId });
      return textResponse(formatWriteFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_edit_file",
    {
      title: "Edit File (Kilo-Kit Hard-Gated)",
      description:
        "Perform exact targeted search-and-replace edit on an existing file with AST check. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
      inputSchema: {
        filePath: z.string().min(1).describe("Relative path to file"),
        targetContent: z.string().min(1).describe("Exact content substring to replace"),
        replacementContent: z.string().describe("Replacement content"),
        allowMultiple: z.boolean().optional().describe("Allow multiple replacements"),
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID (must be in ready state)"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ filePath, targetContent, replacementContent, allowMultiple, sessionId, format }) => {
      const result = executeEditFile(repoRoot, orchestrator, {
        filePath,
        targetContent,
        replacementContent,
        allowMultiple,
        sessionId,
      });
      return textResponse(formatEditFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_run_command",
    {
      title: "Run Command (Kilo-Kit Hard-Gated)",
      description:
        "Execute a terminal command with security guardrails and timeout. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
      inputSchema: {
        command: z.string().min(1).describe("Terminal command to run"),
        cwd: z.string().optional().describe("Working directory relative to repoRoot"),
        timeoutMs: z.number().int().min(1000).max(120000).optional().describe("Timeout in milliseconds"),
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID (must be in ready state)"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ command, cwd, timeoutMs, sessionId, format }) => {
      const result = await executeRunCommand(repoRoot, orchestrator, { command, cwd, timeoutMs, sessionId });
      return textResponse(formatRunCommand(result, normalizeFormat(format)));
    },
  );

  registerResources(server, repoRoot, registry);
  registerPrompts(server);

  return server;
}

function registerResources(
  server: McpServer,
  repoRoot: string,
  registry: Awaited<ReturnType<typeof createSkillRegistry>>,
): void {
  server.registerResource(
    "kilo-skills-index",
    "kilo://skills/index",
    {
      title: "Kilo-Kit Skills Index",
      description: "Lightweight index for skill discovery.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: await readFile(resolveInsideRepo(repoRoot, "skills/SKILLS_INDEX.md"), "utf8"),
        },
      ],
    }),
  );

  server.registerResource(
    "kilo-core-master",
    "kilo://core/master",
    {
      title: "Kilo-Kit Master Skill",
      description: "Core Cognitive Flow Architecture and routing protocol.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: await readFile(resolveInsideRepo(repoRoot, "src/core/KILO_MASTER.md"), "utf8"),
        },
      ],
    }),
  );

  server.registerResource(
    "kilo-c4-operating-rules",
    "kilo://rules/c4",
    {
      title: "Kilo-Kit C4 Operating Rules",
      description: "Minimal rules a host agent should follow after installing the Kilo-Kit MCP server.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: C4_OPERATING_RULES,
        },
      ],
    }),
  );

  server.registerResource(
    "kilo-skill",
    new ResourceTemplate("kilo://skills/{category}/{skill}", {
      list: async () => ({
        resources: registry.listSkills().map((skill) => ({
          uri: `kilo://skills/${skill.category}/${skill.name}`,
          name: skill.id,
          description: skill.description,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      title: "Kilo-Kit Skill",
      description: "Dynamic resource for one Kilo-Kit skill.",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const category = String(variables.category);
      const skill = String(variables.skill);
      const loaded = await registry.loadSkill({ category, skill, maxChars: 20_000 });
      return {
        contents: [
          {
            uri: uri.href,
            text: loaded.content,
          },
        ],
      };
    },
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "kilo-c4-workflow",
    {
      title: "Run Request Through C4",
      description: "Prompt the agent to use the C4 gate before substantive implementation work.",
      argsSchema: {
        request: z.string().min(1).max(4000),
      },
    },
    ({ request }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the Kilo-Kit C4 workflow for this request. Call kilo_orchestrate_task first. If the state is brainstorming_required, load productivity/brainstorming with kilo_get_skill and get approval before coding. If the state is awaiting_memory_confirmation, resolve the suggestions. When the state is ready, load firstSkillToLoad, inspect any other relevant host-agent skills, follow finalWorkflow, and satisfy verificationGate before completion.\n\nRequest:\n${request}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "kilo-select-skill",
    {
      title: "Select Kilo-Kit Skill",
      description: "Prompt the agent to route the current request through Kilo-Kit before implementation.",
      argsSchema: {
        request: z.string().min(1).max(4000),
      },
    },
    ({ request }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Route this request through Kilo-Kit. First call kilo_route_intent with the request, then load the top skill with kilo_get_skill, then proceed.\n\nRequest:\n${request}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "kilo-validate-library",
    {
      title: "Validate Kilo-Kit Library",
      description: "Prompt the agent to run the Kilo-Kit validation quality gate.",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Run kilo_validate_skills and summarize whether the Kilo-Kit skill library passes the quality gate.",
          },
        },
      ],
    }),
  );
}

function normalizeFormat(format: ResponseFormat | undefined): ResponseFormat {
  return format ?? "markdown";
}

const C4_OPERATING_RULES = `# Kilo-Kit C4 Operating Rules

For substantive coding, debugging, refactoring, review, publishing, or project-work requests:

1. Call \`kilo_orchestrate_task\` before implementation.
2. If state is \`brainstorming_required\`, load \`productivity/brainstorming\` with \`kilo_get_skill\`, follow it, and get user approval.
3. Call \`kilo_orchestrate_task\` again with the same \`sessionId\` and \`brainstormingApproved=true\`.
4. If state is \`awaiting_memory_confirmation\`, accept or reject memory suggestions before execution.
5. When state is \`ready\`, load \`firstSkillToLoad\` with \`kilo_get_skill\`.
6. Also inspect the host agent's own available skill list and load any other relevant skills before coding.
7. Follow \`finalWorkflow\`.
8. Satisfy \`verificationGate\` before claiming completion.

For read-only requests, \`kilo_route_intent\` is enough.
`;

async function main(): Promise<void> {
  const server = await createKiloKitServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
