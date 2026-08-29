import { AgentId } from "../types";

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
  lastUpdated: string; // ISO string
}

export interface CorrectionEntry {
  runId: string;
  agentId: string;
  oldDecision: string;
  correctionText: string;
  timestamp: string; // ISO string
  downstreamAffected: string[];
}

export interface SpawnResponse {
  runId: string;
}

export interface PropagateRequest {
  runId: string;
  agentId: AgentId;
  correctionText: string;
}

export interface PropagateResponse {
  accepted: boolean;
  agentId: AgentId;
  downstreamAffected: AgentId[];
}

export interface SnapshotResponse {
  runId: string;
  agents: AgentRun[];
  corrections: CorrectionEntry[];
}
