# TRACE — Fallback Plan
# Person 4 — Demo Contingency

This document describes what to do when things go wrong during the live demo.

---

## Tier 1 — Quick Recoveries (< 30 seconds)

### Problem: "GROQ_API_KEY is not set" error in browser console or server logs

**Fix:**
1. Open `.env.local` in a text editor
2. Confirm `GROQ_API_KEY=gsk_...` is present and not the placeholder
3. Stop and restart `npm run dev`
4. Reload the browser

**Prevention:** Run through the pre-demo checklist. Always verify the key before stepping on stage.

---

### Problem: MongoDB connection error / timeout

**Fix:**
1. Open MongoDB Atlas dashboard in another browser tab
2. Go to Network Access → IP Access List
3. Add current IP address (or temporarily allow 0.0.0.0/0)
4. Wait 30 seconds and retry

**Prevention:** Set the Atlas IP allowlist to 0.0.0.0/0 before the demo and restore it afterward.

---

### Problem: Pipeline starts but one agent card never leaves "Running" state

**Fix:**
1. Open browser developer tools → Console tab
2. Look for a red error from `/api/spawn` or `/api/propagate`
3. If it's a Groq timeout: wait — Groq occasionally has slow responses
4. If it's a 500 error: check server terminal for the stack trace
5. If stuck for > 30 seconds: refresh and start again

---

### Problem: Correction submitted but cascade doesn't trigger (all cards stay green)

**Possible cause:** `/api/propagate` may not have BFS logic implemented yet (Person 2 stub).

**Fix (demo-time):**
1. Switch to Fallback B (screen recording) immediately
2. Do not attempt to debug live

---

## Tier 2 — Switch to Recording (30–90 seconds)

If any live demo step fails and cannot be recovered in 30 seconds:

1. Say: *"Let me show you a recorded run from our rehearsal while we sort this out."*
2. Switch browser tab to the pre-recorded demo video
3. Play the recording (have it cued to the correct start point)
4. Continue narrating over the recording as if it were live

**Required recordings to prepare in advance:**
- Full Demo A run (initial pipeline + Triage correction + cascade)
- Full Demo B run (fresh pipeline + Remediation correction + selective cascade)
- Save as MP4 or WebM, muted, no recording artifacts

---

## Tier 3 — Code Walkthrough (last resort)

If recording is also unavailable:

1. Open `agents/triage.ts` — show the system prompt and decision vocabulary
2. Open `agents/scenario.ts` — show the real CVE-2024-3094 seed data
3. Open `lib/types.ts` — show the `AgentResult` contract
4. Open `person4/integration-notes.md` — show the dependency graph diagram
5. Walk through the flow verbally: *"Here's the system prompt, here's the input, here's the output contract. The BFS graph says triage → remediation → test-impact and remediation → deploy-risk..."*
6. Show the passing test run: `npm test` in terminal (19/19 green)

---

## Scenario-Specific Fallbacks

### Demo A — Triage correction fallback narration
If the cascade doesn't visually animate, describe what it does:

*"In the background, TRACE has received the correction, walked the graph, and re-queued Remediation, Test-Impact, and Deploy-Risk. In a working deployment, you'd see the status badges turn amber and then green. The data model enforces this — let me show you the API contract."*

### Demo B — Selective cascade fallback
If Triage incorrectly updates when Remediation is corrected:

*"That's a known issue with the current integration — the BFS direction check needs to be confirmed. The architecture is designed so that Triage is upstream of Remediation, not downstream, so Triage should not be affected. The agent logic and the graph spec are both correct — this is an integration wire-up issue we're aware of."*

---

## Communication Plan

If something goes badly wrong:

| Person | Responsibility during failure |
|---|---|
| Presenter | Keep narrating, stay calm, switch to fallback |
| Person 2 | Ready at keyboard to check logs if needed |
| Person 3 | Have recording open in adjacent tab |
| Person 1 | Ready to show test output: `npm test` |

---

## Asset Checklist

Prepare these before demo day:

- [ ] MP4/WebM recording of Demo A (full, no cuts)
- [ ] MP4/WebM recording of Demo B (full, no cuts)
- [ ] Screenshots: all four agents in Done state (initial run)
- [ ] Screenshots: after Triage correction (Demo A final state)
- [ ] Screenshots: after Remediation correction (Demo B final state — Triage unchanged)
- [ ] Terminal window showing `npm test` output (19/19 pass)
- [ ] This fallback plan printed or open on a phone
