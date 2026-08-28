# TRACE Integration Map & Notes
# Person 4 — Integration Assessment

Status as of: 2026-08-28
Assessed by: Person 4

---

## 1. File Ownership Map

| File / Directory | Owner | Status |
|---|---|---|
| `agents/triage.ts` | Person 1 | ✅ Complete |
| `agents/remediation.ts` | Person 1 | ✅ Complete |
| `agents/testImpact.ts` | Person 1 | ✅ Complete |
| `agents/deployRisk.ts` | Person 1 | ✅ Complete |
| `agents/shared.ts` | Person 1 | ✅ Complete |
| `agents/scenario.ts` | Person 1 | ✅ Complete (CVE-2024-3094 primary + CVE-2021-44228 secondary) |
| `agents/index.ts` | Person 1 | ✅ Complete (public barrel) |
| `agents/__tests__/agents.test.ts` | Person 1 | ✅ 19/19 tests passing |
| `lib/types.ts` | Person 1 | ✅ Complete |
| `lib/orchestrator/graph.ts` | Person 2 | ❌ Empty stub |
| `lib/orchestrator/db.ts` | Person 2 | ❌ Empty stub |
| `lib/orchestrator/schema.ts` | Person 2 | ❌ Empty stub |
| `app/api/spawn/route.ts` | Person 2 | ❌ Empty stub |
| `app/api/propagate/route.ts` | Person 2 | ❌ Empty stub |
| `app/api/snapshot/route.ts` | Person 2 | ❌ Empty stub |
| `app/(ui)/page.tsx` | Person 3 | ❌ Empty stub |
| `app/layout.tsx` | Person 3 | ❌ Empty stub |
| `components/AgentCard.tsx` | Person 3 | ❌ Empty stub |
| `components/PipelineView.tsx` | Person 3 | ❌ Empty stub |
| `components/EventLog.tsx` | Person 3 | ❌ Empty stub |
| `components/CorrectionInput.tsx` | Person 3 | ❌ Empty stub |
| `scripts/seed.ts` | Person 4 | ❌ Empty stub (see below) |
| `docs/architecture.md` | Person 4 | ✅ Being created |
| `demo/demo-script.md` | Person 4 | ✅ Being created |
| `README.md` | Person 4 | 🟡 Exists (hackathon spec, update pending) |

---

## 2. Integration Map — Data Flow

```
[Browser UI] ←── polling every 1–2 s ──→ GET /api/snapshot?runId=<id>
     │
     ├─ "Start Pipeline" button ──→ POST /api/spawn
     │                                   │
     │                              Person 2: spawn handler
     │                              - reads PRIMARY_AGENT_INPUT from agents/scenario.ts
     │                              - creates MongoDB agentRuns docs (status: idle)
     │                              - calls runTriageAgent() → saves result → done
     │                              - calls runRemediationAgent(triageResult) → saves → done
     │                              - calls runTestImpactAgent([triage, remediation]) → saves → done
     │                              - calls runDeployRiskAgent([triage, rem, test]) → saves → done
     │
     └─ "Correct" button ──────→ POST /api/propagate
                                      │
                                 Person 2: propagate handler
                                 - receives { runId, agentId, correctionText }
                                 - BFS walks dependency graph to find transitive dependents
                                 - marks dependents as "stale" in MongoDB
                                 - re-calls affected agents with:
                                     humanCorrection = correctionText
                                     upstreamContext = corrected upstream results
                                 - saves new results to MongoDB
                                 - writes audit entry to corrections collection

[MongoDB Atlas]
  agentRuns collection:
    { runId, agentId, status, decision, reasoning, summary, dependsOn, lastUpdated }

  corrections collection:
    { runId, agentId, oldDecision, correctionText, timestamp, downstreamAffected }
```

---

## 3. Integration Contracts — Verified

### Person 1 → Person 2 contract (VERIFIED ✅)

Person 1 exports from `agents/index.ts`:
```ts
runTriageAgent(input: AgentInput): Promise<AgentResult>
runRemediationAgent(input: AgentInput): Promise<AgentResult>
runTestImpactAgent(input: AgentInput): Promise<AgentResult>
runDeployRiskAgent(input: AgentInput): Promise<AgentResult>
```

Every agent returns:
```ts
{ decision: string; reasoning: string; summary: string }
```

This matches the MongoDB `agentRuns` schema fields `decision`, `reasoning`, `summary` described in the README.

`AgentInput.humanCorrection: string | null` — maps directly to the `correctionText` field in the `/api/propagate` request body.

`AgentInput.upstreamContext: UpstreamContext | UpstreamContext[] | null` — Person 2 must wrap prior agent results as `{ agent, decision, reasoning, summary }` before passing as upstream.

### Person 1 → Person 3 contract (VERIFIED ✅)

The `AgentResult` fields `decision`, `reasoning`, `summary` match what the UI spec expects to display.

Agent IDs used by Person 1: `"triage" | "remediation" | "testImpact" | "deployRisk"` (camelCase).

Status values expected by UI (from README): `idle | running | done | stale | rerunning` — these are Person 2's responsibility to write to MongoDB.

---

## 4. Integration Issues Found

