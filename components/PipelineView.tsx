import React, { useState, useEffect, useRef } from "react";
import { SnapshotResponse, AgentRun } from "@/lib/orchestrator/types";
import AgentCard from "./AgentCard";

/* ── Adjacency data matching the hardcoded graph ── */
const EDGES: [string, string][] = [
  ["triage", "remediation"],
  ["remediation", "testImpact"],
  ["remediation", "deployRisk"],
  ["testImpact",  "deployRisk"],
];

type LogType = "info" | "human" | "rerun" | "static";
interface LogLine { ts: string; type: LogType; msg: string; }

export default function PipelineView() {
  const [runId,     setRunId]     = useState<string | null>(null);
  const [snapshot,  setSnapshot]  = useState<SnapshotResponse | null>(null);
  const [spawning,  setSpawning]  = useState(false);
  const [polling,   setPolling]   = useState(false);
  const [flashed,   setFlashed]   = useState<Record<string, boolean>>({});
  const [logs,      setLogs]      = useState<LogLine[]>([]);
  const [cascadeIds,setCascadeIds]= useState<string[]>([]);   // IDs being re-run right now

  const prevRef = useRef<Record<string, string>>({});
  const logRef  = useRef<HTMLDivElement>(null);

  /* Auto-scroll log panel */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (type: LogType, msg: string) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setLogs(prev => [...prev, { ts, type, msg }]);
  };

  /* ── Spawn ── */
  const spawn = async () => {
    setSpawning(true);
    setSnapshot(null);
    setLogs([]);
    setFlashed({});
    setCascadeIds([]);
    prevRef.current = {};
    addLog("info", "Swarm initialised — evaluating CVE-2024-3094 (xz-utils).");
    try {
      const res  = await fetch("/api/spawn", { method: "POST" });
      const data = await res.json();
      if (data.runId) setRunId(data.runId);
    } catch (e) {
      addLog("static", `Spawn error: ${e}`);
    } finally {
      setSpawning(false);
    }
  };

  /* ── Poll snapshot ── */
  useEffect(() => {
    if (!runId) return;
    setPolling(true);
    const tick = async () => {
      try {
        const res  = await fetch(`/api/snapshot?runId=${runId}`);
        if (!res.ok) return;
        const data = (await res.json()) as SnapshotResponse;
        setSnapshot(data);

        // Diff statuses → emit logs
        const prev = prevRef.current;
        data.agents.forEach(a => {
          const was = prev[a.agentId];
          if (was === a.status) return;
          if (a.status === "running")   addLog("info",   `${label(a.agentId)} Agent: reasoning started.`);
          if (a.status === "rerunning") addLog("rerun",  `${label(a.agentId)} Agent: re-running (upstream change).`);
          if (a.status === "stale")     addLog("rerun",  `${label(a.agentId)} Agent: marked stale — awaiting re-run.`);
          if (a.status === "done" && was && was !== "idle") {
            addLog("info", `${label(a.agentId)} decided: [${a.decision || "–"}] — ${a.summary?.slice(0, 80)}…`);
          }
          prev[a.agentId] = a.status;
        });

        const active = data.agents.some(a => a.status === "running" || a.status === "rerunning" || a.status === "idle");
        if (!active) {
          setPolling(false);
          setCascadeIds([]);
        }
      } catch { /* swallow */ }
    };

    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [runId]);

  /* ── Correct ── */
  const correct = async (agentId: string, correctionText: string) => {
    if (!runId) return;
    addLog("human", `Human overrode ${label(agentId)} → "${correctionText}"`);
    setFlashed(f => ({ ...f, [agentId]: true }));
    setTimeout(() => setFlashed(f => ({ ...f, [agentId]: false })), 900);

    const res  = await fetch("/api/propagate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, agentId, correctionText }),
    });
    const data = await res.json();
    const affected: string[] = data.downstreamAffected ?? [];
    setCascadeIds(affected);
    addLog("rerun", `Cascade: ${[agentId, ...affected].join(" → ")}`);

    // Log untouched agents
    if (snapshot) {
      snapshot.agents
        .filter(a => a.agentId !== agentId && !affected.includes(a.agentId))
        .forEach(a => addLog("static", `${label(a.agentId)} unaffected — untouched.`));
    }
    setPolling(true);
  };

  /* ── SVG edge class derivation ── */
  const edgeClass = (from: string, to: string) => {
    if (!snapshot) return "path-idle";
    const f = snapshot.agents.find(a => a.agentId === from);
    const t = snapshot.agents.find(a => a.agentId === to);
    if (!f || !t) return "path-idle";
    if (cascadeIds.includes(to)) return "path-cascade";
    if (f.status === "running" || t.status === "running" || f.status === "rerunning" || t.status === "rerunning") return "path-active";
    if (f.status === "done" && t.status === "done") return "path-done";
    return "path-idle";
  };

  const label = (id: string) =>
    ({ triage: "Triage", remediation: "Remediation", testImpact: "Test Impact", deployRisk: "Deploy Risk" }[id] ?? id);

  const logColor = (t: LogType) =>
    ({ info: "#888", human: "#0083ff", rerun: "#f59e0b", static: "#3a3a3a" }[t]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Top control bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", background: "#141414",
        border: "1px solid #222", borderRadius: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#e5e5e5", marginBottom: 4 }}>
            Murmur — DevSecOps Agent Swarm
          </div>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 300 }}>
            BFS-driven human correction propagation over hardcoded dependency topology.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Live indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", background: "#0d0d0d",
            border: "1px solid #222", borderRadius: 999,
            fontSize: 11, color: "#555",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: polling ? "#0083ff" : "#333",
              display: "inline-block",
              transition: "background 0.3s",
            }} />
            {polling ? "Processing" : "Idle"}
          </div>

          {/* Launch button */}
          <button
            onClick={spawn}
            disabled={spawning}
            style={{
              padding: "8px 20px",
              background: "#0083ff", border: "none",
              borderRadius: 8, color: "#fff",
              fontSize: 12, fontWeight: 500,
              cursor: spawning ? "wait" : "pointer",
              fontFamily: "DM Sans, sans-serif",
              opacity: spawning ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {spawning ? "Launching…" : runId ? "Re-launch Swarm" : "Launch Swarm →"}
          </button>
        </div>
      </div>

      {/* ── Main pipeline canvas ── */}
      <div style={{
        background: "#0a0a0a", border: "1px solid #1a1a1a",
        borderRadius: 16, padding: "40px 32px",
        position: "relative", minHeight: 280,
      }}>
        {!runId ? (
          /* Empty state */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: 200, gap: 12, color: "#333",
          }}>
            <div style={{ fontSize: 32 }}>◈</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#3a3a3a" }}>Pipeline standby</div>
            <div style={{ fontSize: 11, color: "#2a2a2a" }}>Press Launch Swarm to trigger the CVE-2024-3094 response chain.</div>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* SVG overlay for edges */}
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
              preserveAspectRatio="none"
            >
              <defs>
                {["blue","amber","green","dim"].map(name => (
                  <marker key={name} id={`arr-${name}`}
                    viewBox="0 0 8 8" refX="5" refY="4"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0 1 L7 4 L0 7 z" fill={
                      name === "blue" ? "#0083ff" : name === "amber" ? "#f59e0b" :
                      name === "green" ? "#22c55e" : "#222"
                    } />
                  </marker>
                ))}
              </defs>

              {/* 
                Card centres in a 4-col grid (25% each).
                Approximate centre-right / centre-left anchor points.
                viewBox is not used — we use % coords via foreignObject trick:
                We position edges at % of total width/height.
                Card cols: 0–25%, 25–50%, 50–75%, 75–100%.
                Each card centre-x: 12.5%, 37.5%, 62.5%, 87.5%.
                Arrow horizontal: from right edge of source col to left edge of target col.
              */}

              {/* Triage → Remediation (straight) */}
              {(() => {
                const cls = edgeClass("triage","remediation");
                const col = cls.includes("cascade") ? "amber" : cls.includes("done") ? "green" : cls.includes("active") ? "blue" : "dim";
                return <line x1="23%" y1="50%" x2="27%" y2="50%"
                  className={cls} strokeWidth={cls === "path-idle" ? 1 : 2}
                  markerEnd={`url(#arr-${col})`} />;
              })()}

              {/* Remediation → Test Impact (straight) */}
              {(() => {
                const cls = edgeClass("remediation","testImpact");
                const col = cls.includes("cascade") ? "amber" : cls.includes("done") ? "green" : cls.includes("active") ? "blue" : "dim";
                return <line x1="48%" y1="50%" x2="52%" y2="50%"
                  className={cls} strokeWidth={cls === "path-idle" ? 1 : 2}
                  markerEnd={`url(#arr-${col})`} />;
              })()}

              {/* Test Impact → Deploy Risk (straight) */}
              {(() => {
                const cls = edgeClass("testImpact","deployRisk");
                const col = cls.includes("cascade") ? "amber" : cls.includes("done") ? "green" : cls.includes("active") ? "blue" : "dim";
                return <line x1="73%" y1="50%" x2="77%" y2="50%"
                  className={cls} strokeWidth={cls === "path-idle" ? 1 : 2}
                  markerEnd={`url(#arr-${col})`} />;
              })()}

              {/* Remediation → Deploy Risk (arc over top) */}
              {(() => {
                const cls = edgeClass("remediation","deployRisk");
                const col = cls.includes("cascade") ? "amber" : cls.includes("done") ? "green" : cls.includes("active") ? "blue" : "dim";
                return <path d="M 37.5% 18% C 50% 2%, 76% 2%, 87.5% 18%"
                  className={cls} fill="none"
                  strokeWidth={cls === "path-idle" ? 1 : 2}
                  markerEnd={`url(#arr-${col})`} />;
              })()}
            </svg>

            {/* 4-column agent cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, position: "relative", zIndex: 1 }}>
              {["triage","remediation","testImpact","deployRisk"].map(id => {
                const agent = snapshot?.agents.find(a => a.agentId === id);
                if (!agent) {
                  /* Loading skeleton */
                  return (
                    <div key={id} style={{
                      background: "#141414", border: "1px solid #1c1c1c",
                      borderRadius: 12, padding: 20, minHeight: 180,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 11, color: "#333" }}>Loading…</span>
                    </div>
                  );
                }
                return (
                  <AgentCard
                    key={id}
                    agent={agent}
                    onCorrect={text => correct(id, text)}
                    isFlashed={!!flashed[id]}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom panel: CVE info + Event log ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>

        {/* CVE context */}
        <div style={{
          background: "#141414", border: "1px solid #222",
          borderRadius: 12, padding: "20px 24px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "2px 10px", borderRadius: 999,
            background: "rgba(239,68,68,0.08)", color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 10, fontWeight: 500, width: "fit-content",
          }}>
            ● CRITICAL
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#e0e0e0" }}>
            CVE-2024-3094
          </div>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7, fontWeight: 300 }}>
            Backdoor inside xz-utils 5.6.0 & 5.6.1. Subverts RSA key auth in OpenSSH sshd via liblzma. CVSS 10.0. Ecosystem: Debian APT.
          </div>
          {runId && (
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12, fontSize: 10, color: "#333", fontFamily: "monospace" }}>
              RUN: {runId.split("-")[0]}…
            </div>
          )}
        </div>

        {/* Event log */}
        <div style={{
          background: "#0a0a0a", border: "1px solid #1a1a1a",
          borderRadius: 12, padding: "20px 24px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#444", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Event Log
            </div>
            <div style={{
              padding: "2px 8px", borderRadius: 999,
              background: "#111", border: "1px solid #1e1e1e",
              fontSize: 10, color: "#333", fontFamily: "monospace",
            }}>
              {polling ? "LIVE" : "IDLE"}
            </div>
          </div>

          <div
            ref={logRef}
            className="log-terminal"
            style={{
              flex: 1, overflowY: "auto", maxHeight: 200,
              fontFamily: "monospace", fontSize: 11, lineHeight: 1.8,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#2a2a2a" }}>{">"} Awaiting swarm events…</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: "#2a2a2a", flexShrink: 0 }}>[{l.ts}]</span>
                  <span style={{ color: logColor(l.type) }}>{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
