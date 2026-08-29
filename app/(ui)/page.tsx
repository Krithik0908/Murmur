"use client";

import PipelineView from "@/components/PipelineView";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#ffffff", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Navigation ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid #1a1a1a",
        background: "#000000",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 32px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Left: wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{
              fontSize: 15, fontWeight: 500,
              color: "#ffffff", letterSpacing: "0.08em",
            }}>
              MURMUR
            </span>
            <span style={{
              width: 1, height: 14, background: "#222",
              display: "inline-block",
            }} />
            <span style={{
              fontSize: 11, color: "#444",
              fontWeight: 300, letterSpacing: "0.05em",
            }}>
              Swarm Console
            </span>
          </div>

          {/* Right: meta tag */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, color: "#333",
          }}>
            <span style={{
              padding: "3px 10px",
              border: "1px solid #1e1e1e",
              borderRadius: 999,
              background: "#0d0d0d",
              color: "#3a3a3a",
              fontSize: 10,
              letterSpacing: "0.06em",
            }}>
              BFS · Human-in-the-loop
            </span>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <PipelineView />

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #111",
        padding: "20px 32px",
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 11, color: "#2a2a2a",
      }}>
        <span>© 2026 Murmur</span>
        <span>BFS-based selective cascade propagation</span>
      </footer>
    </div>
  );
}
