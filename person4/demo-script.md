# TRACE — Demo Script
# Person 4 — Demo Preparation

**Project:** TRACE — Targeted Re-execution for Agent Correction and Execution  
**CVE Scenario:** CVE-2024-3094 (XZ Utils / liblzma supply-chain backdoor, CVSS 10.0)  
**Demo Duration:** ~4 minutes total (1 min setup + 1.5 min Demo A + 1.5 min Demo B)

---

## Pre-Demo Setup Checklist

Before walking to the stage:

- [ ] `.env.local` has a valid `GROQ_API_KEY` (get from https://console.groq.com)
- [ ] `.env.local` has a valid `MONGODB_URI` pointing to MongoDB Atlas
- [ ] `npm run dev` is running and `http://localhost:3000` loads without errors
- [ ] Browser is open to `http://localhost:3000`, tab is fresh (no leftover run state)
- [ ] Internet connection is active (Groq API requires network)
- [ ] Browser zoom is at 100% (or as needed for projector visibility)
- [ ] If demoing from localhost: confirm MongoDB Atlas IP Access List allows your current IP
- [ ] Have fallback screenshots/recording ready (see Fallback Plan below)

---

## Demo A — Large Cascade (Correct Triage Early)

### What this proves
Correcting the **first** agent (Triage) causes **all three downstream agents** to become stale and re-run with the corrected context. This shows the maximum cascade depth.

### Expected dependency graph behaviour
```
Triage (corrected)
   └─→ Remediation (stale → re-run)
          └─→ Test-Impact (stale → re-run)
                 └─→ Deploy-Risk (stale → re-run)
```

### Step-by-step script

#### Step 1 — Launch the pipeline
1. Click **"Start Pipeline"** (or equivalent button on the UI)
2. **Narrate:** *"TRACE has received a CVE alert — CVE-2024-3094, the XZ Utils supply-chain backdoor. Four AI agents are now running in sequence."*
3. **Watch:** Each agent card progresses from `Idle` → `Running` (pulsing blue) → `Done` (green) in order: Triage, Remediation, Test-Impact, Deploy-Risk.
4. **Wait** for all four cards to reach `Done` status (~10–20 seconds depending on Groq response time).

**Expected initial agent outputs (approximate — model may vary slightly):**
| Agent | Expected Decision |
|---|---|
| Triage | REMEDIATE |
| Remediation | PIN *(downgrade xz-utils to 5.4.6)* |
| Test-Impact | SMOKE_TESTS |
| Deploy-Risk | GO_WITH_GUARDRAILS |

#### Step 2 — Point out the pipeline state
*"All four agents have completed. Triage decided to REMEDIATE — downgrade the xz-utils package. Remediation chose PIN — it pinned the package to version 5.4.6 in the Dockerfile. Test-Impact said smoke tests only — it's an OS-level change, not application code. Deploy-Risk said go with guardrails — deploy with enhanced monitoring."*

#### Step 3 — Make the human correction on Triage
1. Click **"Correct"** on the **Triage** card.
2. Enter the correction text:
   > `This server does not use systemd-linked sshd. The vulnerable execution path does not exist. Downgrade is unnecessary — treat as MONITOR only.`
3. Click **Submit** (or press Enter).
4. **Narrate:** *"A security engineer has reviewed the advisory more carefully and realised: this container doesn't use systemd-linked sshd. The vulnerable execution path described in CVE-2024-3094 doesn't exist here. They're overriding Triage — changing it from REMEDIATE to MONITOR."*

#### Step 4 — Observe the cascade
**Watch** (and narrate as it happens):
- The **Triage** card flashes / re-evaluates → updates to `MONITOR`
- The arrow from Triage to Remediation lights up
- **Remediation** flips to `Stale` (amber), then `Re-running` (pulsing amber)
- **Test-Impact** flips to `Stale` (amber)
- **Deploy-Risk** flips to `Stale` (amber)
- One by one they complete: Remediation → `Done`, Test-Impact → `Done`, Deploy-Risk → `Done`

*"TRACE identified that Remediation, Test-Impact, and Deploy-Risk all depended on Triage's decision. It marked them stale and re-ran only those three — injecting the corrected Triage result into each prompt."*

#### Step 5 — Point out the corrected outputs
**Expected corrected decisions (approximate):**
| Agent | Expected Corrected Decision |
|---|---|
| Triage | MONITOR |
| Remediation | DEFER *(no immediate action needed)* |
| Test-Impact | NO_ADDITIONAL_TESTS |
| Deploy-Risk | HOLD *(or GO — deferred remediation, no deploy needed)* |

*"The entire pipeline updated in under 20 seconds. No full restart. The agents reasoned from the corrected information, not the original wrong call."*

---

## Demo B — Small Cascade (Correct Remediation Late)

### What this proves
Correcting a **middle agent** (Remediation) causes only the agents **downstream of Remediation** to become stale. Triage — which Remediation depends on, not the other way around — is **untouched**.

### Expected dependency graph behaviour
```
Triage (UNTOUCHED — stays green)
   └─→ Remediation (corrected)
          └─→ Test-Impact (stale → re-run)
                 └─→ Deploy-Risk (stale → re-run)
```

### Step-by-step script

> **Note:** If running Demo B immediately after Demo A, click "Start Pipeline" again to get a fresh run. Otherwise, resume from the state after Demo A's initial run (before the Triage correction).

#### Step 1 — Show the completed pipeline
Point to the four completed agent cards. Briefly describe the current state:
- Triage: `REMEDIATE`
- Remediation: `PIN` *(downgrade xz-utils to 5.4.6)*
- Test-Impact: `SMOKE_TESTS`
- Deploy-Risk: `GO_WITH_GUARDRAILS`

*"Now imagine the security engineer is happy with the Triage decision — REMEDIATE is correct. But they want to change the remediation approach. Instead of pinning the package in the Dockerfile, they want to apply a vendor configuration patch instead, because rebuilding the Docker image takes 45 minutes in this environment."*

#### Step 2 — Make the human correction on Remediation
1. Click **"Correct"** on the **Remediation** card.
2. Enter the correction text:
   > `Do not rebuild the Docker image. Apply vendor mitigation instead: disable sshd's systemd integration and restart the sshd service in the running containers. Mark as PATCH, not PIN.`
3. Click **Submit**.
4. **Narrate:** *"The engineer is overriding Remediation — from PIN to PATCH, using a live service reconfiguration instead of an image rebuild."*

#### Step 3 — Observe the selective cascade
**Watch** (and narrate):
- **Remediation** updates to `PATCH`
- **Triage** card: **stays green, does NOT change** — point this out explicitly
- **Test-Impact** flips to `Stale` → `Re-running` → `Done`
- **Deploy-Risk** flips to `Stale` → `Re-running` → `Done`

*"Notice — Triage didn't change. Triage doesn't depend on Remediation. Only Test-Impact and Deploy-Risk depend on what Remediation decided. TRACE knows the difference."*

#### Step 4 — Point out the result
**Expected corrected decisions (approximate):**
| Agent | Decision | Changed? |
|---|---|---|
| Triage | REMEDIATE | ❌ No — untouched |
| Remediation | PATCH | ✅ Corrected |
| Test-Impact | TARGETED_TESTS *(live service change — verify sshd behaviour)* | ✅ Re-run |
| Deploy-Risk | GO_WITH_GUARDRAILS *(live patch, monitor carefully)* | ✅ Re-run |

*"Two agents re-ran. Two agents kept their original results. TRACE propagated exactly what needed to change and nothing more."*

---

## Narration Cues — Key Lines for Each Demo Beat

| Moment | Narration |
|---|---|
| Pipeline starts | *"Four AI agents are running — Triage, Remediation, Test-Impact, Deploy-Risk — each reasoning from the output of the one before it."* |
| All four done | *"In a normal pipeline, this is where it ends. But real security decisions need human review."* |
| Human correction submitted | *"A security engineer has corrected this decision. In any other system, you'd restart the whole pipeline. Watch what TRACE does instead."* |
| Cascade starts | *"TRACE walks the dependency graph of agent decisions — not code files, agent decisions — and identifies exactly which downstream work depended on the changed call."* |
| Only some agents update | *"Only the agents whose reasoning actually depended on that decision are re-running. Everything else stays valid."* |
| Final state | *"The pipeline is consistent again. No stale plans. No full restart. No wasted work."* |

---

## Timing Guide

| Phase | Target Time |
|---|---|
| Setup / intro | 30 sec |
| Demo A — initial pipeline run | 20–25 sec (waiting for Groq) |
| Demo A — correction + cascade | 30 sec narration + 15–20 sec waiting |
| Transition | 10 sec |
| Demo B — initial state review | 15 sec |
| Demo B — correction + cascade | 30 sec narration + 10–15 sec waiting |
| Summary | 20 sec |
| **Total** | **~3.5–4 min** |

---

## Fallback Plan

If Groq API is slow or unavailable during the demo:

### Fallback A — Pre-recorded screen capture
Record the full demo flow in advance. If live demo fails, play the recording.

### Fallback B — Mock mode
If Person 2 implements a `MOCK_MODE=true` env flag that returns hardcoded agent results without calling Groq, use that.

### Fallback C — Show the code
Walk through the architecture diagram and the agent output from a prior successful run (screenshot).

### Fallback D — MongoDB timeout
If MongoDB Atlas fails to connect:
- Check IP allowlist in Atlas dashboard
- Switch to local MongoDB instance if available
- Use mock data / static snapshot if implemented

### Common problems and quick fixes

| Problem | Quick fix |
|---|---|
| `GROQ_API_KEY is not set` | Add key to `.env.local` and restart `npm run dev` |
| Pipeline starts but never completes | Check browser console for network errors; check server logs |
| All agents re-run on every correction | BFS graph may not be implemented yet — report to Person 2 |
| UI doesn't update after correction | Check polling is running; check `/api/snapshot` returns fresh data |
| MongoDB connection error | Verify `MONGODB_URI` and Atlas IP allowlist |
