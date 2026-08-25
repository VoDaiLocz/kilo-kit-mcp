import type { RouteReport } from "./route-analytics.js";
import type { MemoryReport, OrchestrationResult } from "./orchestration-types.js";
import type { LoadedSkill, RouteIntentResult, SearchSkillsInput, SkillRecord, ValidationSummary } from "./types.js";

export function textResponse(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

export function formatSkills(skills: SkillRecord[], input: SearchSkillsInput, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify({ query: input.query, skills }, null, 2);
  }

  if (skills.length === 0) {
    return `No skills matched '${input.query}'. Try a broader query or inspect kilo://skills/index.`;
  }

  return [
    `# Skill Search Results`,
    ``,
    `Query: \`${input.query}\``,
    ``,
    ...skills.map(
      (skill, index) =>
        `${index + 1}. **${skill.id}**\n   ${skill.description}\n   Path: \`${skill.skillPath}\``,
    ),
  ].join("\n");
}

export function formatLoadedSkill(loaded: LoadedSkill, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(loaded, null, 2);
  }

  const references =
    loaded.skill.references.length > 0
      ? loaded.skill.references.map((reference) => `- \`${reference}\``).join("\n")
      : "- No bundled references/scripts/assets found.";

  const truncation = loaded.truncated
    ? `\n\n> Output truncated at ${loaded.maxChars} characters. Increase maxChars if you need more.`
    : "";

  return [
    `# ${loaded.skill.id}`,
    ``,
    loaded.skill.description,
    ``,
    `Path: \`${loaded.skill.skillPath}\``,
    ``,
    `## References`,
    references,
    ``,
    `## SKILL.md`,
    ``,
    "```md",
    loaded.content,
    "```",
    truncation,
  ].join("\n");
}

export function formatRoute(result: RouteIntentResult, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (result.recommended.length === 0) {
    return result.nextAction;
  }

  return [
    "# Kilo-Kit Skill Route",
    "",
    `Task mode: \`${result.taskMode}\``,
    "",
    "## Recommended Skills",
    "",
    ...result.recommended.map(
      (item, index) =>
        `${index + 1}. **${item.skill.id}** (${Math.round(item.confidence * 100)}%, score ${item.score ?? "n/a"})\n   ${item.reason}\n   Path: \`${item.skill.skillPath}\``,
    ),
    "",
    "## Workflow",
    "",
    ...result.workflow.map(
      (step, index) =>
        `${index + 1}. **${step.skill.id}** (${step.role})\n   ${step.reason}`,
    ),
    "",
    "## Rule Hierarchy",
    "",
    result.ruleHierarchy.map((rule, index) => `${index + 1}. \`${rule}\``).join("\n"),
    "",
    "## Decision Trail",
    "",
    ...result.decisionTrail.slice(0, 5).map(
      (entry, index) =>
        `${index + 1}. **${entry.skillId}** score ${entry.score}\n   Signals: ${
          entry.matchedSignals.length > 0 ? entry.matchedSignals.map((signal) => `\`${signal}\``).join(", ") : "none"
        }\n   ${entry.reason}`,
    ),
    "",
    `Next action: ${result.nextAction}`,
  ].join("\n");
}

export function formatValidation(summary: ValidationSummary, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(summary, null, 2);
  }

  return [
    "# Kilo-Kit Skill Validation",
    "",
    `Command: \`${summary.command}\``,
    `Valid: **${summary.valid}/${summary.total}**`,
    `Invalid: **${summary.invalid}**`,
    "",
    "```text",
    summary.output,
    "```",
  ].join("\n");
}

export function formatRouteReport(report: RouteReport, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }

  const taskModes =
    report.taskModes.length > 0
      ? report.taskModes.map((item) => `- \`${item.taskMode}\`: ${item.count}`).join("\n")
      : "- No task modes recorded.";
  const workflows =
    report.workflows.length > 0
      ? report.workflows
          .slice(0, 5)
          .map((item) => `- ${item.workflow.map((skill) => `\`${skill}\``).join(" -> ")}: ${item.count}`)
          .join("\n")
      : "- No workflows recorded.";
  const topSkills =
    report.topSkills.length > 0
      ? report.topSkills
          .slice(0, 10)
          .map(
            (item) =>
              `- \`${item.skillId}\`: recommended ${item.timesRecommended}, workflow ${item.timesInWorkflow}, primary ${item.timesPrimary}, avg score ${item.avgScore}`,
          )
          .join("\n")
      : "- No skills recorded.";
  const conflicts =
    report.conflictPenalties.length > 0
      ? report.conflictPenalties
          .map((item) => `- \`${item.skillId}\`: ${item.count} penalties, total ${item.totalPenalty}`)
          .join("\n")
      : "- No conflict penalties recorded.";

  return [
    "# Kilo-Kit Route Report",
    "",
    `Total events: **${report.totalEvents}**`,
    "",
    "## Task Modes",
    taskModes,
    "",
    "## Workflows",
    workflows,
    "",
    "## Top Skills",
    topSkills,
    "",
    "## Conflict Penalties",
    conflicts,
  ].join("\n");
}

