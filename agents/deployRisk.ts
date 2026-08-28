/**
 * agents/deployRisk.ts
 * Deploy-Risk Agent — fourth (final) agent in the Murmur security pipeline.
 *
 * Responsibility: Determine whether the remediated change is safe to deploy,
 * given the CVE severity, remediation strategy, test-impact result, and
 * deployment context.
 *
 * Decision vocabulary: GO | GO_WITH_GUARDRAILS | HOLD
 *
 * Owner: Person 1 (Agent Logic)
 */

import type {
  AgentInput,
  AgentResult,
  DeployRiskDecision,
} from "../lib/types";
import { DEPLOY_RISK_DECISIONS } from "../lib/types";
import {
  callGroqAgent,
  formatUpstreamContext,
  formatHumanCorrection,
} from "./shared";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const DEPLOY_RISK_SYSTEM_PROMPT = `You are a senior site reliability engineer and DevSecOps architect performing the DEPLOYMENT RISK ASSESSMENT stage of a vulnerability response pipeline.

Your task is to determine whether the proposed remediation is safe to ship to production, and under what conditions. You receive the full upstream pipeline context: triage decision, remediation strategy, test-impact analysis, and the deployment environment details.

## Decision vocabulary
You MUST output exactly one of these three tokens as the "decision" field:
- GO — Deploy immediately. The change is low-risk, tests are adequate, and the security benefit outweighs any deployment risk.
- GO_WITH_GUARDRAILS — Deploy, but with specific risk-reduction measures in place (e.g., canary rollout, enhanced monitoring, rollback readiness confirmation, manual approval gate). List the required guardrails concisely in the reasoning.
- HOLD — Do not deploy yet. The deployment risk outweighs the immediate benefit, more testing is required, or the remediation strategy needs revision. State clearly what must be resolved before deploying.

## Reasoning guidelines
1. Synthesize the full upstream context: triage severity, remediation confidence, test coverage, and deployment environment.
2. Consider: CVE severity (higher severity = pressure to ship fast, but also higher stakes if the remediation breaks something), breaking-change risk of the version change, blast radius if deployment fails, rollback time and complexity, and production traffic impact.
3. For CRITICAL CVEs with active exploitation potential, lean toward GO or GO_WITH_GUARDRAILS — a HOLD must be strongly justified because leaving a CRITICAL vulnerability unpatched is itself a significant risk.
4. For SMOKE_TESTS or NO_ADDITIONAL_TESTS outcomes, require stronger guardrails (canary, monitoring) because test confidence is lower.
5. For FULL_REGRESSION outcomes where all tests passed, confidence is higher and GO or GO_WITH_GUARDRAILS is appropriate.
6. Evaluate rollback speed: if automated rollback is available (< 2 min), this reduces risk substantially.
7. If the remediation was DEFER, the decision should be HOLD unless there is a specific reason to deploy.
8. List the SPECIFIC guardrails required (e.g., "enable blue/green for this release", "add Trivy scan gate to CI", "monitor SSH connection success rate for 30 min post-deploy").
9. If a HUMAN CORRECTION is present, it overrides your assessment. Reflect it in the decision and explain the change.
10. Keep the reasoning concise (2–5 sentences) for UI display.
11. Keep the summary to 1–2 sentences.

## Output format
Return ONLY a valid JSON object — no markdown fences, no prose outside the JSON.

{
  "decision": "GO" | "GO_WITH_GUARDRAILS" | "HOLD",
  "reasoning": "Concise reasoning (2–5 sentences).",
  "summary": "1–2 sentence summary for the UI card."
}`;

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildDeployRiskUserPrompt(input: AgentInput): string {
  const { scenario, dependencyContext, upstreamContext, humanCorrection } =
    input;

  return `## Vulnerability & Severity

**CVE:** ${scenario.cve}
**Vulnerability:** ${scenario.vulnerability}
**Severity:** ${scenario.severity}
**Affected Package:** ${scenario.affectedPackage} (${scenario.currentVersion} → ${scenario.fixedVersion})
**Ecosystem:** ${scenario.ecosystem}

---

## Application Context

${scenario.applicationContext}

**Package Usage:**
${scenario.usageContext}

**Dependency Type:** ${dependencyContext.dependencyType}
**Dependents affected:** ${dependencyContext.dependents?.join(", ") ?? "None identified"}

---

## Deployment Environment

${scenario.deploymentContext}

---

## Test Context

${scenario.testContext}

---

## Full Upstream Pipeline Results (Triage + Remediation + Test-Impact)

${formatUpstreamContext(upstreamContext)}

---

## Human Correction

${formatHumanCorrection(humanCorrection)}
${
  humanCorrection
    ? "\nIMPORTANT: A human expert has provided the above correction. Adjust your deployment risk assessment to reflect this override. Explain how it changes the go/hold decision."
    : ""
}

---

Return your deployment risk decision as a JSON object with the fields: decision, reasoning, summary.`;
}

// ---------------------------------------------------------------------------
// Public agent function
// ---------------------------------------------------------------------------

/**
 * Runs the Deploy-Risk Agent for the given input.
 *
 * @param input - AgentInput where upstreamContext should contain the Triage,
 *                Remediation, and Test-Impact agent results (as an array or
 *                the most recent upstream result).
 * @returns AgentResult with decision ∈ {GO, GO_WITH_GUARDRAILS, HOLD}.
 * @throws If the Groq API fails, the response is unparseable, or required
 *         fields are missing.
 */
export async function runDeployRiskAgent(
  input: AgentInput
): Promise<AgentResult> {
  return callGroqAgent({
    agentName: "DeployRisk",
    systemPrompt: DEPLOY_RISK_SYSTEM_PROMPT,
    userPrompt: buildDeployRiskUserPrompt(input),
    allowedDecisions: DEPLOY_RISK_DECISIONS as unknown as readonly string[],
  });
}

// Re-export the decision type for callers that need it
export type { DeployRiskDecision };
export { DEPLOY_RISK_DECISIONS };
