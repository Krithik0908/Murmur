"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { LogEntry } from "@/lib/types";

/* ─── Types ────────────────────────────────────────────── */

interface EventLogProps {
  logs:    LogEntry[];
  onClear?: () => void;
}

/* ─── Static maps ──────────────────────────────────────── */

const AGENT_LABELS: Record<string, string> = {
  triage:      "Triage",
  remediation: "Remediation",
  testImpact:  "Test-Impact",
  deployRisk:  "Deploy-Risk",
};

const TYPE_COLOR: Record<LogEntry["type"], string> = {
  system:     "text-white/40",
  decision:   "text-[#0083ff]",
  correction: "text-[#eab308]",
  rerun:      "text-[#0083ff]",
  untouched:  "text-[#22c55e]",
};

const TYPE_PILL: Record<LogEntry["type"], string> = {
  system:     "bg-[#0a0a0a] text-white/40 border border-[#222222]",
  decision:   "bg-[#0083ff]/15 text-[#0083ff] border border-[#0083ff]/30",
  correction: "bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30",
  rerun:      "bg-[#0083ff]/15 text-[#0083ff] border border-[#0083ff]/30",
  untouched:  "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30",
};

/* ─── Helpers ──────────────────────────────────────────── */

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour12:  false,
    hour:    "2-digit",
    minute:  "2-digit",
    second:  "2-digit",
  });
}

/* ─── Single log row ───────────────────────────────────── */

function LogRow({
  entry,
  index,
}: {
  entry: LogEntry;
  index: number;
}) {
  return (
    <li
      className="log-row grid grid-cols-[80px_1fr] gap-x-[16px] gap-y-[2px] border-b border-[#222222] px-[2px] py-[8px] text-[12px] leading-snug transition-colors hover:bg-[#0a0a0a] sm:grid-cols-[80px_auto_1fr]"
      style={{ animationDelay: `${Math.min(index * 15, 150)}ms` }}
    >
      {/* Timestamp */}
      <span
        className="shrink-0 font-mono text-white/30"
        suppressHydrationWarning
      >
        {formatTime(entry.timestamp)}
      </span>

      {/* Type pill */}
      <span
        className={clsx(
          "hidden sm:inline-flex shrink-0 items-center px-[8px] py-[2px] font-semibold uppercase tracking-wider",
          TYPE_PILL[entry.type]
        )}
        style={{ fontSize: 10 }}
      >
        {entry.type}
      </span>

      {/* Message */}
      <span className={clsx("col-span-1 sm:col-span-1", TYPE_COLOR[entry.type])}>
        {entry.agentId ? (
          <strong className="font-semibold">
            [{AGENT_LABELS[entry.agentId] ?? entry.agentId}]&nbsp;
          </strong>
        ) : null}
        <span className="text-white/70 font-normal">{entry.message}</span>
      </span>
    </li>
  );
}

/* ─── Component ────────────────────────────────────────── */

export default function EventLog({ logs, onClear }: EventLogProps) {
  const bottomRef   = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setCount(logs.length);
  }, [logs]);

  return (
    <section
      className="border border-[#222222] bg-[#141414] p-[24px]"
      aria-label="Event log"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[16px]">
          <h2 className="text-[16px] font-semibold text-white">Event log</h2>
          {count > 0 ? (
            <span className="border border-[#0083ff]/30 bg-[#0083ff]/15 px-[12px] py-[2px] text-[12px] font-semibold text-[#0083ff]">
              {count}
            </span>
          ) : null}
        </div>
        {onClear && logs.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[13px] text-white/40 transition-colors hover:text-white"
            aria-label="Clear event log"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Entries */}
      <div
        className={clsx(
          "mt-[16px] overflow-y-auto",
          logs.length > 0 ? "max-h-[220px]" : ""
        )}
      >
        {logs.length === 0 ? (
          <p className="text-[13px] text-white/40">No events yet.</p>
        ) : (
          <ol className="flex flex-col">
            {logs.map((entry, i) => (
              <LogRow key={entry.id} entry={entry} index={i} />
            ))}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}