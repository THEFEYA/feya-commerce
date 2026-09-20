# FEYA Owner UI — Research-Based Simulation Checkpoint

Date: 2026-09-20  
Branch: `owner-ui-v1`  
Basis: Owner-First UX Blueprint + current Supabase state

## Why this checkpoint exists

The goal is to stop making UI changes just because more changes are possible.

The Owner UI is judged by whether the Owner can answer the six operating questions:

1. Что сейчас важно?
2. Нужно ли моё решение?
3. Что система делает?
4. Что заблокировано?
5. Что изменилось / что получилось?
6. Что делать дальше?

The approved Product OS is outside this simulation except for verifying that it remains visually isolated.

## Current real operating state used for simulation

- Owner Attention: **2** active owner items.
- Raw signals:
  - Owner decision required: **3**
  - Work queue: **3**
  - Implementation action: **8**
  - Monitor: **1**
  - Deferred until active objective: **4**
- Durable Growth work: **0** active Growth Cases.
- Product fact review queue: **50**.
- Keyword review queue: **431**.
- Content QA:
  - human + CQA: **17**
  - independent CQA: **11**
  - revision required: **7**
  - blocked by validation: **16**
  - prechecks: **39**
  - similarity check: **85**
  - component claim check: **5**
- Active opportunities: **0**.
- Experiments: **0**.
- Change events: **0**.
- Confirmed learnings: **0**.
- Execution Gateway requests: **0**.
- Active incidents/freezes: **0**.
- Fully AVAILABLE action capabilities: **0**.

## Simulation 1 — 60-second daily owner check

### Question
Can the Owner open FEYA and know whether personal action is required without reading technical pages?

### Expected research behavior
Today starts with Owner decisions, then material signals, opportunities, work, system, FYI.

### Current UI path
`/admin/company`

### Result
PASS.

Why:
- 2 Owner Attention items appear first.
- Raw owner-decision signals are not duplicated as three separate interruptions.
- material signals appear below;
- Opportunities stays absent because the registry has 0 active opportunities;
- real operational work appears even though Growth Cases = 0;
- system blockers are summarized without a fake global score;
- automatic prechecks are collapsed under FYI.

## Simulation 2 — “0 Growth Cases” must not mean “nothing is happening”

### Question
Can the Owner see real business work when the durable Growth Case registry is empty?

### Current real state
- Growth Cases: 0
- keyword review: 431
- product facts: 50
- actionable CQA: 51
- automatic/intermediate CQA: 129

### Current UI path
`/admin/company/work`

### Result
PASS.

Why:
- operational queues are separated from Growth Cases;
- the Work header counts active operational work truthfully;
- Growth work stays empty instead of generating artificial agent tasks;
- Work and Signals support local saved views for repeated owner workflows.

## Simulation 3 — Signal -> explanation -> evidence -> action

### Question
Can the Owner understand a signal without reading raw JSON or backend enums?

### Current UI path
`/admin/company/signals`

### Result
PASS.

Why:
- compact signal list;
- owner-facing route and priority;
- right drawer;
- “what happened”;
- FEYA recommendation;
- curated evidence keys when available;
- raw evidence remains under Technical details;
- explicit route to Owner Attention / Work / System.

Remaining limitation:
- evidence schema is intentionally conservative; unknown evidence keys are not auto-rendered as business truth.

## Simulation 4 — “What is each AI role actually doing?”

### Question
Can the Owner distinguish an architectural role from a real active agent?

### Current UI paths
- `/admin/roles`
- Work -> Team FEYA

### Result
PASS.

Why:
- status, autonomy, required/available capabilities and current work are shown separately;
- discrete capability indicators replace fake completion percentages;
- current work / queued / waiting state is shown from real Work rows;
- role detail drawer provides capabilities, permissions and direct drilldowns;
- no real-time “virtual office” animation or fake agent presence.

## Simulation 5 — Results before measurement exists

### Question
Does FEYA fabricate progress when experiments, changes and confirmed learning are all zero?

### Current real state
- experiments: 0
- changes: 0
- confirmed learnings: 0

### Current UI paths
- `/admin/company/results`
- `/admin/experiments`
- `/admin/learning`
- `/admin/metrics`

### Result
PASS.

Why:
- zero is explained as a valid pre-measurement state;
- available operational metrics are separated from unavailable business/search metrics;
- unavailable metrics are hidden behind progressive disclosure;
- no revenue, conversion, uplift or organic trend charts are invented.

