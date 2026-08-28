"use client";

import { useEffect, useRef } from "react";
import { LogEntry } from "@/lib/types";
import {
  Terminal,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Info,
  Shield,
  FileCode,
} from "lucide-react";
import clsx from "clsx";

interface EventLogProps {
  logs: LogEntry[];
  onClear?: () => void;
}

const AGENT_STAMPS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  triage: { label: "Triage", bg: "bg-white", text: "text-navy-950 font-bold", border: "border-white" },
  remediation: { label: "Remediation", bg: "bg-navy-800", text: "text-white font-bold", border: "border-navy-400" },
  testImpact: { label: "Test-Impact", bg: "bg-navy-700", text: "text-white font-bold", border: "border-navy-300" },
  deployRisk: { label: "Deploy-Risk", bg: "bg-navy-900", text: "text-white font-bold", border: "border-white" },
};

export default function EventLog({ logs, onClear }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function getLogIcon(type: LogEntry["type"]) {
    switch (type) {
      case "correction":
        return <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />;
      case "rerun":
        return <RefreshCw className="w-3.5 h-3.5 text-navy-200 animate-spin shrink-0" />;
      case "decision":
        return <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />;
      case "untouched":
        return <Shield className="w-3.5 h-3.5 text-navy-300 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-navy-200 shrink-0" />;
    }
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div className="paper-card-navy flex flex-col h-full rounded-2xl border border-navy-700/80 overflow-hidden shadow-paper-lg">
      {/* Log Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-navy-700/80 bg-navy-900/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-white" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Swarm Event Log & Cascade Stream
          </h3>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-white text-navy-950 font-bold rounded-full shadow-sm">
            {logs.length} entries
          </span>
        </div>
        {onClear && logs.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-mono text-navy-300 hover:text-white transition-colors"
          >
            Clear log
          </button>
        )}
      </div>

      {/* Log Entries */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2 font-mono text-xs max-h-[300px] min-h-[200px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-36 text-navy-400 font-mono italic text-[11px]">
            No activity recorded yet. Click "Spawn Swarm Pipeline" to trigger agent dispatch.
          </div>
        ) : (
          logs.map((entry) => {
            const stamp = entry.agentId ? AGENT_STAMPS[entry.agentId] : null;
            const isCorrection = entry.type === "correction";
            const isRerun = entry.type === "rerun";
            const isUntouched = entry.type === "untouched";

            return (
              <div
                key={entry.id}
                className={clsx(
                  "group flex items-start gap-2.5 p-2.5 rounded-lg border transition-all",
                  isCorrection && "bg-white text-navy-950 border-white shadow-md font-medium",
                  isRerun && "bg-navy-800/90 border-dashed border-navy-400 text-white",
                  isUntouched && "bg-navy-950/70 border-navy-700 text-navy-300",
                  !isCorrection && !isRerun && !isUntouched && "bg-navy-900/70 border-navy-800 text-white hover:border-navy-600"
                )}
              >
                <span className={clsx("text-[10px] font-mono shrink-0 pt-0.5", isCorrection ? "text-navy-700" : "text-navy-400")}>
                  {formatTime(entry.timestamp)}
                </span>
                <div className="pt-0.5">{getLogIcon(entry.type)}</div>
                {stamp && (
                  <span
                    className={clsx(
                      "px-1.5 py-0.2 rounded border text-[10px] uppercase font-mono tracking-wider shrink-0 shadow-sm",
                      isCorrection ? "bg-navy-950 text-white border-navy-950" : `${stamp.bg} ${stamp.text} ${stamp.border}`
                    )}
                  >
                    {stamp.label}
                  </span>
                )}
                <span className="flex-1 break-words leading-relaxed">{entry.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
