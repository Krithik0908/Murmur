"use client";

import { useState } from "react";
import { AgentId } from "@/lib/types";
import { Zap, ShieldAlert, Wrench, Send, Sparkles, FilePenLine } from "lucide-react";
import clsx from "clsx";

interface CorrectionInputProps {
  onInjectPreset: (beat: 1 | 2) => void;
  onCustomCorrection: (agentId: AgentId, text: string) => void;
  disabled?: boolean;
}

export default function CorrectionInput({
  onInjectPreset,
  onCustomCorrection,
  disabled = false,
}: CorrectionInputProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("triage");
  const [customText, setCustomText] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || disabled) return;
    onCustomCorrection(selectedAgent, customText.trim());
    setCustomText("");
  };

  return (
    <div className="paper-card-navy rounded-2xl p-5 border border-navy-700/80 shadow-paper-lg">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-navy-700/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-white text-navy-950 shadow-sm">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              Live Human Intervention & Cascade Beats
            </h3>
          </div>
          <p className="text-xs text-navy-200 mt-1.5 leading-relaxed font-sans max-w-2xl">
            Simulate security engineer corrections mid-flight to prove selective BFS graph propagation across the swarm.
          </p>
        </div>

        {/* Preset Beat Triggers */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onInjectPreset(1)}
            disabled={disabled}
            className={clsx(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md",
              "bg-white text-navy-950 hover:bg-navy-50 hover:scale-[1.02] active:scale-[0.98] border border-white",
              disabled && "opacity-40 cursor-not-allowed hover:scale-100"
            )}
            title="Corrects Triage early -> triggers wide cascade across Remediation, Test-Impact & Deploy-Risk"
          >
            <ShieldAlert className="w-4 h-4 text-navy-900" />
            <span>Beat 1: Override Triage (Wide Cascade)</span>
          </button>

          <button
            type="button"
            onClick={() => onInjectPreset(2)}
            disabled={disabled}
            className={clsx(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md",
              "bg-navy-800 text-white hover:bg-navy-700 hover:scale-[1.02] active:scale-[0.98] border border-navy-400/60",
              disabled && "opacity-40 cursor-not-allowed hover:scale-100"
            )}
            title="Corrects Remediation -> only Test-Impact and Deploy-Risk re-run; Triage remains untouched"
          >
            <Wrench className="w-4 h-4 text-white" />
            <span>Beat 2: Override Remediation (Selective)</span>
          </button>
        </div>
      </div>

      {/* Manual Input Dispatch */}
      <form onSubmit={handleCustomSubmit} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentId)}
            disabled={disabled}
            className="w-full bg-navy-950 text-white border border-navy-600 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value="triage">Target: Triage Agent</option>
            <option value="remediation">Target: Remediation Agent</option>
            <option value="testImpact">Target: Test-Impact Agent</option>
            <option value="deployRisk">Target: Deploy-Risk Agent</option>
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-navy-400">
            <FilePenLine className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={disabled}
            placeholder="Type custom human guidance (e.g. 'Use vendor patch v2.1 instead of version pin')..."
            className="w-full bg-navy-950 text-white border border-navy-600 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !customText.trim()}
          className={clsx(
            "w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md shrink-0",
            customText.trim() && !disabled
              ? "bg-white text-navy-950 hover:bg-navy-50 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-navy-800 text-navy-400 border border-navy-700 cursor-not-allowed"
          )}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Propagate Live</span>
        </button>
      </form>
    </div>
  );
}