## Simulation 6 — System trust and action boundary

### Question
Can the Owner tell whether FEYA is allowed to act?

### Current real state
- fully AVAILABLE action capabilities: 0
- execution requests: 0
- incidents: 0

### Current UI paths
- `/admin/company/system`
- `/admin/system-readiness`
- `/admin/data-health`
- `/admin/execution-map`

### Result
PASS.

Why:
- System is quiet-first;
- problematic data sources are shown before healthy sources;
- capability readiness is owner-facing instead of an enum wall;
- unavailable actions and human-approval boundaries are surfaced first;
- full technical registries are collapsed;
- approval is explicitly distinct from execution.

## Simulation 7 — Product OS isolation

### Question
Can the new Company / AI UI improve without changing the approved daily Product OS?

### Result
PASS at source/build level.

Verified:
- storefront root baseline restored;
- shop list/detail baseline restored;
- ProductCard / ShopClient / ProductDetailClient baseline restored;
- Listing Master and Product OS route family restored to the approved working branch;
- Product OS keeps its original shell;
- only a minimal link to Company / AI Team was added;
- protected-read compatibility is allowed only as a non-visual server-side change.

## What is still genuinely missing

These are not visual polish tasks. They require new capability/data:

### Blocked by security
- approve / reject / defer / snooze owner actions;
- owner notes that mutate workflow;
- controlled fact resolution.

Requires:
- verified owner auth;
- allowlist;
- unauthorized-path tests;
- hardened admin read boundary;
- audited server-side mutation path.

### Blocked by data
- Search Console trend charts;
- GA4 funnel / product behavior;
- completed orders and revenue;
- conversion;
- measured experiment outcomes;
- seasonality based on repeated snapshots.

### Blocked by workflow evidence
- full handoff/evidence timeline inside Work detail.

Add only when the canonical projection exposes enough real handoff/evidence events.

## Visual finish line

For the current data maturity, visual/read-only Company UI is done when:

1. Owner visually approves Today / Work / Signals / Team / Growth / Results / System.
2. Desktop and mobile navigation are understandable.
3. drawers, filters, saved views and empty states behave correctly.
4. no raw enum/registry wall remains in a normal owner path;
5. remaining raw registries are explicitly Advanced / Technical;
6. Product OS remains visually unchanged;
7. Vercel build remains green.

After that, stop redesigning.

Next work after visual approval is not “more UI”; it is UX-5 protected actions and UX-7 real analytics when their prerequisites exist.


## Simulation 8 — Bounded visual contract

### Question

Did the Company / AI interface receive a finite visual pass without leaking into Product OS?

### Current implementation

- V0: visual contract and scoped tokens;
- V1: Shell + Today command surface;
- V2: Work + Team FEYA;
- V3: Signals;
- V4: Growth sequential pipeline;
- V5: Results + System;
- V6: mobile / accessibility / polish.

### Result

PASS at source/contract level; awaiting Owner visual review.

Why:
- Company styles are scoped under `.owner-shell`;
- Product OS files and the original global CSS prefix are protected by build-time freeze checks;
- Work, Signals and Team use context-first drawers;
- Growth presents query → cluster → ownership → indexability as a sequence rather than an unrelated KPI wall;
- Results collapses to one honest pre-measurement state when no real outcomes exist;
- System remains issue-first and hides healthy detail by default;
- mobile touch targets and drawer focus behavior have explicit accessibility handling.

## Simulation 9 — “Agent looks busy” failure mode

### Question

Could the UI imply that eight agents are independently working even when no active Growth Cases exist?

### Current real state

- ACTIVE roles: 0;
- SHADOW roles: 5;
- INACTIVE roles: 3;
- active Growth Cases: 0.

### Result

PASS.

Why:
- role state and current work are separate;
- Team FEYA shows no active work when there is none;
- capability readiness is shown as discrete available/missing capability indicators, not a fake completion percentage;
- role drawers explicitly state when no confirmed business result exists;
- next step is derived from real activation/blocking state, not from invented work;
- no perpetual animation, fake online presence or autonomous “thinking” indicator exists.

## Stop condition

The planned visual passes are complete. Remaining work before declaring the read-only Company UI finished is **Owner visual review on the actual preview routes**, plus correction of any concrete defect found there.

Do not continue cosmetic iteration after that review unless a reproducible usability/accessibility problem is found.
