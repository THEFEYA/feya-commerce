# FEYA Owner-First UX Blueprint — Implementation Audit

Date: 2026-09-19  
Branch: `owner-ui-v1`  
Research basis: **FEYA Marketing Intelligence & Growth OS — Owner-First UX Blueprint**

## Scope correction — Owner review

The approved Product OS / storefront UI is **out of scope** for the Owner-First agent-interface redesign.

Frozen surfaces:
- public storefront and product cards;
- `/admin/listing-master`;
- Product OS catalog/review/media/SEO working screens that existed before the agent/company UI program.

Allowed change on frozen surfaces:
- security/read-boundary fixes that do not alter visible layout or workflow;
- one minimal navigation entry to the Company / AI control surface.

Owner-First research now applies to:
- `/admin/company/**`;
- agent/team status;
- Owner Attention;
- Growth signals and Growth Cases;
- agent Work;
- Results / measurement / learning;
- System readiness / capabilities / execution / data health;
- Advanced diagnostic drill-down.

This scope rule supersedes earlier audit items that proposed rebuilding the existing Product Workspace. The existing Product OS remains the approved operator workspace.

## Purpose

This file is the completion map for the Owner UI. It prevents endless “continue improving” work by separating:

- research requirements already implemented;
- requirements still missing;
- requirements intentionally blocked by missing data or security prerequisites;
- later features that should not be built yet.

The finish line is not “all possible UI ideas”. The finish line is: the Owner can understand **state → attention → work → result → context** without learning backend architecture, while deeper engineering data remains available only by deliberate drill-down.

## Research rules used as gates

1. Six primary destinations only: **Сегодня · Работа · Рост · Товары · Результаты · Система**.
2. Today is a daily decision surface, not a KPI wall.
3. Work is a prioritized list first; board is secondary, not canonical workflow state.
4. Details open context-first in a right drawer; full detail is secondary.
5. Product work is one Product Workspace, not a set of disconnected admin pages.
6. Growth is organized around opportunities, demand, pages and technical health.
7. Results distinguish execution from measured outcome and reusable learning.
8. System is quiet when healthy; raw registries live in Advanced.
9. No fake percentages, confidence scores, real-time agent animation or generic AI scores.
10. Personalization is constrained: density, saved views, pin/hide/collapse; no free-form dashboard builder in v1.
11. Mobile prioritizes **Сегодня · Работа · Найти · Товары · Ещё**.
12. Real analytical charts appear only when the underlying authoritative dataset exists.

## Phase audit

| Phase | State | Implemented | Still required before phase is considered done |
|---|---|---|---|
| UX-0 Canon & terminology | COMPLETE | six-destination IA; Russian terminology layer; status semantics; Advanced boundary; no-fake-maturity rules | Maintain terminology as new states appear |
| UX-1 Owner Shell | DESKTOP OWNER-APPROVED / MOBILE REVIEW PENDING | persistent sidebar/topbar; Today in research order; Work; Signals; Owner Attention; Team FEYA; global search; mobile navigation; compact density; drawer-first Work detail; evidence-first Signal drawer; full Work detail route; secondary-copy readability floor raised after owner screenshot review | validate mobile owner experience; validate Work handoff timeline only when the canonical projection exists |
| UX-2 Existing Product OS | FROZEN / APPROVED | existing catalog, Listing Master, review, media and SEO operator screens remain on the approved baseline | no visual rebuild; only non-visual security boundary fixes and a minimal link to Company / AI control |
| UX-3 Growth Workspace | DESKTOP OWNER-APPROVED / DATA-GATED | owner Growth shell; opportunities with context drawer; historical demand with freshness; keyword review; query cluster proposal flow; query clusters; page portfolio; owner-first page ownership proposals; indexability; strategy/initiative gates + initiative drawer; saved views; honest missing-data states | live trend/seasonality views remain blocked until authoritative datasets/history exist |
| UX-4 Results & System | DESKTOP OWNER-APPROVED / DATA-GATED | Results shell; experiment evidence drawers; owner-facing Change Events history; maturity-first learnings + learning drawer; quiet-first System; data-source health drawers; execution request/receipt flow; owner-first incidents/freeze; action permissions; diagnostics behind contextual drill-down or Advanced | measured business outcome cards remain blocked until real measurement data exists |
| UX-5 Protected Owner Actions | BLOCKED BY PREREQUISITES | decision screens exist read-only; authority boundaries are explicit | verified owner auth, allowlist, hardened admin reads, audited mutation path, then approve/reject/defer/snooze and controlled fact resolution |
| UX-6 Operator & Personalization | SAFE V1 PARTIAL | Cmd/Ctrl+K search; keyword/page/product/work/signal discovery; safe navigation shortcuts; sidebar collapse; compact density; local saved views for Work, Signals, CQA, keyword review, fact review, clustering, page portfolio and indexability | pin/hide is deferred until owner review proves a real need; contextual “Спросить FEYA” and prepared writes wait for later operator/action capability |
| UX-7 Real Analytics | BLOCKED BY DATA | historical Google Keyword Planner demand is shown with source/freshness caveat | production GA4, GSC/Bulk Export, authoritative commerce orders/refunds and sufficient history before KPI movement, revenue/conversion, seasonality or outcome charts |

