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

export default function MurmurPage() {
  const [showLanding, setShowLanding] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineState>(makeIdleState);
  const [flashingAgents, setFlashingAgents] = useState<Set<AgentId>>(new Set());
  const [activeArrows, setActiveArrows] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

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
      <main className="paper-texture-bg min-h-screen text-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative overflow-hidden selection:bg-white selection:text-navy-950">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 border border-white/10 grid grid-cols-6 grid-rows-6">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white/5" />
          ))}
        </div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-8 relative z-10 text-center">
          {/* Swarm Badge */}
          <div className="animate-fade-in flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-navy-950 shadow-lg tracking-wider border border-white uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-navy-950" />
            <span>Track 02 — Agentic Web Swarms</span>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-6xl md:text-8xl font-black font-serif tracking-tighter text-white drop-shadow-lg">
              MURMUR
            </h1>
            <p className="text-lg md:text-xl font-mono text-navy-200 font-semibold tracking-wide">
              Live Correction Propagation for DevSecOps Agent Swarms
            </p>
          </div>

          {/* 3D Animated Agentic AI Swarm Core Visualizer */}
          <div className="scene-3d my-4 flex items-center justify-center h-64">
            <div className="sphere-container-3d">
              <div className="core-3d" />
              <div className="ring-3d ring-3d-1">
                <div className="node-3d node-triage" title="Triage Agent" />
              </div>
              <div className="ring-3d ring-3d-2">
                <div className="node-3d node-remediation" title="Remediation Agent" />
                <div className="node-3d node-deploy" title="Deploy-Risk Agent" />
              </div>
              <div className="ring-3d ring-3d-3">
                <div className="node-3d node-test" title="Test-Impact Agent" />
              </div>
            </div>
          </div>

          {/* Landing Copy / Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left mt-2">
            <div className="paper-card-navy p-5 rounded-2xl border border-navy-700/80 shadow-paper">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                <span>Isolated BFS Cascade</span>
              </h3>
              <p className="text-xs text-navy-200 leading-relaxed font-sans font-medium">
                Calculates the exact decision dependency path. When you override one agent's decision, only downstreams re-run.
              </p>
            </div>

            <div className="paper-card-navy p-5 rounded-2xl border border-navy-700/80 shadow-paper">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Zero Wasted Work</span>
              </h3>
              <p className="text-xs text-navy-200 leading-relaxed font-sans font-medium">
                No full swarm restarts. Avoid throwing away hours of valid static analysis, scanning, and pipeline orchestration.
              </p>
            </div>

            <div className="paper-card-navy p-5 rounded-2xl border border-navy-700/80 shadow-paper">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Swarm Consistency</span>
              </h3>
              <p className="text-xs text-navy-200 leading-relaxed font-sans font-medium">
                Updates decision context in-flight. Downstream planners adapt dynamically, preventing stale releases from shipping.
              </p>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => setShowLanding(false)}
            className="flex items-center gap-3 px-8 py-4.5 rounded-2xl text-sm font-mono font-bold transition-all shadow-xl bg-white text-navy-950 hover:bg-navy-50 hover:scale-[1.03] active:scale-[0.97]"
          >
            <span>Launch Swarm Control Console</span>
            <ArrowRight className="w-4 h-4 text-navy-950 animate-bounce-x" />
          </button>
        </div>
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
      <section className="paper-card-navy rounded-2xl p-6 border border-navy-700/80 shadow-paper-xl relative">
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
        <div className="lg:col-span-7 h-[360px]">
          <EventLog logs={pipeline.log} onClear={() => setPipeline((p) => ({ ...p, log: [] }))} />
        </div>

        {/* Right: Provenance Trail & Value Proposition */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* White Paper Provenance Sheet */}
          <div className="paper-card-white rounded-2xl p-5 border border-navy-200 shadow-paper-lg relative overflow-hidden">
            <div className="paper-fold-corner" />
            <div className="flex items-center justify-between pb-3 border-b border-navy-150">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-navy-950" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-navy-950">
                  Correction Provenance Trail
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-navy-950 text-white rounded shadow-sm">
                {pipeline.corrections.length} recorded
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {pipeline.corrections.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-navy-900 font-mono italic font-bold">
                  No overrides applied yet. Trigger Beat 1 or Beat 2 above to observe the provenance audit trail.
                </div>
              ) : (
                pipeline.corrections.map((corr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-navy-50 border border-navy-200 text-xs font-mono space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-navy-950 font-bold uppercase tracking-wide">
                        {corr.agentId} Overridden
                      </span>
                      <span className="text-navy-500 font-bold">
                        {new Date(corr.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-navy-950 text-[11px] font-sans font-semibold">"{corr.correctionText}"</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-navy-800 pt-1 border-t border-navy-200">
                      <span className="font-bold">Affected Downstream:</span>
                      <span className="text-navy-950 font-black underline">
                        {corr.downstreamAffected.join(", ") || "none"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deep Navy Swarm Insight Card */}
          <div className="paper-card-navy rounded-2xl p-5 border border-navy-700/80 shadow-paper flex flex-col gap-2">
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
