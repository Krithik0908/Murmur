"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Wrench,
  FlaskConical,
  Rocket,
  Pencil,
  X,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import { AgentRun, AgentStatus } from "@/lib/types";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  triage: <ShieldAlert className="w-4 h-4" />,
  remediation: <Wrench className="w-4 h-4" />,
  testImpact: <FlaskConical className="w-4 h-4" />,
  deployRisk: <Rocket className="w-4 h-4" />,
};

const AGENT_LABELS: Record<string, string> = {
  triage: "Triage Agent",
  remediation: "Remediation Agent",
  testImpact: "Test-Impact Agent",
  deployRisk: "Deploy-Risk Agent",
};

const AGENT_ROLES: Record<string, string> = {
  triage: "CVE Severity & Vector",
  remediation: "Patch & Pin Strategy",
  testImpact: "Targeted Test Suites",
  deployRisk: "Rollout & Rollback Plan",
};

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; icon: React.ReactNode; badgeClass: string; cardBorder: string; headerBg: string }
> = {
  idle: {
    label: "IDLE",
    icon: <Clock className="w-3 h-3 text-[#a49db5]" />,
    badgeClass: "bg-black/40 text-[#a49db5] border-white/10",
    cardBorder: "border-white/10 hover:border-white/20",
    headerBg: "bg-black/20",
  },
  running: {
    label: "RUNNING",
    icon: <Loader2 className="w-3 h-3 animate-spin text-black" />,
    badgeClass: "bg-[#9a8afb] text-black border-[#9a8afb] animate-pulse font-bold shadow-md",
    cardBorder: "border-[#9a8afb]/45 ring-1 ring-[#9a8afb]/25",
    headerBg: "bg-black/20",
  },
  done: {
    label: "RESOLVED",
    icon: <CheckCircle2 className="w-3 h-3 text-black" />,
    badgeClass: "bg-[#46c17d] text-black border-[#46c17d] font-bold shadow-sm",
    cardBorder: "border-white/10 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.55)]",
    headerBg: "bg-black/20",
  },
  stale: {
    label: "CASCADE STALE",
    icon: <AlertCircle className="w-3 h-3 text-black" />,
    badgeClass: "bg-[#d6a94f] text-black border-[#d6a94f] border-dashed font-bold shadow-sm",
    cardBorder: "border-dashed border border-[#d6a94f]/60 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.55)]",
    headerBg: "bg-black/20",
  },
  rerunning: {
    label: "RE-RUNNING",
    icon: <RefreshCw className="w-3 h-3 animate-spin text-black" />,
    badgeClass: "bg-[#d6a94f] text-black border-[#d6a94f] animate-pulse font-bold shadow-md",
    cardBorder: "border-[#d6a94f]/55 ring-1 ring-[#d6a94f]/30",
    headerBg: "bg-black/20",
  },
};

interface AgentCardProps {
  agent: AgentRun;
  isFlashing?: boolean;
  onCorrect: (agentId: string, correctionText: string) => void;
  correctable: boolean;
}

export default function AgentCard({
  agent,
  isFlashing,
  onCorrect,
  correctable,
}: AgentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [correction, setCorrection] = useState("");
  const [expanded, setExpanded] = useState(false);

  const cfg = STATUS_CONFIG[agent.status];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!correction.trim()) return;
    onCorrect(agent.agentId, correction.trim());
    setCorrection("");
    setIsEditing(false);
  };

  return (
    <div
      className={clsx(
        "paper-card-navy relative flex flex-col rounded-2xl border transition-all duration-300",
        "w-full min-w-[240px] max-w-[290px] overflow-hidden",
        cfg.cardBorder,
        isFlashing && "animate-paper-flash ring-4 ring-navy-950"
      )}
    >
      {/* Paper fold top-right corner accent */}
      <div className="paper-fold-corner" />

      {/* Header bar */}
      <div className={clsx("px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2", cfg.headerBg)}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#9a8afb] text-black flex items-center justify-center shadow-md shrink-0 border border-[#9a8afb]">
            {AGENT_ICONS[agent.agentId]}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate font-mono">
              {AGENT_LABELS[agent.agentId]}
            </h4>
            <p className="text-[10px] font-mono text-[#c2bcd2] truncate font-medium">
              {AGENT_ROLES[agent.agentId]}
            </p>
          </div>
        </div>

        {/* Status Stamp */}
        <div
          className={clsx(
            "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider border shrink-0",
            cfg.badgeClass
          )}
        >
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {agent.status === "idle" ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-6 h-6 text-[#a49db5] mb-2 stroke-[1.5]" />
            <p className="text-xs text-[#a49db5] font-mono italic">
              Standing by for pipeline trigger...
            </p>
          </div>
        ) : (
          <>
            <div className="text-xs text-[#eaeaf0] font-medium leading-relaxed bg-black/30 p-3 rounded-xl border border-white/10 shadow-inner">
              <span className="font-bold text-[#a49db5] font-mono text-[10px] uppercase block mb-1 tracking-wider">
                DECISION SUMMARY:
              </span>
              <p className="line-clamp-4 text-[#eaeaf0] font-sans">{agent.summary}</p>
            </div>

            {agent.reasoning && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#c2bcd2] hover:text-white self-start transition-colors pt-0.5"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide reasoning dossier</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View reasoning dossier</span>
                  </>
                )}
              </button>
            )}

            {expanded && agent.reasoning && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-[11px] text-[#eaeaf0] font-mono leading-relaxed space-y-1 animate-fade-in shadow-inner">
                <span className="text-[10px] font-bold text-[#a49db5] uppercase block tracking-wider">
                  Swarm Rationale & Vector Context:
                </span>
                <p className="whitespace-pre-line text-[#eaeaf0]">{agent.reasoning}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Action Form */}
      <div className="px-4 pb-4 pt-1 border-t border-white/10 bg-black/20">
        {correctable && !isEditing && agent.status === "done" && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl",
              "text-xs font-mono font-bold text-black bg-[#9a8afb] border border-[#9a8afb]",
              "hover:brightness-110 shadow-sm transition-all active:scale-[0.98]"
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Override Decision</span>
          </button>
        )}

        {isEditing && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-1 animate-slide-up">
            <textarea
              autoFocus
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="Inject human correction into this agent..."
              rows={2}
              className={clsx(
                "w-full text-xs font-mono text-[#eaeaf0] bg-black/40 border border-white/10 rounded-xl",
                "px-3 py-2 resize-none placeholder:text-[#767676]",
                "focus:outline-none focus:ring-2 focus:ring-[#9a8afb] focus:border-[#9a8afb] shadow-inner"
              )}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!correction.trim()}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all shadow-md",
                  correction.trim()
                    ? "bg-[#9a8afb] text-black hover:brightness-110"
                    : "bg-black/40 text-[#767676] cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Propagate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setCorrection("");
                }}
                className="py-2 px-3 rounded-xl text-xs font-mono text-[#c2bcd2] hover:text-white border border-white/10 hover:bg-white/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
