"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Play, Check } from "lucide-react";
import clsx from "clsx";
import MurmurMark from "@/components/MurmurMark";
import Hero from "@/components/ui/animated-shader-hero";

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Console", href: "/console" },
  { label: "Docs", href: "#docs" },
];

const PIPELINE = [
  { id: "triage", label: "Triage", status: "Done", done: true, cascade: false },
  { id: "remediation", label: "Remediation", status: "Re-running", done: false, cascade: true },
  { id: "testImpact", label: "Test-Impact", status: "Stale", done: false, cascade: true },
  { id: "deployRisk", label: "Deploy-Risk", status: "Stale", done: false, cascade: true },
];

const STEPS = [
  {
    n: "01",
    heading: "Swarm runs the job",
    desc: "Four agents execute sequentially on a real CVE so every decision has a visible upstream source.",
  },
  {
    n: "02",
    heading: "Human corrects one agent",
    desc: "A security engineer overrides a mid-flight decision instead of restarting the whole pipeline.",
  },
  {
    n: "03",
    heading: "BFS traces dependents",
    desc: "Murmur uses a deterministic graph walk to find exactly which downstream agents relied on the changed decision.",
  },
  {
    n: "04",
    heading: "Only affected agents re-run",
    desc: "Upstream work stays intact while only the impacted branch replays with fresh context.",
  },
];

const PARTNERS = [
  { name: "Groq", detail: "Llama 3.3 70B" },
  { name: "MongoDB Atlas", detail: "Hybrid DB Layer" },
  { name: "Next.js", detail: "App Router" },
];

