import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runKiloKitDoctor } from "../src/doctor.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("Kilo-Kit System Health Doctor", () => {
  it("runs full diagnostic suite and returns healthy or degraded status with all 177 skills and 24 tools", async () => {
    const report = await runKiloKitDoctor(repoRoot);

    expect(report).toBeDefined();
    expect(report.overallStatus).not.toBe("broken");

    // 1. Environment check
    const envCheck = report.checks.find((c) => c.name === "Node.js Runtime");
    expect(envCheck?.status).toBe("pass");

    // 2. Skill library check (177 skills)
    const skillCheck = report.checks.find((c) => c.name === "Skill Library");
    expect(skillCheck?.status).toBe("pass");
    expect(skillCheck?.message).toContain("177");

    // 3. MCP Server Runtime check (24 tools)
    const serverCheck = report.checks.find((c) => c.name === "MCP Server Runtime");
    expect(serverCheck?.status).toBe("pass");
    expect(serverCheck?.message).toContain("24 tools");
  });
});
