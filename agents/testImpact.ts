/**
 * agents/testImpact.ts
 * Test-Impact Agent — third agent in the Murmur security pipeline.
 *
 * Responsibility: Determine what testing is required after the proposed
 * remediation, based on the package role, usage context, and the upstream
 * triage and remediation results.
 *
 * Decision vocabulary: TARGETED_TESTS | FULL_REGRESSION | SMOKE_TESTS | NO_ADDITIONAL_TESTS
 *
 * Owner: Person 1 (Agent Logic)
 */

import type {
  AgentInput,
  AgentResult,
  TestImpactDecision,
} from "../lib/types";
import { TEST_IMPACT_DECISIONS } from "../lib/types";
import {
  callGroqAgent,
  formatUpstreamContext,
  formatHumanCorrection,
} from "./shared";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const TEST_IMPACT_SYSTEM_PROMPT = `You are a senior quality engineer and DevSecOps practitioner performing the TEST IMPACT ANALYSIS stage of a vulnerability response pipeline.

Your task is to determine what testing is required after the proposed remediation has been applied. You receive context about the vulnerability, the remediation strategy chosen, and the application's existing test suite.

## Decision vocabulary
You MUST output exactly one of these four tokens as the "decision" field:
- TARGETED_TESTS — Run a focused subset of tests that directly cover the changed package's functionality or the application code paths that use it. The existing suite does not need to run in full.
- FULL_REGRESSION — Run the complete test suite because the change has broad or unpredictable impact across multiple application subsystems.
- SMOKE_TESTS — Run only the critical path smoke tests (the minimal set that confirms the application starts and core flows work). Use when the package change is OS-level, infrastructure-level, or otherwise far removed from application logic.
- NO_ADDITIONAL_TESTS — No tests beyond the standard CI checks are needed. Use only when the remediation is a config-only change with no code path impact, or the remediation decision was DEFER.

## Reasoning guidelines
1. Ground your analysis in the specific package, how it is used in the application, and what the remediation action changes.
2. Do NOT generically say "run all tests" without concrete justification — name the actual areas of the application that could regress.
3. Consider: API surface compatibility between old and new package versions, whether the package is in the hot path vs. infrastructure layer, whether the change is a version bump, config change, or package replacement.
4. For OS-level packages (e.g., liblzma, systemd), focus on runtime/startup behavior and OS-level smoke tests rather than unit tests.
5. For direct application dependencies, focus on the application features and API contracts that consume the package.
6. Identify specific test categories or test cases by name if the test context mentions them.
7. If the remediation decision was DEFER or the triage decision was DISMISS, justify why NO_ADDITIONAL_TESTS or SMOKE_TESTS is appropriate.
8. If a HUMAN CORRECTION is present, adjust your assessment to reflect the override. Explain the impact on test scope.
9. Keep the reasoning concise (2–5 sentences) for UI display.
10. Keep the summary to 1–2 sentences.

## Output format
Return ONLY a valid JSON object — no markdown fences, no prose outside the JSON.

{
  "decision": "TARGETED_TESTS" | "FULL_REGRESSION" | "SMOKE_TESTS" | "NO_ADDITIONAL_TESTS",
  "reasoning": "Concise reasoning (2–5 sentences).",
  "summary": "1–2 sentence summary for the UI card."
}`;

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildTestImpactUserPrompt(input: AgentInput): string {
  const { scenario, dependencyContext, upstreamContext, humanCorrection } =
    input;

  return `## Vulnerability & Package Details

**CVE:** ${scenario.cve}
**Vulnerability:** ${scenario.vulnerability}
**Severity:** ${scenario.severity}
**Affected Package:** ${scenario.affectedPackage}
**Ecosystem:** ${scenario.ecosystem}
**Current Version:** ${scenario.currentVersion}
**Fixed / Safe Version:** ${scenario.fixedVersion}

---

## Application Context

${scenario.applicationContext}

**Package Usage in Application:**
${scenario.usageContext}

**Dependency Tree:**
${scenario.dependencyTree.join("\n")}

**Dependency Type:** ${dependencyContext.dependencyType}
**Dependents:** ${dependencyContext.dependents?.join(", ") ?? "None identified"}

---

## Existing Test Suite

${scenario.testContext}

---

## Upstream Agent Results (Triage + Remediation)

${formatUpstreamContext(upstreamContext)}

---

## Human Correction

${formatHumanCorrection(humanCorrection)}
${
  humanCorrection
    ? "\nIMPORTANT: A human expert has provided the above correction. Adjust your test-impact assessment to reflect this override. Explain how it changes the required test scope."
    : ""
}

---

Return your test-impact decision as a JSON object with the fields: decision, reasoning, summary.`;
}

// ---------------------------------------------------------------------------
// Public agent function
// ---------------------------------------------------------------------------

/**
 * Runs the Test-Impact Agent for the given input.
 *
 * @param input - AgentInput where upstreamContext should contain at minimum
 *                the Remediation agent's result (and ideally the Triage result too).
 * @returns AgentResult with decision ∈ {TARGETED_TESTS, FULL_REGRESSION,
 *          SMOKE_TESTS, NO_ADDITIONAL_TESTS}.
 * @throws If the Groq API fails, the response is unparseable, or required
 *         fields are missing.
 */
export async function runTestImpactAgent(
  input: AgentInput
): Promise<AgentResult> {
  return callGroqAgent({
    agentName: "TestImpact",
    systemPrompt: TEST_IMPACT_SYSTEM_PROMPT,
    userPrompt: buildTestImpactUserPrompt(input),
    allowedDecisions: TEST_IMPACT_DECISIONS as unknown as readonly string[],
  });
}

// Re-export the decision type for callers that need it
export type { TestImpactDecision };
export { TEST_IMPACT_DECISIONS };
