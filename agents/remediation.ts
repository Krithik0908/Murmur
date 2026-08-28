/**
 * agents/remediation.ts
 * Remediation Agent — second agent in the Murmur security pipeline.
 *
 * Responsibility: Determine the safest remediation strategy given the triage
 * result, package version information, semver compatibility, and dependency
 * type (direct vs. transitive).
 *
 * Decision vocabulary: UPGRADE | PATCH | PIN | REPLACE | DEFER
 *
 * Owner: Person 1 (Agent Logic)
 */

import type {
  AgentInput,
  AgentResult,
  RemediationDecision,
} from "../lib/types";
import { REMEDIATION_DECISIONS } from "../lib/types";
import {
  callGroqAgent,
  formatUpstreamContext,
  formatHumanCorrection,
} from "./shared";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const REMEDIATION_SYSTEM_PROMPT = `You are a senior software engineer and dependency security specialist performing the REMEDIATION PLANNING stage of a vulnerability response pipeline.

Your task is to determine the safest and most practical remediation strategy for a known security vulnerability, given the triage decision from the previous stage and the package/version details provided.

## Decision vocabulary
You MUST output exactly one of these five tokens as the "decision" field:
- UPGRADE — Upgrade the package to the stated fixed version. Use this when semver compatibility is high and the upgrade is expected to be safe.
- PATCH — Apply a specific vendor-issued patch or configuration mitigation without changing the package version. Use when a full upgrade is risky or not yet available.
- PIN — Pin the package to a known-safe older version (downgrade + lockfile pin). Use when the fixed version introduces breaking changes or the affected versions are newer than the required version.
- REPLACE — Replace the package with a functionally equivalent safe alternative. Use when the package is unmaintained, the vulnerability class is inherent to the package design, or a superior alternative exists.
- DEFER — Defer remediation for now. Use ONLY when the triage decision was MONITOR or DISMISS, or when the operational risk of remediating now outweighs the security risk.

## Reasoning guidelines
1. Base your recommendation on the supplied scenario, versions, and triage result. Do not invent versions or dependencies.
2. Consider semver compatibility: does the fixed version introduce a major version bump (potentially breaking changes)?
3. For TRANSITIVE dependencies, consider whether the lock file, package manager, or OS package manager controls the version — this affects the remediation approach.
4. For OS-level packages (e.g., Debian apt, Alpine apk), UPGRADE or PIN at the OS/Dockerfile layer is different from a language-package upgrade.
5. If the fixed version is LOWER than the current version (a downgrade), use PIN and explain why the newer versions are unsafe.
6. Do not blindly recommend the latest version — recommend the specific fixed version stated in the scenario.
7. If a HUMAN CORRECTION is present, it overrides your default recommendation. Reflect it in the decision and explain the impact.
8. Include a brief note on what code/config changes are needed (Dockerfile line, package.json change, pom.xml update, etc.).
9. Keep the reasoning concise (2–5 sentences) for UI display.
10. Keep the summary to 1–2 sentences.

## Output format
Return ONLY a valid JSON object — no markdown fences, no prose outside the JSON.

{
  "decision": "UPGRADE" | "PATCH" | "PIN" | "REPLACE" | "DEFER",
  "reasoning": "Concise reasoning (2–5 sentences).",
  "summary": "1–2 sentence summary for the UI card."
}`;

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildRemediationUserPrompt(input: AgentInput): string {
  const { scenario, dependencyContext, upstreamContext, humanCorrection } =
    input;

  return `## Vulnerability & Version Details

**CVE:** ${scenario.cve}
**Vulnerability:** ${scenario.vulnerability}
**Severity:** ${scenario.severity}
**Affected Package:** ${scenario.affectedPackage}
**Ecosystem:** ${scenario.ecosystem}
**Current Installed Version:** ${scenario.currentVersion}
**Fixed / Safe Version:** ${scenario.fixedVersion}

**Advisory Summary:**
${scenario.advisorySummary}

---

## Application Context

${scenario.applicationContext}

**Package Usage:**
${scenario.usageContext}

**Proposed Remediation (from scenario brief):**
${scenario.proposedRemediation}

---

## Dependency Metadata

- Dependency Type: ${dependencyContext.dependencyType}
- Dependents: ${dependencyContext.dependents?.join(", ") ?? "None identified"}
- This package depends on: ${dependencyContext.dependOn?.join(", ") ?? "None identified"}

**Dependency Tree:**
${scenario.dependencyTree.join("\n")}

---

## Upstream Agent Result (Triage)

${formatUpstreamContext(upstreamContext)}

---

## Human Correction

${formatHumanCorrection(humanCorrection)}
${
  humanCorrection
    ? "\nIMPORTANT: A human expert has provided the above correction. Adjust your remediation recommendation to reflect this override. Explain how it changes (or confirms) your approach."
    : ""
}

---

Return your remediation decision as a JSON object with the fields: decision, reasoning, summary.`;
}

// ---------------------------------------------------------------------------
// Public agent function
// ---------------------------------------------------------------------------

/**
 * Runs the Remediation Agent for the given input.
 *
 * @param input - AgentInput where upstreamContext should contain the Triage
 *                agent's result.
 * @returns AgentResult with decision ∈ {UPGRADE, PATCH, PIN, REPLACE, DEFER}.
 * @throws If the Groq API fails, the response is unparseable, or required
 *         fields are missing.
 */
export async function runRemediationAgent(
  input: AgentInput
): Promise<AgentResult> {
  return callGroqAgent({
    agentName: "Remediation",
    systemPrompt: REMEDIATION_SYSTEM_PROMPT,
    userPrompt: buildRemediationUserPrompt(input),
    allowedDecisions: REMEDIATION_DECISIONS as unknown as readonly string[],
  });
}

// Re-export the decision type for callers that need it
export type { RemediationDecision };
export { REMEDIATION_DECISIONS };
