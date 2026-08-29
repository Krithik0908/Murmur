import { AgentId } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded dependency graph — deterministic, NOT AI-inferred.
// Key   = agent that owns a decision
// Value = agents whose decisions that agent depends ON (upstream)
// ─────────────────────────────────────────────────────────────────────────────
export const DEPENDENCY_GRAPH: Record<AgentId, AgentId[]> = {
  triage:      [],
  remediation: ["triage"],
  testImpact:  ["remediation"],
  deployRisk:  ["remediation", "testImpact"],
};

// Safe sequential execution order (topologically sorted)
export const AGENT_ORDER: AgentId[] = [
  "triage",
  "remediation",
  "testImpact",
  "deployRisk",
];

// ─────────────────────────────────────────────────────────────────────────────
// BFS: given an agent that just changed, return every agent that transitively
// depends on it (i.e. all agents that must be marked stale + re-run).
//
// Example:  getTransitiveDependents("triage")
//           → ["remediation", "testImpact", "deployRisk"]
//
//           getTransitiveDependents("remediation")
//           → ["testImpact", "deployRisk"]
// ─────────────────────────────────────────────────────────────────────────────
export function getTransitiveDependents(changedAgent: AgentId): AgentId[] {
  const result: AgentId[] = [];
  const visited = new Set<AgentId>();
  const queue: AgentId[] = [changedAgent];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const [agent, deps] of Object.entries(DEPENDENCY_GRAPH) as [
      AgentId,
      AgentId[],
    ][]) {
      if (deps.includes(current) && !visited.has(agent)) {
        visited.add(agent);
        result.push(agent);
        queue.push(agent); // keep walking downstream
      }
    }
  }

  // Return in topological order so we re-run in the right sequence
  return AGENT_ORDER.filter((id) => result.includes(id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Returns the subset of AGENT_ORDER that must re-run after a correction:
// [correctedAgent, ...its transitive dependents] — in execution order
// ─────────────────────────────────────────────────────────────────────────────
export function getCascadeOrder(correctedAgent: AgentId): AgentId[] {
  const dependents = getTransitiveDependents(correctedAgent);
  return AGENT_ORDER.filter(
    (id) => id === correctedAgent || dependents.includes(id)
  );
}
