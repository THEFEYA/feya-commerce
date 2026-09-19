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
| UX-1 Owner Shell | IN REVIEW | persistent sidebar/topbar; Today in research order; Work; Signals; Owner Attention; Team FEYA; global search; mobile navigation; compact density; drawer-first Work detail; evidence-first Signal drawer; full Work detail route | visual owner review; validate drawers with first real Growth Case and owner signal; add handoff timeline only when the projection exists |
| UX-2 Existing Product OS | FROZEN / APPROVED | existing catalog, Listing Master, review, media and SEO operator screens remain on the approved baseline | no visual rebuild; only non-visual security boundary fixes and a minimal link to Company / AI control |
| UX-3 Growth Workspace | IN PROGRESS | owner Growth shell; opportunities surface; historical demand; keyword review; query clusters; page portfolio; ownership; indexability; technical launch/search gates; honest missing-data states | consolidate remaining diagnostic-only SEO routes under Advanced/context; add trend views only after live datasets exist |
| UX-4 Results & System | IN PROGRESS | Results shell; experiments; learnings; change records; System readiness; source health; permissions; AI usage; incidents; capability/action diagnostics | convert remaining registry-style owner pages into contextual drill-down where they still leak engineering structure; measured outcome cards require real measurement data |
| UX-5 Protected Owner Actions | BLOCKED BY PREREQUISITES | decision screens exist read-only; authority boundaries are explicit | verified owner auth, allowlist, hardened admin reads, audited mutation path, then approve/reject/defer/snooze and controlled fact resolution |
| UX-6 Operator & Personalization | PARTIAL / DEFERRED | Cmd/Ctrl+K search; keyword/page/product/work/signal discovery; safe navigation shortcuts; sidebar collapse; compact density | saved filters/views; pin/hide non-critical blocks; contextual “Спросить FEYA”; prepared write previews only after UX-5 |
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

### Product Workspace

Research tabs: **Обзор · Факты · Контент и поиск · Медиа · Цены и варианты · История**.

Current state:
- one product workspace route: DONE
- six-section navigation: DONE
- Facts: DONE
- Content/Search summary from real brief/CQA/SEO portfolio: DONE
- Media: DONE
- Pricing/options: DONE
- History from actual review events: DONE
- protected edits / fact resolution: intentionally read-only until UX-5

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
- saved filters/views: INITIAL VERSION DONE for Product catalog; expand only where repeated workflows justify it
- pin/hide non-critical Today modules: NOT YET; deferred until owner review confirms which modules are actually worth personalizing
- full drag/drop dashboard builder: WILL NOT BUILD IN V1

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

1. Verify the new Work/Signal drawers and the Company / AI control surfaces on Vercel; separately confirm the approved Product OS baseline is unchanged.
2. Audit remaining normal owner routes for raw engineering terminology and duplicated registry pages.
3. Verify the first saved Product catalog views in owner use; only then propagate the pattern to another repeated review table.
4. Add pin/hide only for non-critical Today/Work informational blocks if owner review shows a real need, with a visible Reset to default.
5. Do not add live KPI charts, revenue, conversion, organic trends or measured outcomes until the authoritative sources are connected.