## Research-to-screen compliance

### Today

Required order from research:
1. Owner decisions
2. Material changes
3. Opportunities
4. Active work
5. Real KPIs only when available
6. Measured outcomes
7. Compact system state
8. FYI collapsed

Current state:
- Owner decisions: DONE
- Material signals: DONE
- Opportunities: conditional block implemented; hidden while registry is empty, which is the correct behavior
- Active work: DONE, includes real operational queues
- KPI block: intentionally absent because authoritative business/search datasets are not live
- Measured outcomes: intentionally absent until Measurement Engine has real evidence
- System state: DONE
- FYI: automatic content checks are collapsed under «Для сведения» and do not interrupt the primary Today flow

### Work

Research pattern: prioritized list → drawer → full detail → workflow/evidence.

Current state:
- prioritized lifecycle list: DONE
- Owner waiting queue: DONE
- operational queues: DONE
- Team FEYA roster: DONE
- right drawer: DONE for Work and Signals
- full detail route: DONE
- durable handoff timeline: DONE — governed handoff projection is wired into Work detail; current production rows are 0, so the empty state is truthful
- durable workflow-event timeline: DONE — governed workflow-event projection is wired into Work detail; current production rows are 0
- measured outcome evidence remains data-gated and is not inferred from workflow activity

### Existing Product OS

Owner scope correction freezes the existing Product OS as the approved operator workspace.

Current state:
- public storefront and product-card design: FROZEN / APPROVED
- Listing Master: FROZEN / APPROVED
- Product catalog/detail and existing Product OS review/media/SEO workflows: FROZEN / APPROVED
- visible changes are not part of the agent/company UX program
- only non-visual protected-read/security compatibility changes are allowed
- one minimal link between Product OS and Company / AI control is allowed

The Product Workspace redesign described in the original research is therefore not implemented as a second product workspace. The existing Product OS already fulfills the operator role and remains canonical for daily product work.

### Search / command access

Research requires quick discovery across product, pages, queries and work.

Current state:
- Cmd/Ctrl+K: DONE
- products: DONE
- SEO pages: DONE
- literal keyword/query search: DONE
- work: DONE
- signals: DONE
- safe navigation commands: DONE
- opportunities: DONE
- experiments: DONE
- incidents: DONE
- execution requests: DONE
- learning records: DONE
- natural-language Operator: DEFERRED until UX-6

### Personalization

Allowed by research:
- collapse;
- density;
- saved filters/views;
- favorites;
- pin/hide non-critical modules;
- limited reorder.

Current:
- sidebar collapse: DONE
- compact density: DONE
- saved filters/views: DONE for repeated agent queues (Work, Signals, CQA, keyword review, fact review, clustering, page portfolio, indexability); local-only and non-canonical
- pin/hide non-critical Today modules: NOT YET; deferred until owner review confirms which modules are actually worth personalizing
- full drag/drop dashboard builder: WILL NOT BUILD IN V1

## Visual contract pass status — 2026-09-20

The Company / AI visual program is now bounded by `OWNER_COMPANY_VISUAL_CONTRACT_V1.md`:

