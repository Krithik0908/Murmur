"use client";

import clsx from "clsx";
import {
  ShieldAlert,
  Wrench,
  FlaskConical,
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { AgentRun, AgentStatus } from "@/lib/types";

/* ─── Static maps ──────────────────────────────────────── */

const AGENT_ICONS: Record<string, React.ReactNode> = {
  triage: <ShieldAlert className="h-[16px] w-[16px]" />,
  remediation: <Wrench className="h-[16px] w-[16px]" />,
  testImpact: <FlaskConical className="h-[16px] w-[16px]" />,
  deployRisk: <Rocket className="h-[16px] w-[16px]" />,
};

const AGENT_LABELS: Record<string, string> = {
  triage: "Triage",
  remediation: "Remediation",
  testImpact: "Test-Impact",
  deployRisk: "Deploy-Risk",
};

const AGENT_STEP: Record<string, string> = {
  triage: "01",
  remediation: "02",
  testImpact: "03",
  deployRisk: "04",
};

type StatusConfig = {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  ringClass: string;
  pulse: boolean;
};

const STATUS_CONFIG: Record<AgentStatus, StatusConfig> = {
  idle: {
    label: "Idle",
    icon: <Clock className="h-[12px] w-[12px]" />,
    badgeClass: "bg-[#0a0a0a] text-white/40 border border-[#222222]",
    ringClass: "",
    pulse: false,
  },
  running: {
    label: "Running",
    icon: <Loader2 className="h-[12px] w-[12px] animate-spin" />,
    badgeClass: "bg-[#0083ff]/15 text-[#0083ff] border border-[#0083ff]/30",
    ringClass: "shadow-[0_0_0_2px_#0083ff40]",
    pulse: true,
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="h-[12px] w-[12px]" />,
    badgeClass: "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30",
    ringClass: "shadow-[0_0_0_2px_#22c55e30]",
    pulse: false,
  },
  stale: {
    label: "Stale",
    icon: <AlertCircle className="h-[12px] w-[12px]" />,
    badgeClass: "bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30",
    ringClass: "shadow-[0_0_0_2px_#eab30830]",
    pulse: true,
  },
  rerunning: {
    label: "Re-running",
    icon: <RefreshCw className="h-[12px] w-[12px]" />,
    badgeClass: "bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30",
    ringClass: "shadow-[0_0_0_2px_#eab30830]",
    pulse: true,
  },
};

/* ─── Props ────────────────────────────────────────────── */

interface AgentCardProps {
  agent: AgentRun;
  isFlashing: boolean;
  onCorrect: (agentId: string, correctionText: string) => void;
  correctable: boolean;
  agentOrderIndex?: number;
}

/* ─── Component ────────────────────────────────────────── */

export default function AgentCard({ agent, isFlashing }: AgentCardProps) {
  const cfg = STATUS_CONFIG[agent.status];
  const isIdle = agent.status === "idle";
  const isDone = agent.status === "done";
  const label = AGENT_LABELS[agent.agentId];
  const icon = AGENT_ICONS[agent.agentId];
  const step = AGENT_STEP[agent.agentId];

  const bodyText = isIdle ? "Waiting to run" : agent.summary || "Waiting to run";
  const secondaryText = !isIdle && agent.decision ? agent.decision : null;

  return (
    <article
      className={clsx(
        "group relative flex h-[220px] w-full min-w-0 flex-col",
        "overflow-hidden border border-[#222222] bg-[#141414] p-[30px]",
        "transition-all duration-300",
        cfg.ringClass,
        isFlashing && "shadow-[0_0_0_2px_#0083ff] !ring-0",
      )}
      aria-label={`${label} — ${cfg.label}`}
    >
      {/* ── Subtle top accent bar ────────────────────── */}
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-[2px] transition-colors duration-500",
          isDone
            ? "bg-[#22c55e]"
            : agent.status === "running"
            ? "bg-[#0083ff]"
            : agent.status === "stale" || agent.status === "rerunning"
            ? "bg-[#eab308]"
            : "bg-[#222222]"
        )}
        aria-hidden="true"
      />

      {/* ─── Header: icon + name + step ──────────────── */}
      <div className="flex min-w-0 items-start justify-between gap-[2px]">
        <div className="flex min-w-0 items-center gap-[2px]">
          <span
            className={clsx(
              "flex h-[30px] w-[30px] shrink-0 items-center justify-center",
              "transition-colors duration-300",
              isDone ? "bg-[#22c55e] text-[#000000]" : "bg-[#0083ff] text-[#000000]"
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
          <h3 className="ml-[2px] truncate text-[14px] font-semibold text-white">{label}</h3>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-white/30">{step}</span>
      </div>

      {/* ─── Status badge ────────────────────────────── */}
      <span
        className={clsx(
          "mt-[2px] inline-flex w-fit items-center gap-[2px] px-[30px] py-[2px]",
          "text-[11px] font-semibold leading-tight",
          cfg.badgeClass,
          cfg.pulse && "animate-pulse"
        )}
      >
        {cfg.icon}
        {cfg.label}
      </span>

      {/* ─── Body text ───────────────────────────────── */}
      <div className="mt-[30px] min-h-0 flex-1 overflow-y-auto pr-[2px]">
        <p className="text-[13px] font-medium leading-snug text-white/80">{bodyText}</p>
        {secondaryText ? (
          <p className="mt-[2px] border-t border-white/5 pt-[2px] text-[12px] leading-snug text-white/40">
            {secondaryText}
          </p>
        ) : null}
      </div>
    </article>
  );
}