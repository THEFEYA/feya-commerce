# FEYA Mission Control v1 — Visual + Event Contract (DRAFT, not approved)

Date: 2026-10-16. This is an owner's visual-design discussion and not an alternative FEYA MASTER/passport or runtime activation.

## Objective
A single central FEYA command room with eight recognizable agents and true task movement. Owner wants a readable premium/luxury-tech environment rather than a generic card dashboard or a literal pixel-art clone. Preserve the existing dark/gold brand, frozen V13 public storefront, SEO Studio, canonical role passports, current Supabase Growth OS and owner approval.

## Three directions
A. **Graph-first** — agents as inspectable nodes, animated edges and step pathways. Fastest to read; least decorative.
B. **Office-first** — visually striking office with animated employees and department zones. Risk: hides handoff failures and exact evidence.
C. **Hybrid FEYA (working recommendation, owner not yet signed off)** — cinematic office feel + legible agent topology in a pan/zoom central canvas, right-side passport/task dossier and bottom replayable step timeline. Toggle Office/Flow without changing engine or data.

Re-use UI mechanics only: React Flow/xyflow (MIT) for pan/zoom, custom nodes and signal movement; Claw-Empire (Apache 2.0) and Pixel Agents (MIT) for interaction patterns. Do NOT replace canonical Growth OS, adopt an unrelated local SQLite control plane or fork role policy.

## Read-only verified facts — never mark simulated work as live
- 8 logical canonical roles: **SHADOW** OSPM, SCO, CQA, GMEL, TSEO; **INACTIVE** GROWTH_DIRECTOR, CPIM, GDAE.
- Production Growth Cases, Workflows, Handoffs and recorded AI invocations are at 0 in the last direct query; legacy cron schedules remain paused.
- ACTIVE Search Release v12: 18 intended index, 210 intended noindex, 207 approved bindings. This is **not** the actual number indexed by Google.
- A rollback-only DB integration test passed: TSEO work intake/dedupe -> role-scoped claim -> canonical completion -> three events -> directed TSEO/GMEL handoff with owner/role checks -> stale-epoch quarantine -> owner attention. No persistent test records, no LLM provider call, no proof of actual authenticated browser action.
- User has reported setting FEYA_GROWTH_SHADOW_WORK_ENABLED=true and redeploying; Vercel env listing still returns 403. Do not assert owner-auth button works without observed browser run.
- Internal legacy readiness/signal snapshots may misrepresent effective Search Release; the active release reader is canonical, while GSC/GA4/order authority still need independent real data.

## The runtime to UI mapping
| Existing authority | On-screen meaning | Guard |
| --- | --- | --- |
| feya_growth_role_activation_v1 + 8 approved role passports | Agent mode, capabilities, rules | SHADOW is not RUNNING |
| feya_growth_cases_v1 | Single growth case with accountable owner | Do not treat all operational queues as Growth Cases |
| feya_growth_workflow_runs_v1 / workflow_events_v1 | Real stage, replay, receipt, retries | No invented percent |
| feya_growth_handoffs_v1 | Source -> target signal, receipt and stale status | No animation until persisted handoff |
| feya_growth_owner_attention_v1 | Needs you: next approval/review step | No implicit approval |
| feya_growth_ai_invocations_v1 | Recorded model usage, when available | No unlimited subscription assumption |
| ACTIVE Search Release and health of GSC/GA4 | Intent vs observed reality | Not actual Google indexed pages |

Do not expose privileged raw state, keys or uncontrolled business changes in a client browser. Render vetted projections through existing owner-authenticated server routes.

## Animation contract
INACTIVE: dim, stationary. SHADOW: available only within approved observation mode, never fake working. QUEUED: wait for actual queue admission. RUNNING: pulse only while a persisted lease/event says RUNNING, no fabricated ETA. WAITING/OWNER: pause plus reason. BLOCKED/FAILED/DEAD_LETTER: conspicuous exact error and recovery action. COMPLETED step: a receipt, not automatic closing of the overall Case. STALE handoff: dashed/grey/no follow-on action. Historical replay must display REPLAY not LIVE.

Transfer light travels only on persisted source/target event, with accessible text equivalent. “k / n steps” only when n is a known finite workflow contract. Event feed shows time, role, real case reference and evidence freshness. Role portrait opens dossier with its passport, capabilities and current case; graph position/edit is visual only until owner-approved governance change.

## Performance, UX, and safety
- One large screen under existing company admin; no new subscription and no dedicated graphic server.
- Only 8 agents initially, do not display fake concurrent sessions or move models between subscriptions for visual effect.
- Premium but restrained: black/graphite background, gold for owner/authority, cool cyan for selected/in-progress, red for critical incidents; statuses have icons/text as well as color.
- Keyboard-focusable cards, full pan/zoom with reset, reduced-motion toggle, readable mobile fallback and no animation causing excessive rendering.
- Avoid loading all historic logs or large product catalogs in the interactive scene; paginate/detail on demand.
- Independent graph/story simulation must never write to Supabase nor impersonate a real owner run.

## Acceptance gates
1. Owner chooses artistic direction A/B/C, portrait treatment, and signal animation.
2. Confirm first real authenticated TSEO SHADOW task in /admin/company/work with readback of case, workflow, three events, canonical Release v12 receipt and NO production mutations.
3. Separately implement read-only realtime safe projection adapter with tested recover/replay, not a second workflow engine.
4. Add premium visual module only to command center on protected preview branch; do not redesign SEO Studio, Product OS or V13 site.
5. Verify no fake statuses, no extra model expenses, performance, auth, accessibility, and owner review before release.

## Prototype produced in owner conversation (16 Oct)
A self-contained interactive FEYA Mission Control v1 HTML: 8 actual logical roles (5 SHADOW / 3 INACTIVE), Office/Graph toggle, pan/zoom, selectable role passports, and a clearly DEMO five-stage owner -> TSEO -> GMEL -> owner event replay. It was verified headlessly in Chromium: all stages, passports, reset, desktop/mobile and no external calls or JS errors. **Not live, not deployed, and not a claim of agent autonomy.**

Live implementation tracker: GitHub issue #145; existing Growth OS MASTER and passports remain authoritative.