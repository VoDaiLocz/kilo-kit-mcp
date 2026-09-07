import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

import { buildSmokeEnvironment } from "./smoke-env.js";

const transport = new StdioClientTransport({
  command: process.env.KILO_KIT_SMOKE_COMMAND ?? process.execPath,
  args: parseSmokeArgs(),
  env: buildSmokeEnvironment(),
});

const client = new Client({ name: "kilo-kit-smoke", version: "1.0.0" });

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  for (const required of [
    "kilo_route_intent",
    "kilo_get_skill",
    "kilo_validate_skills",
    "kilo_route_report",
    "kilo_orchestrate_task",
    "kilo_memory_report",
  ]) {
    if (!toolNames.includes(required)) {
      throw new Error(`Missing expected tool: ${required}`);
    }
  }

  const prompts = await client.listPrompts();
  const promptNames = prompts.prompts.map((prompt) => prompt.name);
  for (const required of ["kilo-c4-workflow", "kilo-select-skill", "kilo-validate-library"]) {
    if (!promptNames.includes(required)) {
      throw new Error(`Missing expected prompt: ${required}`);
    }
  }

  const resources = await client.listResources();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  for (const required of ["kilo://skills/index", "kilo://core/master", "kilo://rules/c4"]) {
    if (!resourceUris.includes(required)) {
      throw new Error(`Missing expected resource: ${required}`);
    }
  }

  const route = await client.callTool({
    name: "kilo_route_intent",
    arguments: {
      message: "Fix bug login, viết test trước",
      context: { files: ["src/auth/login.ts"], mode: "coding" },
      format: "json",
    },
  });

  const routeText = extractFirstText(route);
  if (!routeText.includes("engineering/tdd")) {
    throw new Error(`Smoke route did not recommend engineering/tdd: ${routeText}`);
  }

  const report = await client.callTool({
    name: "kilo_route_report",
    arguments: { format: "json" },
  });
  const reportText = extractFirstText(report);
  const parsedReport = JSON.parse(reportText) as { totalEvents?: number };
  if ((parsedReport.totalEvents ?? 0) < 1 || !reportText.includes("engineering/tdd")) {
    throw new Error(`Smoke route report did not include the routed event: ${reportText}`);
  }

  const orchestration = await client.callTool({
    name: "kilo_orchestrate_task",
    arguments: {
      message: "Fix bug login, viết test trước",
      context: { files: ["src/auth/login.ts"], mode: "coding", projectFingerprint: "smoke:typescript" },
      format: "json",
    },
  });
  const orchestrationText = extractFirstText(orchestration);
  const orchestrationResult = JSON.parse(orchestrationText) as {
    sessionId?: string;
    state?: string;
    workflow?: Array<{ skill?: { id?: string } }>;
    questions?: Array<{ id?: string; skillId?: string }>;
    firstSkillToLoad?: { id?: string };
    missingInfo?: string[];
  };
  if (orchestrationResult.state !== "brainstorming_required") {
    throw new Error(`Smoke orchestration did not require brainstorming: ${orchestrationText}`);
  }
  if (orchestrationResult.workflow?.[0]?.skill?.id !== "productivity/brainstorming") {
    throw new Error(`Smoke orchestration did not start with brainstorming: ${orchestrationText}`);
  }
  if (orchestrationResult.firstSkillToLoad?.id !== "productivity/brainstorming") {
    throw new Error(`Smoke orchestration did not instruct loading brainstorming: ${orchestrationText}`);
  }
  if ((orchestrationResult.questions?.length ?? 0) !== 0 || (orchestrationResult.missingInfo?.length ?? 0) !== 0) {
    throw new Error(`Smoke orchestration should not use C4 questions as a gate: ${orchestrationText}`);
  }

  const approvedOrchestration = await client.callTool({
    name: "kilo_orchestrate_task",
    arguments: {
      message: "Fix bug login, viết test trước",
      sessionId: orchestrationResult.sessionId,
      brainstormingApproved: true,
      format: "json",
    },
  });
  const approvedText = extractFirstText(approvedOrchestration);
  const approvedResult = JSON.parse(approvedText) as { state?: string };
  if (approvedResult.state === "cognitive_required") {
    await client.callTool({
      name: "kilo_trace_root_cause",
      arguments: {
        sessionId: orchestrationResult.sessionId,
        errorLog: "TypeError: Cannot read properties of undefined at auth/login.ts:42",
        failingFile: "src/auth/login.ts",
      },
    });
  }

  const readyOrchestration = await client.callTool({
    name: "kilo_orchestrate_task",
    arguments: {
      message: "Fix bug login, viết test trước",
      sessionId: orchestrationResult.sessionId,
      brainstormingApproved: true,
      format: "json",
    },
  });
  const readyText = extractFirstText(readyOrchestration);
  const readyResult = JSON.parse(readyText) as {
    state?: string;
    firstSkillToLoad?: { id?: string };
    finalWorkflow?: Array<{ skill?: { id?: string } }>;
  };
  if (
    readyResult.state !== "ready" ||
    !["engineering/diagnose", "engineering/tdd"].includes(readyResult.firstSkillToLoad?.id ?? "")
  ) {
    throw new Error(`Smoke orchestration did not release post-brainstorming workflow after approval: ${readyText}`);
  }
  if (readyResult.finalWorkflow?.some((step) => step.skill?.id === "productivity/brainstorming")) {
    throw new Error(`Smoke final workflow should not repeat brainstorming after approval: ${readyText}`);
  }

  const memoryReport = await client.callTool({
    name: "kilo_memory_report",
    arguments: { format: "json" },
  });
  const memoryReportText = extractFirstText(memoryReport);
  if (!memoryReportText.includes('"facts"')) {
    throw new Error(`Smoke memory report did not return memory facts: ${memoryReportText}`);
  }

  const skill = await client.callTool({
    name: "kilo_get_skill",
    arguments: { category: "engineering", skill: "tdd", maxChars: 800 },
  });
  const skillText = extractFirstText(skill);
  if (!skillText.includes("Test-Driven Development")) {
    throw new Error("Smoke skill load did not return the TDD skill body.");
  }

  console.log("MCP smoke check passed.");
} finally {
  await client.close();
}

function extractFirstText(value: unknown): string {
  const content = (value as { content?: Array<{ type?: string; text?: string }> }).content;
  const first = content?.[0];
  return first?.type === "text" && first.text ? first.text : "";
}

function parseSmokeArgs(): string[] {
  const rawArgs = process.env.KILO_KIT_SMOKE_ARGS;
  if (!rawArgs) {
    return [fileURLToPath(new URL("./server.js", import.meta.url))];
  }

  const parsed = JSON.parse(rawArgs) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("KILO_KIT_SMOKE_ARGS must be a JSON array of strings.");
  }

  return parsed;
}
