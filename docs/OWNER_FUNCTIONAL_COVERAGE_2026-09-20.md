# FEYA Owner UI — Functional Coverage Map

Date: 2026-09-20  
Branch: `owner-ui-v1`  
Scope: Company / AI Team / Growth OS only. Product OS remains visually frozen.

## Purpose

This map answers one engineering question:

> Is every useful Growth OS capability either represented in a clear owner-facing surface, intentionally placed under Advanced, or explicitly blocked by a real prerequisite?

A backend table/view/registry does **not** automatically require its own screen.

## 1. Daily owner loop

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Owner Attention | `/admin/company`, `/admin/company/owner-attention` | decisions first, deduplicated, decision detail | COVERED |
| Material signals | `/admin/company/signals` | compact list → evidence drawer → route/action | COVERED |
| Active work / Growth Cases | `/admin/company/work` | lifecycle list, drawer, full detail | COVERED |
| Operational work outside Growth Cases | Work operational queues | Product Facts, keyword review, CQA separated from Growth Cases | COVERED |
| Team FEYA / Role Activation | Work → Team + `/admin/roles` | role state, autonomy, capabilities, real work, role drawer | COVERED |
| Global discovery | `/admin/company/search` | Product, Page, Query, Work, Signal, Opportunity, Experiment, Incident, Execution, Learning | COVERED |
| Healthy-state silence | Today / System | healthy detail collapsed; no KPI wall | COVERED |

## 2. Search / growth portfolio

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Keyword cleanup / review | `/admin/seo-keyword-review` | review queue, filters, saved views | COVERED |
| Historical keyword demand | Growth → Demand | source/freshness + saved Keyword Planner metrics | COVERED |
| Query cluster proposals | `/admin/seo-cluster-proposals` | reviewed keys → proposals → canonical grouping; full registry collapsed | COVERED |
| Query clusters | `/admin/seo-clusters` | current group structure | COVERED |
| Page portfolio | `/admin/seo-portfolio` | page portfolio / lifecycle | COVERED |
| Page/query ownership proposals | `/admin/seo-ownership-proposals` | groups without owner + proposals awaiting review | COVERED |
| Indexability readiness | `/admin/seo-indexability` | ownership + content readiness before indexability | COVERED |
| Opportunities | `/admin/opportunities` | commercial window vs event date + opportunity drawer | COVERED |
| Strategy / objectives / initiatives | `/admin/strategy` | human-activated strategy; Growth Objectives with feasibility/metric/history; initiative gates and drawers | COVERED |
| Live GSC performance | future Growth analytics | not fabricated | BLOCKED BY DATA |
| Seasonality / rising-falling live demand | future Growth analytics | not fabricated | BLOCKED BY HISTORY |
| Protected-winner automation | future | no automation before performance history | BLOCKED BY DATA |

## 3. Product truth / content / quality

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Product Truth review | `/admin/product-facts-review` | issue queue + Product Truth drawer | COVERED |
| Product DNA / manual axes | existing Product OS / Listing Master | approved working UI remains canonical operator surface | COVERED / FROZEN |
| Content Brief Compiler | `/admin/content-briefs` | blockers vs shadow-ready vs canonical-ready + brief drawer | COVERED |
| SCO shadow/content generation | existing Product OS SEO Studio + content queues | generator/operator workflow preserved | COVERED / FROZEN |
| Independent CQA | `/admin/content-qa` | stage states + CQA drawer + deterministic blockers | COVERED |
| Similarity / ALT / component claims | CQA | visible as separate checks; not collapsed into one fake QA score | COVERED |
| Publication | future protected execution | no direct owner/browser publish | BLOCKED BY AUTH / EXECUTION |

## 4. Measurement / outcomes / learning

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Experiments | `/admin/experiments` | feasibility, contamination, measurement spec, experiment drawer | COVERED |
| Change Events | `/admin/company/results/changes` | owner history grouped by time; links to execution/case/incident | COVERED |
| Learning Registry | `/admin/learning` | maturity-first cards + learning drawer | COVERED |
| Metrics registry | `/admin/metrics` | owner-readable metric maturity; raw definitions deeper | COVERED |
| Measured business outcomes | Results | honest unavailable/empty state | BLOCKED BY DATA |
| Causal claims | Results / Experiments | no unsupported causal verdict | BLOCKED UNTIL EVIDENCE |
| Revenue / conversion / orders | future Results | not inferred from drafts | BLOCKED BY COMMERCE TRUTH |

