import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bootstrap } from "../src/init.js";

describe("kilo-kit init bootstrap", () => {
  it("creates the expected host-agent instruction file", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kilo-init-gemini-"));

    const [result] = bootstrap({ client: "gemini", cwd });
    const filePath = path.join(cwd, "GEMINI.md");
    const content = readFileSync(filePath, "utf8");

    expect(result).toMatchObject({ action: "created", client: "gemini", filePath });
    expect(content).toContain("Kilo-Kit C4 v3.0 Cognitive Protocol");
    expect(content).toContain("kilo_orchestrate_task");
    expect(content).toContain("Playwright");
  });

  it("appends the bootstrap block without removing existing content", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kilo-init-codex-"));
    const filePath = path.join(cwd, "AGENTS.md");
    writeFileSync(filePath, "# Project Rules\n\nKeep answers short.\n", "utf8");

    const [result] = bootstrap({ client: "codex", cwd });
    const content = readFileSync(filePath, "utf8");

    expect(result?.action).toBe("updated");
    expect(content).toContain("# Project Rules");
    expect(content).toContain("Keep answers short.");
    expect(content).toContain("<!-- KILO-KIT:C4:START -->");
  });

  it("replaces the existing bootstrap block instead of duplicating it", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kilo-init-claude-"));
    const filePath = path.join(cwd, "CLAUDE.md");
    writeFileSync(
      filePath,
      [
        "# Project Rules",
        "",
        "<!-- KILO-KIT:C4:START -->",
        "old rule",
        "<!-- KILO-KIT:C4:END -->",
        "",
        "Local project note.",
        "",
      ].join("\n"),
      "utf8",
    );

    bootstrap({ client: "claude", cwd });
    const content = readFileSync(filePath, "utf8");

    expect(content).not.toContain("old rule");
    expect(content.match(/KILO-KIT:C4:START/g)).toHaveLength(1);
    expect(content).toContain("Local project note.");
  });

  it("refuses to create a missing target directory", () => {
    const cwd = path.join(os.tmpdir(), `kilo-init-missing-${Date.now()}`);

    expect(() => bootstrap({ client: "gemini", cwd })).toThrow(/Target directory does not exist/);
  });

  it("refuses to update a malformed marker block", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kilo-init-malformed-"));
    const filePath = path.join(cwd, "AGENTS.md");
    writeFileSync(filePath, "<!-- KILO-KIT:C4:START -->\nmissing end marker\n", "utf8");

    expect(() => bootstrap({ client: "codex", cwd })).toThrow(/marker block is malformed/);
  });

  it("refuses to update a symlinked bootstrap file", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kilo-init-symlink-"));
    const realFile = path.join(cwd, "real.md");
    const linkFile = path.join(cwd, "GEMINI.md");
    writeFileSync(realFile, "real content\n", "utf8");
    symlinkSync(realFile, linkFile);

    expect(() => bootstrap({ client: "gemini", cwd })).toThrow(/symlinked bootstrap file/);
  });

  it("configures MCP across client configuration targets", async () => {
    const { setupClientMcpConfigs } = await import("../src/init.js");
    const results = setupClientMcpConfigs();
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.some((r) => r.client === "Cursor IDE")).toBe(true);
    expect(results.some((r) => r.client === "Claude Code")).toBe(true);
  });
});
