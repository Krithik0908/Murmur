import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/orchestrator/db";
import { AgentRun, Correction } from "@/lib/orchestrator/schema";
import {
  DEPENDENCY_GRAPH,
  AGENT_ORDER,
  getCascadeOrder,
  getTransitiveDependents,
} from "@/lib/orchestrator/graph";
import {
  runTriageAgent,
  runRemediationAgent,
  runTestImpactAgent,
  runDeployRiskAgent,
  PRIMARY_SCENARIO,
  PRIMARY_DEPENDENCY_CONTEXT,
} from "@/agents";
import {
  AgentId,
  AgentInput,
  AgentResult,
  UpstreamContext,
} from "@/lib/types";
import { PropagateRequest, PropagateResponse } from "@/lib/orchestrator/types";

type RunnerFn = (input: AgentInput) => Promise<AgentResult>;

const RUNNERS: Record<AgentId, RunnerFn> = {
  triage:      runTriageAgent,
  remediation: runRemediationAgent,
  testImpact:  runTestImpactAgent,
  deployRisk:  runDeployRiskAgent,
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Core cascade propagation logic.
//
// Steps:
//  1. Mark all cascade agents "stale" atomically.
//  2. Re-run each cascade agent in topological order:
//     a. Mark "rerunning"
//     b. Inject corrected context (humanCorrection only on the target agent)
//     c. Persist output ΓåÆ mark "done"
//  4. Agents NOT in the cascade are never touched.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function propagateCascade(
  runId: string,
  correctedAgent: AgentId,
  correctionText: string
) {
  const cascadeOrder = getCascadeOrder(correctedAgent);

  // Γæá Mark entire cascade "stale" in one batch write
  await AgentRun.updateMany(
    { runId, agentId: { $in: cascadeOrder } },
    { status: "stale", lastUpdated: new Date() }
  );

  // Γæí Re-run cascade agents in order
  for (const agentId of cascadeOrder) {
    const isTarget = agentId === correctedAgent;

    // Mark this agent as rerunning
    await AgentRun.findOneAndUpdate(
      { runId, agentId },
      { status: "rerunning", lastUpdated: new Date() }
    );

    // Build upstream context from database state of dependencies
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
        // Inject the human correction only on the corrected agent itself;
        // downstream agents receive the updated output naturally via context.
        humanCorrection: isTarget ? correctionText : null,
      };

      const output = await runner(agentInput);

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
      console.error(`[Murmur][propagate] Re-run failed for ${agentId}:`, err);
      await AgentRun.findOneAndUpdate(
        { runId, agentId },
        {
          status:      "done",
          decision:    "Re-run error ΓÇö check server logs.",
          reasoning:   String(err),
          summary:     "Error during re-run.",
          lastUpdated: new Date(),
        }
      );
      // Since this is a dependency cascade, if an upstream agent fails, we break downstream execution.
      break;
    }
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// POST /api/propagate
// Body: { runId, agentId, correctionText }
// Returns: { accepted, agentId, downstreamAffected }
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function POST(req: NextRequest) {
  await connectDB();

  const body = (await req.json()) as Partial<PropagateRequest>;
  const { runId, agentId, correctionText } = body;

  if (!runId || !agentId || !correctionText) {
    return NextResponse.json(
      { error: "runId, agentId, and correctionText are all required." },
      { status: 400 }
    );
  }

  // Validate agentId
  const validIds: AgentId[] = ["triage", "remediation", "testImpact", "deployRisk"];
  if (!validIds.includes(agentId)) {
    return NextResponse.json(
      { error: `Unknown agentId: ${agentId}` },
      { status: 400 }
    );
  }

  // Load current agent state for the audit log
  const currentDoc = await AgentRun.findOne({ runId, agentId }).lean();
  if (!currentDoc) {
    return NextResponse.json(
      { error: `No agent run found for runId=${runId} agentId=${agentId}` },
      { status: 404 }
    );
  }

  const downstreamAffected = getTransitiveDependents(agentId);

  // Write correction audit log entry
  await Correction.create({
    runId,
    agentId,
    oldDecision:        currentDoc.decision,
    correctionText,
    downstreamAffected,
  });

  // Fire cascade ΓÇö intentionally not awaited so we respond immediately
  propagateCascade(runId, agentId, correctionText).catch((err) =>
    console.error("[Murmur][propagate] Cascade error:", err)
  );

  return NextResponse.json<PropagateResponse>({
    accepted:           true,
    agentId,
    downstreamAffected,
  });
}
