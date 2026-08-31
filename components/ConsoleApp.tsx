"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Play, RotateCcw } from "lucide-react";
import {
  AgentId,
  Correction,
  LogEntry,
  PipelineState,
} from "@/lib/types";
import {
  CORRECTED_REMEDIATION,
  CORRECTED_TRIAGE,
  MOCK_DECISIONS,
  log,
  makeIdleState,
  transitiveDownstream,
} from "@/lib/mock";
import PipelineView   from "@/components/PipelineView";
import EventLog       from "@/components/EventLog";
import CorrectionInput from "@/components/CorrectionInput";
import MurmurMark     from "@/components/MurmurMark";

/* ─── Constants ────────────────────────────────────────── */

const AGENT_ORDER: AgentId[] = [
  "triage",
  "remediation",
  "testImpact",
  "deployRisk",
];

/* ─── Helpers ──────────────────────────────────────────── */

function visualHops(target: AgentId, affected: AgentId[]): string[] {
  const hops:  string[] = [];
  const start = AGENT_ORDER.indexOf(target);
  for (let i = start; i < AGENT_ORDER.length - 1; i += 1) {
    const to = AGENT_ORDER[i + 1];
    if (affected.includes(to)) {
      hops.push(`${AGENT_ORDER[i]}->${to}`);
    }
  }
  return hops;
}

/* ─── ConsoleApp ───────────────────────────────────────── */

