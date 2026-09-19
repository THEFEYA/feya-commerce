# FEYA Owner UI — Research-Based Simulation Checkpoint

Date: 2026-09-19  
Branch: `owner-ui-v1`  
Scope: **Company / AI-team Owner UI only**. Existing Product OS and storefront are frozen to the approved baseline.

## Why this simulation exists

The Owner UI should not be judged by how many cards or pages exist. It should be judged by whether a non-technical owner can move through:

**attention → explanation → work → result → context**

without learning database structure, while the system remains honest about missing data and inactive agents.

## Current real-state snapshot

Read-only Supabase snapshot used for the simulation:

- Owner Attention: **2**
- Growth signal candidates: **19**
- Active Growth work / Growth Cases: **0**
- Agent runtime:
  - ACTIVE: **0**
  - SHADOW: **5**
  - INACTIVE: **3**
- Product fact review queue: **50**
- Keyword review queue: **431**
- Actionable CQA queue: **51**
- Automatic CQA / precheck queue: **129**
- Open non-expired growth opportunities: **0**
- Regression scenarios: **15 PASS / 0 FAIL / 0 WARN / 0 NOT_RUN**
- Critical regression scenarios not passed: **0**

## Simulation A — Owner opens Today

Expected research behavior:
1. Show decisions that only the Owner can make.
2. Do not duplicate those decisions again as ordinary signals.
3. Show meaningful signals.
4. Show opportunities only if real opportunities exist.
5. Show real work.
6. Do not fabricate KPI charts.

Observed / implemented:
- **PASS** — 2 Owner Attention decisions appear at the top.
- **PASS** — OWNER_DECISION_REQUIRED signals are removed from the ordinary signal block when already represented by Owner Attention.
- **PASS** — material signals remain visible separately.
- **PASS** — opportunity section is hidden because the opportunity registry currently has 0 active opportunities.
- **PASS** — real operational queues remain visible even though active Growth Cases = 0.
- **PASS** — no revenue, conversion, GA4, GSC or outcome charts are invented.

## Simulation B — Owner opens Work

Expected research behavior:
- prioritized list first;
- blocked/waiting state visible;
- Owner decisions separate from ordinary work;
- agent/team state secondary;
- detail opens context-first, not by dumping raw tables.

Observed / implemented:
- **PASS** — Owner waiting items are separated.
- **PASS** — operational queues show real Product Facts, Keyword Review and CQA workloads.
- **PASS** — no fake Growth tasks are created when active Growth work = 0.
- **PASS** — Team FEYA is secondary/collapsed.
- **PASS** — Work detail uses a right drawer first and a full detail page second.
- **DEFERRED** — handoff/evidence timeline waits for an owner-safe evidence projection instead of showing raw workflow JSON.

## Simulation C — Owner inspects the AI team

Expected research behavior:
- logical role ≠ active bot;
- status, autonomy, current work and capability limits should be visible;
- no virtual-office animation or fake activity.

Observed / implemented:
- **PASS** — runtime reflects 5 SHADOW + 3 INACTIVE + 0 ACTIVE.
- **PASS** — each role shows autonomy mode.
- **PASS** — current active work count is explicit.
- **PASS** — capability readiness uses discrete available/missing indicators, not an invented intelligence or performance score.
- **PASS** — no animated “agents working now” fiction.

## Simulation D — Owner opens a signal

Expected research behavior:
- compact signal first;
- drawer second;
- evidence and recommended action inside;
- raw technical evidence only on deliberate drill-down.

Observed / implemented:
- **PASS** — compact list row.
- **PASS** — right-side signal drawer.
- **PASS** — evidence values are taken from actual `evidence_json` when an owner label exists.
- **PASS** — recommended action and route are explicit.
- **PASS** — raw evidence stays under Technical Details.

## Simulation E — Product / storefront regression guard

Owner correction:
> Product cards, product page layout, Listing Master, shop/storefront and approved Product OS working screens must not be redesigned by the agent UX project.

Verification:
- **PASS** — `app/page.tsx` matches the approved baseline.
- **PASS** — `app/shop/page.tsx` matches the approved baseline.
- **PASS** — `app/shop/[slug]/page.tsx` matches the approved baseline.
- **PASS** — `ProductCard`, `ProductDetailClient`, `ShopClient`, and `AdminProductDetailView` match the approved baseline.
- **PASS** — Product OS uses its original `AdminNav`/layout instead of the new Owner Shell.
- **PASS** — Listing Master visible layout/workflow is preserved; only its server-side admin read boundary is changed.
- **EXPECTED DIFFERENCE** — Product OS navigation contains one isolated route to Company / AI control so the two work areas remain reachable.

## Simulation F — Regression and release safety

- **PASS** — regression registry reports 15/15 PASS.
- **PASS** — no Critical scenario is currently unpassed.
- **PASS** — current Vercel checkpoints for the isolated Agent UI shell build successfully.
- **PASS** — Product OS security changes are limited to read-boundary plumbing, not visual layout.

## Remaining research gaps after this checkpoint

1. Visual owner review of Today / Work / Roles / System on desktop.
2. Mobile visual review of the same agent surfaces.
3. First real Growth Case should be used to validate drawer/full-detail lifecycle behavior.
4. First real opportunity should validate the conditional Today opportunity block.
5. Protected Owner Actions remain blocked until auth/allowlist/audit prerequisites are verified.
6. Real KPI/trend/outcome charts remain blocked until authoritative GA4/GSC/commerce datasets exist.

## Stop condition

The current **agent/company read-only UI** is finished when:

- the Owner approves the visual hierarchy of Today, Work, Growth, Results and System;
- the AI Team and Signal detail patterns are understandable without engineering knowledge;
- no normal Owner screen leaks raw registries/enums as its primary language;
- Product OS/storefront regression guard remains intact;
- the branch is green on Vercel.

Anything beyond that belongs to one of two later programs:

- **Protected actions** after authentication/audit is ready;
- **Real analytics** after real production datasets exist.
