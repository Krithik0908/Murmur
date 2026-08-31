"use client";

import { useState } from "react";
import clsx from "clsx";
import { AgentId } from "@/lib/types";

/* ─── Types ────────────────────────────────────────────── */

interface CorrectionInputProps {
  onInjectPreset?: (beat: 1 | 2) => void;   // optional (unused but kept for compatibility)
  onCustomCorrection: (agentId: AgentId, text: string) => void;
  disabled?:         boolean;
}

const AGENT_OPTIONS: { value: AgentId; label: string }[] = [
  { value: "triage",      label: "Triage"      },
  { value: "remediation", label: "Remediation" },
  { value: "testImpact",  label: "Test-Impact" },
  { value: "deployRisk",  label: "Deploy-Risk" },
];

/* ─── Component ────────────────────────────────────────── */

export default function CorrectionInput({
  onCustomCorrection,
  disabled = false,
}: CorrectionInputProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("triage");
  const [customText,    setCustomText]    = useState("");

  const canSubmit = customText.trim().length > 0 && !disabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onCustomCorrection(selectedAgent, customText.trim());
    setCustomText("");
  };

  return (
    <section
      className="border border-[#222222] bg-[#141414] p-[24px]"
      aria-label="Human intervention panel"
    >
      <h2 className="text-[16px] font-semibold text-white">
        Human intervention
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-[24px] flex flex-col gap-[16px] lg:flex-row lg:items-center"
      >
        {/* Agent selector */}
        <select
          id="correction-agent-select"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value as AgentId)}
          disabled={disabled}
          aria-label="Target agent"
          className={clsx(
            "border border-[#222222] bg-[#0a0a0a] px-[16px] py-[10px]",
            "text-[16px] font-medium text-white",
            "focus:border-[#0083ff] focus:outline-none",
            "lg:w-auto",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {AGENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Correction text input */}
        <input
          id="correction-text-input"
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          disabled={disabled}
          placeholder="Type a correction for the selected agent…"
          className={clsx(
            "min-w-0 flex-1 border border-[#222222] bg-[#0a0a0a] px-[16px] py-[10px]",
            "text-[16px] font-medium text-white",
            "placeholder:text-white/30",
            "focus:border-[#0083ff] focus:outline-none",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        />

        {/* Submit */}
        <button
          id="correction-submit-btn"
          type="submit"
          disabled={!canSubmit}
          className={clsx(
            "px-[24px] py-[10px]",
            "text-[16px] font-semibold transition-opacity",
            canSubmit
              ? "bg-[#0083ff] text-white hover:opacity-80"
              : "bg-[#0a0a0a] text-white/30 cursor-not-allowed border border-[#222222]"
          )}
        >
          Submit
        </button>
      </form>
    </section>
  );
}