| Pass | State | Current implementation |
|---|---|---|
| V0 Contract / tokens | DONE | scoped Company palette, typography, geometry, truthfulness and Product OS boundary |
| V1 Shell + Today | DESKTOP APPROVED | premium Company shell; command brief; research order; no fake KPI wall |
| V2 Work + Team FEYA | DESKTOP APPROVED | owner waiting; real operational queues; durable work; role cards; role drawers; truthful last-result absence and next step |
| V3 Signals | DESKTOP APPROVED | compact routing strip; search/filter; evidence-first drawer; owner-decision de-duplication explanation |
| V4 Growth | DESKTOP APPROVED | sequential query → cluster → ownership → indexability; opportunity/initiative drill-down; historical demand only; live-data limitations explicit |
| V5 Results + System | DESKTOP APPROVED | experiment/change/learning drill-down; quiet-first system; data-source/execution/incident context drawers |
| V6 Mobile / accessibility / polish | ENGINEERING DONE / DEVICE REVIEW PENDING | mobile priority nav; safe-area handling; full-width drawers; 44px+ touch targets; 16px search input; horizontal table containment; More sheet; focus trapping; Escape/return focus; reduced motion; loading/error states; secondary-copy readability corrected |

Owner reviewed the desktop Company surfaces on 2026-09-20 and approved the visual direction. The only concrete feedback was that some secondary copy was too small; the Company readability floor was raised without changing the compact visual language. No further cosmetic pass is planned unless review reveals a reproducible usability/accessibility defect.

## Current pre-launch finish line

The current Owner UI visual/read-only program is complete when all of the following are true:

1. UX-1 passes owner visual review on desktop and mobile.
2. Existing Product OS screens remain visually and behaviorally on the approved baseline.
3. Growth, Results and System contain no remaining owner-visible raw enum/registry walls except explicit Advanced drill-down.
4. Global search reliably reaches Product, Page, Query, Work and Signal contexts.
5. Large queues have search/filter/sort/pagination or an equivalent focused view.
6. Every displayed number has an honest source and maturity label when needed.
7. Vercel build is green and the core owner routes render.
8. No public storefront/product-card design is changed by this program.

At that point the read-only owner interface is DONE for the current data maturity.

UX-5 and UX-7 are **not part of this finish line** because they are blocked by security and authoritative production data, respectively. UX-6 is limited to safe preferences/search until UX-5 exists.

## Next implementation order

1. **Owner visual review on the actual Company / AI routes**: Today, Work, Signals, Team FEYA, Growth, Results, System.
2. Fix only concrete issues found by that review or by deterministic simulation/accessibility/build checks; the planned V0–V6 visual passes are already implemented.
3. Keep raw diagnostic registries under Advanced/context; do not polish every engineering table just because it exists.
4. Add pin/hide only if owner review proves a repeated need; do not build a free-form dashboard.
5. Do not add revenue, conversion, Search Console/GA4 trends or measured-outcome charts until authoritative production datasets exist.
6. When owner-facing read-only UX passes review, **stop visual redesign**. The next project is protected actions (UX-5), not more cosmetics.


## Product OS visual freeze verification

After Owner review, the branch was corrected so the approved Product OS is no longer wrapped in the Company Owner Shell.

Verified scope:
- `/admin/listing-master` stays on the existing Product OS visual shell;
- `/admin/products` and Product OS review/media/SEO routes stay on the approved baseline;
- `/shop`, product cards and public product detail components remain baseline-identical;
- new Growth OS / agent routes use the modern Owner Shell;
- Product OS gets only a minimal entry to **Компания и ИИ-команда**.

Security exception:
internal Product OS server pages may switch from the public read client to `getAdminReadClient()` for protected-read compatibility. This is intentionally non-visual and must not change layout/workflow.

## Current completion target after scope correction

The remaining visual work is only in the Company / AI system:

1. finish owner-first Team FEYA, Today, Work, Signals, Results, Growth and System;
2. make normal agent/system pages modern and contextual, while keeping raw registries under Advanced;
3. validate desktop + mobile navigation, drawers, saved views and empty/error states;
4. stop visual work when these owner surfaces pass the research checklist;
5. do not restart Product OS redesign.


