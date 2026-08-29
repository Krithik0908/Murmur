import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/orchestrator/db";
import { AgentRun, Correction } from "@/lib/orchestrator/schema";
import { SnapshotResponse } from "@/lib/orchestrator/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/snapshot?runId=<uuid>
//
// Returns the current state of all 4 agent docs + the full correction audit
// log for the given run. Polled by the frontend every 1–2s.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  await connectDB();

  const runId = new URL(req.url).searchParams.get("runId");

  if (!runId) {
    return NextResponse.json(
      { error: "runId query param is required. Example: /api/snapshot?runId=<uuid>" },
      { status: 400 }
    );
  }

  const [agentDocs, correctionDocs] = await Promise.all([
    AgentRun.find({ runId }).sort({ lastUpdated: 1 }).lean(),
    Correction.find({ runId }).sort({ timestamp: 1 }).lean(),
  ]);

  const response: SnapshotResponse = {
    runId,
    agents: agentDocs.map((a) => ({
      runId:       a.runId,
      agentId:     a.agentId as SnapshotResponse["agents"][number]["agentId"],
      status:      a.status as SnapshotResponse["agents"][number]["status"],
      decision:    a.decision,
      reasoning:   a.reasoning,
      summary:     a.summary,
      dependsOn:   a.dependsOn as SnapshotResponse["agents"][number]["dependsOn"],
      lastUpdated: (a.lastUpdated as Date).toISOString(),
    })),
    corrections: correctionDocs.map((c) => ({
      runId:              c.runId,
      agentId:            c.agentId as SnapshotResponse["corrections"][number]["agentId"],
      oldDecision:        c.oldDecision,
      correctionText:     c.correctionText,
      timestamp:          (c.timestamp as Date).toISOString(),
      downstreamAffected: c.downstreamAffected as SnapshotResponse["corrections"][number]["downstreamAffected"],
    })),
  };

  return NextResponse.json(response);
}
