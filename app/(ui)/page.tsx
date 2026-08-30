"use client";

import { useState, useEffect, useRef } from "react";
import {
  AgentId,
  AgentRun,
  AgentStatus,
  LogEntry,
  Correction,
  PipelineState,
} from "@/lib/types";
import {
  DEPENDENCY_GRAPH,
  transitiveDownstream,
  MOCK_DECISIONS,
  CORRECTED_TRIAGE,
  CORRECTED_REMEDIATION,
  makeIdleState,
  log,
} from "@/lib/mock";
import PipelineView from "@/components/PipelineView";
import EventLog from "@/components/EventLog";
import CorrectionInput from "@/components/CorrectionInput";
import ResponsiveHeroBanner from "@/components/ui/responsive-hero-banner";
import {
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Activity,
  GitFork,
  Sparkles,
  Layers,
  Radio,
  ArrowRight,
  Monitor,
  Terminal as TermIcon,
} from "lucide-react";
import clsx from "clsx";

const LANDING_NAV_LINKS = [
  { label: "Home", href: "#home", active: true },
  { label: "How it works", href: "#how-it-works" },
  { label: "Console", href: "#console" },
  { label: "Docs", href: "#docs" },
];

const LANDING_PARTNERS = [
  { name: "Groq", detail: "Llama 3.3 70B" },
  { name: "MongoDB Atlas", detail: "Hybrid DB Layer" },
  { name: "Next.js", detail: "App Router" },
];

const LANDING_HOW_IT_WORKS = [
  {
    step: "01",
    title: "Swarm runs the job",
    body: "Four agents execute sequentially on a real CVE so every decision has a visible upstream source.",
  },
  {
    step: "02",
    title: "Human corrects one agent",
    body: "A security engineer overrides a mid-flight decision instead of restarting the whole pipeline.",
  },
  {
    step: "03",
    title: "BFS traces dependents",
    body: "Murmur uses a deterministic graph walk to find exactly which downstream agents relied on the changed decision.",
  },
  {
    step: "04",
    title: "Only affected agents re-run",
    body: "Upstream work stays intact while only the impacted branch replays with fresh context.",
  },
];

const HERO_ARC_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" fill="none">
    <defs>
      <linearGradient id="murmurGlow" x1="120" y1="120" x2="1120" y2="540" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#9a8afb" stop-opacity="0" />
        <stop offset="0.35" stop-color="#9a8afb" stop-opacity="0.18" />
        <stop offset="0.7" stop-color="#9a8afb" stop-opacity="0.48" />
        <stop offset="1" stop-color="#9a8afb" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="M180 510C360 250 590 162 860 190C1020 207 1120 268 1192 344" stroke="url(#murmurGlow)" stroke-width="10" stroke-linecap="round" />
    <path d="M188 500C364 258 594 174 858 202C1012 218 1108 278 1182 352" stroke="#9a8afb" stroke-opacity="0.16" stroke-width="42" stroke-linecap="round" filter="blur(16px)" />
    <circle cx="854" cy="200" r="10" fill="#9a8afb" fill-opacity="0.5" />
    <circle cx="1116" cy="308" r="12" fill="#9a8afb" fill-opacity="0.34" />
  </svg>
`).replace(/\n\s+/g, "")}`;