## Accessibility verification

Current owner drawer pattern:
- Escape closes the drawer;
- body scrolling is locked while the drawer is open;
- focus moves into the drawer on open;
- Tab / Shift+Tab are trapped inside the modal context;
- focus returns to the trigger after close;
- Work, Signal and Role drawers use the same shared behavior.

This satisfies the current keyboard-accessibility requirement for context-first drawers. A full WCAG audit remains outside the current visual finish line but can be run before production launch.


## Functional projection expansion — 2026-09-20

A separate completion map now lives at `docs/OWNER_FUNCTIONAL_COVERAGE_2026-09-20.md`.

New owner-facing contextual surfaces added after the initial visual pass:

- opportunity drawer: commercial expiry vs event timing, role, priority and initiative relation;
- experiment drawer: feasibility, measurement period, contamination and Measurement Spec;
- incident drawer: impact, mutation freeze and root-cause context;
- execution drawer: request → approval → executor → receipt, with approval explicitly distinct from execution;
- data-source drawer: health, freshness, watermark, authority and source-of-truth context;
- learning drawer: learning maturity, evidence/context counts and policy adoption boundary;
- content-brief drawer: Product Truth/generation/keyword-plan/Business Truth/SEO ownership readiness;
- CQA drawer: human review, deterministic validation, similarity, ALT truth, component truth and independent CQA as separate checks;
- Product Truth review drawer: ambiguity reason, current facts and controlled resolution boundary;
- initiative drawer: Growth Director gate, Human Owner gate and strategy revalidation;
- Growth Objective projection + drawer: objective status, owner, primary/guardrail metrics, feasibility, human activation and durable objective events;
- Work durable history: role handoffs and workflow events now render from governed projections instead of a placeholder;
- owner-facing Change Events history under Results;
- global search expanded to opportunities, experiments, incidents, execution and learning;
- legacy `/admin/owner-attention` now redirects to the single canonical Company Owner Attention projection.

These additions do not enable mutations and do not create synthetic data. They expose already-existing governed state more clearly.


## Objective / handoff projection checkpoint — 2026-09-20

Migration `20260920104947 feya_owner_objective_handoff_safe_projections_v1` added governed read projections for Growth Objectives, Objective Events, Handoffs and Workflow Events.

Validation:
- objectives: 0;
- handoffs: 0;
- workflow events: 0;
- registered Admin Data Boundary views: 46;
- browser-readable registered views: 46, intentionally unchanged until owner auth/allowlist cutover.

The UI now exposes the capability without fabricating activity:
- Strategy shows an honest empty Growth Objective state until a Human Owner activates a real objective;
- Work detail shows durable handoffs/workflow events when they exist;
- no agent/tool trace is mixed into business history;
- no write path was enabled.


## Mobile engineering hardening checkpoint — 2026-09-20

The Company surface received a bounded mobile/touch pass without changing Product OS:

- safe-area bottom padding for fixed mobile navigation and bottom sheets;
- sticky compact top bar;
- minimum 44px actionable controls;
- 16px search input to avoid mobile browser zoom;
- owner drawers become full-width on narrow screens;
- long analytical tables stay horizontally contained rather than breaking the page;
- secondary text retains the desktop readability correction at mobile widths;
- Team FEYA, Growth steps, queue strips and timeline rows use mobile-specific density;
- the existing keyboard/focus/reduced-motion behavior remains intact.

This closes the implementation side of V6. A real-device owner visual review is still useful before production launch, but no further mobile cosmetic expansion is planned without a concrete defect.


## UX-5 protected Owner Action foundation — 2026-09-20

The first Human Owner write path is now implemented but intentionally **not enabled**.

Owner Attention detail now uses:
- a protected action readiness panel;
- decision preview before submission;
- server-side owner-auth + allowlist validation;
- an independent `FEYA_OWNER_ACTIONS_ENABLED` circuit breaker;
- expected-status concurrency guard;
- service-role-only mutation RPC;
- durable owner decision audit events;
- refetch after successful write.

