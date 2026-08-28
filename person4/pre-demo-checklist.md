# TRACE — Pre-Demo Checklist
# Person 4 — Quality Assurance

Use this checklist before every demo rehearsal and before the live demo.

---

## Environment Setup

- [ ] `.env.local` exists (copied from `.env.example`)
- [ ] `GROQ_API_KEY` in `.env.local` is a real, active key (not the placeholder)
- [ ] `MONGODB_URI` in `.env.local` points to a reachable MongoDB Atlas cluster
- [ ] MongoDB Atlas IP Access List includes your current IP address (or 0.0.0.0/0 for demo safety)
- [ ] `npm install` has been run on the current checkout (no missing packages)

## Build Verification

- [ ] `npm test` → all tests pass (expected: 19/19)
- [ ] `npm run dev` starts without errors on `http://localhost:3000`
- [ ] Browser console shows no uncaught errors on page load
- [ ] `/api/spawn` responds to a test POST request (use curl or Postman if available)
- [ ] `/api/snapshot?runId=<any>` responds (even if empty) without a 500 error

## UI Verification

- [ ] Pipeline cards are visible for all four agents: Triage, Remediation, Test-Impact, Deploy-Risk
- [ ] Status badges are visible (Idle state by default)
- [ ] "Start Pipeline" (or equivalent) button is visible and clickable
- [ ] "Correct" button appears on each card (or is conditionally shown after Done)
- [ ] Correction input field accepts text

## Pipeline Run Verification

- [ ] Click "Start Pipeline" → all four agents reach `Done` state within 60 seconds
- [ ] Each card shows a `decision`, `reasoning`/`summary` after completion
- [ ] Event log shows pipeline progress entries

## Correction Cascade Verification (Demo A)

- [ ] Click Correct on Triage with text: `This server does not use systemd-linked sshd. Treat as MONITOR only.`
- [ ] Triage card updates to `MONITOR` (or similar reduced-risk decision)
- [ ] Remediation, Test-Impact, Deploy-Risk all go `Stale` → `Re-running` → `Done`
- [ ] Updated decisions are different from the original run (DEFER / NO_ADDITIONAL_TESTS expected)

## Correction Cascade Verification (Demo B)

- [ ] Start a fresh pipeline run (click Start Pipeline again)
- [ ] Click Correct on Remediation with text: `Apply vendor patch instead of rebuilding. Mark as PATCH.`
- [ ] Triage card does NOT change (stays green / untouched)
- [ ] Test-Impact and Deploy-Risk go `Stale` → `Re-running` → `Done`
- [ ] Remediation shows PATCH decision

## Performance

- [ ] Groq API response time < 15 seconds per agent (monitor during rehearsal)
- [ ] Total pipeline run time < 60 seconds
- [ ] Correction cascade completes within 30 seconds

## Fallback Assets Ready

- [ ] Screen recording of a successful full demo run saved locally
- [ ] Screenshots of each agent card in Done state (both before and after correction)
- [ ] `person4/fallback-plan.md` reviewed and understood by all team members

---

## Sign-off

| Check | By | Time |
|---|---|---|
| Environment setup | | |
| Build verification | | |
| Rehearsal run 1 (full Demo A + B) | | |
| Rehearsal run 2 (full Demo A + B) | | |
| Demo day final check | | |
