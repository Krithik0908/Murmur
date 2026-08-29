"use client";

import { useRef, useEffect, useState } from "react";
import clsx from "clsx";
import { AgentId, AgentRun, AgentStatus } from "@/lib/types";
import AgentCard from "./AgentCard";

interface PipelineViewProps {
  agents: Record<AgentId, AgentRun>;
  flashingAgents: Set<AgentId>;
  activeArrows: Set<string>; // "triage->remediation"
  onCorrect: (agentId: string, correctionText: string) => void;
}

const AGENT_ORDER: AgentId[] = ["triage", "remediation", "testImpact", "deployRisk"];

function isCorrectableStatus(status: AgentStatus): boolean {
  return status === "done";
}

export default function PipelineView({
  agents,
  flashingAgents,
  activeArrows,
  onCorrect,
}: PipelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardRects, setCardRects] = useState<Record<string, DOMRect>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const rects: Record<string, DOMRect> = {};
      for (const id of AGENT_ORDER) {
        const el = cardRefs.current[id];
        if (el) {
          const r = el.getBoundingClientRect();
          rects[id] = new DOMRect(
            r.left - containerRect.left,
            r.top - containerRect.top,
            r.width,
            r.height
          );
        }
      }
      setCardRects(rects);
    };

    measure();
    window.addEventListener("resize", measure);
    const timeout = setTimeout(measure, 100);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timeout);
    };
  }, [agents]);

  const arrows: { from: AgentId; to: AgentId; key: string }[] = [
    { from: "triage", to: "remediation", key: "triage->remediation" },
    { from: "remediation", to: "testImpact", key: "remediation->testImpact" },
    { from: "remediation", to: "deployRisk", key: "remediation->deployRisk" },
    { from: "testImpact", to: "deployRisk", key: "testImpact->deployRisk" },
  ];

  const containerWidth = containerRef.current?.offsetWidth ?? 1200;
  const containerHeight = containerRef.current?.offsetHeight ?? 380;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* SVG Layer for Blueprint Drafting Arrows */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        width={containerWidth}
        height={containerHeight}
      >
        <defs>
          {/* Default Navy Ink Marker */}
          <marker id="marker-navy-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1b3c7b" />
          </marker>
          {/* Active Resolved Ink Marker */}
          <marker id="marker-white-solid" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#ffffff" />
          </marker>
          {/* Cascade Flash Marker */}
          <marker id="marker-cascade-pulse" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#ffffff" />
          </marker>
        </defs>

        {arrows.map(({ from, to, key }) => {
          const fromRect = cardRects[from];
          const toRect = cardRects[to];
          if (!fromRect || !toRect) return null;

          const isLit = activeArrows.has(key);
          const isDone =
            agents[from]?.status === "done" ||
            agents[from]?.status === "stale" ||
            agents[from]?.status === "rerunning";
          const isActive = isDone && !isLit;

          const x1 = fromRect.right;
          const y1 = fromRect.top + fromRect.height / 2;
          const x2 = toRect.left;
          const y2 = toRect.top + toRect.height / 2;

          const cx1 = x1 + (x2 - x1) * 0.5;
          const cy1 = y1;
          const cx2 = x1 + (x2 - x1) * 0.5;
          const cy2 = y2;

          return (
            <g key={key}>
              {/* Cascade Glow Path */}
              {isLit && (
                <path
                  d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
                  stroke="#ffffff"
                  strokeWidth="6"
                  fill="none"
                  opacity="0.6"
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))" }}
                />
              )}

              {/* Main Arrow Line */}
              <path
                d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
                stroke={isLit ? "#ffffff" : isActive ? "#9bb8ee" : "#1b3c7b"}
                strokeWidth={isLit ? 3 : isActive ? 2 : 1.5}
                strokeDasharray={isLit ? "6 4" : "none"}
                fill="none"
                markerEnd={`url(#${
                  isLit
                    ? "marker-cascade-pulse"
                    : isActive
                    ? "marker-white-solid"
                    : "marker-navy-dim"
                })`}
                style={{
                  transition: "stroke 0.3s ease, stroke-width 0.3s ease",
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* 4 Cards in Horizontal Chain */}
      <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-4 w-full" style={{ zIndex: 1 }}>
        {AGENT_ORDER.map((agentId) => {
          const agent = agents[agentId];
          return (
            <div
              key={agentId}
              ref={(el) => {
                cardRefs.current[agentId] = el;
              }}
              className="flex-1 flex justify-center"
            >
              <AgentCard
                agent={agent}
                isFlashing={flashingAgents.has(agentId)}
                onCorrect={onCorrect}
                correctable={isCorrectableStatus(agent.status)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
