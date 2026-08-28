# Murmur — Live Correction Propagation for DevSecOps Agent Swarms

> **Hackathon:** Tenori Stateless Hackathon (Tenori Labs × Stateless × LICET)
> **Track:** Track 02 — Agentic Web, Swarms & Harnesses

---

## The Problem

DevSecOps pipelines are moving from single-step automation toward coordinated AI agents making real judgment calls — how to remediate a vulnerability, which patch to apply, whether to auto-deploy. Full autonomy isn't trusted for these decisions yet: even Bitbucket's own "Agentic Pipelines" feature explicitly avoids using agent output as a release gate without human review, because a wrong autonomous call can have real blast radius (broken prod, an unpatched security hole, compliance violations).

But today, when a human corrects one agent's decision mid-pipeline, **nothing propagates that correction to the other agents already reasoning from the original (now-wrong) call** — they keep planning around stale information. The only fallback is restarting the entire pipeline from scratch, which throws away all completed work and defeats the purpose of incremental automation.

---

## The Solution

A DevSecOps agent swarm — **Triage → Remediation → Test-Impact → Deploy-Risk** — working a real vulnerability-response job. When a security engineer overrides one agent's decision mid-run:

1. Traces the **dependency graph of agent decisions** (not files — decisions)
2. Identifies exactly which downstream agents' plans depended on the changed decision
3. **Re-runs only those agents**, injecting the corrected context
4. Leaves everything unrelated **untouched and still valid**

No full restart. No wasted work. No stale plan silently shipping.

> **Elevator pitch:** *"Starlings redirect their whole flock instantly when one bird changes direction — nobody stops and re-forms the flock. We built that for agent swarms."*

---

## Demo Scenario

A CVE alert comes in for a package. Four agents run in a chain:

| Agent | Depends On | Role |
|---|---|---|
| **Triage** | — | Reads the CVE, decides severity + initial fix approach |
| **Remediation** | Triage | Drafts the actual patch plan |
| **Test-Impact** | Remediation | Decides which tests need to run |
| **Deploy-Risk** | Remediation + Test-Impact | Assesses rollout risk + rollback plan |

### Two demo beats (run both live)

- **Correct Triage early** → big cascade: Remediation, Test-Impact, Deploy-Risk all re-run
- **Correct Remediation later** → small cascade: only Test-Impact and Deploy-Risk re-run; Triage untouched

Showing both proves the selectivity is real, not "restart everything" in disguise.

---

## Architecture

### Dependency Graph (hardcoded — deterministic, not AI-inferred)

```json
{
  "triage": [],
  "remediation": ["triage"],
  "testImpact": ["remediation"],
  "deployRisk": ["remediation", "testImpact"]
}
```

