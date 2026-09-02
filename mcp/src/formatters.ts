import type { RouteReport } from "./route-analytics.js";
import type { BenchmarkReport, MemoryReport, OrchestrationResult, SentinelSessionStatus } from "./orchestration-types.js";
import type { LoadedSkill, RouteIntentResult, SearchSkillsInput, SkillRecord, ValidationSummary } from "./types.js";

export function textResponse(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

export function formatObservabilityDirective(options: {
  justConcluded: string;
  nextToolRecommendation: string;
}): string {
  return [
    "",
    "---",
    "📢 **[MANDATORY INTER-TOOL NARRATION DIRECTIVE]**",
    `👉 **Action Required before next tool call:** Emit a 1-2 sentence progress update directly to the terminal user:`,
    `   - **[DECISION]:** State what you just concluded, selected, or discovered regarding: ${options.justConcluded}`,
    `   - **[NEXT]:** State what tool you are calling next and why: ${options.nextToolRecommendation}`,
    `⚠️ DO NOT execute the next tool silently. The terminal user cannot see internal MCP return bodies unless you narrate them.`,
  ].join("\n");
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
      ? "Load `productivity/brainstorming` (via `kilo_get_skill({ skill: 'brainstorming' })`) and follow the grounded probe hard-gate."
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
      : "- Run typecheck/build and Playwright E2E verification.";

  const cognitiveDirectives: string[] = [];
  const sid = result.sessionId;
  if (result.taskMode === "bug" || result.taskMode === "bug-test-first") {
    cognitiveDirectives.push(`- **[MANDATORY GATE]** Call \`kilo_trace_root_cause\` with \`{ errorLog, failingFile, sessionId: "${sid}" }\` BEFORE any code edit. kilo_write_file/kilo_edit_file will be BLOCKED until this is called.`);
    cognitiveDirectives.push("- **Diagnostic Protocol**: Follow `engineering/diagnose` (Reproduce → Minimize → Hypothesize → Instrument → Fix).");
  } else if (result.taskMode === "security") {
    cognitiveDirectives.push(`- **[MANDATORY GATE]** Call \`kilo_trace_root_cause\` with \`{ errorLog, sessionId: "${sid}" }\` AND \`kilo_grill_plan\` with \`{ plan, sessionId: "${sid}" }\` BEFORE any code edit. Both are REQUIRED.`);
  } else {
    cognitiveDirectives.push(`- **[MANDATORY GATE]** Call \`kilo_think_step\` with \`{ thought, thoughtNumber: 1, totalThoughts: 3, sessionId: "${sid}" }\` to compare 3 architectural paths. REQUIRED before kilo_write_file/kilo_edit_file/kilo_run_command.`);
    cognitiveDirectives.push(`- **[MANDATORY GATE]** Call \`kilo_grill_plan\` with \`{ plan, depth: "deep", sessionId: "${sid}" }\` to adversarially stress-test the plan. REQUIRED before kilo_write_file/kilo_edit_file/kilo_run_command.`);
    if (result.taskMode === "ui") {
      cognitiveDirectives.push("- **Playwright E2E**: Generate and execute Playwright browser/UI tests to verify real DOM interaction.");
      cognitiveDirectives.push("- **Aesthetic Standard**: Apply `design/aesthetic` (Beautiful, Right, Satisfying, Peak).");
    }
  }

  const qualityGate = [
    "1. Intent & Spec Fidelity: Check all user requirements against Given-When-Then criteria.",
    "2. Clean Code & Zero Bloat: Deep module interfaces, no console.logs, concise diffs.",
    "3. UX & Platform Fidelity: Visual feedback, responsive layout, touch safety.",
    "4. Empirical & Playwright E2E: Run real typecheck/build and Playwright automated tests.",
  ].map((line) => `- ${line}`).join("\n");

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
    "## Cognitive Reasoning Blueprint",
    cognitiveDirectives.join("\n"),
    "",
    "## 4D Quality Assurance & Playwright Gate",
    qualityGate,
    "",
    "## Memory Suggestions",
    memorySuggestions,
    "",
    "## Execution Protocol (5-Gate Lifecycle)",
    `- Gate 1 (Task Orchestration): Call kilo_orchestrate_task with sessionId \`${result.sessionId}\`.`,
    `- Gate 2 (Cognitive Reasoning): Call kilo_think_step (3 trade-offs) / kilo_grill_plan / kilo_trace_root_cause / kilo_compact_context.`,
    `- Gate 3 (Skill Delivery & Supervisor): Call kilo_get_skill to load workflow rules, and check kilo_sentinel_status.`,
    `- Gate 4 (Surgical Implementation): Apply clean-code changes using your native tools or Kilo-Kit tools with defense-in-depth.`,
    `- Gate 5 (4D Verification & Learning): Run tests/Playwright, then call kilo_record_reflection with sessionId \`${result.sessionId}\` to persist lessons to SQLite.`,
    "",
    "## Verification Gate",
    verification,
    "",
    `Next action: ${result.nextAction}`,
    formatObservabilityDirective({
      justConcluded: `Task mode '${result.taskMode}' and workflow: [${result.workflow.map((w) => w.skill.id).join(" -> ")}]`,
      nextToolRecommendation: result.nextAction,
    }),
  ].join("\n");
}

