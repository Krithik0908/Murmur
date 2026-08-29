import React, { useState, useEffect } from "react";
import { AgentRun } from "@/lib/orchestrator/types";

const AGENT_META: Record<string, { label: string; icon: string }> = {
  triage:      { label: "Triage",       icon: "⬡" },
  remediation: { label: "Remediation",  icon: "⬡" },
  testImpact:  { label: "Test Impact",  icon: "⬡" },
  deployRisk:  { label: "Deploy Risk",  icon: "⬡" },
};

interface AgentCardProps {
  agent: AgentRun;
  onCorrect: (text: string) => void;
  isFlashed: boolean;
}

export default function AgentCard({ agent, onCorrect, isFlashed }: AgentCardProps) {
  const [correcting, setCorrecting] = useState(false);
  const [input, setInput]           = useState("");
  const [busy, setBusy]             = useState(false);

  // Close override box if card goes stale/re-running after a correction
  useEffect(() => {
    if (agent.status !== "done") setCorrecting(false);
  }, [agent.status]);

  const meta = AGENT_META[agent.agentId] ?? { label: agent.agentId, icon: "⬡" };

  /* Status badge */
  const badge = () => {
    switch (agent.status) {
      case "done":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: "rgba(34,197,94,0.08)", color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.2)",
            fontSize: 11, fontWeight: 500, letterSpacing: "0.03em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Done
          </span>
        );
      case "running":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: "rgba(0,131,255,0.08)", color: "#0083ff",
            border: "1px solid rgba(0,131,255,0.25)",
            fontSize: 11, fontWeight: 500,
          }}>
            <span className="dot-pulse" style={{ background: "#0083ff" }} />
            Running
          </span>
        );
      case "rerunning":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: "rgba(245,158,11,0.08)", color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.25)",
            fontSize: 11, fontWeight: 500,
          }}>
            <span className="dot-pulse" style={{ background: "#f59e0b" }} />
            Re-running
          </span>
        );
      case "stale":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: "rgba(245,158,11,0.06)", color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.15)",
            fontSize: 11, fontWeight: 400,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block", opacity: 0.7 }} />
            Stale
          </span>
        );
      default:
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: "#1a1a1a", color: "#555",
            border: "1px solid #222",
            fontSize: 11, fontWeight: 400,
          }}>
            Idle
          </span>
        );
    }
  };

  /* Decision chip */
  const decisionChip = () => {
    if (!agent.decision) return null;
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 8px", borderRadius: 8,
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        color: "#aaa", fontSize: 10, fontFamily: "monospace",
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginTop: 8,
      }}>
        {agent.decision}
      </span>
    );
  };

  const cardBorder = (() => {
    if (agent.status === "running" || agent.status === "rerunning") return "#0083ff";
    if (agent.status === "stale") return "#f59e0b";
    if (agent.status === "done") return "#282828";
    return "#1c1c1c";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    try {
      await onCorrect(input.trim());
      setInput("");
      setCorrecting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id={`card-${agent.agentId}`}
      className={isFlashed ? "card-flashed" : ""}
      style={{
        background: "#141414",
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 180,
        transition: "border-color 0.4s ease",
        boxShadow: agent.status === "running" ? "0 0 20px rgba(0,131,255,0.06)" :
                   agent.status === "rerunning" ? "0 0 20px rgba(245,158,11,0.06)" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: "#1f1f1f", border: "1px solid #2a2a2a",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0083ff", fontSize: 13,
          }}>
            {meta.icon}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#e5e5e5" }}>
            {meta.label}
          </span>
        </div>
        {badge()}
      </div>

      {/* Summary body */}
      <div style={{ flex: 1 }}>
        {agent.summary ? (
          <p style={{ fontSize: 12, color: "#999", lineHeight: 1.6, fontWeight: 300 }}>
            {agent.summary}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "#444", fontStyle: "italic", fontWeight: 300 }}>
            {agent.status === "idle" ? "Awaiting pipeline trigger." : "Agent reasoning in progress…"}
          </p>
        )}
        {decisionChip()}
      </div>

      {/* Correct button / override form */}
      {agent.status === "done" && (
        <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 12, marginTop: "auto" }}>
          {!correcting ? (
            <button
              onClick={() => setCorrecting(true)}
              style={{
                width: "100%", padding: "7px 0",
                background: "transparent", border: "1px solid #282828",
                borderRadius: 8, color: "#666", fontSize: 11,
                fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "DM Sans, sans-serif",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#0083ff";
                (e.currentTarget as HTMLButtonElement).style.color = "#0083ff";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#282828";
                (e.currentTarget as HTMLButtonElement).style.color = "#666";
              }}
            >
              + Correct Decision
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6 }}>
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Override instruction…"
                disabled={busy}
                style={{
                  flex: 1, padding: "7px 10px",
                  background: "#0d0d0d", border: "1px solid #333",
                  borderRadius: 8, color: "#fff", fontSize: 11,
                  fontFamily: "monospace", outline: "none",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#0083ff")}
                onBlur={e => (e.currentTarget.style.borderColor = "#333")}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                style={{
                  padding: "7px 14px",
                  background: busy ? "#0066cc" : "#0083ff",
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 11, fontWeight: 500,
                  cursor: busy ? "wait" : "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  opacity: !input.trim() ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {busy ? "…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={() => setCorrecting(false)}
                style={{
                  padding: "7px 10px", background: "transparent",
                  border: "1px solid #222", borderRadius: 8,
                  color: "#555", fontSize: 11, cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Esc
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
