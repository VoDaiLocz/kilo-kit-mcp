import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  executeEditFile,
  executeGrepCode,
  executeReadFile,
  executeRunCommand,
  executeSearchFiles,
  executeWriteFile,
} from "../src/execution-tools.js";
import { createInMemoryOrchestrationMemory } from "../src/orchestration-memory.js";
import { createOrchestrator } from "../src/orchestrator.js";
import { createSkillRegistry } from "../src/registry.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const testSandboxDir = path.join(repoRoot, "mcp/tests/.sandbox");

describe("100% MCP Execution Tools Suite", () => {
  beforeAll(() => {
    mkdirSync(testSandboxDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testSandboxDir)) {
      rmSync(testSandboxDir, { recursive: true, force: true });
    }
  });

  describe("kilo_read_file, kilo_search_files, kilo_grep_code (Read-only tools)", () => {
    it("reads a file with line slicing and formatting", () => {
      const sampleFile = path.join(testSandboxDir, "sample-read.txt");
      writeFileSync(sampleFile, "line 1\nline 2\nline 3\nline 4\nline 5\n", "utf8");

      const result = executeReadFile(repoRoot, {
        filePath: "mcp/tests/.sandbox/sample-read.txt",
        startLine: 2,
        endLine: 4,
      });

      expect(result.totalLines).toBe(6);
      expect(result.startLine).toBe(2);
      expect(result.endLine).toBe(4);
      expect(result.content).toContain("2: line 2");
      expect(result.content).toContain("3: line 3");
      expect(result.content).toContain("4: line 4");
      expect(result.content).not.toContain("1: line 1");
    });

    it("searches files using glob patterns", () => {
      const result = executeSearchFiles(repoRoot, {
        pattern: "*.json",
        rootDir: "mcp",
      });

      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.files.some((f) => f.endsWith("package.json"))).toBe(true);
    });

    it("greps code within files", () => {
      const result = executeGrepCode(repoRoot, {
        query: "SERVER_VERSION",
        rootDir: "mcp/src",
      });

      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.matches[0]?.file).toContain("server.ts");
    });
  });

  describe("Protocol-Level Hard-Gate on Write, Edit, and Run Command", () => {
    it("blocks kilo_write_file when no sessionId is provided", async () => {
      const registry = await createSkillRegistry({ repoRoot });
      const orchestrator = createOrchestrator({
        registry,
        memory: createInMemoryOrchestrationMemory(),
      });

      expect(() =>
        executeWriteFile(repoRoot, orchestrator, {
          filePath: "mcp/tests/.sandbox/blocked.txt",
          content: "Hello World",
          sessionId: "",
        }),
      ).toThrowError(/\[KILO-KIT HARD-GATE VIOLATION\]/);
    });

    it("blocks kilo_write_file and kilo_edit_file when session is in brainstorming_required state", async () => {
      const registry = await createSkillRegistry({ repoRoot });
      const orchestrator = createOrchestrator({
        registry,
        memory: createInMemoryOrchestrationMemory(),
      });

      const orchestrateRes = orchestrator.orchestrate({
        message: "Refactor login logic in auth.ts",
      });
      expect(orchestrateRes.state).toBe("brainstorming_required");
      const sessionId = orchestrateRes.sessionId;

      // Attempt to write file -> Must be BLOCKED
      expect(() =>
        executeWriteFile(repoRoot, orchestrator, {
          filePath: "mcp/tests/.sandbox/blocked.txt",
          content: "Should not write",
          sessionId,
        }),
      ).toThrowError(/\[KILO-KIT HARD-GATE VIOLATION\].*brainstorming_required/);

      // Create a test file for edit attempt
      const targetFile = path.join(testSandboxDir, "sample-edit.txt");
      writeFileSync(targetFile, "const count = 1;", "utf8");

      // Attempt to edit file -> Must be BLOCKED
      expect(() =>
        executeEditFile(repoRoot, orchestrator, {
          filePath: "mcp/tests/.sandbox/sample-edit.txt",
          targetContent: "const count = 1;",
          replacementContent: "const count = 2;",
          sessionId,
        }),
      ).toThrowError(/\[KILO-KIT HARD-GATE VIOLATION\].*brainstorming_required/);

      // Attempt to run command -> Must be BLOCKED
      await expect(
        executeRunCommand(repoRoot, orchestrator, {
          command: "echo test",
          sessionId,
        }),
      ).rejects.toThrowError(/\[KILO-KIT HARD-GATE VIOLATION\].*brainstorming_required/);
    });

    it("allows write, edit, and command execution once session reaches ready state", async () => {
      const registry = await createSkillRegistry({ repoRoot });
      const orchestrator = createOrchestrator({
        registry,
        memory: createInMemoryOrchestrationMemory(),
      });

      // 1. Initial request -> brainstorming_required
      const res1 = orchestrator.orchestrate({
        message: "Add calculator utility",
      });
      const sessionId = res1.sessionId;

      // 2. Approve brainstorming -> transitions to ready
      const res2 = orchestrator.orchestrate({
        sessionId,
        message: "Add calculator utility",
        brainstormingApproved: true,
      });
      expect(res2.state).toBe("ready");

      orchestrator.recordCognitiveTool(sessionId, "kilo_think_step", {
        thoughtLength: 100,
        isSuperficial: false,
      });
      orchestrator.recordCognitiveTool(sessionId, "kilo_grill_plan", {
        planLength: 100,
      });

      // 3. kilo_write_file succeeds
      const writeRes = executeWriteFile(repoRoot, orchestrator, {
        filePath: "mcp/tests/.sandbox/calculator.ts",
        content: "export function add(a: number, b: number) { return a - b; }",
        sessionId,
      });
      expect(writeRes.action).toBe("created");
      expect(existsSync(path.join(testSandboxDir, "calculator.ts"))).toBe(true);

      // 4. kilo_edit_file succeeds
      const editRes = executeEditFile(repoRoot, orchestrator, {
        filePath: "mcp/tests/.sandbox/calculator.ts",
        targetContent: "return a - b;",
        replacementContent: "return a + b;",
        sessionId,
      });
      expect(editRes.replacements).toBe(1);
      const updatedCode = readFileSync(path.join(testSandboxDir, "calculator.ts"), "utf8");
      expect(updatedCode).toContain("return a + b;");

      // 5. kilo_run_command succeeds
      const cmdRes = await executeRunCommand(repoRoot, orchestrator, {
        command: "node -e 'console.log(\"KILO_MCP_SUCCESS\")'",
        sessionId,
      });
      expect(cmdRes.exitCode).toBe(0);
      expect(cmdRes.stdout).toBe("KILO_MCP_SUCCESS");
    });

    it("blocks dangerous commands even in ready state via security guardrails", async () => {
      const registry = await createSkillRegistry({ repoRoot });
      const orchestrator = createOrchestrator({
        registry,
        memory: createInMemoryOrchestrationMemory(),
      });

      const res = orchestrator.orchestrate({
        message: "Clean temporary files",
        brainstormingApproved: true,
      });
      expect(res.state).toBe("ready");

      orchestrator.recordCognitiveTool(res.sessionId, "kilo_think_step", {
        thoughtLength: 100,
        isSuperficial: false,
      });
      orchestrator.recordCognitiveTool(res.sessionId, "kilo_grill_plan", {
        planLength: 100,
      });

      await expect(
        executeRunCommand(repoRoot, orchestrator, {
          command: "rm -rf /",
          sessionId: res.sessionId,
        }),
      ).rejects.toThrowError(/\[KILO-KIT SECURITY VIOLATION\]/);
    });
  });
});