### ISSUE-001 — Person 2 stubs are all empty
**Component:** `lib/orchestrator/graph.ts`, `db.ts`, `schema.ts`, all API routes
**Expected:** BFS graph, MongoDB connection, Mongoose schemas, three API route handlers
**Actual:** All files are empty (0 bytes)
**Impact:** CRITICAL — the application cannot run at all without these
**Recommended minimal fix:** Person 2 must implement these; the agent contracts are ready and waiting
**Owner:** Person 2

### ISSUE-002 — Person 3 stubs are all empty
**Component:** `app/(ui)/page.tsx`, `app/layout.tsx`, all components
**Expected:** Pipeline view UI, agent cards, correction input, event log, polling loop
**Actual:** All files are empty (0 bytes)
**Impact:** CRITICAL — no UI exists
**Recommended minimal fix:** Person 3 must implement these; the API contract is defined in README
**Owner:** Person 3

### ISSUE-003 — `scripts/seed.ts` is empty
**Component:** `scripts/seed.ts`
**Expected:** A script that seeds MongoDB with initial agent state for a run
**Actual:** Empty
**Impact:** LOW — demo can be triggered via POST /api/spawn without the seed script
**Recommended minimal fix:** Person 4 will implement this (it is Person 4's file)
**Owner:** Person 4 (this document author)

### ISSUE-004 — Agent ID casing must be consistent
**Component:** Cross-cutting
**Expected:** Agent IDs in camelCase: `triage`, `remediation`, `testImpact`, `deployRisk`
**Actual:** Person 1 uses camelCase throughout ✅. Person 2 (when implemented) must use the same casing in MongoDB documents and the dependency graph keys.
**Impact:** MEDIUM — mismatched casing would break the BFS lookup
**Recommended minimal fix:** Person 2 should use the same keys as in the README dependency graph:
  ```json
  { "triage": [], "remediation": ["triage"], "testImpact": ["remediation"], "deployRisk": ["remediation", "testImpact"] }
  ```
**Owner:** Person 2 (to confirm when implementing graph.ts)

### ISSUE-005 — `app/layout.tsx` is empty — Next.js will fail to build
**Component:** `app/layout.tsx`
**Expected:** Root layout with HTML/body wrapper (required by Next.js App Router)
**Actual:** Empty
**Impact:** CRITICAL — `npm run dev` and `npm run build` will fail without a root layout
**Recommended minimal fix:** Person 3 must add at minimum:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
```
**Owner:** Person 3

### ISSUE-006 — No `GROQ_API_KEY` or `MONGODB_URI` in `.env.local`
**Component:** Runtime environment
**Expected:** `.env.local` with real keys for demo
**Actual:** Only `.env.example` with placeholder values
**Impact:** CRITICAL for demo — agents will throw "GROQ_API_KEY is not set" on first call
**Recommended minimal fix:** Before demo, copy `.env.example` → `.env.local` and fill in real keys
**Owner:** All (setup task, coordinate before demo)

---

## 5. Pre-Integration Checklist for Person 2

When Person 2 implements their files, verify:

- [ ] `lib/orchestrator/graph.ts` exports a dependency graph with keys matching `AgentId` type (`triage | remediation | testImpact | deployRisk`)
- [ ] `lib/orchestrator/schema.ts` Mongoose schema includes fields: `runId`, `agentId`, `status`, `decision`, `reasoning`, `summary`, `dependsOn`, `lastUpdated`
- [ ] `lib/orchestrator/db.ts` exports a MongoDB connection singleton compatible with Next.js serverless (no persistent connection issues)
- [ ] `POST /api/spawn` imports `PRIMARY_AGENT_INPUT` from `@/agents` and calls `runTriageAgent`, `runRemediationAgent`, `runTestImpactAgent`, `runDeployRiskAgent` in sequence
- [ ] `POST /api/propagate` accepts `{ runId, agentId, correctionText }` — matches README spec
- [ ] `GET /api/snapshot` accepts `?runId=<id>` — returns array of agentRun documents
- [ ] When passing human correction, Person 2 uses `humanCorrection: correctionText` (not `correction` or `override`)
- [ ] When passing upstream context, Person 2 wraps the MongoDB doc as `{ agent, decision, reasoning, summary }` matching `UpstreamContext` type

---

## 6. Pre-Integration Checklist for Person 3

When Person 3 implements their files, verify:

- [ ] `app/layout.tsx` is not empty (Next.js will crash)
- [ ] Polling calls `GET /api/snapshot?runId=<runId>` (not `/api/status` or other variant)
- [ ] "Start" / "Run Pipeline" action calls `POST /api/spawn` (not `/api/run`)
- [ ] "Correct" action calls `POST /api/propagate` with body `{ runId, agentId, correctionText }`
- [ ] Status badges handle all five states: `idle`, `running`, `done`, `stale`, `rerunning`
- [ ] Agent card displays `decision`, `reasoning` (or `summary`) from the snapshot response
- [ ] Agent IDs displayed must match: `triage`, `remediation`, `testImpact`, `deployRisk`

---

## 7. Build Status

```
npm test → 19/19 PASS (Person 1 agent logic layer only)
npm run dev → NOT TESTED (requires Person 2 + Person 3 stubs to be filled)
npm run build → NOT TESTED (will fail without layout.tsx + page.tsx)
```
