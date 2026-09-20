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
| UX-1 Owner Shell | READY FOR OWNER REVIEW | persistent sidebar/topbar; Today in research order; Work; Signals; Owner Attention; Team FEYA; global search; mobile navigation; compact density; drawer-first Work detail; evidence-first Signal drawer; full Work detail route | visual owner review; validate drawers with first real Growth Case and owner signal; add handoff timeline only when the projection exists |
| UX-2 Existing Product OS | FROZEN / APPROVED | existing catalog, Listing Master, review, media and SEO operator screens remain on the approved baseline | no visual rebuild; only non-visual security boundary fixes and a minimal link to Company / AI control |
| UX-3 Growth Workspace | READY FOR OWNER REVIEW | owner Growth shell; opportunities; historical demand with freshness; keyword review; query clusters; page portfolio; ownership; indexability; saved views on repeated growth queues; technical proposal pages remain contextual/Advanced; honest missing-data states | owner visual review; trend views remain blocked until live datasets exist |
| UX-4 Results & System | READY FOR OWNER REVIEW | Results shell; evidence-first experiments; maturity-first learnings; real metric maturity; quiet-first System; owner-first system readiness; data health; business truth; action permissions; incidents/technical registries kept behind contextual drill-down or Advanced | owner visual review; measured outcome cards remain blocked until real measurement data exists |
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
- workflow/handoff/evidence timeline: NOT YET — current owner projection does not expose enough evidence; UI says so instead of inventing events

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
| V1 Shell + Today | READY FOR OWNER REVIEW | premium Company shell; command brief; research order; no fake KPI wall |
| V2 Work + Team FEYA | READY FOR OWNER REVIEW | owner waiting; real operational queues; durable work; role cards; role drawers; truthful last-result absence and next step |
| V3 Signals | READY FOR OWNER REVIEW | compact routing strip; search/filter; evidence-first drawer; owner-decision de-duplication explanation |
| V4 Growth | READY FOR OWNER REVIEW | sequential query → cluster → ownership → indexability pipeline; historical demand only; live-data limitations explicit |
| V5 Results + System | READY FOR OWNER REVIEW | evidence-first empty/results state; quiet-first system; issue-first sources; compact permission/execution state |
| V6 Mobile / accessibility / polish | READY FOR OWNER REVIEW | mobile priority nav; More sheet; focus trapping; Escape/return focus; reduced motion; loading/error states |

No further cosmetic pass is planned unless owner review reveals a concrete usability defect.

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
