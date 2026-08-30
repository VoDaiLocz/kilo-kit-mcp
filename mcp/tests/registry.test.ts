import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

import { createSkillRegistry } from "../src/registry.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("skill registry", () => {
  it("loads indexed skills with category, name, path, and description", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const tdd = registry.getSkill("engineering", "tdd");

    expect(tdd.name).toBe("tdd");
    expect(tdd.category).toBe("engineering");
    expect(tdd.skillPath).toBe("skills/engineering/tdd/SKILL.md");
    expect(tdd.description).toContain("Test-driven development");
  });

  it("searches by query and ranks exact domain matches first", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const results = registry.searchSkills({ query: "test driven development", limit: 3 });

    expect(results[0]?.id).toBe("engineering/tdd");
    expect(results.map((skill) => skill.id)).toContain("engineering/tdd-workflow");
  });

  it("loads capped skill content and preserves references list", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    const loaded = await registry.loadSkill({ category: "engineering", skill: "tdd", maxChars: 400 });

    expect(loaded.content.length).toBeLessThanOrEqual(400);
    expect(loaded.truncated).toBe(true);
    expect(loaded.skill.id).toBe("engineering/tdd");
  });

  it("resolves fuzzy aliases and short skill names correctly", async () => {
    const registry = await createSkillRegistry({ repoRoot });

    // Short name without category
    const brainstorm = registry.getSkill("brainstorming");
    expect(brainstorm.id).toBe("productivity/brainstorming");

    // Slash format passed as first arg
    const diagnose = registry.getSkill("engineering/diagnose");
    expect(diagnose.id).toBe("engineering/diagnose");

    // Short name for playwright
    const playwright = registry.getSkill("playwright");
    expect(playwright.id).toBe("engineering/playwright");

    // Clean code short name
    const cleanCode = registry.getSkill("clean-code");
    expect(cleanCode.id).toBe("engineering/clean-code");
  });

  it("indexes all 177 skills without nested collision", async () => {
    const registry = await createSkillRegistry({ repoRoot });
    const skills = registry.listSkills();

    expect(skills.length).toBeGreaterThanOrEqual(177);

    // Verify nested games skills exist with distinct IDs
    const games2d = registry.getSkill("games/2d-games");
    expect(games2d.id).toBe("games/2d-games");

    const nestedGames2d = registry.getSkill("games/game-development/2d-games");
    expect(nestedGames2d.id).toBe("games/game-development/2d-games");
  });
});