## 5. Reliability / data / execution

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Launch Readiness | `/admin/launch-readiness` | scopes separate; blockers first | COVERED |
| Capability Registry | `/admin/system-readiness` | unavailable/degraded first; healthy collapsed | COVERED |
| Data Source Health | `/admin/data-health` | freshness/coverage/authority + source drawer | COVERED |
| Source-of-Truth Registry | `/admin/data-authority` | engineering precedence / Advanced | COVERED / ADVANCED |
| Action Capability Map | `/admin/execution-map` | unavailable actions, approval boundary, executor path | COVERED |
| Execution Gateway | `/admin/executions` | request ≠ approval ≠ execution receipt; execution drawer | COVERED |
| Incidents / mutation freeze | `/admin/incidents` | active incidents, freeze state, root-cause context, incident drawer | COVERED |
| Scenario regression | `/admin/scenario-tests` | diagnostic reliability | COVERED / ADVANCED |
| AI usage metering | System → AI usage | invocations, metering completeness, latency/tokens only when useful | COVERED |
| Admin data boundary | System | current hardening state surfaced | COVERED |
| Owner auth | System / login | prepared but not enabled as mutation authority | PREPARED |

## 6. Workflow / multi-agent behavior

| Canonical capability | Owner surface | Current UX | Status |
|---|---|---|---|
| Role ownership | Work / Team / Role drawer | one accountable role shown | COVERED |
| Work lifecycle | Work | queued/running/waiting/blocked/measuring/completed | COVERED |
| Durable case state | Work detail | real state only | COVERED |
| Handoff timeline | Work detail | durable source→target role handoffs, question/result reason, known facts/unknowns/evidence counts; honest empty state when no rows exist | COVERED |
| Workflow event timeline | Work detail | durable workflow events/status transitions/step/reason; current production count is 0 | COVERED |
| Evidence timeline | Work detail | handoff evidence summary is available; measured outcome evidence remains separate and data-gated | PARTIAL / DATA-GATED |
| Agent trace/tool spans | Advanced only | not mixed with business history | COVERED / ADVANCED |
| Virtual office | not built | intentionally rejected as primary model | WILL NOT BUILD V1 |

## 7. Human actions intentionally not enabled yet

The following are UX-5, not missing visual polish:

- approve / reject / defer / snooze Owner Attention;
- resolve Product Truth facts;
- apply query cluster proposals;
- apply page ownership proposals;
- apply indexability proposals;
- activate strategy / initiative;
- publish content;
- change price / canonical;
- create or approve execution requests from normal browser UI.

Prerequisite sequence:

1. verified owner Auth account;
2. exact allowlist;
3. mandatory admin auth;
4. server-only admin read boundary;
5. action-specific canonical write target;
6. approval class;
7. service-side RPC / Execution Gateway path;
8. audit receipt;
9. rollback/reversal semantics where applicable;
10. scenario/regression coverage.

## 8. Features intentionally deferred

- natural-language Operator that can prepare writes;
- automatic creation/activation of Growth Objectives without explicit Human Owner authority;
- owner notes that mutate workflow;
- pin/hide/reorder beyond already-safe local preferences unless repeated owner need is demonstrated;
- live GSC / GA4 / commerce dashboards;
- revenue/conversion attribution;
- predictive analytics;
- fake progress, fake real-time agent presence, uncalibrated AI confidence.

## 9. Current owner route model

Primary:

`Сегодня → Работа → Рост → Товары (Product OS) → Результаты → Система`

Context surfaces:

- Decisions
- Signals
- Team FEYA
- Opportunities
- Strategy / objectives / initiatives
- Keyword review
- Query clusters
- Page ownership
- Indexability
- Content briefs
- CQA
- Experiments
- Changes
- Learnings
- Data health
- Capabilities
- Execution
- Incidents

Advanced:

- raw signal diagnostics;
- Source-of-Truth precedence;
- registries;
- scenario tests;
- raw IDs / JSON / traces.

## 10. Stop rule

A missing backend noun is not automatically a missing screen.

Continue UI work only when one of these is true:

1. a real owner decision cannot be understood;
2. a real workflow cannot be inspected;
3. an existing capability has no usable owner projection;
4. a normal owner path leaks raw engineering detail;
5. a reproducible accessibility/usability defect exists.

Otherwise move to prerequisites, data integration or protected execution rather than cosmetic expansion.


## 11. Safe projections added on 2026-09-20

The previous Work limitation around durable handoff/objective visibility was closed additively without exposing raw runtime tables.

Added governed read projections:

- `feya_commerce_v_growth_objectives_safe_v1`;
- `feya_commerce_v_growth_objective_events_safe_v1`;
- `feya_commerce_v_growth_handoffs_safe_v1`;
- `feya_commerce_v_growth_workflow_events_safe_v1`.

Owner UI now uses them in Strategy and Work. Current row counts are zero, so empty states remain truthful and no synthetic objective/handoff activity is generated.

These views are registered in Admin Data Boundary and deliberately remain browser-readable only during the existing pre-auth preview phase. They will be hardened together with the other governed admin read surfaces only after the owner-auth runbook succeeds.
