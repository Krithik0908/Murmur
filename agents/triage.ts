/**
 * agents/triage.ts
 * Triage Agent — first agent in the Murmur security pipeline.
 *
 * Responsibility: Decide whether the vulnerability requires remediation,
 * warrants monitoring only, or can be dismissed in this application context.
 *
 * Decision vocabulary: REMEDIATE | MONITOR | DISMISS
 *
 * Owner: Person 1 (Agent Logic)
 */

import type { AgentInput, AgentResult, TriageDecision } from "../lib/types";
import { TRIAGE_DECISIONS } from "../lib/types";
import {
  callGroqAgent,
  formatUpstreamContext,
  formatHumanCorrection,
} from "./shared";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM_PROMPT = `You are a senior DevSecOps security engineer performing the TRIAGE stage of a vulnerability response pipeline.

Your task is to evaluate a security vulnerability report and decide whether it requires immediate remediation, ongoing monitoring, or can be dismissed in this application's specific context.

## Decision vocabulary
You MUST output exactly one of these three tokens as the "decision" field:
- REMEDIATE — The vulnerability is relevant, practically exploitable in this context, and requires an immediate fix.
- MONITOR — The vulnerability exists but practical exploitation risk is low in this context; no immediate action is required but the issue should be watched.
- DISMISS — The vulnerability does not affect this application in any meaningful way; no action is needed at this time.

## Reasoning guidelines
1. Analyze ONLY the supplied evidence — do not invent facts about the CVE, the package, or the application.
2. Distinguish clearly between KNOWN FACTS (from the advisory and scenario) and your INFERENCES (from context).
3. Give the application context priority: a CRITICAL CVE in an unused code path is very different from a CRITICAL CVE in the active request-handling path.
4. Consider: CVE severity, affected package version, whether the application is in the vulnerable execution path, dependency type (direct vs. transitive), and whether a fix version exists.
5. If a HUMAN CORRECTION is present, treat it as an authoritative expert override. Re-evaluate your decision in light of it. You may note disagreement, but you must reflect the correction in your final decision.
6. Keep the reasoning concise — it will be displayed in a UI panel (2–5 sentences).
7. Keep the summary to 1–2 sentences — it appears as the card subtitle.

## Output format
Return ONLY a valid JSON object — no markdown fences, no prose outside the JSON.

{
  "decision": "REMEDIATE" | "MONITOR" | "DISMISS",
  "reasoning": "Concise reasoning (2–5 sentences).",
  "summary": "1–2 sentence summary for the UI card."
}`;

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildTriageUserPrompt(input: AgentInput): string {
  const { scenario, dependencyContext, upstreamContext, humanCorrection } =
    input;

  return `## Vulnerability Report

**CVE:** ${scenario.cve}
**Vulnerability:** ${scenario.vulnerability}
**Severity:** ${scenario.severity}
**Affected Package:** ${scenario.affectedPackage}
**Current Installed Version:** ${scenario.currentVersion}
**Fixed Version:** ${scenario.fixedVersion}
**Ecosystem:** ${scenario.ecosystem}

**Advisory Summary:**
${scenario.advisorySummary}

---

## Application Context

${scenario.applicationContext}

**Package Usage in This Application:**
${scenario.usageContext}

**Dependency Tree:**
${scenario.dependencyTree.join("\n")}

---

## Dependency Metadata

- Package: ${dependencyContext.packageName}
- Installed Version: ${dependencyContext.currentVersion}
- Dependency Type: ${dependencyContext.dependencyType}
- Dependents (packages/services that use this package): ${
    dependencyContext.dependents?.join(", ") ?? "None identified"
  }
- This package depends on: ${
    dependencyContext.dependOn?.join(", ") ?? "None identified"
  }

---

## Upstream Agent Context

${formatUpstreamContext(upstreamContext)}

---

## Human Correction

${formatHumanCorrection(humanCorrection)}
${
  humanCorrection
    ? "\nIMPORTANT: A human expert has provided the above correction. Re-evaluate your triage decision to reflect this override. Explain how the correction changed (or confirmed) your reasoning."
    : ""
}

---

Return your triage decision as a JSON object with the fields: decision, reasoning, summary.`;
}

// ---------------------------------------------------------------------------
// Public agent function
// ---------------------------------------------------------------------------

/**
 * Runs the Triage Agent for the given input.
 *
 * @param input - Common agent input containing scenario, dependency context,
 *                optional upstream context, and optional human correction.
 * @returns AgentResult with decision ∈ {REMEDIATE, MONITOR, DISMISS}.
 * @throws If the Groq API fails, the response is unparseable, or required
 *         fields are missing.
 */
export async function runTriageAgent(input: AgentInput): Promise<AgentResult> {
  return callGroqAgent({
    agentName: "Triage",
    systemPrompt: TRIAGE_SYSTEM_PROMPT,
    userPrompt: buildTriageUserPrompt(input),
    allowedDecisions: TRIAGE_DECISIONS as unknown as readonly string[],
  });
}

// Re-export the decision type for callers that need it
export type { TriageDecision };
export { TRIAGE_DECISIONS };
