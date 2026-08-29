# Murmur — Live Correction Propagation for DevSecOps Agent Swarms

> **Hackathon:** Tenori Stateless Hackathon (Tenori Labs × Stateless × LICET)  
> **Track:** Track 02 — Agentic Web, Swarms & Harnesses  
> **Aesthetic:** Vexel AI Flat Editorial System (pure black, sharp edges, `#0083ff` blue primary accent)

---

## The Problem

DevSecOps pipelines are moving from single-step automation toward coordinated AI agents making real judgment calls — how to remediate a vulnerability, which patch to apply, and whether it's safe to deploy. Full autonomy isn't trusted for these critical release-gate decisions yet: a wrong autonomous call can result in a broken production system, an unpatched security hole, or a compliance violation.

But today, when a human expert corrects one agent's decision mid-pipeline, **nothing propagates that correction to the other agents already reasoning from the original, now-wrong call.** They keep planning from stale information. The only fallback is restarting the entire pipeline from scratch, throwing away all completed work.

---

## The Solution

Murmur maintains a **dependency graph of agent decisions** (not files — decisions). When a security engineer overrides one agent's output mid-run:

1. **Graph Traversal:** Murmur walks the dependency graph using a Breadth-First Search (BFS) to identify every downstream agent whose reasoning depended on the changed decision.
2. **State Invalidation:** Downstream dependent agents are marked as `stale`.
3. **Targeted Re-execution:** Only the stale agents re-run, injecting the corrected context into their prompts.
4. **Conservation:** Everything upstream and unrelated remains **untouched, static, and still valid**.

No full restart. No wasted work. No stale plan silently shipping.

> *"Starlings redirect their whole flock instantly when one bird changes direction — nobody stops and re-forms the flock. We built that for agent swarms."*

---

## How Murmur Works

```
POST /api/spawn
  → Connects DB (Atlas or local fallback)
  → Runs Triage, Remediation, Test-Impact, Deploy-Risk in sequence
  → Saves run document state

POST /api/propagate  { runId, agentId, correctionText }
  → Performs BFS-walk from corrected agent node
  → Marks transitive dependents "stale" in DB
  → Asynchronously re-invokes affected agents with the human override context

GET /api/snapshot?runId=<id>
  → Returns current state of all agents (polled by the UI to draw real-time flow)
```

---

## The Swarm Graph

```
  ┌─────────┐       ┌──────────────┐       ┌─────────────┐
  │ Triage  │ ────▶ │ Remediation  │ ────▶ │ Test Impact │
  └─────────┘       └──────────────┘       └─────────────┘
                           │                      │
                           │                      ▼
                           └───────────────▶ ┌─────────────┐
                                             │ Deploy Risk │
                                             └─────────────┘
```

```json
{
  "triage":      [],
  "remediation": ["triage"],
  "testImpact":  ["remediation"],
  "deployRisk":  ["remediation", "testImpact"]
}
```

* **Large Cascade:** Correcting **Triage** cascades to all three downstream agents.
* **Small Cascade:** Correcting **Remediation** cascades to Test-Impact and Deploy-Risk only — Triage is upstream and remains static.

---

## Setup & Run

### 1. Configure Environment
Copy the env template:
```bash
cp .env.example .env.local
```
Fill in your credentials in `.env.local`:
```env
MONGODB_URI=mongodb+srv://...
GROQ_API_KEY=gsk_...
```

### 2. Install & Start Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

> [!TIP]
> **Zero-Config/Offline Support:** Murmur features a **Hybrid DB mode**. If it cannot connect to MongoDB Atlas (e.g. port 27017 is blocked by a college firewall), it automatically falls back to a local, fast in-memory database store so the demo runs instantly and offline out-of-the-box.

---

## Technology Stack

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript 5
* **LLM Engine:** Groq API — `openai/gpt-oss-20b` (extremely fast, low latency)
* **Database:** MongoDB Atlas (Production) / Local In-Memory Store (Offline/Local Fallback)
* **Design & Styling:** Vexel AI Theme (Pure black `#000000`, surfaces `#141414`, borders `#222222`, primary `#0083ff`)
* **Testing:** Jest 30 + ts-jest

---

## What Murmur Is Not

| System | What it does | Why it's not Murmur |
|---|---|---|
| LangGraph, CrewAI | Multi-agent routing | Solves routing, not correction propagation |
| Bitbucket Agentic Pipelines | Live-steer one agent | Single-agent execution, no swarm-wide cascade |
| Bazel, Turborepo | Selective rebuild | Tracks file changes, not agent decisions |

Murmur's specific contribution: **human-triggered, decision-dependency-aware, selective agent re-execution** — in a domain where full autonomy is explicitly not yet trusted.
