# TRACE Architecture

## Overview

TRACE is a Next.js application demonstrating selective correction propagation across a four-agent DevSecOps AI pipeline. When a human expert overrides one agent's decision mid-run, TRACE identifies the downstream agents whose reasoning depended on that decision and re-runs only those agents with the corrected context injected.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js Frontend)                  │
│                                                                     │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │  Triage  │→ │Remediation │→ │Test-Impact │→ │ Deploy-Risk  │   │
│  │   Card   │  │   Card     │  │   Card     │  │    Card      │   │
│  └──────────┘  └────────────┘  └────────────┘  └──────────────┘   │
│        │              │               │                │            │
│  [Correct]      [Correct]        [Correct]        [Correct]         │
│                                                                     │
│  ←──── GET /api/snapshot?runId=<id>  (polling every 1–2 s) ──────→ │
└────────────────────────────┬────────────────────────────────────────┘
                             │ POST /api/spawn
                             │ POST /api/propagate
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Person 2)                    │
│                                                                     │
│  /api/spawn       → sequential agent invocation, stores results    │
│  /api/propagate   → BFS cascade on correction, re-invokes agents   │
│  /api/snapshot    → reads current agentRuns from MongoDB           │
└───────────┬────────────────────────┬────────────────────────────────┘
            │                        │
            ▼                        ▼
┌───────────────────┐    ┌───────────────────────────────────────────┐
│   MongoDB Atlas   │    │          Agent Logic Layer (Person 1)     │
│                   │    │                                           │
│  agentRuns        │    │  runTriageAgent(input)     → AgentResult  │
│  corrections      │    │  runRemediationAgent(input) → AgentResult │
│                   │    │  runTestImpactAgent(input)  → AgentResult │
└───────────────────┘    │  runDeployRiskAgent(input)  → AgentResult │
                         │                                           │
                         │  ↓ each agent calls:                     │
                         │  Groq API (llama-3.3-70b-versatile)      │
                         └───────────────────────────────────────────┘
```

---

## Agent Pipeline & Dependency Graph

```
Triage
  └─→ Remediation          (depends on: Triage)
          └─→ Test-Impact   (depends on: Remediation)
          └─→ Deploy-Risk   (depends on: Remediation, Test-Impact)