The action records the Human Owner's decision only. It does not publish content, change price/canonical/indexability, activate checkout, or otherwise treat approval as execution.

Current blockers remain explicit:
1. choose the exact owner Auth account (there are multiple confirmed Auth users, so no identity is guessed);
2. configure exact allowlist;
3. enable mandatory admin auth in preview and test unauthorized access;
4. harden governed admin views;
5. run security regression checks;
6. only then enable `FEYA_OWNER_ACTIONS_ENABLED=true` in preview.

This keeps Product OS operational and prevents UX-5 from silently changing production behavior before the security boundary is proven.


## Protected SEO proposal review checkpoint — 2026-09-20

The second UX-5 family is implemented in locked mode:

- query-cluster proposal review;
- page-ownership proposal review;
- indexability proposal review.

Each review:
1. requires the server-side owner auth/allowlist/action-switch gate;
2. requires APPROVED or REJECTED plus a human note;
3. goes through a service-role-only wrapper;
4. preserves the existing proposal-specific stale-state guard;
5. writes an owner action audit receipt;
6. refreshes the owner surface after success.

The UI explicitly separates **review** from **apply**. No canonical SEO mutation is enabled by these controls.

Because current review queues are empty, this work changes capability coverage only, not business data.


## Protected strategic owner actions checkpoint — 2026-09-20

The Strategy workspace now has locked UX-5 controls for the three Human Owner boundaries defined by canon:

- Growth Objective activation;
- Human Owner initiative approval/rejection;
- Growth Strategy activation.

The controls are contextual:
- objective activation only appears for an activation-eligible objective;
- an objective with insufficient feasibility explains the missing prerequisite instead of exposing an invalid button;
- initiative approval appears only while Human Owner status is PENDING;
- DRAFT strategy activation is shown only when a draft version exists.

All controls remain non-operational until mandatory auth, exact allowlist and `FEYA_OWNER_ACTIONS_ENABLED=true` are verified. Current production has no rows eligible for these actions, so owner screens remain visually quiet.


## Advanced surface consistency checkpoint — 2026-09-20

Three remaining Growth OS diagnostics that still used the old nested admin presentation were normalized into the Company visual system without changing their data contracts:

- technical Signal Diagnostics;
- Source-of-Truth / Data Authority;
- Scenario Regression registry.

They remain Advanced/context surfaces rather than primary navigation. Raw tables are now behind owner-readable summaries and progressive disclosure, while full diagnostic detail remains available when needed.

No Product OS route or storefront component was changed.


## Owner Action audit visibility — 2026-09-20

Company → System now reads the sanitized `feya_commerce_v_owner_action_audit_safe_v1` projection and shows the latest protected Human Owner actions in a collapsed audit section.

The UI keeps three histories distinct:
- Human Owner decision/review history;
- controlled Execution Gateway receipts;
- measured business outcomes.

This avoids treating an approval as an execution or an execution as a proven business result.


## Protected canonical SEO apply checkpoint — 2026-09-20

Owner UI now shows the second step after Human review for:
- approved page-ownership proposals;
- approved indexability proposals.

The UI explicitly states what the apply step changes and what it does not change. Query-cluster apply remains intentionally gated because raw `cluster_code` is an engineering identifier, not an owner-facing business decision.

No approved rows currently exist, so these controls stay visually quiet.

## Protected Execution Request approval checkpoint — 2026-09-20

Execution drawer now contains a locked Human Owner approval control only when request status is APPROVAL_REQUIRED.

The preview says explicitly:
- approval is not execution;
- approval does not dispatch;
- receipt is still required to claim factual execution.

The action remains behind mandatory owner auth, exact allowlist and `FEYA_OWNER_ACTIONS_ENABLED=true`.


## Protected keyword review checkpoint — 2026-09-20

The keyword-review workspace now exposes the real Human decision point as a protected context drawer.

The UI keeps three layers separate:
- automated cleanup;
- independent AI recommendation;
- Human Owner review status.

Approval lets the owner confirm/edit the final approved keyword before submission. Rejection and needs-review remain explicit alternatives. The control remains locked until auth/allowlist/action switch are verified.

The live queue contains 431 reviewable keywords, but no production decision was written during implementation.
