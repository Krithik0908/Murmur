import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/lib/orchestrator/db";
import { AgentRun } from "@/lib/orchestrator/schema";
import { DEPENDENCY_GRAPH, AGENT_ORDER } from "@/lib/orchestrator/graph";
import {
  runTriageAgent,
  runRemediationAgent,
  runTestImpactAgent,
  runDeployRiskAgent,
  PRIMARY_SCENARIO,
  PRIMARY_DEPENDENCY_CONTEXT,
} from "@/agents";
import { AgentId, AgentInput, AgentResult, UpstreamContext } from "@/lib/types";
import { SpawnResponse } from "@/lib/orchestrator/types";

type RunnerFn = (input: AgentInput) => Promise<AgentResult>;

const RUNNERS: Record<AgentId, RunnerFn> = {
  triage:      runTriageAgent,
  remediation: runRemediationAgent,
  testImpact:  runTestImpactAgent,
  deployRisk:  runDeployRiskAgent,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sequential pipeline runner — runs agents one-by-one, updating DB after each.
// Fired in the background so POST /api/spawn returns immediately.
// ─────────────────────────────────────────────────────────────────────────────
async function runPipeline(runId: string) {
  for (const agentId of AGENT_ORDER) {
    // ① Mark agent as running
    await AgentRun.findOneAndUpdate(
      { runId, agentId },
      { status: "running", lastUpdated: new Date() }
    );

    // ② Build upstream context from database state of dependencies
    const upstreamContext: UpstreamContext[] = [];
    for (const dep of DEPENDENCY_GRAPH[agentId]) {
      const depDoc = await AgentRun.findOne({ runId, agentId: dep }).lean();
      if (depDoc && depDoc.status === "done") {
        upstreamContext.push({
          agent: dep,
          decision: depDoc.decision,
          reasoning: depDoc.reasoning,
          summary: depDoc.summary,
        });
      }
    }

    try {
      const runner = RUNNERS[agentId];
      const agentInput: AgentInput = {
        scenario: PRIMARY_SCENARIO,
        dependencyContext: PRIMARY_DEPENDENCY_CONTEXT,
        upstreamContext: upstreamContext.length > 0 ? upstreamContext : null,
        humanCorrection: null,
      };

      const output = await runner(agentInput);

      // ③ Persist output + mark done
      await AgentRun.findOneAndUpdate(
        { runId, agentId },
        {
          status:      "done",
          decision:    output.decision,
          reasoning:   output.reasoning,
          summary:     output.summary,
          lastUpdated: new Date(),
        }
      );
    } catch (err) {
      console.error(`[Murmur][spawn] Agent ${agentId} failed:`, err);
      await AgentRun.findOneAndUpdate(
        { runId, agentId },
        {
          status:      "done",
          decision:    "Agent error — check server logs.",
          reasoning:   String(err),
          summary:     "Error during execution.",
          lastUpdated: new Date(),
        }
      );
      // Since this is a chain, if an agent fails, the downstream agents shouldn't run with stale/broken context.
      // We break the execution loop here.
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spawn
// Body: none
// Returns: { runId }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST() {
  await connectDB();

  const runId = uuidv4();

  // Insert all 4 agent docs as "idle" in a single batch write
  await AgentRun.insertMany(
    AGENT_ORDER.map((agentId) => ({
      runId,
      agentId,
      status:      "idle",
      decision:    "",
      reasoning:   "",
      summary:     "",
      dependsOn:   DEPENDENCY_GRAPH[agentId],
      lastUpdated: new Date(),
    }))
  );

  // Fire pipeline — intentionally not awaited
  runPipeline(runId).catch((err) =>
    console.error("[Murmur][spawn] Pipeline error:", err)
  );

  return NextResponse.json<SpawnResponse>({ runId });
}