On a correction to agent X: BFS-walk the graph → find all transitive dependents → mark them `stale` → re-invoke each with corrected upstream context injected into its prompt.

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| LLM | Groq API (`llama-3.3-70b-versatile`) |
| Database | MongoDB Atlas |
| Hosting | Vercel |
| Real-time | 1–2s polling (no websockets) |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/spawn` | POST | Kick off the pipeline from seed CVE scenario |
| `/api/propagate` | POST | Accept human correction → BFS cascade → re-invoke downstream |
| `/api/snapshot` | GET | Current state of all agents for polling |

### Request — `/api/propagate`
```json
{ "runId": "string", "agentId": "triage|remediation|testImpact|deployRisk", "correctionText": "string" }
```

---

## Data Model

### `agentRuns` collection

```json
{
  "runId": "string",
  "agentId": "triage | remediation | testImpact | deployRisk",
  "status": "idle | running | done | stale | rerunning",
  "decision": "string",
  "reasoning": "string",
  "summary": "string",
  "dependsOn": ["string"],
  "lastUpdated": "timestamp"
}
```

### `corrections` collection (audit log + provenance trail)

```json
{
  "runId": "string",
  "agentId": "string",
  "oldDecision": "string",
  "correctionText": "string",
  "timestamp": "timestamp",
  "downstreamAffected": ["string"]
}
```

---

## Agent Prompt Contract

Each agent receives `{ scenario, upstreamContext, humanCorrection? }` and returns:

```json
{ "decision": "string", "reasoning": "string", "summary": "string" }
```

`upstreamContext` carries the decisions of all upstream dependencies. `humanCorrection`, when present, overrides what the agent would otherwise conclude and must be reflected in `decision`.

---

## Project Structure

```
Murmur/
├── agents/
│   ├── scenario.ts          ← CVE seed data (XZ Utils / CVE-2024-3094)
│   ├── triage.ts            ← Triage agent + Groq call
│   ├── remediation.ts       ← Remediation agent
│   ├── testImpact.ts        ← Test-Impact agent
│   └── deployRisk.ts        ← Deploy-Risk agent
│
├── lib/
│   ├── types.ts             ← Shared TypeScript types
│   └── orchestrator/
│       ├── graph.ts         ← Hardcoded dep graph + BFS resolver
│       ├── db.ts            ← MongoDB connection singleton
│       └── schema.ts        ← Mongoose models
│
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── (ui)/page.tsx        ← Main pipeline UI
│   └── api/
│       ├── spawn/route.ts
│       ├── propagate/route.ts
│       └── snapshot/route.ts
│
├── components/
│   ├── AgentCard.tsx        ← Card: status badge + Correct button
│   ├── PipelineView.tsx     ← Horizontal DAG + animated arrows
│   ├── EventLog.tsx         ← Timestamped event log panel
│   └── CorrectionInput.tsx  ← Inline override input
│
├── scripts/seed.ts
├── docs/architecture.md
└── demo/demo-script.md
```

---

## UI Spec

- **Main view:** horizontal pipeline of 4 cards connected by arrows that match the actual dependency graph
- **Each card:** agent name/icon, status badge, 1–2 line decision summary, "Correct" button
- **Status badges:** `Idle` / `Running` (pulsing blue) / `Done` (green) / `Stale` (amber) / `Re-running` (pulsing amber)
- **Cascade animation:** corrected card flashes → arrows light up toward dependents → downstream cards flip amber → pulse → green with updated text → unrelated cards stay visibly static
- **Event log panel:** timestamped entries e.g.
  - `Triage decided: upgrade to v3.2`
  - `Human corrected Triage → use vendor patch v2.1`
  - `Remediation re-run (dependency: Triage changed)`
  - `Deploy-Risk unaffected — untouched`

---

## Team Split

| Person | Ownership |
|---|---|
| **Person 1** | `/agents/*` — prompt files, Groq calls, scenario seed |
| **Person 2** | `/lib/orchestrator/*`, `/app/api/*` — graph, BFS, Mongo, API routes |
| **Person 3** | `/app/(ui)/*`, `/components/*` — all UI, polling |
| **Person 4** | `/scripts/*`, `/docs/*`, `/demo/*` — README, architecture, seed script, demo rehearsal |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys
cp .env.example .env.local

# 3. Run dev server
npm run dev
```

### Environment Variables

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/murmur
GROQ_API_KEY=gsk_...
```

---

## Prior Art — What This Is Not

| Tool | What it does | Why it's not this |
|---|---|---|
| LangGraph, CrewAI, AutoGen | Multi-agent handoff/orchestration | Solves routing, not correction propagation |
| Bitbucket Agentic Pipelines | Live-steer one agent mid-task | No swarm-wide propagation; single-agent + human-gated |
| Bazel, Nx, Turborepo | Dependency-aware selective rebuild | Tracks file changes, not agent decisions |
| SAFEFLOW, OxyMake | Dependency DAG over agent ops | Triggered by system error detection, never by a human correction |
| A2A, AP2, ERC-8004 | Agent identity/reputation/marketplace | Solves *which* agent to trust, not what happens when a trusted agent's decision changes mid-flight |

---

## What's Unique

Nobody combines: **(1)** a human live-correcting one agent's decision mid-swarm, **(2)** automatic selective propagation to only the downstream agents whose reasoning depended on it, **(3)** without a full restart.

Every piece exists separately and is proven elsewhere — this wires them together for the **human-correction case**, in a domain where full autonomy is explicitly not trusted yet.
