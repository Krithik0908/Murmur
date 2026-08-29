import { AgentId, AgentRun, LogEntry, PipelineState } from "./types";
import { v4 as uuidv4 } from "uuid";

// ─── Dependency graph ────────────────────────────────────────────────────────
export const DEPENDENCY_GRAPH: Record<AgentId, AgentId[]> = {
  triage: [],
  remediation: ["triage"],
  testImpact: ["remediation"],
  deployRisk: ["remediation", "testImpact"],
};

// Reverse map: who depends on X
export function dependentsOf(agentId: AgentId): AgentId[] {
  const all: AgentId[] = ["triage", "remediation", "testImpact", "deployRisk"];
  return all.filter((a) => DEPENDENCY_GRAPH[a].includes(agentId));
}

// BFS to find all transitive downstream agents
export function transitiveDownstream(changed: AgentId): AgentId[] {
  const visited = new Set<AgentId>();
  const queue: AgentId[] = [changed];
  while (queue.length) {
    const current = queue.shift()!;
    const deps = dependentsOf(current);
    for (const d of deps) {
      if (!visited.has(d)) {
        visited.add(d);
        queue.push(d);
      }
    }
  }
  return Array.from(visited);
}

// ─── Mock agent data ─────────────────────────────────────────────────────────
const CVE = "CVE-2024-3094 (XZ Utils backdoor, CVSS 10.0)";

export const MOCK_DECISIONS: Record<AgentId, { decision: string; reasoning: string; summary: string }> = {
  triage: {
    decision: "Severity: CRITICAL. Recommend immediate upgrade to xz-utils 5.6.3 or patched vendor build. Blast radius: all Linux distros shipping 5.6.0/5.6.1.",
    reasoning: `The ${CVE} is a supply-chain backdoor injected into the upstream tarball. The malicious code hooks the RSA key decryption path in OpenSSH via systemd-notify. CVSS 10.0 — full RCE without auth on affected systems. Triage conclusion: highest priority, upgrade path is the only safe remediation.`,
    summary: "CRITICAL — upgrade xz-utils immediately, do not patch in-place.",
  },
  remediation: {
    decision: "Pin xz-utils to 5.4.6 (last known-good). Add SBOM entry. Block 5.6.x in dependency policy. Open PR with automated pin.",
    reasoning: "Upgrade to 5.6.3 is not yet available in all distro repos. Safest immediate action: pin to 5.4.6. Automated PR will update package-lock + requirements. SBOM ensures audit trail. Policy block prevents accidental re-introduction.",
    summary: "Pin to 5.4.6, block 5.6.x in policy, open automated PR.",
  },
  testImpact: {
    decision: "Run: [xz-utils integration suite] + [OpenSSH auth regression] + [systemd service smoke tests]. Skip: UI / frontend test suites (unaffected).",
    reasoning: "Remediation changes the pinned version of xz-utils. Test-Impact analysis: only tests that touch compression, SSH auth, or systemd linkage are relevant. Frontend and database test suites have no dependency path to xz-utils.",
    summary: "3 targeted test suites; skip 8 unrelated suites. Est. ~12 min CI time.",
  },
  deployRisk: {
    decision: "Risk: LOW-MEDIUM. Recommended: rolling deploy (10% canary → 1h soak → 100%). Rollback plan: revert PR, re-pin to 5.4.5 (prev lock), trigger prior image rebuild.",
    reasoning: "Pinning a dependency is low blast-radius if CI is green. The canary approach gives observability before full rollout. Rollback is deterministic: prior image is cached. No DB migrations involved. Main risk is distro package cache misses slowing first-boot — mitigated by pre-pulling in deploy script.",
    summary: "Rolling 10%→100% canary. Rollback: revert pin to 5.4.5. Low-medium risk.",
  },
};

export const CORRECTED_TRIAGE: typeof MOCK_DECISIONS["triage"] = {
  decision: "Severity: CRITICAL. Recommend applying vendor patch v2.1 (RHEL/Debian certified) instead of upstream upgrade. Patch preserves ABI compat.",
  reasoning: `Correction from security engineer: vendor patch v2.1 is now available and certified by RHEL and Debian security teams. It backports the fix without ABI breaks that the 5.6.3 upgrade would introduce in some shared-lib environments. This changes the remediation path entirely.`,
  summary: "CRITICAL — apply vendor patch v2.1, maintains ABI compat.",
};

export const CORRECTED_REMEDIATION: typeof MOCK_DECISIONS["remediation"] = {
  decision: "Apply vendor patch v2.1 via distro package manager. No version pin needed — patch tracks upstream. Update SBOM. Skip PR automation (distro handles it).",
  reasoning: "With vendor patch v2.1 (corrected by engineer), pinning is no longer required. The distro package manager will pull the patched build. SBOM update still required for compliance. PR automation is skipped — distro team owns the package update.",
  summary: "Apply vendor patch v2.1 via apt/dnf. SBOM update only, no pin PR.",
};

// ─── Mock state factory ───────────────────────────────────────────────────────
function makeAgent(
  runId: string,
  agentId: AgentId,
  status: AgentRun["status"],
  data: typeof MOCK_DECISIONS["triage"]
): AgentRun {
  return {
    runId,
    agentId,
    status,
    ...data,
    dependsOn: DEPENDENCY_GRAPH[agentId],
    lastUpdated: Date.now(),
  };
}

export function makeIdleState(): PipelineState {
  const runId = uuidv4();
  const agents = Object.fromEntries(
    (["triage", "remediation", "testImpact", "deployRisk"] as AgentId[]).map(
      (id) => [
        id,
        makeAgent(runId, id, "idle", { decision: "", reasoning: "", summary: "Waiting to run…" }),
      ]
    )
  ) as Record<AgentId, AgentRun>;

  return {
    runId,
    agents,
    log: [
      {
        id: uuidv4(),
        timestamp: Date.now(),
        message: `Pipeline ready. CVE scenario: ${CVE}`,
        type: "system",
      },
    ],
    corrections: [],
    phase: "idle",
  };
}

export function log(msg: string, type: LogEntry["type"], agentId?: AgentId): LogEntry {
  return { id: uuidv4(), timestamp: Date.now(), message: msg, type, agentId };
}