function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl px-[30px] pb-[54px] pt-[54px] sm:px-[48px] lg:px-[72px]">
      <div className="grid gap-[30px] lg:grid-cols-4">
        {LANDING_HOW_IT_WORKS.map((item) => (
          <article
            key={item.step}
            className="rounded-[20px] border border-white/10 bg-[#1e1c26] p-[30px]"
          >
            <div className="text-[30px] font-bold leading-none text-[#ffffff]">{item.step}</div>
            <h3 className="mt-[30px] text-[18px] font-bold text-[#ffffff]">{item.title}</h3>
            <p className="mt-[12px] text-[14px] leading-[1.7] text-[#eaeaf0]">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingPipelinePreview({ step }: { step: number }) {
  const triageCascade = step < 4;

  const snapshot = triageCascade
    ? {
        label: "Correcting Triage",
        summary: "A triage correction travels to Remediation, Test-Impact, and Deploy-Risk only.",
        litArrows: new Set(["triage->remediation", "remediation->testImpact", "remediation->deployRisk"]),
        cards: {
          triage: {
            status: step === 0 ? ("rerunning" as const) : ("done" as const),
            title: "Triage",
            summary: CORRECTED_TRIAGE.summary,
            decision: CORRECTED_TRIAGE.decision,
          },
          remediation: {
            status: step === 1 ? ("rerunning" as const) : step < 1 ? ("stale" as const) : ("done" as const),
            title: "Remediation",
            summary:
              step < 1
                ? "Marked stale while Triage replays with corrected guidance."
                : MOCK_DECISIONS.remediation.summary,
            decision:
              step < 1
                ? "Waiting on corrected Triage context."
                : step === 1
                  ? "Re-evaluating with corrected Triage context."
                  : MOCK_DECISIONS.remediation.decision,
          },
          testImpact: {
            status: step === 2 ? ("rerunning" as const) : step < 2 ? ("stale" as const) : ("done" as const),
            title: "Test-Impact",
            summary:
              step < 2
                ? "Marked stale while Remediation replays."
                : step === 2
                  ? "Re-running with corrected Remediation context."
                  : MOCK_DECISIONS.testImpact.summary,
            decision:
              step < 2
                ? "Waiting on corrected Remediation context."
                : step === 2
                  ? "Re-running targeted tests from the corrected patch path."
                  : MOCK_DECISIONS.testImpact.decision,
          },
          deployRisk: {
            status: step === 3 ? ("rerunning" as const) : step < 3 ? ("stale" as const) : ("done" as const),
            title: "Deploy-Risk",
            summary:
              step < 3
                ? "Marked stale until Test-Impact finishes."
                : step === 3
                  ? "Re-running after the corrected downstream context settles."
                  : MOCK_DECISIONS.deployRisk.summary,
            decision:
              step < 3
                ? "Waiting on corrected downstream context."
                : step === 3
                  ? "Re-evaluating rollout risk after corrected downstream work."
                  : MOCK_DECISIONS.deployRisk.decision,
          },
        },
      }
    : {
        label: "Correcting Remediation",
        summary: "A Remediation correction leaves Triage untouched and replays only Test-Impact + Deploy-Risk.",
        litArrows: new Set(["remediation->testImpact", "remediation->deployRisk"]),
        cards: {
          triage: {
            status: "done" as const,
            title: "Triage",
            summary: CORRECTED_TRIAGE.summary,
            decision: CORRECTED_TRIAGE.decision,
          },
          remediation: {
            status: step === 4 ? ("rerunning" as const) : ("done" as const),
            title: "Remediation",
            summary: CORRECTED_REMEDIATION.summary,
            decision:
              step === 4
                ? "Re-evaluating with the corrected vendor patch path."
                : CORRECTED_REMEDIATION.decision,
          },
          testImpact: {
            status: step === 5 ? ("rerunning" as const) : step < 5 ? ("stale" as const) : ("done" as const),
            title: "Test-Impact",
            summary:
              step < 5
                ? "Marked stale while Remediation replays."
                : step === 5
                  ? "Re-running with corrected Remediation context."
                  : MOCK_DECISIONS.testImpact.summary,
            decision:
              step < 5
                ? "Waiting on corrected Remediation context."
                : step === 5
                  ? "Re-running targeted tests from the corrected patch path."
                  : MOCK_DECISIONS.testImpact.decision,
          },
          deployRisk: {
            status: step === 6 ? ("rerunning" as const) : step < 6 ? ("stale" as const) : ("done" as const),
            title: "Deploy-Risk",
            summary:
              step < 6
                ? "Marked stale until Test-Impact finishes."
                : step === 6
                  ? "Re-running after the corrected downstream context settles."
                  : MOCK_DECISIONS.deployRisk.summary,
            decision:
              step < 6
                ? "Waiting on corrected downstream context."
                : step === 6
                  ? "Re-evaluating rollout risk after corrected downstream work."
                  : MOCK_DECISIONS.deployRisk.decision,
          },
        },
      };

  const statusStyles: Record<
    "idle" | "running" | "done" | "stale" | "rerunning",
    { label: string; badge: string; dot: string; pulse: string }
  > = {
    idle: {
      label: "Idle",
      badge: "border-white/10 bg-black text-[#a49db5]",
      dot: "bg-[#767676]",
      pulse: "",
    },
    running: {
      label: "Running",
      badge: "border-[#9a8afb]/40 bg-[#9a8afb]/12 text-[#ffffff]",
      dot: "bg-[#9a8afb]",
      pulse: "animate-pulse",
    },
    done: {
      label: "Done",
      badge: "border-white/10 bg-[#1e1c26] text-[#ffffff]",
      dot: "bg-[#46c17d]",
      pulse: "",
    },
    stale: {
      label: "Stale",
      badge: "border-[#d6a94f]/45 bg-[#d6a94f]/10 text-[#ffffff]",
      dot: "bg-[#d6a94f]",
      pulse: "animate-pulse",
    },
    rerunning: {
      label: "Re-running",
      badge: "border-[#d6a94f]/45 bg-[#d6a94f]/14 text-[#ffffff]",
      dot: "bg-[#d6a94f]",
      pulse: "animate-pulse",
    },
  };

  const cardOrder: Array<keyof typeof snapshot.cards> = ["triage", "remediation", "testImpact", "deployRisk"];

  return (
    <section className="mx-auto w-full max-w-7xl px-[30px] pb-[54px] sm:px-[48px] lg:px-[72px]">
      <div className="rounded-[24px] border border-white/10 bg-[#1e1c26] p-[30px] sm:p-[44px]">
        <div className="flex flex-col gap-[12px] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#a49db5]">
              Live pipeline preview
            </p>
            <h3 className="mt-[12px] text-[24px] font-bold text-[#ffffff]">{snapshot.label}</h3>
          </div>
          <p className="max-w-2xl text-[14px] leading-[1.7] text-[#eaeaf0]">{snapshot.summary}</p>
        </div>

        <div className="mt-[30px] grid gap-[12px] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          {cardOrder.map((agentId, index) => {
            const card = snapshot.cards[agentId];
            const isActive = card.status === "rerunning";
            const isStale = card.status === "stale";
            const status = statusStyles[card.status];

            return (
              <div key={agentId} className="flex flex-col min-h-[344px]">
                <article
                  className={clsx(
                    "flex h-full min-h-[344px] flex-col rounded-[20px] border bg-black p-[30px] transition-all duration-300",
                    isActive ? "border-[#9a8afb] shadow-[0_0_0_1px_rgba(154,138,251,0.24)]" : "border-white/10",
                    isStale && "border-[#d6a94f]/55"
                  )}
                >
                  <div className="flex items-center justify-between gap-[12px]">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#a49db5]">{card.title}</p>
                      <p className="mt-[12px] text-[18px] font-bold text-[#ffffff] break-words">{card.summary}</p>
                    </div>
                    <span className={clsx("rounded-[999px] border px-[12px] py-[3px] text-[11px] font-medium", status.badge)}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-[30px] flex items-center gap-[9px]">
                    <span className={clsx("h-[9px] w-[9px] rounded-full", status.dot, status.pulse)} />
                    <span className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#eaeaf0]">
                      {isActive ? "Pulse traveling" : isStale ? "Waiting on upstream" : "Decision locked"}
                    </span>
                  </div>

                  <div className="mt-[30px] flex-1 rounded-[16px] border border-white/10 bg-[#1e1c26] p-[30px] overflow-auto">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#a49db5]">Decision</p>
                    <p className="mt-[12px] text-[14px] leading-[1.7] text-[#eaeaf0] break-words">{card.decision}</p>
                  </div>
                </article>

                {index < cardOrder.length - 1 ? (
                  <div className="flex items-center justify-center py-[12px] lg:py-0 lg:px-[12px]">
                    <div
                      className={clsx(
                        "flex items-center gap-[9px] rounded-[999px] border px-[12px] py-[3px] text-[11px] font-medium transition-colors duration-300",
                        snapshot.litArrows.has(`${agentId}->${cardOrder[index + 1]}`)
                          ? "border-[#9a8afb]/70 bg-[#9a8afb]/12 text-[#ffffff]"
                          : "border-white/10 bg-black text-[#a49db5]"
                      )}
                    >
                      <ArrowRight className="h-[14px] w-[14px]" />
                      <span className="hidden lg:inline">
                        {snapshot.litArrows.has(`${agentId}->${cardOrder[index + 1]}`) ? "Cascade" : "Dependency"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function MurmurPage() {
  const [showLanding, setShowLanding] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineState>(makeIdleState);
  const [flashingAgents, setFlashingAgents] = useState<Set<AgentId>>(new Set());
  const [activeArrows, setActiveArrows] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [landingStep, setLandingStep] = useState(0);

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!showLanding) {
      return;
    }

    const interval = window.setInterval(() => {
      setLandingStep((current) => (current + 1) % 7);
    }, 500);

    return () => window.clearInterval(interval);
  }, [showLanding]);

  const addLog = (msg: string, type: LogEntry["type"], agentId?: AgentId) => {
    setPipeline((prev) => ({
      ...prev,
      log: [...prev.log, log(msg, type, agentId)],
    }));
  };

  // ─── Pipeline Spawn Simulation ───────────────────────────────────────────────
  const handleStartPipeline = () => {
    clearTimers();
    setIsProcessing(true);
    const fresh = makeIdleState();
    fresh.phase = "running";
    setPipeline(fresh);

    addLog("🚀 Pipeline spawned for CVE-2024-3094 (XZ Utils backdoor CVSS 10.0)", "system");

    // 1. Triage
    const t1 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          triage: { ...prev.agents.triage, status: "running", summary: "Analyzing CVE vector & threat landscape..." },
        },
      }));
      addLog("Triage agent running: Evaluating CVE-2024-3094 vector", "system", "triage");
    }, 400);

    const t2 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          triage: {
            ...prev.agents.triage,
            status: "done",
            ...MOCK_DECISIONS.triage,
            lastUpdated: Date.now(),
          },
          remediation: {
            ...prev.agents.remediation,
            status: "running",
            summary: "Formulating dependency pinning & patch strategy...",
          },
        },
      }));
      addLog(`Triage completed: ${MOCK_DECISIONS.triage.summary}`, "decision", "triage");
      addLog("Remediation agent running (Triggered by Triage completion)", "system", "remediation");
    }, 1800);

    // 2. Remediation
    const t3 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          remediation: {
            ...prev.agents.remediation,
            status: "done",
            ...MOCK_DECISIONS.remediation,
            lastUpdated: Date.now(),
          },
          testImpact: {
            ...prev.agents.testImpact,
            status: "running",
            summary: "Evaluating test suites for xz-utils / sshd linkage...",
          },
        },
      }));
      addLog(`Remediation completed: ${MOCK_DECISIONS.remediation.summary}`, "decision", "remediation");
      addLog("Test-Impact agent running (Triggered by Remediation completion)", "system", "testImpact");
    }, 3200);

    // 3. Test-Impact & Deploy-Risk
    const t4 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          testImpact: {
            ...prev.agents.testImpact,
            status: "done",
            ...MOCK_DECISIONS.testImpact,
            lastUpdated: Date.now(),
          },
          deployRisk: {
            ...prev.agents.deployRisk,
            status: "running",
            summary: "Calculating blast radius, rollback plans, and canary stages...",
          },
        },
      }));
      addLog(`Test-Impact completed: ${MOCK_DECISIONS.testImpact.summary}`, "decision", "testImpact");
      addLog("Deploy-Risk agent running (Triggered by Remediation + Test-Impact)", "system", "deployRisk");
    }, 4600);

    const t5 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        phase: "complete",
        agents: {
          ...prev.agents,
          deployRisk: {
            ...prev.agents.deployRisk,
            status: "done",
            ...MOCK_DECISIONS.deployRisk,
            lastUpdated: Date.now(),
          },
        },
      }));
      addLog(`Deploy-Risk completed: ${MOCK_DECISIONS.deployRisk.summary}`, "decision", "deployRisk");
      addLog("✅ Full swarm initial run complete. Ready for human live corrections.", "system");
      setIsProcessing(false);
    }, 6000);

    timersRef.current.push(t1, t2, t3, t4, t5);
  };

  // ─── Live Correction Propagation (BFS Cascade) ──────────────────────────────
  const handlePropagateCorrection = (
    targetAgent: AgentId,
    overrideText: string,
    overrideData?: { decision: string; reasoning: string; summary: string }
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const affected = transitiveDownstream(targetAgent);
    const untouched = (["triage", "remediation", "testImpact", "deployRisk"] as AgentId[]).filter(
      (id) => id !== targetAgent && !affected.includes(id)
    );

    setFlashingAgents(new Set([targetAgent]));
    const newArrows = new Set<string>();
    affected.forEach((dep) => {
      if (DEPENDENCY_GRAPH[dep].includes(targetAgent)) {
        newArrows.add(`${targetAgent}->${dep}`);
      }
    });
    setActiveArrows(newArrows);

    const oldDecision = pipeline.agents[targetAgent].decision;

    // 1. Mark target as rerunning and downstream as stale
    setPipeline((prev) => {
      const nextAgents = { ...prev.agents };
      nextAgents[targetAgent] = {
        ...nextAgents[targetAgent],
        status: "rerunning",
        summary: `Human intervention received: "${overrideText}"`,
      };

      affected.forEach((depId) => {
        nextAgents[depId] = {
          ...nextAgents[depId],
          status: "stale",
          summary: `Marked stale (dependency ${targetAgent} changed)`,
        };
      });

      return { ...prev, agents: nextAgents };
    });

    addLog(`👤 Human override injected into [${targetAgent}]: "${overrideText}"`, "correction", targetAgent);
    addLog(`⚡ BFS cascade computed. Transitive dependents marked stale: [${affected.join(", ")}]`, "system");
    if (untouched.length > 0) {
      addLog(`🛡️ Untouched agents preserved with valid state: [${untouched.join(", ")}]`, "untouched");
    }

    // 2. Resolve corrected agent
    const t1 = setTimeout(() => {
      const resolvedData =
        overrideData || {
          decision: `[Corrected] ${overrideText}`,
          reasoning: `Human correction applied: ${overrideText}. Downstream context recalculated.`,
          summary: overrideText.length > 60 ? `${overrideText.slice(0, 57)}...` : overrideText,
        };

      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          [targetAgent]: {
            ...prev.agents[targetAgent],
            status: "done",
            ...resolvedData,
            lastUpdated: Date.now(),
          },
        },
      }));
      addLog(`[${targetAgent}] updated with corrected reasoning.`, "decision", targetAgent);
    }, 1200);

    // 3. Sequentially re-invoke affected downstream agents
    let delayAccumulator = 2000;
    affected.forEach((depId, idx) => {
      const tRerunStart = setTimeout(() => {
        setPipeline((prev) => ({
          ...prev,
          agents: {
            ...prev.agents,
            [depId]: {
              ...prev.agents[depId],
              status: "rerunning",
              summary: `Re-evaluating with upstream corrected context...`,
            },
          },
        }));
        addLog(`Re-running [${depId}] with new upstream context...`, "rerun", depId);
      }, delayAccumulator);

      const tRerunDone = setTimeout(() => {
        setPipeline((prev) => {
          let updatedSummary = prev.agents[depId].summary;
          let updatedDecision = prev.agents[depId].decision;
          let updatedReasoning = prev.agents[depId].reasoning;

          if (depId === "remediation" && targetAgent === "triage") {
            updatedDecision = CORRECTED_REMEDIATION.decision;
            updatedReasoning = CORRECTED_REMEDIATION.reasoning;
            updatedSummary = CORRECTED_REMEDIATION.summary;
          } else if (depId === "testImpact") {
            updatedSummary = "Updated tests: Added ABI compatibility regression suite, skipped full pin tests.";
            updatedDecision = "Run ABI compatibility regression suite + distro package verification.";
            updatedReasoning = "Reflecting the corrected upstream patch strategy. ABI compatibility test added.";
          } else if (depId === "deployRisk") {
            updatedSummary = "Deploy risk recalculated: LOW. Direct package update requires no rolling rollback pin.";
            updatedDecision = "Risk: LOW. Standard staged rollout with canary health checks.";
            updatedReasoning = "Upstream remediation now uses certified vendor patch. Risk profile reduced.";
          }

          return {
            ...prev,
            agents: {
              ...prev.agents,
              [depId]: {
                ...prev.agents[depId],
                status: "done",
                decision: updatedDecision,
                reasoning: updatedReasoning,
                summary: updatedSummary,
                lastUpdated: Date.now(),
              },
            },
          };
        });
        addLog(`[${depId}] re-run complete with updated plan.`, "decision", depId);

        if (idx === affected.length - 1) {
          setFlashingAgents(new Set());
          setActiveArrows(new Set());
          setIsProcessing(false);
          addLog("✨ Correction propagation complete. Swarm consistency restored without full restart.", "system");
        }
      }, delayAccumulator + 1400);

      timersRef.current.push(tRerunStart, tRerunDone);
      delayAccumulator += 1600;
    });

    const record: Correction = {
      runId: pipeline.runId,
      agentId: targetAgent,
      oldDecision,
      correctionText: overrideText,
      timestamp: Date.now(),
      downstreamAffected: affected,
    };

    setPipeline((prev) => ({
      ...prev,
      corrections: [record, ...prev.corrections],
    }));

    timersRef.current.push(t1);
  };

  const handlePreset = (beat: 1 | 2) => {
    if (beat === 1) {
      handlePropagateCorrection(
        "triage",
        "Use certified vendor patch v2.1 (RHEL/Debian) instead of version pinning",
        CORRECTED_TRIAGE
      );
    } else {
      handlePropagateCorrection(
        "remediation",
        "Apply vendor patch v2.1 via distro package manager directly without automated PR",
        CORRECTED_REMEDIATION
      );
    }
  };

  const handleReset = () => {
    clearTimers();
    setIsProcessing(false);
    setFlashingAgents(new Set());
    setActiveArrows(new Set());
    setPipeline(makeIdleState());
  };

  // ─── Render Landing Page ─────────────────────────────────────────────────────
  if (showLanding) {
    return (
      <main className="min-h-screen bg-black text-[#eaeaf0] selection:bg-[#9a8afb] selection:text-black">
        <section id="home">
          <ResponsiveHeroBanner
            logoUrl="/assets/murmur orange.png"
            backgroundImageUrl={HERO_ARC_SVG}
            navLinks={LANDING_NAV_LINKS}
            ctaButtonText="Open Console"
            badgeLabel="Live"
            badgeText="Dependency-aware correction cascading"
            title="Corrections propagate."
            titleLine2="Not restarts."
            description="When a human overrides one agent mid-flight, Murmur traces the decision dependency graph and re-runs only the agents that depend on it — leaving everything else intact."
            primaryButtonText="Open Swarm Console"
            secondaryButtonText="Watch Demo"
            partnersTitle="Powered by"
            partners={LANDING_PARTNERS}
            onCtaClick={() => setShowLanding(false)}
            onPrimaryClick={() => setShowLanding(false)}
            onSecondaryClick={() => {
              document.getElementById("pipeline-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </section>

        <LandingHowItWorks />

        <section id="pipeline-preview">
          <LandingPipelinePreview step={landingStep} />
        </section>

        <section className="mx-auto w-full max-w-7xl px-[30px] pb-[88px] sm:px-[48px] lg:px-[72px]">
          <div className="rounded-[24px] border border-white/10 bg-[#1e1c26] p-[30px]">
            <div className="flex flex-wrap items-center justify-between gap-[12px]">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#a49db5]">Console</p>
                <h3 className="mt-[12px] text-[24px] font-bold text-[#ffffff]">Open the live swarm console</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLanding(false)}
                className="rounded-[16px] bg-[#9a8afb] px-[30px] py-[12px] text-[14px] font-semibold text-black transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Open Swarm Console
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ─── Render Main Console Dashboard ──────────────────────────────────────────
  return (
    <main className="paper-texture-bg min-h-screen text-white p-4 sm:p-6 lg:p-8 flex flex-col gap-6 selection:bg-white selection:text-navy-950">
      {/* ─── Hero Header Bar ─── */}
      <header className="paper-card-white rounded-2xl p-6 border border-navy-200 shadow-paper-xl relative overflow-hidden">
        <div className="paper-fold-corner" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowLanding(true)}
                className="text-2xl font-black tracking-tight text-navy-950 font-serif hover:opacity-80 transition-opacity"
              >
                MURMUR
              </button>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-navy-950 text-white shadow-sm uppercase tracking-wide">
                Console Active
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-navy-50 text-navy-950 border border-navy-300">
                Track 02 Swarms
              </span>
            </div>
            <p className="text-xs sm:text-sm text-navy-900 font-sans max-w-3xl leading-relaxed font-semibold">
              Live Correction Propagation for DevSecOps Agent Swarms — When a human overrides one agent mid-flight, Murmur traces the decision DAG and re-invokes <span className="underline decoration-navy-400 font-black">only affected downstream agents</span> without full pipeline restarts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleStartPipeline}
              disabled={isProcessing}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-mono font-bold shadow-lg transition-all",
                "bg-navy-950 text-white hover:bg-navy-850 hover:scale-[1.02] active:scale-[0.98]",
                isProcessing && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{pipeline.phase === "idle" ? "Spawn Swarm Pipeline" : "Re-run Initial Swarm"}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-semibold bg-white border border-navy-300 text-navy-900 hover:bg-navy-50 hover:border-navy-900 shadow-sm transition-all"
              title="Reset swarm to idle state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLanding(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-semibold bg-navy-900 text-white border border-navy-800 hover:bg-navy-850 transition-all"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Incident Context Dispatch Bar ─── */}
      <section className="paper-card-navy rounded-xl p-4 border border-navy-700/80 flex flex-wrap items-center justify-between gap-3 text-xs shadow-paper">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className="font-bold text-white uppercase tracking-wider">INCIDENT DOSSIER:</span>
            <span className="bg-white text-navy-950 px-2.5 py-0.5 rounded font-bold shadow-sm">
              CVE-2024-3094
            </span>
            <span className="text-white font-semibold">XZ Utils Backdoor (CVSS 10.0 Critical)</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-white font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-white" />
            <span>4 Swarm Agents</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-white" />
            <span>Deterministic DAG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Selective Cascade BFS</span>
          </div>
        </div>
      </section>

      {/* ─── Swarm DAG Pipeline Canvas ─── */}
      <section className="paper-card-navy rounded-2xl p-6 border border-white/10 shadow-paper-xl relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-navy-700/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Live Agent Dependency Graph & Swarm State
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-navy-400 animate-pulse"></span> Running
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-navy-950 border border-white"></span> Resolved
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-dashed border-navy-950"></span> Cascade Stale
            </span>
          </div>
        </div>

        <PipelineView
          agents={pipeline.agents}
          flashingAgents={flashingAgents}
          activeArrows={activeArrows}
          onCorrect={(agentId, text) => handlePropagateCorrection(agentId as AgentId, text)}
        />
      </section>

      {/* ─── Intervention & Demo Beats Toolbar ─── */}
      <section>
        <CorrectionInput
          onInjectPreset={handlePreset}
          onCustomCorrection={(agentId, text) => handlePropagateCorrection(agentId, text)}
          disabled={isProcessing || pipeline.phase === "idle"}
        />
      </section>

      {/* ─── Bottom Panels: Event Stream & Provenance Trail ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Swarm Event Log */}
        <div className="lg:col-span-7">
          <EventLog logs={pipeline.log} onClear={() => setPipeline((p) => ({ ...p, log: [] }))} />
        </div>

        {/* Right: Provenance Trail & Value Proposition */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* White Paper Provenance Sheet */}
          <div className="paper-card-navy rounded-2xl p-5 border border-white/10 shadow-paper-lg relative overflow-hidden">
            <div className="paper-fold-corner" />
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Correction Provenance Trail
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#9a8afb] text-black rounded shadow-sm">
                {pipeline.corrections.length} recorded
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {pipeline.corrections.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-[#a49db5] font-mono italic font-bold">
                  No overrides applied yet. Trigger Beat 1 or Beat 2 above to observe the provenance audit trail.
                </div>
              ) : (
                pipeline.corrections.map((corr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-black/30 border border-white/10 text-xs font-mono space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white font-bold uppercase tracking-wide">
                        {corr.agentId} Overridden
                      </span>
                      <span className="text-[#a49db5] font-bold">
                        {new Date(corr.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[#eaeaf0] text-[11px] font-sans font-semibold">"{corr.correctionText}"</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#c2bcd2] pt-1 border-t border-white/10">
                      <span className="font-bold">Affected Downstream:</span>
                      <span className="text-white font-black underline">
                        {corr.downstreamAffected.join(", ") || "none"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deep Navy Swarm Insight Card */}
          <div className="paper-card-navy rounded-2xl p-5 border border-white/10 shadow-paper flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>Architectural Insight</span>
            </div>
            <p className="text-xs text-navy-100 leading-relaxed font-sans font-medium">
              Unlike static restarts (e.g. re-running the full swarm from Triage), Murmur isolates the changed sub-DAG via BFS, preserving valid upstream context and saving compute & latency.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