/* ═══════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════ */
function StatusBadge({ status, done, cascade }: { status: string; done: boolean; cascade: boolean }) {
  const base = "inline-flex items-center gap-1 px-[10px] py-[2px] text-[12px] font-semibold leading-tight border";
  const cls = done
    ? "bg-[#0083ff]/15 text-[#0083ff] border-[#0083ff]/30"
    : cascade
    ? "bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30"
    : "bg-[#141414] text-[#767676] border-[#222222]";
  return (
    <span className={clsx(base, cls, cascade && !done && "animate-pulse")}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   PIPELINE CARD (hero visual section)
   ═══════════════════════════════════════════════════ */
function PipelineCard({ card, isLast }: { card: typeof PIPELINE[number]; isLast: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <article className="flex min-h-[160px] min-w-0 flex-1 flex-col bg-[#141414] border border-[#222222] p-[24px]">
        <h3 className="text-[14px] font-semibold text-white">{card.label}</h3>
        <StatusBadge status={card.status} done={card.done} cascade={card.cascade} />
        <p className="mt-auto pt-[12px] text-[12px] leading-snug text-white/60">
          {card.done
            ? "CRITICAL — apply vendor patch v2.1, maintains ABI compat."
            : card.cascade
            ? "Stale — waiting for upstream correction to propagate."
            : "Waiting to run."}
        </p>
      </article>

      {!isLast && (
        <div className="relative mx-[8px] flex h-[2px] w-[32px] shrink-0 items-center" aria-hidden="true">
          <div className={clsx("h-[2px] w-full", card.done ? "bg-[#0083ff]" : "bg-[#222222]")} />
          <span
            className={clsx(
              "absolute right-[-1px] top-1/2 -translate-y-1/2 h-[8px] w-[8px] rotate-45",
              "border-t-[2px] border-r-[2px]",
              card.done ? "border-[#0083ff]" : "border-[#222222]"
            )}
          />
          {card.done && (
            <span className="absolute left-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-[#0083ff] shadow-[0_0_6px_2px_#0083ff80]" />
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FEATURE SECTION — alternating panels
   ═══════════════════════════════════════════════════ */
function FeatureSection({
  reverse,
  points,
  heading,
  paragraph,
  visual,
}: {
  reverse: boolean;
  points: string[];
  heading: string;
  paragraph: string;
  visual: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-[54px] lg:gap-[72px]",
        reverse ? "lg:flex-row-reverse" : "lg:flex-row"
      )}
    >
      <div className="flex flex-1 flex-col" style={{ maxWidth: 480 }}>
        <ul className="flex flex-col gap-[10px]">
          {points.map((pt) => (
            <li key={pt} className="flex items-center gap-[10px]">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#0083ff]/20">
                <Check className="h-[10px] w-[10px] text-[#0083ff]" strokeWidth={3} />
              </span>
              <span className="text-[14px] text-white/60">{pt}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-[30px] text-[32px] font-bold leading-tight text-white lg:text-[38px]">
          {heading}
        </h3>
        <p className="mt-[20px] text-[15px] leading-relaxed text-white/70">{paragraph}</p>
        <Link
          href="/console"
          className="mt-[30px] inline-flex items-center gap-[8px] text-[14px] font-semibold text-[#0083ff] transition-opacity hover:opacity-70"
        >
          Explore
          <ArrowRight className="h-[14px] w-[14px]" />
        </Link>
      </div>
      <div className="w-full flex-1 lg:max-w-[520px]">
        <div className="w-full border border-[#222222] bg-[#141414]" style={{ minHeight: 280 }}>
          {visual}
        </div>
      </div>
    </div>
  );
}

/* ─── Visual: Dependency Graph ──────────────────────── */
function VisualGraph() {
  const nodes = [
    { id: "triage", label: "Triage", x: 50, y: 60 },
    { id: "remediation", label: "Remediation", x: 200, y: 60 },
    { id: "testImpact", label: "Test-Impact", x: 350, y: 60 },
    { id: "deployRisk", label: "Deploy-Risk", x: 200, y: 160 },
  ];
  const edges = [
    { x1: 50, y1: 60, x2: 200, y2: 60 },
    { x1: 200, y1: 60, x2: 350, y2: 60 },
    { x1: 200, y1: 60, x2: 200, y2: 160 },
  ];
  return (
    <div className="flex h-full w-full items-center justify-center p-[40px]">
      <svg viewBox="0 0 420 220" className="w-full" style={{ maxHeight: 200 }}>
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#0083ff"
            strokeWidth="1.5"
            strokeOpacity={0.4}
            strokeDasharray="4 3"
          />
        ))}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x - 52}
              y={n.y - 16}
              width={104}
              height={32}
              fill="rgba(0,131,255,0.08)"
              stroke="rgba(0,131,255,0.35)"
              strokeWidth={1}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fill="#eaeaf0"
              fontSize={11}
              fontWeight={600}
              fontFamily="Inter, sans-serif"
            >
              {n.label}
            </text>
          </g>
        ))}
        <text x={210} y={215} textAnchor="middle" fill="#767676" fontSize={10} fontFamily="Inter, sans-serif">
          BFS traversal — deterministic, no model call
        </text>
      </svg>
    </div>
  );
}

/* ─── Visual: Cascade before/after ───────────────────── */
function VisualCascade() {
  const unchanged = [{ label: "Triage", color: "#22c55e", status: "Done" }];
  const cascading = [
    { label: "Remediation", color: "#eab308", status: "Re-running" },
    { label: "Test-Impact", color: "#eab308", status: "Stale" },
    { label: "Deploy-Risk", color: "#eab308", status: "Stale" },
  ];
  const rowCls = "flex items-center justify-between border border-[#222222] px-[16px] py-[10px] bg-[#0a0a0a]";
  return (
    <div className="flex flex-col gap-[20px] p-[32px]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
        After correction to Triage
      </p>
      <div className="grid grid-cols-2 gap-[16px]">
        <div className="flex flex-col gap-[8px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#22c55e]">Preserved</p>
          {unchanged.map((r) => (
            <div key={r.label} className={clsx(rowCls, "border-[#22c55e]/30")}>
              <span className="text-[13px] text-white">{r.label}</span>
              <span className="text-[11px] font-semibold text-[#22c55e]">{r.status}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[8px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#eab308]">Re-running</p>
          {cascading.map((r) => (
            <div key={r.label} className={clsx(rowCls, "border-[#eab308]/30 animate-pulse")}>
              <span className="text-[13px] text-white">{r.label}</span>
              <span className="text-[11px] font-semibold text-[#eab308]">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-white/40">Triage's verified output is kept — no wasted compute</p>
    </div>
  );
}

/* ─── Visual: Correction Input ────────────────────────── */
function VisualCorrection() {
  return (
    <div className="flex flex-col gap-[16px] p-[32px]">
      <div className="border border-[#0083ff]/25 bg-[#0083ff]/5 p-[20px]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#0083ff]">Human intervention</p>
        <div className="mt-[12px] flex flex-col gap-[10px]">
          <div className="bg-[#0a0a0a] border border-[#222222] px-[14px] py-[10px]">
            <p className="text-[10px] text-white/40">Target agent</p>
            <p className="text-[13px] font-semibold text-white">Triage</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#0083ff]/20 px-[14px] py-[10px]">
            <p className="text-[12px] text-white/70">Use vendor patch v2.1 — maintains ABI compat…</p>
          </div>
          <div className="flex justify-end">
            <div className="bg-[#0083ff] px-[16px] py-[6px] text-[12px] font-semibold text-white">
              Submit correction →
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-[6px]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Audit trail</p>
        {[
          { agent: "Triage", time: "14:22:01", text: "Use vendor patch v2.1" },
          { agent: "Remediation", time: "14:25:48", text: "Applied via distro pkg" },
        ].map((e) => (
          <div key={e.agent} className="flex items-center gap-[10px] bg-[#0a0a0a] border border-[#222222] px-[12px] py-[8px]">
            <span className="shrink-0 bg-[#0083ff]/20 px-[6px] py-[2px] text-[9px] font-bold text-[#0083ff]">
              {e.agent}
            </span>
            <span className="flex-1 text-[11px] text-white/70">{e.text}</span>
            <span className="shrink-0 text-[10px] text-white/30">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div id="home" className="min-h-screen bg-[#000000] text-white">

      {/* ─── NAV ───────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 bg-[#000000] border-b border-[#222222]"
        style={{ height: 72 }}
      >
        <div className="mx-auto flex w-full items-center justify-between px-[30px] lg:px-[72px]" style={{ maxWidth: 1280, height: 72 }}>
          <a href="#home" aria-label="Murmur home" className="shrink-0 flex items-center">
            <MurmurMark size={32} />
          </a>

          <nav className="hidden items-center gap-[44px] md:flex" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={clsx(
                  "text-[15px] font-medium text-white/60 transition-colors hover:text-white",
                  link.label === "Home" && "border border-white/20 px-[16px] py-[6px]"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            href="/console"
            className="hidden items-center bg-[#0083ff] px-[24px] font-semibold text-white transition-opacity hover:opacity-80 md:inline-flex"
            style={{ height: 44, fontSize: 15 }}
          >
            Open Console
          </Link>

          <button
            type="button"
            className="flex h-[44px] w-[44px] items-center justify-center border border-white/10 text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-[20px] w-[20px]" /> : <Menu className="h-[20px] w-[20px]" />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-[2px] border-t border-white/10 bg-[#000000] px-[30px] pb-[30px] pt-[20px] md:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block py-[10px] text-[16px] font-medium text-white/60 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/console"
              className="mt-[20px] block bg-[#0083ff] px-[24px] py-[12px] text-center text-[15px] font-semibold text-white"
            >
              Open Console
            </Link>
          </div>
        )}
      </header>

      {/* ─── HERO — full-viewport WebGL shader ──────────── */}
      <Hero
        trustBadge={{
          text: "Dependency-aware correction cascading",
          icons: ["✦"]
        }}
        headline={{
          line1: "Corrections propagate.",
          line2: "Not restarts."
        }}
        subtitle="When a human overrides one agent mid-flight, Murmur traces the decision dependency graph and re-runs only the agents that depend on it — leaving everything else intact."
        buttons={{
          primary: {
            text: "Open Swarm Console",
            onClick: () => { window.location.href = "/console"; },
          },
          secondary: {
            text: "How it works ↓",
            onClick: () => {
              document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
            },
          },
        }}
      />

      {/* ─── PIPELINE PREVIEW ───────────────────────── */}
      <section
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingTop: 0, paddingBottom: 100 }}
        aria-label="Pipeline preview"
      >
        <div className="w-full border border-[#222222] bg-[#141414]" style={{ padding: 54 }}>
          <p className="mb-[30px] text-[12px] font-semibold uppercase tracking-widest text-white/40">
            Live pipeline · CVE-2024-3094 · After correction to Triage
          </p>
          <div className="flex w-full items-stretch gap-0">
            {PIPELINE.map((card, i) => (
              <PipelineCard key={card.id} card={card} isLast={i === PIPELINE.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURE SECTIONS ───────────────────────── */}
      <section
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingTop: 162, paddingBottom: 162 }}
        id="product"
      >
        <FeatureSection
          reverse={false}
          points={[
            "Hardcoded dependency graph",
            "Plain BFS traversal",
            "No LLM call to decide who's affected",
          ]}
          heading="Deterministic, not guessed"
          paragraph="Every dependency is known ahead of time. When a correction lands, a plain graph traversal — not another model call — decides exactly who's affected."
          visual={<VisualGraph />}
        />
      </section>

      <div className="mx-auto w-full px-[30px] lg:px-[72px]" style={{ maxWidth: 1280 }}>
        <div style={{ height: 1, background: "#222222" }} />
      </div>

      <section
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingTop: 162, paddingBottom: 162 }}
      >
        <FeatureSection
          reverse={true}
          points={[
            "Only downstream agents re-run",
            "Upstream work stays valid",
            "No wasted compute",
          ]}
          heading="Selective cascade, not restart"
          paragraph="Correcting one agent doesn't blow away the whole run. Only the agents that actually depended on the change redo their work — everything else holds."
          visual={<VisualCascade />}
        />
      </section>

      <div className="mx-auto w-full px-[30px] lg:px-[72px]" style={{ maxWidth: 1280 }}>
        <div style={{ height: 1, background: "#222222" }} />
      </div>

      <section
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingTop: 162, paddingBottom: 162 }}
      >
        <FeatureSection
          reverse={false}
          points={[
            "Correct any agent mid-flight",
            "Full audit trail",
            "Every override logged",
          ]}
          heading="Human stays in control"
          paragraph="Full autonomy isn't trusted yet, and it shouldn't be. Every correction is a deliberate human action, and every override is recorded."
          visual={<VisualCorrection />}
        />
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────── */}
      <section
        id="how-it-works"
        className="mx-auto w-full scroll-mt-[80px] px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingTop: 162, paddingBottom: 162 }}
      >
        <h2 className="font-bold text-white" style={{ fontSize: 40, marginBottom: 72 }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-[44px] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col">
              <span className="font-bold text-[#0083ff]" style={{ fontSize: 48, lineHeight: 1 }}>
                {step.n}
              </span>
              <h3 className="font-semibold text-white" style={{ fontSize: 18, marginTop: 20, lineHeight: 1.3 }}>
                {step.heading}
              </h3>
              <p className="text-white/50" style={{ fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA BAND ────────────────────────────────── */}
      <section
        id="docs"
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingBottom: 100 }}
        aria-label="Open swarm console"
      >
        <div
          className="flex flex-col items-start justify-between gap-[30px] border border-[#222222] bg-[#141414] sm:flex-row sm:items-center"
          style={{ padding: 54 }}
        >
          <div>
            <h2 className="font-bold text-white" style={{ fontSize: 28 }}>
              Open the live swarm console
            </h2>
            <p className="mt-[10px] text-[14px] text-white/50">
              Run CVE-2024-3094, submit a correction, watch the cascade propagate in real time.
            </p>
          </div>
          <Link
            href="/console"
            className="inline-flex shrink-0 items-center gap-[10px] bg-[#0083ff] px-[28px] font-semibold text-white transition-opacity hover:opacity-80"
            style={{ height: 54, fontSize: 16 }}
          >
            Open Console
            <ArrowRight className="h-[16px] w-[16px]" />
          </Link>
        </div>
      </section>

      {/* ─── POWERED BY ──────────────────────────────── */}
      <section
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{ maxWidth: 1280, paddingBottom: 100 }}
        aria-label="Powered by"
      >
        <p className="font-medium uppercase tracking-widest text-white/40" style={{ fontSize: 12, marginBottom: 30 }}>
          Powered by
        </p>
        <div className="grid grid-cols-3 gap-[44px] sm:grid-cols-3">
          {PARTNERS.map((p) => (
            <div key={p.name}>
              <p className="text-[16px] font-semibold text-white">{p.name}</p>
              <p className="mt-[4px] text-[13px] text-white/40">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────── */}
      <footer
        className="mx-auto w-full px-[30px] lg:px-[72px]"
        style={{
          maxWidth: 1280,
          borderTop: "1px solid #222222",
          paddingTop: 44,
          paddingBottom: 44,
        }}
      >
        <div className="flex flex-col items-start justify-between gap-[24px] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-[30px]">
            <a href="#home" aria-label="Murmur home">
              <MurmurMark size={24} />
            </a>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] text-white/40 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-[12px] text-white/30">Built for Track 02 — Tenori Stateless Hackathon</p>
        </div>
      </footer>
    </div>
  );
}