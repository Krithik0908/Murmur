# TRACE — Targeted Re-execution for Agent Correction and Execution

> **Hackathon:** Tenori Stateless Hackathon (Tenori Labs × Stateless × LICET)
> **Track:** Track 02 — Agentic Web, Swarms & Harnesses

---

## The Problem

DevSecOps pipelines are moving from single-step automation toward coordinated AI agents making real judgment calls — how to remediate a vulnerability, which patch to apply, whether it's safe to deploy. Full autonomy isn't trusted for these decisions yet: a wrong autonomous call can mean a broken production system, an unpatched security hole, or a compliance violation.

But today, when a human expert corrects one agent's decision mid-pipeline, **nothing propagates that correction to the other agents already reasoning from the original, now-wrong call.** They keep planning from stale information. The only fallback is restarting the entire pipeline from scratch — throwing away all the completed work.

---

## The Solution

TRACE maintains a **dependency graph of agent decisions** (not files — decisions). When a security engineer overrides one agent's output mid-run:

1. TRACE BFS-walks the dependency graph to find every downstream agent whose reasoning depended on the changed decision
2. Marks those agents as stale
3. Re-runs only those agents, injecting the corrected context into their prompts
4. Leaves everything upstream and unrelated **untouched and still valid**

No full restart. No wasted work. No stale plan silently shipping.

> *"Starlings redirect their whole flock instantly when one bird changes direction — nobody stops and re-forms the flock. We built that for agent swarms."*

---

## How TRACE Works

```
POST /api/spawn
  → run Triage          → save to MongoDB
  → run Remediation     → save
  → run Test-Impact     → save
  → run Deploy-Risk     → save

POST /api/propagate  { runId, agentId, correctionText }
  → BFS-walk graph from corrected agent
  → mark transitive dependents "stale"
  → re-invoke each stale agent with corrected upstream context
  → save updated results

GET /api/snapshot?runId=<id>
  → return current state of all agents (polled every 1–2 s by the UI)
```

---

## The Four Agents

| Agent | Depends On | Decision Vocabulary |
|---|---|---|
| **Triage** | — | `REMEDIATE` · `MONITOR` · `DISMISS` |
| **Remediation** | Triage | `UPGRADE` · `PATCH` · `PIN` · `REPLACE` · `DEFER` |
| **Test-Impact** | Remediation | `TARGETED_TESTS` · `FULL_REGRESSION` · `SMOKE_TESTS` · `NO_ADDITIONAL_TESTS` |
| **Deploy-Risk** | Remediation + Test-Impact | `GO` · `GO_WITH_GUARDRAILS` · `HOLD` |

Every agent returns: `{ decision, reasoning, summary }` — a controlled-vocabulary token, a 2–5 sentence explanation, and a 1–2 sentence UI summary.

Human corrections are injected into the prompt as an authoritative override. The agent re-evaluates its decision in light of the correction and explains the change in its reasoning.

---

## Dependency Graph

```json
{
  "triage":      [],
  "remediation": ["triage"],
  "testImpact":  ["remediation"],
  "deployRisk":  ["remediation", "testImpact"]
}
```

Correcting **Triage** cascades to all three downstream agents.
Correcting **Remediation** cascades to Test-Impact and Deploy-Risk only — Triage is upstream and is never touched.

---

## Demo Scenario

**CVE-2024-3094** — XZ Utils / liblzma supply-chain backdoor (CVSS 3.1: **10.0 CRITICAL**)

A malicious contributor (Jia Tan) injected a backdoor into xz-utils 5.6.0 and 5.6.1 that subverts OpenSSH's RSA key decryption path on systems where sshd is linked against systemd + liblzma. Our simulated production API gateway container was automatically upgraded to 5.6.1 during a routine OS image rebuild.

### Demo A — Large cascade

Correct **Triage** with: `This server does not use systemd-linked sshd. The vulnerable execution path does not exist. Treat as MONITOR only.`

→ All three downstream agents (Remediation, Test-Impact, Deploy-Risk) become stale and re-run.

### Demo B — Small cascade

Correct **Remediation** with: `Apply vendor patch instead of rebuilding the Docker image. Mark as PATCH, not PIN.`

→ Only Test-Impact and Deploy-Risk re-run. Triage stays green — untouched.

See [`demo/demo-script.md`](demo/demo-script.md) for the full step-by-step script and [`person4/demo-script.md`](person4/demo-script.md) for the detailed narrated version.

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full architecture diagram, BFS propagation walkthrough, data model, and API contract.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in real credentials in .env.local
#    GROQ_API_KEY=gsk_...        (from https://console.groq.com)
#    MONGODB_URI=mongodb+srv://... (from MongoDB Atlas)

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description | Where to get |
|---|---|---|
| `GROQ_API_KEY` | Groq API key | https://console.groq.com |
| `MONGODB_URI` | MongoDB Atlas connection string | https://cloud.mongodb.com |

---

## Running Tests

```bash
npm test
```

Tests cover the agent logic layer only (no real API calls — Groq is mocked).

```
PASS agents/__tests__/agents.test.ts
  Triage Agent          8 tests
  Remediation Agent     3 tests
  TestImpact Agent      3 tests
  DeployRisk Agent      3 tests
  Full pipeline chain   1 test
  Upstream context      1 test

Tests: 19 passed, 19 total
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Database | MongoDB Atlas + Mongoose 8 |
| Styling | Tailwind CSS 3 |
| Testing | Jest 30 + ts-jest |

---

## What TRACE Is Not

| Tool | What it does | Why it's not TRACE |
|---|---|---|
| LangGraph, CrewAI, AutoGen | Multi-agent routing and handoff | Solves routing, not correction propagation |
| Bitbucket Agentic Pipelines | Live-steer one agent mid-task | No swarm-wide propagation; single-agent |
| Bazel, Nx, Turborepo | Dependency-aware selective rebuild | Tracks file changes, not agent decisions |
| HITL research systems | Human-in-the-loop checkpoints | Pause/resume, not selective re-propagation |

TRACE's specific contribution: **human-triggered, decision-dependency-aware, selective agent re-execution** — in a domain where full autonomy is explicitly not yet trusted.

---

## Team

| Person | Ownership |
|---|---|
| **Person 1** | `agents/` — four AI agents, prompts, Groq calls, seed scenario |
| **Person 2** | `lib/orchestrator/`, `app/api/` — dependency graph, BFS, MongoDB, API routes |
| **Person 3** | `app/(ui)/`, `components/` — pipeline UI, agent cards, polling |
| **Person 4** | `person4/`, `docs/`, `demo/`, `README.md` — integration, demo, pitch |
