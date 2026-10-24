import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { runKiloKitDoctor } from "../src/doctor.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("Kilo-Kit System Health Doctor", () => {
  it("runs full diagnostic suite and returns healthy or degraded status with all 180 skills and 24 tools", async () => {
    const report = await runKiloKitDoctor(repoRoot);

    expect(report).toBeDefined();
    expect(report.overallStatus).not.toBe("broken");

    // 1. Environment check
    const envCheck = report.checks.find((c) => c.name === "Node.js Runtime");
    expect(envCheck?.status).toBe("pass");

    // 2. Skill library check (180 skills)
    const skillCheck = report.checks.find((c) => c.name === "Skill Library");
    expect(skillCheck?.status).toBe("pass");
    expect(skillCheck?.message).toContain("180");

    // 3. MCP Server Runtime check (24 tools with functional probe)
    const serverCheck = report.checks.find((c) => c.name === "MCP Server Runtime");
    expect(serverCheck?.status).toBe("pass");
    expect(serverCheck?.message).toContain("24 tools");
    expect(serverCheck?.message).toContain("functional probe");

    // 4. SQLite Persistence check (with integrity and FTS5)
    const sqliteCheck = report.checks.find((c) => c.name === "SQLite Persistence");
    expect(sqliteCheck).toBeDefined();
    expect(sqliteCheck?.status).toBe("pass");
    expect(sqliteCheck?.message).toContain("integrity: ok");

    // 5. Host Client configuration checks
    const clientCheck = report.checks.find((c) => c.name.startsWith("Client:"));
    if (clientCheck) {
      expect(clientCheck.message).toMatch(/\[.*\]/); // asserts execution mode bracket is present
    }
  });
});
