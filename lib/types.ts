/**
 * lib/types.ts
 * Shared TypeScript types for the Murmur agent pipeline.
 * Owner: Person 1 (Agent Logic)
 */

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Scenario {
  /** Unique scenario identifier */
  id: string;
  /** CVE identifier, e.g. "CVE-2024-3094" */
  cve: string;
  /** Short human-readable name for the vulnerability */
  vulnerability: string;
  /** CVSS-aligned severity rating */
  severity: Severity;
  /** npm / pip / cargo / etc. package name */
  affectedPackage: string;
  /** Currently installed version in the project */
  currentVersion: string;
  /** Earliest version that resolves the vulnerability */
  fixedVersion: string;
  /** Package ecosystem: "npm" | "cargo" | "pypi" | etc. */
  ecosystem: string;
  /** Brief advisory text from the upstream security database */
  advisorySummary: string;
  /** Human-readable description of the application and its purpose */
  applicationContext: string;
  /** How / where this package is actually used inside the app */
  usageContext: string;
  /** Abbreviated dependency tree showing the affected package path */
  dependencyTree: string[];
  /** Human-readable proposed remediation for agent priming */
  proposedRemediation: string;
  /** Current test suite characteristics relevant to change-impact analysis */
  testContext: string;
  /** Current deployment environment and strategy */
  deploymentContext: string;
}

// ---------------------------------------------------------------------------
// Dependency Context
// ---------------------------------------------------------------------------

export interface DependencyContext {
  packageName: string;
  currentVersion: string;
  dependencyType: "direct" | "transitive";
  /** Packages / services that import this package */
  dependents?: string[];
  /** Packages this package depends on */
  dependOn?: string[];
}

// ---------------------------------------------------------------------------
// Upstream Context (result from a previous agent)
// ---------------------------------------------------------------------------

export interface UpstreamContext {
  agent: "triage" | "remediation" | "testImpact" | "deployRisk";
  decision: string;
  reasoning: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Common Agent Input
// ---------------------------------------------------------------------------

export interface AgentInput {
  scenario: Scenario;
  dependencyContext: DependencyContext;
  /** Result(s) from upstream agents — may be one or multiple upstream results */
  upstreamContext?: UpstreamContext | UpstreamContext[] | null;
  /** Optional human override text; when present agents must re-evaluate */
  humanCorrection?: string | null;
}

// ---------------------------------------------------------------------------
// Agent Result (the external contract — every agent must return this shape)
// ---------------------------------------------------------------------------

export interface AgentResult {
  /** Controlled-vocabulary decision token (e.g. "REMEDIATE", "UPGRADE", ...) */
  decision: string;
  /** Full reasoning paragraph shown in the UI */
  reasoning: string;
  /** One-to-two sentence summary for the event log / card subtitle */
  summary: string;
}

// ---------------------------------------------------------------------------
// Decision vocabularies (used for validation)
// ---------------------------------------------------------------------------

export const TRIAGE_DECISIONS = ["REMEDIATE", "MONITOR", "DISMISS"] as const;
export type TriageDecision = (typeof TRIAGE_DECISIONS)[number];

export const REMEDIATION_DECISIONS = [
  "UPGRADE",
  "PATCH",
  "PIN",
  "REPLACE",
  "DEFER",
] as const;
export type RemediationDecision = (typeof REMEDIATION_DECISIONS)[number];

export const TEST_IMPACT_DECISIONS = [
  "TARGETED_TESTS",
  "FULL_REGRESSION",
  "SMOKE_TESTS",
  "NO_ADDITIONAL_TESTS",
] as const;
export type TestImpactDecision = (typeof TEST_IMPACT_DECISIONS)[number];

export const DEPLOY_RISK_DECISIONS = [
  "GO",
  "GO_WITH_GUARDRAILS",
  "HOLD",
] as const;
export type DeployRiskDecision = (typeof DEPLOY_RISK_DECISIONS)[number];

// ---------------------------------------------------------------------------
// Agent IDs
// ---------------------------------------------------------------------------

export type AgentId = "triage" | "remediation" | "testImpact" | "deployRisk";
