/**
 * agents/index.ts
 * Public barrel — re-exports all four agent runner functions, the scenario
 * seed data, and the shared types/utilities needed by Person 2 (orchestrator).
 *
 * Person 2: import from here, not from individual agent files.
 *
 * Owner: Person 1 (Agent Logic)
 */

// ---------------------------------------------------------------------------
// Agent runner functions
// ---------------------------------------------------------------------------
export { runTriageAgent } from "./triage";
export { runRemediationAgent } from "./remediation";
export { runTestImpactAgent } from "./testImpact";
export { runDeployRiskAgent } from "./deployRisk";

// ---------------------------------------------------------------------------
// Scenario seed data
// ---------------------------------------------------------------------------
export {
  PRIMARY_SCENARIO,
  PRIMARY_DEPENDENCY_CONTEXT,
  PRIMARY_AGENT_INPUT,
  SECONDARY_SCENARIO,
  SECONDARY_DEPENDENCY_CONTEXT,
  ALL_SCENARIOS,
  ALL_DEPENDENCY_CONTEXTS,
} from "./scenario";

// ---------------------------------------------------------------------------
// Shared types (re-exported for convenience — also available from lib/types)
// ---------------------------------------------------------------------------
export type {
  AgentInput,
  AgentResult,
  Scenario,
  DependencyContext,
  UpstreamContext,
  Severity,
  TriageDecision,
  RemediationDecision,
  TestImpactDecision,
  DeployRiskDecision,
  AgentId,
} from "../lib/types";

export {
  TRIAGE_DECISIONS,
  REMEDIATION_DECISIONS,
  TEST_IMPACT_DECISIONS,
  DEPLOY_RISK_DECISIONS,
} from "../lib/types";