export function formatMemoryReport(report: MemoryReport, format: "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }

  const reflections =
    report.reflections && report.reflections.length > 0
      ? report.reflections
          .slice(0, 10)
          .map(
            (r, i) =>
              `${i + 1}. **[${r.taskMode}]** \`${r.id.slice(0, 8)}\` — *${r.taskSummary.slice(0, 70)}*\n` +
              `   💡 **Lesson:** ${r.lessonsLearned.slice(0, 160)}${r.lessonsLearned.length > 160 ? "..." : ""}\n` +
              `   ✅ **Correct Approach:** ${r.correctApproach.slice(0, 100)}\n` +
              (r.wrongPathsEncountered && r.wrongPathsEncountered.length > 0
                ? `   ❌ **Avoided:** ${r.wrongPathsEncountered.slice(0, 2).join("; ")}\n`
                : ""),
          )
          .join("\n")
      : "- No learning reflections recorded.";

  const facts =
    report.facts.length > 0
      ? report.facts
          .slice(0, 20)
          .map((fact) => `- \`${fact.key}\` (${fact.kind}, confidence ${Math.round(fact.confidence * 100)}%) from ${fact.source}`)
          .join("\n")
      : "- No memory facts recorded.";
  const decisions =
    report.decisions.length > 0
      ? report.decisions.map((decision) => `- \`${decision.suggestionKey}\`: **${decision.decision}**${decision.reason ? ` (${decision.reason})` : ""}`).join("\n")
      : "- No memory decisions recorded.";
  const sessions =
    report.sessions.length > 0
      ? report.sessions
          .slice(0, 10)
          .map((session) => `- \`${session.id.slice(0, 8)}...\`: **${session.state}** [${session.taskMode}] — *${session.message.slice(0, 60)}*`)
          .join("\n")
      : "- No orchestration sessions recorded.";
  const outcomes =
    report.outcomes.length > 0
      ? report.outcomes
          .slice(0, 10)
          .map((outcome) => `- \`${outcome.id.slice(0, 8)}...\`: **${outcome.outcome}** [${outcome.taskMode}]`)
          .join("\n")
      : "- No workflow outcomes recorded.";

  return [
    "# 🧠 Kilo-Kit SQLite Memory & Knowledge Base Report",
    "",
    `Total Stored Knowledge: **${report.reflections?.length || 0} reflections**, **${report.facts.length} facts**, **${report.decisions.length} decisions**, **${report.sessions.length} sessions**, **${report.outcomes.length} outcomes**.`,
    "",
    "## 💡 Top Learning Reflections (Past Lessons)",
    reflections,
    "",
    "## 📌 Stored Facts & Policies",
    facts,
    "",
    "## ⚖️ User & Architecture Decisions",
    decisions,
    "",
    "## 🔄 Recent Orchestration Sessions",
    sessions,
    "",
    "## 🏁 Released Workflow Outcomes",
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
  const MAX_OUTPUT_CHARS = 64 * 1024;
  const stdout = result.stdout
    ? result.stdout.length > MAX_OUTPUT_CHARS
      ? `${result.stdout.slice(0, MAX_OUTPUT_CHARS)}\n... [Output truncated at 64KB]`
      : result.stdout
    : "";
  const stderr = result.stderr
    ? result.stderr.length > MAX_OUTPUT_CHARS
      ? `${result.stderr.slice(0, MAX_OUTPUT_CHARS)}\n... [Output truncated at 64KB]`
      : result.stderr
    : "";
  return [
    `${statusEmoji} Command: \`${result.command}\` (Exit Code: ${result.exitCode}, Duration: ${result.durationMs}ms)`,
    stdout ? `\n**Stdout:**\n\`\`\`\n${stdout}\n\`\`\`` : "",
    stderr ? `\n**Stderr:**\n\`\`\`\n${stderr}\n\`\`\`` : "",
  ].filter(Boolean).join("\n");
}

export function formatThinkStep(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  const t = result.currentThought;
  return [
    `# 🧠 Sequential Thought #${t.thoughtNumber}/${t.totalThoughts}${t.branchId ? ` (Branch: \`${t.branchId}\`)` : ""}`,
    t.isRevision ? `> 🔄 *Revision of thought #${t.revisesThought}*` : "",
    t.hypothesis ? `> 💡 **Hypothesis:** ${t.hypothesis}` : "",
    "",
    t.thought,
    "",
    `*Status:* ${result.isComplete ? "✅ Reasoning Complete" : `⏳ Continuing (${result.totalRecordedThoughts} steps recorded)`}`,
    formatObservabilityDirective({
      justConcluded: `Which architectural option (A, B, or C) you selected from this thought step`,
      nextToolRecommendation: `kilo_grill_plan to stress-test this chosen option`,
    }),
  ].filter(Boolean).join("\n");
}

export function formatGrillPlan(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  const verdictEmoji = result.readinessVerdict === "APPROVED" ? "✅" : result.readinessVerdict === "REQUIRES_HARDENING" ? "⚠️" : "🛑";
  return [
    `# 🥊 Kilo-Kit Red-Team Grill Report`,
    `**Verdict:** ${verdictEmoji} **${result.readinessVerdict}** (Risk Score: ${result.riskScore}/100)`,
    `*${result.summary}*`,
    "",
    "## 🔍 Critical Stress-Test Questions",
    ...result.grillQuestions.map((q: any, i: number) => 
      `### ${i + 1}. [${q.category.toUpperCase()}] ${q.title}\n- **Concern:** ${q.concern}\n- **Stress-Test:** *"${q.stressTestQuestion}"*\n- **Hardening:** ${q.recommendation}\n`
    ),
    "## 🛡️ Pre-Code Hardening Checklist",
    ...result.hardeningChecklist.map((item: string) => `- [ ] ${item}`),
    formatObservabilityDirective({
      justConcluded: `Grill verdict (${result.readinessVerdict}) and key risk mitigation strategy`,
      nextToolRecommendation: `kilo_orchestrate_task (with brainstormingApproved=true) or kilo_get_skill to begin execution`,
    }),
  ].join("\n");
}

export function formatTraceRootCause(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return [
    `# 🔍 5-Whys Root Cause Trace Analysis`,
    `**Symptom:** \`${result.symptom}\``,
    `**Root Cause:** **${result.rootCause}**`,
    "",
    "## 🌳 Causal Chain (Back-Propagation)",
    ...result.causalChain.map((lvl: any) => `**Level ${lvl.level} (${lvl.name}):** ${lvl.finding}`),
    "",
    `## 🛠️ Minimal Surgical Fix`,
    result.minimalFixRecommendation,
    "",
    `## 🧪 Regression Prevention Test`,
    result.regressionPreventionTest,
    formatObservabilityDirective({
      justConcluded: `Identified Root Cause: ${result.rootCause}`,
      nextToolRecommendation: `kilo_read_file or view_file to locate the code, then apply the minimal fix`,
    }),
  ].join("\n");
}

export function formatCompactContext(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return [
    `# 🗜️ Context Compacted (${result.reductionPercentage}% Token Reduction)`,
    `*Original: ${result.originalBytes} bytes ➔ Compacted: ${result.compactedBytes} bytes*`,
    result.lockedInvariants.length > 0 ? `**Locked Invariants:** ${result.lockedInvariants.join(", ")}` : "",
    "```",
    result.compactedContent,
    "```",
    formatObservabilityDirective({
      justConcluded: `Context compacted (${result.reductionPercentage}% reduction) and ${result.lockedInvariants.length} invariants locked`,
      nextToolRecommendation: `kilo_think_step or kilo_get_skill for workflow execution`,
    }),
  ].filter(Boolean).join("\n");
}

export function formatSynthesizeSkill(result: any, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(result, null, 2);
  return `✨ Successfully synthesized skill \`${result.skillId}\` at \`${result.skillPath}\`! (Quality Gate Passed: ${result.validationPassed ? "✅" : "❌"})`;
}

export function formatSentinelStatus(status: SentinelSessionStatus, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(status, null, 2);
  const stateIcon = status.circuitState === "CLOSED" ? "🟢 CLOSED (Normal)" : status.circuitState === "HALF_OPEN" ? "🟡 HALF-OPEN (Testing)" : "🔴 OPEN (TRIPPED)";
  return [
    `# 🛡️ Kilo-Sentinel Supervisor Status`,
    `**Session ID:** \`${status.sessionId}\``,
    `**Circuit Breaker State:** ${stateIcon}`,
    status.tripReason ? `**Trip Reason:** ${status.tripReason}` : "",
    `**Step Budget:** ${status.stepsRecorded} / ${status.maxStepBudget} steps recorded`,
    `**Consecutive Failures:** ${status.consecutiveFailures}`,
    `**Grounded Files (${status.groundedFiles.length}):** ${status.groundedFiles.length > 0 ? status.groundedFiles.map((f) => `\`${f}\``).join(", ") : "_None yet (pre-flight required)_"}`,
    `**Total Probes Performed:** ${status.totalProbes}`,
  ].filter(Boolean).join("\n");
}

export function formatBenchmarkReport(report: BenchmarkReport, format: "markdown" | "json"): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  const verdictIcon = report.verdict === "ALIGNED" ? "✅ ALIGNED" : "🔄 REPLAN_TRIGGERED";
  return [
    `# 📊 GitHub & Industry Benchmark Report`,
    `**Verdict:** **${verdictIcon}**`,
    `**Summary:** ${report.summary}`,
    "",
    "## 🔍 Key Comparative Findings",
    ...report.keyDifferences.map((d) => `- ${d}`),
    "",
    "## 💡 Recommendations",
    ...report.recommendations.map((r) => `- ${r}`),
    "",
    `**Suggested Workflow Skills:** ${report.suggestedSkills.map((s) => `\`${s}\``).join(", ")}`,
    formatObservabilityDirective({
      justConcluded: `Industry benchmark verdict: ${report.verdict} (${report.summary})`,
      nextToolRecommendation: `kilo_grill_plan or workflow execution`,
    }),
  ].join("\n");
}

