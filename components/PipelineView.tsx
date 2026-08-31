"use client";

import { Fragment } from "react";
import clsx from "clsx";
import { AgentId, AgentRun } from "@/lib/types";
import AgentCard from "./AgentCard";

/* ─── Types ────────────────────────────────────────────── */

interface PipelineViewProps {
  agents:         Record<AgentId, AgentRun>;
  flashingAgents: Set<AgentId>;
  activeArrows:   Set<string>;
  pulseArrow?:    string | null;
  onCorrect:      (agentId: string, correctionText: string) => void;
}

/* ─── Constants ────────────────────────────────────────── */

const AGENT_ORDER: AgentId[] = [
  "triage",
  "remediation",
  "testImpact",
  "deployRisk",
];

const VISUAL_EDGES: { from: AgentId; to: AgentId; key: string }[] = [
  { from: "triage",      to: "remediation", key: "triage->remediation"     },
  { from: "remediation", to: "testImpact",  key: "remediation->testImpact" },
  { from: "testImpact",  to: "deployRisk",  key: "testImpact->deployRisk"  },
];

/* ─── Connector ────────────────────────────────────────── */

function Connector({ lit, pulsing }: { lit: boolean; pulsing: boolean }) {
  return (
    <div
      className="flex h-[220px] w-[44px] shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative flex h-[2px] w-full items-center">
        {/* Track */}
        <div
          className={clsx(
            "h-[2px] w-full transition-colors duration-500",
            lit ? "bg-[#0083ff]" : "bg-[#222222]"
          )}
        />

        {/* Cascade dot — travels left → right at 500ms per hop */}
        {pulsing ? (
          <span
            className="absolute left-0 top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full bg-[#0083ff] shadow-[0_0_8px_2px_#0083ff80] animate-pulse"
          />
        ) : null}

        {/* Arrowhead — CSS chevron */}
        <span
          className={clsx(
            "absolute right-0 top-1/2 -translate-y-1/2 -translate-x-[1px]",
            "h-[10px] w-[10px] rotate-45",
            "border-t-[2px] border-r-[2px]",
            "transition-colors duration-500",
            lit ? "border-[#0083ff]" : "border-[#222222]"
          )}
        />
      </div>
    </div>
  );
}

/* ─── PipelineView ─────────────────────────────────────── */

export default function PipelineView({
  agents,
  flashingAgents,
  activeArrows,
  pulseArrow = null,
  onCorrect,
}: PipelineViewProps) {
  return (
    <div className="flex w-full min-w-0 items-stretch overflow-hidden">
      {AGENT_ORDER.map((agentId, index) => (
        <Fragment key={agentId}>
          {/* Agent card — flexible width */}
          <div className="min-w-0 flex-1">
            <AgentCard
              agent={agents[agentId]}
              isFlashing={flashingAgents.has(agentId)}
              onCorrect={onCorrect}
              correctable={agents[agentId].status === "done"}
              agentOrderIndex={index}
            />
          </div>

          {/* Connector between cards (skip after last) */}
          {index < VISUAL_EDGES.length ? (
            <Connector
              lit={activeArrows.has(VISUAL_EDGES[index].key)}
              pulsing={pulseArrow === VISUAL_EDGES[index].key}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}