export default function ConsoleApp() {
  const [pipeline,       setPipeline]       = useState<PipelineState>(makeIdleState);
  const [flashingAgents, setFlashingAgents] = useState<Set<AgentId>>(new Set());
  const [activeArrows,   setActiveArrows]   = useState<Set<string>>(new Set());
  const [pulseArrow,     setPulseArrow]     = useState<string | null>(null);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const addLog = (msg: string, type: LogEntry["type"], agentId?: AgentId) =>
    setPipeline((prev) => ({
      ...prev,
      log: [...prev.log, log(msg, type, agentId)],
    }));

  /* ── Run pipeline ─────────────────────── */
  const handleStartPipeline = () => {
    clearTimers();
    setIsProcessing(true);
    setActiveArrows(new Set());
    setPulseArrow(null);

    const fresh = makeIdleState();
    fresh.phase = "running";
    setPipeline(fresh);
    addLog("Pipeline spawned for CVE-2024-3094 (XZ Utils backdoor CVSS 10.0)", "system");

    const t1 = setTimeout(() => {
      setPipeline((prev) => ({
        ...prev,
        agents: {
          ...prev.agents,
          triage: { ...prev.agents.triage, status: "running", summary: "Analyzing CVE vector & threat landscape…" },
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
            summary: "Formulating dependency pinning & patch strategy…",
          },
        },
      }));
      addLog(`Triage completed: ${MOCK_DECISIONS.triage.summary}`, "decision", "triage");
      addLog("Remediation agent running (triggered by Triage completion)", "system", "remediation");
    }, 1800);

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
            summary: "Evaluating test suites for xz-utils / sshd linkage…",
          },
        },
      }));
      addLog(`Remediation completed: ${MOCK_DECISIONS.remediation.summary}`, "decision", "remediation");
      addLog("Test-Impact agent running (triggered by Remediation completion)", "system", "testImpact");
    }, 3200);

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
            summary: "Calculating blast radius, rollback plans, and canary stages…",
          },
        },
      }));
      addLog(`Test-Impact completed: ${MOCK_DECISIONS.testImpact.summary}`, "decision", "testImpact");
      addLog("Deploy-Risk agent running (triggered by Remediation + Test-Impact)", "system", "deployRisk");
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
      addLog("Full swarm initial run complete. Ready for human live corrections.", "system");
      setIsProcessing(false);
    }, 6000);

    timersRef.current.push(t1, t2, t3, t4, t5);
  };

  /* ── Propagate correction ─────────────── */
  const handlePropagateCorrection = (
    targetAgent: AgentId,
    overrideText: string,
    overrideData?: { decision: string; reasoning: string; summary: string }
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const affected  = transitiveDownstream(targetAgent);
    const untouched = AGENT_ORDER.filter(
      (id) => id !== targetAgent && !affected.includes(id)
    );
    const hops = visualHops(targetAgent, affected);

    setFlashingAgents(new Set([targetAgent]));
    setActiveArrows(new Set());
    setPulseArrow(null);

    hops.forEach((key, index) => {
      const hopTimer = setTimeout(() => {
        setActiveArrows((prev) => new Set([...prev, key]));
        setPulseArrow(key);
      }, index * 500);
      timersRef.current.push(hopTimer);
    });

    const oldDecision = pipeline.agents[targetAgent].decision;

    setPipeline((prev) => {
      const nextAgents = { ...prev.agents };
      nextAgents[targetAgent] = {
        ...nextAgents[targetAgent],
        status:  "rerunning",
        summary: `Human intervention received: "${overrideText}"`,
      };
      affected.forEach((depId) => {
        nextAgents[depId] = {
          ...nextAgents[depId],
          status:  "stale",
          summary: `Marked stale (dependency ${targetAgent} changed)`,
        };
      });
      return { ...prev, agents: nextAgents };
    });

    addLog(`Human override injected into [${targetAgent}]: "${overrideText}"`, "correction", targetAgent);
    addLog(`BFS cascade computed. Transitive dependents marked stale: [${affected.join(", ")}]`, "system");
    if (untouched.length > 0) {
      addLog(`Untouched agents preserved with valid state: [${untouched.join(", ")}]`, "untouched");
    }

    const t1 = setTimeout(() => {
      const resolvedData = overrideData ?? {
        decision:  `[Corrected] ${overrideText}`,
        reasoning: `Human correction applied: ${overrideText}. Downstream context recalculated.`,
        summary:   overrideText.length > 60 ? `${overrideText.slice(0, 57)}…` : overrideText,
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

    let delay = 2000;
    affected.forEach((depId, idx) => {
      const tStart = setTimeout(() => {
        setPipeline((prev) => ({
          ...prev,
          agents: {
            ...prev.agents,
            [depId]: {
              ...prev.agents[depId],
              status:  "rerunning",
              summary: "Re-evaluating with upstream corrected context…",
            },
          },
        }));
        addLog(`Re-running [${depId}] with new upstream context…`, "rerun", depId);
      }, delay);

      const tDone = setTimeout(() => {
        setPipeline((prev) => {
          let updatedSummary   = prev.agents[depId].summary;
          let updatedDecision  = prev.agents[depId].decision;
          let updatedReasoning = prev.agents[depId].reasoning;

          if (depId === "remediation" && targetAgent === "triage") {
            updatedDecision  = CORRECTED_REMEDIATION.decision;
            updatedReasoning = CORRECTED_REMEDIATION.reasoning;
            updatedSummary   = CORRECTED_REMEDIATION.summary;
          } else if (depId === "testImpact") {
            updatedSummary   = "Updated tests: Added ABI compatibility regression suite, skipped full pin tests.";
            updatedDecision  = "Run ABI compatibility regression suite + distro package verification.";
            updatedReasoning = "Reflecting the corrected upstream patch strategy. ABI compatibility test added.";
          } else if (depId === "deployRisk") {
            updatedSummary   = "Deploy risk recalculated: LOW. Direct package update requires no rolling rollback pin.";
            updatedDecision  = "Risk: LOW. Standard staged rollout with canary health checks.";
            updatedReasoning = "Upstream remediation now uses certified vendor patch. Risk profile reduced.";
          }

          return {
            ...prev,
            agents: {
              ...prev.agents,
              [depId]: {
                ...prev.agents[depId],
                status:    "done",
                decision:  updatedDecision,
                reasoning: updatedReasoning,
                summary:   updatedSummary,
                lastUpdated: Date.now(),
              },
            },
          };
        });
        addLog(`[${depId}] re-run complete with updated plan.`, "decision", depId);

        if (idx === affected.length - 1) {
          setFlashingAgents(new Set());
          setActiveArrows(new Set());
          setPulseArrow(null);
          setIsProcessing(false);
          addLog(
            "Correction propagation complete. Swarm consistency restored without full restart.",
            "system"
          );
        }
      }, delay + 1400);

      timersRef.current.push(tStart, tDone);
      delay += 1600;
    });

    if (affected.length === 0) {
      const tDone = setTimeout(() => {
        setFlashingAgents(new Set());
        setActiveArrows(new Set());
        setPulseArrow(null);
        setIsProcessing(false);
        addLog("Correction applied. No downstream agents to re-run.", "system");
      }, 1400);
      timersRef.current.push(tDone);
    }

    const record: Correction = {
      runId:              pipeline.runId,
      agentId:            targetAgent,
      oldDecision,
      correctionText:     overrideText,
      timestamp:          Date.now(),
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
    setPulseArrow(null);
    setPipeline(makeIdleState());
  };

  const isIdle = pipeline.phase === "idle";

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-[#000000] text-white">

      {/* ══ Header ════════════════════════════════════════ */}
      <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-[30px] border-b border-[#222222] px-[30px] py-[20px] lg:px-[72px]">

        <div className="flex min-w-0 items-center gap-[30px]">
          <Link href="/" aria-label="Murmur home" className="shrink-0">
            <MurmurMark size={32} />
          </Link>

          <span className="bg-[#0083ff] px-[16px] py-[2px] text-[14px] font-semibold text-white">
            Console Active
          </span>

          <span className="hidden rounded border border-[#222222] bg-[#0a0a0a] px-[16px] py-[2px] text-[14px] font-medium text-white/60 sm:inline">
            Track 02 Swarms
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-[16px]">
          <button
            id="run-pipeline-btn"
            type="button"
            onClick={handleStartPipeline}
            disabled={isProcessing}
            className={clsx(
              "inline-flex items-center gap-[8px] bg-[#0083ff] px-[24px] py-[10px]",
              "text-[16px] font-semibold text-white transition-opacity",
              isProcessing && "opacity-40 cursor-not-allowed"
            )}
          >
            <Play className="h-[16px] w-[16px]" />
            Run
          </button>

          <button
            id="reset-pipeline-btn"
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className={clsx(
              "inline-flex items-center gap-[8px] border border-[#222222] bg-[#0a0a0a] px-[24px] py-[10px]",
              "text-[16px] font-semibold text-white/60 transition-opacity hover:border-[#333333] hover:text-white",
              isProcessing && "opacity-40 cursor-not-allowed"
            )}
          >
            <RotateCcw className="h-[16px] w-[16px]" />
            Reset
          </button>
        </div>
      </header>

      {/* ══ Page body ═════════════════════════════════════ */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[30px] px-[30px] pb-[72px] lg:px-[72px]">

        {/* ── Incident dossier bar ─────────────────────── */}
        <section
          className="flex flex-wrap items-center justify-between gap-[16px] border border-[#222222] bg-[#141414] px-[24px] py-[12px]"
          aria-label="Incident dossier"
        >
          <div>
            <p className="text-[16px] font-semibold text-white">CVE-2024-3094</p>
            <p className="text-[14px] text-white/60">XZ Utils Backdoor</p>
          </div>
          <span className="border border-[#222222] bg-[#0a0a0a] px-[16px] py-[2px] text-[14px] font-semibold text-white">
            Severity: Critical
          </span>
          <p className="text-[14px] text-white/60">4 agents</p>
        </section>

        {/* ── Pipeline ─────────────────────────────────── */}
        <section
          className="overflow-hidden border border-[#222222] bg-[#141414] p-[24px]"
          aria-label="Agent pipeline"
        >
          <PipelineView
            agents={pipeline.agents}
            flashingAgents={flashingAgents}
            activeArrows={activeArrows}
            pulseArrow={pulseArrow}
            onCorrect={(agentId, text) =>
              handlePropagateCorrection(agentId as AgentId, text)
            }
          />
        </section>

        {/* ── Human intervention ───────────────────────── */}
        <CorrectionInput
          onInjectPreset={handlePreset}
          onCustomCorrection={(agentId, text) =>
            handlePropagateCorrection(agentId, text)
          }
          disabled={isProcessing || isIdle}
        />

        {/* ── Event log ────────────────────────────────── */}
        <EventLog
          logs={pipeline.log}
          onClear={() => setPipeline((p) => ({ ...p, log: [] }))}
        />

        {/* ── Correction provenance ─────────────────────── */}
        <section
          className="border border-[#222222] bg-[#141414] p-[24px]"
          aria-label="Correction provenance"
        >
          <h2 className="text-[16px] font-semibold text-white">
            Correction provenance
          </h2>

          <div className="mt-[24px]">
            {pipeline.corrections.length === 0 ? (
              <p className="text-[14px] text-white/40">No corrections recorded.</p>
            ) : (
              <ol className="flex flex-col gap-[16px]">
                {pipeline.corrections.map((corr) => (
                  <li
                    key={`${corr.timestamp}-${corr.agentId}`}
                    className="flex flex-col gap-[4px] border-t border-[#222222] pt-[12px] first:border-0 first:pt-0"
                  >
                    <p className="text-[14px] font-semibold text-white">
                      {corr.agentId}{" "}
                      <span className="font-normal text-white/40">
                        · {new Date(corr.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                    </p>
                    <p className="text-[14px] text-white/70">{corr.correctionText}</p>
                    <p className="text-[13px] text-white/40">
                      Affected:{" "}
                      {corr.downstreamAffected.length > 0
                        ? corr.downstreamAffected.join(", ")
                        : "none"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}