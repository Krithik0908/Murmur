import React from "react";
import { CorrectionEntry } from "@/lib/orchestrator/types";
import { History, ArrowRight } from "lucide-react";

interface EventLogProps {
  corrections: CorrectionEntry[];
}

export default function EventLog({ corrections }: EventLogProps) {
  return (
    <div className="flex flex-col w-full h-full bg-slate-950/40 border border-slate-900 rounded-xl p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-3">
        <History className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Correction Audit Trail
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-4">
        {corrections.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-500 italic text-center py-6">
            No overrides injected yet. Correct any completed agent to trigger a selective BFS re-run cascade.
          </div>
        ) : (
          corrections.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 p-3.5 bg-slate-900/30 border border-slate-900 rounded-lg text-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-blue-400 uppercase font-semibold">
                  {item.agentId} override
                </span>
              </div>

              {/* Text */}
              <div className="text-slate-300 font-medium">
                &ldquo;{item.correctionText}&rdquo;
              </div>

              {/* Cascade Output */}
              <div className="flex flex-col gap-1 border-t border-slate-900/60 pt-2 text-[10px] text-slate-400 font-mono">
                <span className="text-slate-500 font-semibold uppercase">
                  Downstream Cascade:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {item.agentId}
                  </span>
                  {item.downstreamAffected.map((node, nIdx) => (
                    <React.Fragment key={nIdx}>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {node}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
