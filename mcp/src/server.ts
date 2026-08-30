#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  executeCompactContext,
  executeGrillPlan,
  executeSynthesizeSkill,
  executeThinkStep,
  executeTraceRootCause,
} from "./cognitive-tools.js";
import {
  executeEditFile,
  executeGrepCode,
  executeReadFile,
  executeRunCommand,
  executeSearchFiles,
  executeWriteFile,
} from "./execution-tools.js";
import {
  formatBenchmarkReport,
  formatCompactContext,
  formatEditFile,
  formatGrepCode,
  formatGrillPlan,
  formatLoadedSkill,
  formatMemoryReport,
  formatOrchestration,
  formatReadFile,
  formatRoute,
  formatRouteReport,
  formatRunCommand,
  formatSearchFiles,
  formatSentinelStatus,
  formatSkills,
  formatSynthesizeSkill,
  formatThinkStep,
  formatTraceRootCause,
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
import { KiloSentinel } from "./sentinel.js";
import { validateSkills } from "./validator.js";
import type { ResponseFormat } from "./types.js";

const SERVER_VERSION = "1.8.0";
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const formatSchema = z.enum(["markdown", "json"]).default("markdown");

export interface CreateKiloKitServerOptions {
  repoRoot?: string;
}

export async function createKiloKitServer(options: CreateKiloKitServerOptions = {}): Promise<McpServer> {
  const repoRoot = path.resolve(options.repoRoot ?? process.env.KILO_KIT_REPO_ROOT ?? DEFAULT_REPO_ROOT);
  const workspaceRoot = process.env.KILO_KIT_WORKSPACE_ROOT
    ? path.resolve(process.env.KILO_KIT_WORKSPACE_ROOT)
    : options.repoRoot
      ? path.resolve(options.repoRoot)
      : process.cwd();
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
  const sentinel = new KiloSentinel({
    memory: orchestrationMemory,
    maxConsecutiveIdenticalCalls: 3,
    similarityThreshold: 0.85,
    maxConsecutiveFailures: 3,
    maxSessionStepBudget: 50,
  });

  const server = new McpServer(
    {
      name: "kilo-kit",
      version: SERVER_VERSION,
    },
    {
      instructions:
        "CRITICAL KILO-KIT C4 PROTOCOL:\n" +
        "1. MANDATORY FIRST ACTION: You MUST call kilo_orchestrate_task as your FIRST action for any request involving code, debugging, bug fixes, UI, features, refactoring, or project work.\n" +
        "2. EXCLUSIVE TOOL USAGE (NO NATIVE LIMBS): Do NOT use native terminal, search, file, or edit tools (Bash, Terminal, Read, Edit, Write, ListDir, Search, Find, grep_search, view_file, run_command, replace_file_content). You MUST use kilo_read_file, kilo_search_files, kilo_grep_code, kilo_write_file, kilo_edit_file, and kilo_run_command for ALL workspace discovery, file I/O, editing, and command executions.\n" +
        "3. SESSION CONTINUITY: Always pass the sessionId obtained from kilo_orchestrate_task to all subsequent tool calls to maintain pre-flight grounding and satisfy Kilo-Sentinel supervision.",
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
    "kilo_record_reflection",
    {
      title: "Record Learning Reflection & Self-Improvement",
      description:
        "Record correct approaches, wrong paths/pitfalls encountered, skill ratings, and lessons learned into SQLite to drive Kilo-Kit's continuous self-improvement across sessions.",
      inputSchema: {
        taskMode: z.string().min(1).max(80).describe("Task mode (e.g. 'bug', 'architecture', 'ui', 'feature-build')."),
        taskSummary: z.string().min(1).max(1000).describe("Summary of the problem solved."),
        correctApproach: z.string().min(1).max(2000).describe("The successful strategy, fix, or architectural pattern used."),
        wrongPathsEncountered: z.array(z.string().max(1000)).describe("Mistakes, wrong assumptions, or pitfalls encountered."),
        skillsEvaluated: z
          .array(
            z.object({
              skillId: z.string().max(120),
              score: z.number().min(1).max(100),
              feedback: z.string().max(500).optional(),
            }),
          )
          .optional()
          .describe("Ratings and feedback for specific skills used."),
        lessonsLearned: z.string().min(1).max(2000).describe("Key invariant or takeaway for future tasks."),
        sessionId: z.string().max(120).optional().describe("Optional session ID."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({
      taskMode,
      taskSummary,
      correctApproach,
      wrongPathsEncountered,
      skillsEvaluated,
      lessonsLearned,
      sessionId,
      format,
    }) => {
      const record = orchestrationMemory.recordReflection({
        taskMode,
        taskSummary,
        correctApproach,
        wrongPathsEncountered,
        ...(skillsEvaluated ? { skillsEvaluated } : {}),
        lessonsLearned,
        ...(sessionId ? { sessionId } : {}),
      });
      if (format === "json") {
        return textResponse(JSON.stringify(record, null, 2));
      }
      return textResponse(
        [
          "# Kilo-Kit Self-Improvement Reflection Recorded",
          "",
          `ID: \`${record.id}\``,
          `Task Mode: \`${record.taskMode}\``,
          `Task Summary: ${record.taskSummary}`,
          "",
          "## Correct Approach",
          record.correctApproach,
          "",
          "## Wrong Paths Avoided",
          record.wrongPathsEncountered.map((p: string) => `- ❌ ${p}`).join("\n") || "- None",
          "",
          "## Lessons Learned",
          record.lessonsLearned,
          "",
          "Saved to SQLite memory for future autonomous retrieval.",
        ].join("\n"),
      );
    },
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
        "Load a Kilo-Kit skill by name or category/skill. Supports fuzzy aliases (e.g. 'brainstorming', 'diagnose', 'playwright', 'tdd', 'productivity/brainstorming').",
      inputSchema: {
        category: z.string().max(80).optional().describe("Optional skill category, for example engineering or productivity."),
        skill: z.string().min(1).max(120).describe("Skill name or identifier (e.g. 'brainstorming', 'diagnose', 'playwright', 'productivity/brainstorming')."),
        maxChars: z.number().int().min(100).max(50000).optional().describe("Maximum SKILL.md characters to return."),
        sessionId: z.string().optional().describe("Active session ID to register skill delivery"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ category, skill, maxChars, sessionId, format }) => {
      const loaded = await registry.loadSkill({
        ...(category ? { category } : {}),
        skill,
        ...(maxChars ? { maxChars } : {}),
      });
      if (sessionId) {
        orchestrator.recordCognitiveTool(sessionId, `skill:${loaded.skill.id}`);
      }
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
      title: "Read File (Kilo-Kit Safe Workspace I/O)",
      description:
        "MANDATORY: Read file content safely across workspace boundaries (supports line ranges and byte capping). Use this INSTEAD OF native Read/view_file tools. Registers pre-flight grounding required for subsequent edits.",
      inputSchema: {
        filePath: z.string().min(1).describe("Path to file (supports relative path, absolute path, and '~')"),
        startLine: z.number().int().min(1).optional().describe("Starting line number (1-indexed)"),
        endLine: z.number().int().min(1).optional().describe("Ending line number (1-indexed)"),
        maxBytes: z.number().int().min(100).max(1024 * 1024).optional().describe("Max bytes to return"),
        sessionId: z.string().optional().describe("Active session ID from kilo_orchestrate_task. Pass this to register pre-flight grounding for kilo_edit_file."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ filePath, startLine, endLine, maxBytes, sessionId, format }) => {
      const result = executeReadFile(workspaceRoot, { filePath, startLine, endLine, maxBytes });
      sentinel.recordPostExecution({
        sessionId: sessionId ?? "default",
        toolName: "kilo_read_file",
        args: { filePath: result.filePath, startLine, endLine },
        success: true,
        durationMs: 5,
        summary: `Read ${result.totalLines} lines from ${result.filePath}`,
      });
      return textResponse(formatReadFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_search_files",
    {
      title: "Search Files (Kilo-Kit)",
      description:
        "MANDATORY: Search for files matching a glob pattern across the workspace. Use this INSTEAD OF native find/search/glob/ListDir tools for exploratory file discovery. Pass sessionId to record pre-flight grounding.",
      inputSchema: {
        pattern: z.string().min(1).describe("Glob pattern (e.g. '*.ts', '**/*.json', 'src/**/*.tsx')"),
        rootDir: z.string().optional().describe("Subdirectory or workspace path to limit search"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Maximum file matches"),
        sessionId: z.string().optional().describe("Active session ID from kilo_orchestrate_task to register pre-flight grounding."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ pattern, rootDir, maxResults, sessionId, format }) => {
      const result = executeSearchFiles(workspaceRoot, { pattern, rootDir, maxResults });
      sentinel.recordPostExecution({
        sessionId: sessionId ?? "default",
        toolName: "kilo_search_files",
        args: { pattern, rootDir },
        success: true,
        durationMs: 5,
        summary: `Found ${result.totalMatches} file(s) matching ${pattern}`,
      });
      return textResponse(formatSearchFiles(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_grep_code",
    {
      title: "Grep Code (Kilo-Kit)",
      description:
        "MANDATORY: Search code snippets and matching lines across workspace files. Use this INSTEAD OF native grep/search tools for code pattern discovery. Pass sessionId to record pre-flight grounding.",
      inputSchema: {
        query: z.string().min(1).describe("Search string or regex pattern"),
        rootDir: z.string().optional().describe("Subdirectory or workspace path to limit search"),
        isRegex: z.boolean().optional().describe("Whether query is regex"),
        caseSensitive: z.boolean().optional().describe("Case-sensitive match"),
        maxResults: z.number().int().min(1).max(200).optional().describe("Max matches to return"),
        sessionId: z.string().optional().describe("Active session ID from kilo_orchestrate_task to register pre-flight grounding."),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ query, rootDir, isRegex, caseSensitive, maxResults, sessionId, format }) => {
      const result = executeGrepCode(workspaceRoot, { query, rootDir, isRegex, caseSensitive, maxResults });
      sentinel.recordPostExecution({
        sessionId: sessionId ?? "default",
        toolName: "kilo_grep_code",
        args: { query, rootDir },
        success: true,
        durationMs: 5,
        summary: `Found ${result.totalMatches} match(es) for ${query}`,
      });
      return textResponse(formatGrepCode(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_write_file",
    {
      title: "Write File (Kilo-Kit Hard-Gated)",
      description:
        "MANDATORY: Create a new file or overwrite an existing file. Use this INSTEAD OF native write tools. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
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
      const preFlight = sentinel.inspectPreFlight({
        sessionId,
        toolName: "kilo_write_file",
        args: { filePath, overwrite },
      });
      if (!preFlight.allowed) {
        return textResponse(`[KILO-SENTINEL HARD-GATE VIOLATION] ${preFlight.reason}\nSuggested action: ${preFlight.suggestedAction}`);
      }
      const start = Date.now();
      const result = executeWriteFile(workspaceRoot, orchestrator, { filePath, content, overwrite, sessionId });
      sentinel.recordPostExecution({
        sessionId,
        toolName: "kilo_write_file",
        args: { filePath, overwrite },
        success: true,
        durationMs: Date.now() - start,
        summary: `Action: ${result.action} on ${result.filePath}`,
      });
      return textResponse(formatWriteFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_edit_file",
    {
      title: "Edit File (Kilo-Kit Hard-Gated)",
      description:
        "MANDATORY: Perform exact targeted search-and-replace edit on an existing file with AST check. Use this INSTEAD OF native Edit/replace tools. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
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
      const preFlight = sentinel.inspectPreFlight({
        sessionId,
        toolName: "kilo_edit_file",
        args: { filePath, targetContent, replacementContent },
      });
      if (!preFlight.allowed) {
        return textResponse(`[KILO-SENTINEL HARD-GATE VIOLATION] ${preFlight.reason}\nSuggested action: ${preFlight.suggestedAction}`);
      }
      const start = Date.now();
      const result = executeEditFile(workspaceRoot, orchestrator, {
        filePath,
        targetContent,
        replacementContent,
        allowMultiple,
        sessionId,
      });
      sentinel.recordPostExecution({
        sessionId,
        toolName: "kilo_edit_file",
        args: { filePath, targetContent },
        success: result.replacements > 0,
        durationMs: Date.now() - start,
        summary: `Edit applied (${result.replacements} replacements) on ${result.filePath}`,
      });
      return textResponse(formatEditFile(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_run_command",
    {
      title: "Run Command (Kilo-Kit Hard-Gated)",
      description:
        "MANDATORY: Execute a terminal command with security guardrails and timeout. Use this INSTEAD OF native Bash/terminal tools. PROTOCOL HARD-GATE: Requires valid sessionId in 'ready' state.",
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
      const preFlight = sentinel.inspectPreFlight({
        sessionId,
        toolName: "kilo_run_command",
        args: { command, cwd },
      });
      if (!preFlight.allowed) {
        return textResponse(`[KILO-SENTINEL HARD-GATE VIOLATION] ${preFlight.reason}\nSuggested action: ${preFlight.suggestedAction}`);
      }
      const start = Date.now();
      const result = await executeRunCommand(workspaceRoot, orchestrator, { command, cwd, timeoutMs, sessionId });
      sentinel.recordPostExecution({
        sessionId,
        toolName: "kilo_run_command",
        args: { command, cwd },
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
        summary: result.exitCode === 0 ? "Command completed successfully" : `Command failed with code ${result.exitCode}`,
      });
      return textResponse(formatRunCommand(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_think_step",
    {
      title: "Sequential Thinking & Branching",
      description:
        "Iterative step-by-step reasoning engine with hypothesis tracking, revision, and solution branching.",
      inputSchema: {
        thought: z.string().min(1).describe("Current reasoning thought"),
        thoughtNumber: z.number().int().min(1).describe("Current thought step index"),
        totalThoughts: z.number().int().min(1).describe("Estimated total thought steps"),
        nextThoughtNeeded: z.boolean().describe("Whether more reasoning steps are needed"),
        isRevision: z.boolean().optional().describe("Whether this thought revises an earlier thought"),
        revisesThought: z.number().int().min(1).optional().describe("Which thought index is being revised"),
        branchFromThought: z.number().int().min(1).optional().describe("Thought index to branch from"),
        branchId: z.string().optional().describe("Identifier for this reasoning branch"),
        hypothesis: z.string().optional().describe("Explicit hypothesis being tested"),
        sessionId: z.string().optional().describe("Optional session ID"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({
      thought,
      thoughtNumber,
      totalThoughts,
      nextThoughtNeeded,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      hypothesis,
      sessionId,
      format,
    }) => {
      const result = executeThinkStep({
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        isRevision,
        revisesThought,
        branchFromThought,
        branchId,
        hypothesis,
        sessionId,
      });
      if (sessionId) {
        orchestrator.recordCognitiveTool(sessionId, "kilo_think_step", {
          thoughtLength: thought.trim().length,
          isSuperficial: thought.trim().length < 30 || /^(prepare|ready|next step|file creation|start coding)$/i.test(thought.trim()),
        });
      }
      return textResponse(formatThinkStep(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_grill_plan",
    {
      title: "Red-Team Plan Grilling",
      description:
        "Automated adversarial stress-testing against Inversion, Simplification Cascades, Blast Radius, and Edge-cases.",
      inputSchema: {
        plan: z.string().min(1).describe("The proposed architecture, implementation plan, or bugfix strategy"),
        context: z.string().optional().describe("Relevant file paths, tech stack, or system constraints"),
        depth: z.enum(["quick", "deep", "hardcore"]).optional().describe("Grilling depth"),
        sessionId: z.string().optional().describe("Active session ID to register cognitive gate satisfaction"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ plan, context, depth, sessionId, format }) => {
      const result = executeGrillPlan({ plan, context, depth });
      if (sessionId) {
        orchestrator.recordCognitiveTool(sessionId, "kilo_grill_plan", {
          planLength: plan.trim().length,
          riskScore: result.riskScore,
        });
      }
      return textResponse(formatGrillPlan(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_trace_root_cause",
    {
      title: "5-Whys Root Cause Tracer",
      description:
        "Recursive causal backward-propagation analysis from crash log to the underlying systemic root cause.",
      inputSchema: {
        errorLog: z.string().min(1).describe("Raw error message, stack trace, or failing test output"),
        failingFile: z.string().optional().describe("File where failure occurred"),
        expectedBehavior: z.string().optional().describe("Expected behavior"),
        actualBehavior: z.string().optional().describe("Actual behavior"),
        sessionId: z.string().optional().describe("Active session ID to register cognitive gate satisfaction"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ errorLog, failingFile, expectedBehavior, actualBehavior, sessionId, format }) => {
      const result = executeTraceRootCause({ errorLog, failingFile, expectedBehavior, actualBehavior });
      if (sessionId) {
        orchestrator.recordCognitiveTool(sessionId, "kilo_trace_root_cause", {
          errorLogLength: errorLog.trim().length,
        });
      }
      return textResponse(formatTraceRootCause(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_compact_context",
    {
      title: "Cognitive Context Compactor",
      description:
        "Compacts verbose logs, test dumps, and noisy output by 40-70% while preserving architectural invariants.",
      inputSchema: {
        content: z.string().min(1).describe("Verbose content to compact"),
        preserveInvariants: z.array(z.string()).optional().describe("Key invariant rules or phrases to lock"),
        targetReduction: z.enum(["moderate", "aggressive"]).optional().describe("Compaction aggressiveness"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ content, preserveInvariants, targetReduction, format }) => {
      const result = executeCompactContext({ content, preserveInvariants, targetReduction });
      return textResponse(formatCompactContext(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_synthesize_skill",
    {
      title: "Synthesize Self-Evolving Skill",
      description:
        "Distill a newly solved architectural pattern or bugfix methodology into a reusable, validated SKILL.md.",
      inputSchema: {
        skillName: z.string().min(1).describe("Name of the skill to synthesize"),
        category: z.string().optional().describe("Target skill category (defaults to 'learned')"),
        problemDescription: z.string().min(10).describe("Description of the problem solved"),
        solutionPattern: z.string().min(10).describe("Proven solution pattern and code guidelines"),
        verificationGuidance: z.string().min(10).describe("Verification and testing steps"),
        keywords: z.array(z.string()).optional().describe("Keywords for discovery"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ skillName, category, problemDescription, solutionPattern, verificationGuidance, keywords, format }) => {
      const result = await executeSynthesizeSkill(repoRoot, registry, {
        skillName,
        category,
        problemDescription,
        solutionPattern,
        verificationGuidance,
        keywords,
      });
      return textResponse(formatSynthesizeSkill(result, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_sentinel_status",
    {
      title: "Kilo-Sentinel Supervisor Status",
      description:
        "Inspect real-time Sentinel supervisor telemetry: Circuit breaker state, step budget, failure streaks, and grounded files list.",
      inputSchema: {
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ sessionId, format }) => {
      const status = sentinel.getStatus(sessionId);
      return textResponse(formatSentinelStatus(status, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_reset_circuit_breaker",
    {
      title: "Reset Circuit Breaker (Supervised)",
      description:
        "Reset an open Circuit Breaker with justification and root-cause evidence. Transitions breaker to HALF_OPEN.",
      inputSchema: {
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID"),
        justification: z.string().min(10).describe("Detailed justification and root cause explanation for reset"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ sessionId, justification, format }) => {
      const status = sentinel.resetCircuit(sessionId, justification);
      return textResponse(formatSentinelStatus(status, normalizeFormat(format)));
    },
  );

  server.registerTool(
    "kilo_benchmark_solution",
    {
      title: "Benchmark Solution Against Industry & GitHub",
      description:
        "Audit the current session trajectory against open-source GitHub standards and industry best practices. Returns alignment score or triggers re-planning.",
      inputSchema: {
        sessionId: z.string().min(1).describe("Active Kilo-Kit session ID"),
        proposedApproach: z.string().min(10).describe("The approach, architecture, or code produced in this session"),
        industryBestPractice: z.string().min(10).describe("Standard pattern, library, or algorithm used by top GitHub repos"),
        format: formatSchema.optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ sessionId, proposedApproach, industryBestPractice, format }) => {
      const report = sentinel.benchmarkSolution(sessionId, proposedApproach, industryBestPractice);
      return textResponse(formatBenchmarkReport(report, normalizeFormat(format)));
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

function isCurrentModuleMain(): boolean {
  if (!process.argv[1]) return false;
  const target = fileURLToPath(import.meta.url);
  const directPath = path.resolve(process.argv[1]);
  if (directPath === target) return true;
  try {
    return existsSync(process.argv[1]) && realpathSync(process.argv[1]) === target;
  } catch {
    return false;
  }
}

if (isCurrentModuleMain()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
