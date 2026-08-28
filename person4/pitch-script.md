# TRACE — Pitch Script & Presentation Guide
# Person 4 — Pitch Preparation

**Presentation length:** 3–4 minutes  
**Audience:** Hackathon judges, technical evaluators  
**Format:** Live demo + verbal pitch

---

## The One-Line Pitch

> **"When a human corrects one AI agent's decision mid-pipeline, TRACE automatically finds every downstream agent that reasoned from that decision and re-runs only those — leaving everything else untouched."**

---

## Full Pitch Script (3.5–4 min)

### Opening — The Problem (30 sec)

*"DevSecOps pipelines are moving toward AI agents making real decisions — which vulnerabilities to fix, how to fix them, whether it's safe to deploy. These aren't toy decisions. A wrong call means a broken production system or an unpatched security hole.*

*But here's the problem that nobody has solved yet: when a human expert corrects one agent's decision mid-pipeline, the agents downstream are already planning from the original, now-wrong call. Today, the only fix is to restart everything from scratch — throwing away all the completed work."*

---

### The Insight (20 sec)

*"We noticed that agent decisions have a dependency structure — just like code. Agent B depends on Agent A's output. Agent C depends on B. Agent D depends on both B and C.*

*When A's output changes, only B, C, and D need to update. Not agents that come before A. Not agents that don't use A's output at all."*

---

### The Solution — TRACE (20 sec)

*"TRACE tracks the dependency graph of agent decisions. When a human corrects any agent, TRACE does a BFS walk of that graph, finds exactly which downstream agents depended on the changed decision, marks them stale, and re-runs only those — injecting the corrected context into their prompts.*

*No full restart. No wasted work. No stale plan silently shipping."*

---

### Live Demo (see Demo Script) (~90 sec)

> *Run Demo A and Demo B here. The demo is the centrepiece of the pitch.*

Key things to say during the demo:

- **When the cascade starts:** *"Watch which cards update and which cards stay still."*
- **When Triage doesn't change in Demo B:** *"Triage is upstream of Remediation — correcting Remediation has no effect on Triage. TRACE knows this."*
- **When all agents finish:** *"Consistent pipeline. Under 20 seconds."*

---

### Why This Is Hard (20 sec)

*"This sounds simple, but it requires solving three things at the same time: knowing the dependency structure between agent decisions — not files, not data, decisions — detecting that a human correction invalidates downstream reasoning, and re-running agents with the corrected context rather than their original inputs. Doing all three together, triggered by a human override, is what TRACE adds."*

---

### What Already Exists (20 sec)

*"LangGraph and CrewAI handle agent routing and handoff. Bazel and Nx do dependency-aware selective rebuilds — but they track file changes, not decision changes. Bitbucket's Agentic Pipelines let a human steer one agent mid-task — but there's no swarm-wide propagation. TRACE combines the decision-dependency idea with human-triggered re-evaluation, in a domain where full autonomy isn't trusted yet."*

---

### Real-World Impact (15 sec)

*"Security engineers reviewing vulnerability responses, release managers deciding whether to deploy, compliance teams auditing AI-assisted decisions — in all these cases, a human expert needs to be able to correct the AI mid-stream without restarting from zero. TRACE makes that possible."*

---

### Tech Stack (10 sec)

*"Next.js frontend, Groq API with Llama 3.3 70B for the four agents, MongoDB Atlas for state, polling for real-time updates. All running on Vercel. All TypeScript."*

---

### Close (10 sec)

*"Starlings redirect their whole flock instantly when one bird changes direction — nobody stops and reforms the flock. We built that for AI agent swarms. This is TRACE."*

---

## Judge Questions — Prepared Answers

**Q: Why not just restart the pipeline?**
> A restart is O(n) — you re-run every agent regardless of whether their inputs changed. TRACE is O(affected) — it re-runs only the agents whose reasoning actually depended on the changed decision. In a long pipeline with many parallel or sequential agents, the difference compounds.

**Q: How do you know which agents depend on which?**
> The dependency graph is hardcoded and deterministic — not AI-inferred. For this domain (security pipelines), the structure is stable and known: Triage → Remediation → Test-Impact; Remediation + Test-Impact → Deploy-Risk. This is a deliberate design choice: correctness over flexibility.

**Q: What if the human correction is wrong?**
> TRACE propagates what the human says. The agent prompts include the correction text and instruct the model to re-evaluate in light of it — not to blindly accept it, but to reflect it. The corrections are also written to an audit log, so every override has a provenance trail.

**Q: Is this a new idea?**
> The components exist separately: dependency-aware execution (Bazel), human-in-the-loop overrides (HITL research), agent pipelines (LangGraph). What's new is combining them specifically for the human-correction case in a live running swarm, in a domain where full autonomy is not yet trusted.

**Q: Does the cascade slow things down?**
> Only affected agents are re-run. Groq's Llama 3.3 70B responses take ~3–5 seconds each. In the worst case (correcting the first agent), three agents re-run — ~10–15 seconds total. That's fast enough for a human-in-the-loop workflow.

**Q: What's next for TRACE?**
> Dynamic dependency graphs (not hardcoded), parallel re-execution of independent affected agents, confidence scores on agent decisions that factor into BFS traversal depth, and extension to non-security pipelines.

---

## Key Differentiators — One-liners for Judges

| Claim | Evidence in code |
|---|---|
| Real AI agents | 4 Groq-backed agents with production-quality prompts (`agents/`) |
| Real vulnerability | CVE-2024-3094, XZ Utils CVSS 10.0, real advisory text |
| Real cascade logic | BFS on hardcoded dependency graph (`lib/orchestrator/graph.ts`) |
| Human correction works | `humanCorrection` field in every agent prompt, reflected in decision |
| Audit trail | `corrections` MongoDB collection with `downstreamAffected` |
| Tested | 19/19 unit tests passing on agent logic layer |

---

## Pitch Deck Slide Outline

If a slide deck is needed for submission or display:

| Slide | Title | Content |
|---|---|---|
| 1 | TRACE | Tagline + team |
| 2 | The Problem | "When a human corrects one agent, nothing propagates" |
| 3 | The Insight | Decision dependency graph diagram |
| 4 | How TRACE Works | BFS walk diagram (before/after correction) |
| 5 | Live Demo | (switch to browser) |
| 6 | Architecture | Stack diagram: Next.js → Groq → MongoDB |
| 7 | What Makes It Different | Prior art table |
| 8 | Real-World Impact | Security / compliance use cases |
| 9 | Future Scope | Dynamic graphs, parallel re-execution, confidence scores |
| 10 | TRACE | Closing tagline + team |