```

The dependency graph is hardcoded in `lib/orchestrator/graph.ts`:

```json
{
  "triage":      [],
  "remediation": ["triage"],
  "testImpact":  ["remediation"],
  "deployRisk":  ["remediation", "testImpact"]
}
```

---

## Correction Propagation — How BFS Works

1. Human submits a correction for agent X via `POST /api/propagate`
2. TRACE reverse-walks the dependency graph: finds all agents Y where X ∈ Y.dependsOn (transitively)
3. All found agents are marked `stale` in MongoDB
4. TRACE re-invokes each stale agent in topological order, injecting:
   - The corrected upstream result(s)
   - The `humanCorrection` text (into the corrected agent's prompt only)
5. Results are saved to MongoDB as `done`
6. Frontend polling picks up the new state

### Example — Correcting Triage

| Agent | Before correction | After BFS | Re-run? |
|---|---|---|---|
| Triage | done: REMEDIATE | done: MONITOR | Yes (the corrected agent) |
| Remediation | done: PIN | stale → done: DEFER | Yes |
| Test-Impact | done: SMOKE_TESTS | stale → done: NO_ADDITIONAL_TESTS | Yes |
| Deploy-Risk | done: GO_WITH_GUARDRAILS | stale → done: HOLD | Yes |

### Example — Correcting Remediation

| Agent | Before correction | After BFS | Re-run? |
|---|---|---|---|
| Triage | done: REMEDIATE | done: REMEDIATE | **No — untouched** |
| Remediation | done: PIN | done: PATCH | Yes (the corrected agent) |
| Test-Impact | done: SMOKE_TESTS | stale → done: TARGETED_TESTS | Yes |
| Deploy-Risk | done: GO_WITH_GUARDRAILS | stale → done: GO_WITH_GUARDRAILS | Yes |

---

## Agent Contract

Every agent function signature:

```ts
runTriageAgent(input: AgentInput): Promise<AgentResult>
runRemediationAgent(input: AgentInput): Promise<AgentResult>
runTestImpactAgent(input: AgentInput): Promise<AgentResult>
runDeployRiskAgent(input: AgentInput): Promise<AgentResult>
```

**AgentInput:**
```ts
{
  scenario: Scenario;                        // CVE + application context
  dependencyContext: DependencyContext;       // package metadata
  upstreamContext?: UpstreamContext | UpstreamContext[] | null;
  humanCorrection?: string | null;
}
```

**AgentResult (external contract — stored in MongoDB):**
```ts
{
  decision: string;   // controlled vocabulary token
  reasoning: string;  // 2–5 sentences
  summary: string;    // 1–2 sentences (card subtitle)
}
```

---

## Decision Vocabularies

| Agent | Valid Decisions |
|---|---|
| Triage | `REMEDIATE` · `MONITOR` · `DISMISS` |
| Remediation | `UPGRADE` · `PATCH` · `PIN` · `REPLACE` · `DEFER` |
| Test-Impact | `TARGETED_TESTS` · `FULL_REGRESSION` · `SMOKE_TESTS` · `NO_ADDITIONAL_TESTS` |
| Deploy-Risk | `GO` · `GO_WITH_GUARDRAILS` · `HOLD` |

---

## MongoDB Data Model

### `agentRuns` collection

```json
{
  "runId":       "string (UUID)",
  "agentId":     "triage | remediation | testImpact | deployRisk",
  "status":      "idle | running | done | stale | rerunning",
  "decision":    "string",
  "reasoning":   "string",
  "summary":     "string",
  "dependsOn":   ["string"],
  "lastUpdated": "Date"
}
```

### `corrections` collection (audit log)

```json
{
  "runId":               "string",
  "agentId":             "string",
  "oldDecision":         "string",
  "correctionText":      "string",
  "timestamp":           "Date",
  "downstreamAffected":  ["string"]
}
```

---

## API Routes

| Route | Method | Body / Query | Purpose |
|---|---|---|---|
| `/api/spawn` | POST | `{}` | Start new pipeline run with primary CVE scenario |
| `/api/propagate` | POST | `{ runId, agentId, correctionText }` | Submit human correction → BFS cascade |
| `/api/snapshot` | GET | `?runId=<id>` | Return current state of all agents for a run |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Database | MongoDB Atlas + Mongoose 8 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Testing | Jest 30 + ts-jest |
| Hosting | Vercel |

---

## File Structure

```
Murmur/
├── agents/
│   ├── index.ts          ← Public barrel (import agents from here)
│   ├── shared.ts         ← Groq client, JSON parsing, validation
│   ├── triage.ts         ← runTriageAgent()
│   ├── remediation.ts    ← runRemediationAgent()
│   ├── testImpact.ts     ← runTestImpactAgent()
│   ├── deployRisk.ts     ← runDeployRiskAgent()
│   ├── scenario.ts       ← CVE-2024-3094 seed data (+ CVE-2021-44228)
│   └── __tests__/
│       └── agents.test.ts
│
├── lib/
│   ├── types.ts          ← Shared TypeScript types
│   └── orchestrator/
│       ├── graph.ts      ← Dependency graph + BFS resolver
│       ├── db.ts         ← MongoDB connection singleton
│       └── schema.ts     ← Mongoose models (agentRuns, corrections)
│
├── app/
│   ├── layout.tsx        ← Root Next.js layout
│   ├── globals.css
│   ├── (ui)/page.tsx     ← Main pipeline UI
│   └── api/
│       ├── spawn/route.ts
│       ├── propagate/route.ts
│       └── snapshot/route.ts
│
├── components/
│   ├── AgentCard.tsx     ← Card: status badge + Correct button
│   ├── PipelineView.tsx  ← Horizontal DAG + animated arrows
│   ├── EventLog.tsx      ← Timestamped event log panel
│   └── CorrectionInput.tsx
│
├── person4/              ← Demo, pitch, integration docs
├── docs/architecture.md  ← This file
├── demo/demo-script.md   ← Canonical demo script copy
└── .env.example          ← Environment variable template
```
