export type AgentId = "triage" | "remediation" | "testImpact" | "deployRisk";

export type AgentStatus =
  | "idle"
  | "running"
  | "done"
  | "stale"
  | "rerunning";

export interface AgentRun {
  runId: string;
  agentId: AgentId;
  status: AgentStatus;
  decision: string;
  reasoning: string;
  summary: string;
  dependsOn: AgentId[];
  lastUpdated: number;
}

export interface Correction {
  runId: string;
  agentId: AgentId;
  oldDecision: string;
  correctionText: string;
  timestamp: number;
  downstreamAffected: AgentId[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "decision" | "correction" | "rerun" | "untouched" | "system";
  agentId?: AgentId;
}

export interface PipelineState {
  runId: string;
  agents: Record<AgentId, AgentRun>;
  log: LogEntry[];
  corrections: Correction[];
  phase: "idle" | "spawned" | "running" | "complete";
}
