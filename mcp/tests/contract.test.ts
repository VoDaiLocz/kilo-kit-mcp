import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createKiloKitServer } from "../src/server.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("Kilo-Kit MCP Contract & Discovery Snapshot", () => {
  it("initializes MCP server and registers all 22 tools", async () => {
    const server = await createKiloKitServer({ repoRoot });
    expect(server).toBeDefined();

    // Check registered tools count and names
    const registeredTools: string[] = Object.keys((server as any)._registeredTools ?? {});
    expect(registeredTools.length).toBe(22);

    const expectedTools = [
      "kilo_orchestrate_task",
      "kilo_memory_report",
      "kilo_record_reflection",
      "kilo_search_skills",
      "kilo_get_skill",
      "kilo_route_intent",
      "kilo_route_report",
      "kilo_validate_skills",
      "kilo_read_file",
      "kilo_search_files",
      "kilo_grep_code",
      "kilo_write_file",
      "kilo_edit_file",
      "kilo_run_command",
      "kilo_think_step",
      "kilo_grill_plan",
      "kilo_trace_root_cause",
      "kilo_compact_context",
      "kilo_synthesize_skill",
      "kilo_sentinel_status",
      "kilo_reset_circuit_breaker",
      "kilo_benchmark_solution",
    ];

    for (const tool of expectedTools) {
      expect(registeredTools).toContain(tool);
    }
  });

  it("registers required resources and prompts", async () => {
    const server = await createKiloKitServer({ repoRoot });
    const registeredResources = Object.keys((server as any)._registeredResources ?? {});
    expect(registeredResources).toContain("kilo://skills/index");
    expect(registeredResources).toContain("kilo://core/master");
    expect(registeredResources).toContain("kilo://rules/c4");

    const registeredPrompts = Object.keys((server as any)._registeredPrompts ?? {});
    expect(registeredPrompts).toContain("kilo-c4-workflow");
  });
});
