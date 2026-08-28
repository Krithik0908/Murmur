# TRACE — Demo Flow Reference
# Canonical demo script (short version for quick reference)

See [`person4/demo-script.md`](person4/demo-script.md) for the full step-by-step version.

---

## Scenario

**CVE-2024-3094** — XZ Utils / liblzma supply-chain backdoor (CVSS 10.0 CRITICAL)

A malicious contributor injected a backdoor into xz-utils 5.6.1 targeting systemd-linked sshd. Our simulated API gateway container runs Debian Bookworm and was automatically updated to 5.6.1. TRACE runs four AI agents to respond.

---

## Demo A — Large Cascade (Correct Triage)

1. Click **Start Pipeline** → watch all four agents complete
2. Click **Correct** on **Triage**
3. Enter: `This server does not use systemd-linked sshd. The vulnerable execution path does not exist. Treat as MONITOR only.`
4. Submit

**Expected result:**
- Triage → `MONITOR`
- Remediation, Test-Impact, Deploy-Risk → all go `Stale` → `Re-running` → `Done` with updated decisions
- New decisions will shift toward DEFER / NO_ADDITIONAL_TESTS

---

## Demo B — Small Cascade (Correct Remediation)

1. Start a **fresh pipeline run** (click Start Pipeline)
2. Click **Correct** on **Remediation**
3. Enter: `Apply vendor patch instead of rebuilding the Docker image. Mark as PATCH, not PIN.`
4. Submit

**Expected result:**
- **Triage stays green / untouched** ← point this out
- Remediation → `PATCH`
- Test-Impact and Deploy-Risk → `Stale` → `Re-running` → `Done`
- Only 2 agents re-run (not 3)

---

## Key Message

> TRACE tracked the dependency graph of agent decisions and re-ran only the agents whose reasoning actually depended on the changed decision — not the whole pipeline.