export function formatOrchestration(result: OrchestrationResult, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  const brainstormingGate =
    result.state === "brainstorming_required"
      ? "Load `productivity/brainstorming` and follow the real skill hard-gate. C4 questions are not used as a separate questionnaire."
      : "Brainstorming approval has been recorded or this is a read-only route.";
  const workflow =
    result.workflow.length > 0
      ? result.workflow.map((step, index) => `${index + 1}. **${step.skill.id}** (${step.role})\n   ${step.reason}`).join("\n")
      : "No workflow selected.";
  const memorySuggestions =
    result.memorySuggestions.length > 0
      ? result.memorySuggestions
          .map(
            (suggestion) =>
              `- **${suggestion.key}** (${Math.round(suggestion.confidence * 100)}%)\n  ${suggestion.reason}\n  Requires confirmation: ${suggestion.requiresConfirmation ? "yes" : "no"}`,
          )
          .join("\n")
      : "- No memory suggestions.";
  const verification =
    result.verificationGate.commands.length > 0
      ? result.verificationGate.commands.map((command) => `- \`${command}\``).join("\n")
      : "- No commands selected.";

  return [
    "# Kilo-Kit C4 Orchestration",
    "",
    `Session: \`${result.sessionId}\``,
    `State: \`${result.state}\``,
    `Task mode: \`${result.taskMode}\``,
    "",
    "## Brainstorming Gate",
    brainstormingGate,
    "",
    "## Workflow",
    workflow,
    "",
    "## Memory Suggestions",
    memorySuggestions,
    "",
    "## Verification Gate",
    verification,
    "",
    `Next action: ${result.nextAction}`,
  ].join("\n");
}

export function formatMemoryReport(report: MemoryReport, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }

  const facts =
    report.facts.length > 0
      ? report.facts
          .slice(0, 20)
          .map((fact) => `- \`${fact.key}\` (${fact.kind}, confidence ${fact.confidence}) from ${fact.source}`)
          .join("\n")
      : "- No memory facts recorded.";
  const decisions =
    report.decisions.length > 0
      ? report.decisions.map((decision) => `- \`${decision.suggestionKey}\`: ${decision.decision}`).join("\n")
      : "- No memory decisions recorded.";
  const sessions =
    report.sessions.length > 0
      ? report.sessions
          .slice(0, 10)
          .map((session) => `- \`${session.id}\`: ${session.state} (${session.taskMode})`)
          .join("\n")
      : "- No orchestration sessions recorded.";
  const outcomes =
    report.outcomes.length > 0
      ? report.outcomes
          .slice(0, 10)
          .map((outcome) => `- \`${outcome.id}\`: ${outcome.outcome} (${outcome.taskMode})`)
          .join("\n")
      : "- No workflow outcomes recorded.";

  return [
    "# Kilo-Kit Memory Report",
    "",
    "## Facts",
    facts,
    "",
    "## Decisions",
    decisions,
    "",
    "## Sessions",
    sessions,
    "",
    "## Outcomes",
    outcomes,
  ].join("\n");
}

export function formatReadFile(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return [
    `# File: \`${result.filePath}\` (Lines ${result.startLine}-${result.endLine} of ${result.totalLines})`,
    result.truncated ? `> ⚠️ Output truncated at maxBytes threshold.` : "",
    "```",
    result.content,
    "```",
  ].filter(Boolean).join("\n");
}

export function formatWriteFile(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return `✅ Successfully ${result.action} file \`${result.filePath}\` (${result.bytesWritten} bytes written).`;
}

export function formatEditFile(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return `✅ ${result.message} (Status: ${result.syntaxStatus})`;
}

export function formatSearchFiles(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  if (result.totalMatches === 0) return `No files matched pattern \`${result.pattern}\`.`;
  return [
    `# File Search Results (\`${result.pattern}\` - ${result.totalMatches} matches):`,
    ...result.files.map((file: string) => `- \`${file}\``),
  ].join("\n");
}

export function formatGrepCode(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  if (result.totalMatches === 0) return `No code matches found for query \`${result.query}\`.`;
  return [
    `# Code Grep Results (\`${result.query}\` - ${result.totalMatches} matches):`,
    ...result.matches.map((m: any) => `- \`${m.file}:${m.line}\`: ${m.content}`),
  ].join("\n");
}

export function formatRunCommand(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  const statusEmoji = result.exitCode === 0 ? "✅" : "❌";
  return [
    `${statusEmoji} Command: \`${result.command}\` (Exit Code: ${result.exitCode}, Duration: ${result.durationMs}ms)`,
    result.stdout ? `\n**Stdout:**\n\`\`\`\n${result.stdout}\n\`\`\`` : "",
    result.stderr ? `\n**Stderr:**\n\`\`\`\n${result.stderr}\n\`\`\`` : "",
  ].filter(Boolean).join("\n");
}
