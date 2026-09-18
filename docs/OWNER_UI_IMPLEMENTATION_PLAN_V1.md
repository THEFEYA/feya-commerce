# FEYA Owner UI — Implementation Plan v1

Status: CANONICAL UX IMPLEMENTATION BASELINE
Branch: owner-ui-v1
Parent baseline: growth-os-implementation-v1
Date: 2026-09-18

## 1. Purpose

Transform the existing engineering-first `/admin` into an owner-first operating interface without rebuilding or weakening the canonical FEYA Growth OS.

The backend remains canonical. The Owner UI is a projection layer that:
- combines many backend/read views into a small number of human workspaces;
- translates internal states into concise Russian language;
- shows only the depth needed for the next reasonable decision;
- keeps engineering diagnostics available under an explicit Advanced surface;
- never bypasses Product Truth, ownership, approvals, locks, evidence, Measurement or Execution Gateway.

## 2. Owner-facing top-level information architecture

Only six permanent owner destinations:

1. **Сегодня**
   - what needs the Owner now;
   - material changes;
   - opportunities;
   - active work;
   - recent outcomes;
   - compact system state.

2. **Работа**
   - waits for Owner;
   - blocked;
   - running;
   - queued;
   - waiting for data/condition;
   - measuring;
   - recently completed;
   - **Команда FEYA** as a secondary view.

3. **Рост**
   - opportunities;
   - demand;
   - query clusters;
   - page portfolio / ownership;
   - technical search health.

4. **Товары**
   - searchable catalog;
   - unified Product Workspace;
   - Product Truth / facts;
   - content and search optimization;
   - media;
   - configurations/prices;
   - readiness and history.

5. **Результаты**
   - measured outcomes;
   - experiments;
   - change history;
   - reusable learnings.

6. **Система**
   - readiness;
   - data sources and freshness;
   - permissions / autonomy;
   - AI usage;
   - incidents;
   - **Технические детали** for existing diagnostic screens.

Owner Attention is cross-cutting, not a seventh permanent navigation item.
Team FEYA is a view inside Work, not a top-level destination.

## 3. Non-negotiable UX rules

### Russian-first
All normal owner-visible:
- navigation;
- role names;
- statuses;
- actions;
- helper text;
- alerts;
- explanations;
- recommendations;
- empty states;
- error states;
- chart labels

must be Russian.

Backend codes, canonical IDs and English enums may appear only in **Технические детали**.

### Attention-first
Normal state is quiet.
The system interrupts the Owner only for:
- authority boundary;
- material risk;
- material opportunity;
- unresolved ambiguity only the Owner can resolve;
- high-impact blocker.

### No fake maturity
Do not show:
- revenue/conversion analytics before real sources exist;
- fake progress percentages;
- fake agent activity;
- fake confidence percentages;
- fake real-time states;
- AI scores without calibrated meaning.

### Progressive disclosure
Default:
1. what happened;
2. why it matters;
3. what FEYA recommends;
4. whether the Owner is needed;
5. next action.

Then:
- evidence;
- history;
- canonical/technical details.

### One canonical state
UI aggregation and AI explanation never become an alternate source of truth.

### Business situation is the owner-facing unit
The normal UI should organize work around a business situation, not a database object or an agent:

**Сигнал → объяснение → рекомендуемое действие → выполнение → результат → измерение → вывод**

The Owner should not have to reconstruct this chain from separate technical pages.

### Fact / inference / recommendation / hypothesis separation
Every important statement must be presented as one of:
- **Подтверждено данными**
- **Вероятное объяснение**
- **FEYA предлагает**
- **Нужно проверить**

A hypothesis must never be phrased as an established cause.

### Data quality belongs next to the number
Freshness/completeness limitations must be visible beside the affected metric or signal, not hidden only in System.

Examples:
- **Данные актуальны**
- **Данные обновлены с задержкой**
- **Показатель временно неполный**
- **Недостаточно данных для вывода**

### Approval is not execution
Owner approval may authorize the next step, but it must not silently mean the external mutation already happened.
Execution remains a separate governed step with receipt/audit.

### One root cause — one owner situation
Correlated or duplicate technical signals should be grouped into one owner-level case/attention item where a shared root cause exists.

## 4. Owner UI Projection Layer

Do not create new business entities only for presentation.

Implement presentation adapters/view-models above existing canonical data:

- `OwnerAttentionVM`
- `SignalVM`
- `WorkItemVM`
- `ResultVM`
- `ProductSummaryVM`
- `GrowthOpportunityVM`
- `SystemHealthVM`
- `RoleStatusVM`

Target code location:

`lib/owner-ui/`

Recommended modules:
- `terminology.ts` — canonical enum/code -> Russian label/description;
- `presenters.ts` — concise human summaries;
- `priority.ts` — owner attention ordering;
- `status.ts` — semantic visual states;
- `links.ts` — canonical object -> owner route / Advanced route;
- `types.ts` — owner-facing view models.

No raw database row should determine owner-facing copy directly in page JSX.

## 5. Incremental implementation phases

### UX-0 — Canon and terminology
Goal: freeze the human model before redesign.

Build:
- this implementation plan;
- Russian terminology canon;
- owner-facing status/action semantics;
- route map;
- visual hierarchy rules.

No production behavior change.

Exit:
- no ambiguity about top-level navigation;
- no ambiguity about Russian role/status/action names;
- old diagnostic admin remains intact.

### UX-1 — Owner Shell
Goal: make the system understandable without enabling new writes.

Build:
- persistent sidebar with six sections;
- top bar;
- owner page title / context;
- **Сегодня v1**;
- **Работа v1**;
- link to **Технические детали**;
- Russian terminology adapter;
- visible data freshness / source state where it affects interpretation;
- basic read-only global search for navigation to products/pages/work/signals;
- initial responsive shell;
- legacy diagnostic routes remain reachable but are removed from primary navigation.

Today v1 uses only existing trustworthy data:
- Owner Attention;
- launch blockers;
- current material signals;
- current work/case state if any;
- system summary;
- honest empty/data-not-connected states.

Work v1:
- prioritized list, not Kanban by default;
- owner-facing lifecycle groups;
- show time in current state when the timestamp is real and useful for diagnosing waiting/blockage;
- task/work drawer;
- Team FEYA secondary tab.

Exit criteria:
- Owner can see within 60 seconds whether action is required;
- no raw OSPM/CPIM/enum jargon in normal UI;
- no fake KPI cards;
- technical depth still reachable.

### UX-2 — Product Workspace
Goal: replace scattered product/content pages with one coherent product context.

Build:
- Product Workspace shell;
- tabs:
  - Обзор
  - Факты
  - Контент и поиск
  - Медиа
  - Цены и варианты
  - История
- Product Fact Review integrated contextually;
- Content Brief / SCO / CQA shown inside product context;
- existing separate diagnostic pages retained in Advanced until parity is verified.

Important:
Use **Цены и варианты** instead of **Продажи** until authoritative commerce/order data exists.

Keep Product DNA / positioning as sections inside **Обзор** or **Факты** rather than creating more top-level product tabs.

Do not show a product readiness percentage unless it has a deterministic denominator. Prefer:
**3 из 4 обязательных проверок пройдены**
over:
**Готовность 82%**

Exit:
- Owner can understand one product without jumping through multiple engineering pages.

### UX-3 — Growth Workspace
Goal: consolidate OSPM/TSEO surfaces around owner questions.

Tabs:
- Возможности
- Спрос
- Страницы
- Техническое SEO

Before Google/GSC data:
- show truthful readiness/empty states;
- no fake charts.

After data:
- demand trends;
- page/query ownership;
- search performance;
- technical issues ranked by material impact.

### UX-4 — Results and System
Results:
- Результаты;
- Эксперименты;
- Изменения;
- Выводы.

System:
- Готовность;
- Источники данных;
- Права и автоматизация;
- Использование AI;
- Технические детали.

Move the current engineering-first pages under System/Advanced rather than deleting them.

### UX-5 — Protected Owner Actions
Prerequisite:
- approved owner account;
- admin auth enabled and verified;
- unauthorized access test passes;
- registered admin views hardened;
- audited mutation path exists.

Then add:
- decision preview;
- approve / reject / defer;
- snooze / acknowledge;
- owner notes;
- convert note -> investigation/task/objective;
- audited Product Fact resolution;
- state-dependent actions through existing RPC/Gateway.

No direct browser mutations of canonical tables.

### UX-6 — Operator and Personalization
Only after the Owner Shell and controlled actions are stable.

Note:
A basic **read-only search/navigation** surface is allowed in UX-1. Command actions belong here.

Build:
- command palette actions;
- contextual **Спросить FEYA**;
- prepared actions with decision preview;
- saved filters;
- pin/hide of non-critical blocks;
- Team FEYA richer workflow visualization;
- optional ambient/visual agent mode later.

Do not implement a virtual office as the primary interface.

### UX-7 — Real analytics surfaces
Only when authoritative data exists:
- GA4 production;
- GSC/Bulk Export;
- commerce order/refund truth;
- sufficient historical demand data.

Then enable:
- real KPI movement;
- conversion/revenue;
- search trend analysis;
- seasonality;
- protected winner behavior;
- measured outcome cards;
- quality/cost views for AI workflows.

## 6. Phase control loop

Every UX phase follows the same gate:

1. **Audit**
   - exact existing routes/views/contracts;
   - no duplicate backend architecture.

2. **Implement one vertical slice**
   - smallest useful owner workflow;
   - no speculative extras.

3. **Deterministic checks**
   - data source exists;
   - states are truthful;
   - no write bypass.

4. **Code gates**
   - TypeScript PASS;
   - Next.js build PASS;
   - no new critical security warning.

5. **Vercel preview**
   - deployment READY;
   - route renders;
   - no accidental production behavior.

6. **Owner UX review**
   - understandable Russian;
   - obvious next action;
   - no engineering jargon;
   - no clutter;
   - no fake metrics/states.

7. **Checkpoint**
   - update implementation map;
   - document what is replaced, what remains Advanced, what is deferred.

Do not start the next large UX phase on top of a red build.

## 7. Visual direction

Preserve FEYA dark/premium identity.

Target:
- near-black background;
- dark panels;
- gold only as brand/selection accent;
- semantic red/amber/blue/green/gray independent from brand gold;
- persistent sidebar;
- flexible content width;
- drawers for context-first detail;
- tables only where comparison is genuinely useful;
- status pills only for actual status;
- short, restrained motion.

Spacing:
4 / 8 / 12 / 16 / 24 / 32 / 48.

### Contextual period controls
Do not place one global date-period selector in the permanent top bar for every owner screen.
A period selector should appear only where the data is actually period-dependent (Growth, Results, analytical drawers). Mixed Today/Work state should instead show each source timestamp/comparison window in context.

Default owner UI should feel compact, premium and calm, not like an engineering console.

## 8. Legacy route policy

Do not delete old admin routes during migration.

Classify them:
- absorbed into owner workspace;
- contextual detail;
- Advanced diagnostics;
- hidden/internal.

Only remove or redirect a legacy screen after:
- owner replacement exists;
- data parity is verified;
- no engineering/debug dependency is lost.

## 9. Definition of success

The Owner opens FEYA and can answer:

- Что сейчас важно?
- Нужно ли моё решение?
- Что система делает?
- Что заблокировано?
- Что изменилось?
- Что получилось?
- Что делать дальше?

without learning backend architecture.

Engineering depth remains available, but only after explicit drill-down.


## 10. UX-1 implementation checkpoint — 2026-09-18

Implemented on `owner-ui-v1`:

- persistent Russian owner shell;
- six top-level owner destinations;
- Today command center;
- Work workspace;
- Team FEYA role view;
- owner-facing Signals;
- owner-facing Owner Attention;
- Growth / Results / System owner shells;
- read-only global search across products, SEO pages, work and signals;
- Russian terminology / presenter layer;
- Advanced gateway preserving engineering diagnostics;
- raw Signals diagnostic preserved separately under Advanced;
- contextual Russian data-health explanations;
- functional Cmd/Ctrl+K navigation to search;
- responsive sidebar/mobile navigation foundation.

Database projections added only for safe read presentation:
- `feya_commerce_v_owner_work_safe_v1`;
- `feya_commerce_v_owner_attention_safe_v2`.

Current real state:
- Owner Work rows: 0;
- open Owner Attention: 2;
- governed admin read surfaces: 42;
- no owner write actions enabled;
- admin hardening still intentionally pending verified owner auth.

Validation:
- Vercel preview: READY;
- latest build completed without errors;
- CSS compatibility warning found during build review and fixed;
- no fake KPI, progress or confidence values added.

Next gate before UX-2:
- Owner visual review of Today / Work / Signals / System shell;
- fix any comprehension/navigation problems found in preview;
- only then expand Product Workspace.


## 11. Product Admin / Company Control separation

Owner review on 2026-09-18 revealed a real UX boundary that the first shell blurred:

- the existing FEYA Commerce/Product OS admin is a daily working tool for products, SEO, content, media, pricing and storefront preview;
- the new Owner UI is a company/growth control center for AI roles, signals, durable work, results and system trust.

These are related, but they are not the same workspace.

Canonical route decision:

- `/admin` — existing Commerce/Product OS admin, visually preserved;
- `/admin/company` — Owner-first Company Control Center;
- legacy admin pages keep their original layout and behavior;
- a small global **Центр управления** switch links from the commerce admin into the company center;
- the company center provides **Админка магазина** to return;
- the company center may link into existing product/SEO pages rather than duplicate them.

This prevents Growth OS navigation from replacing or visually contaminating the product/SEO workspace.

### Smart localization boundary

Translate:
- navigation;
- headings;
- statuses;
- actions;
- explanations;
- helper text;
- role names;
- system concepts.

Do not translate business/search content merely because it is English:
- product titles;
- SEO keywords and queries;
- H1/SEO title/meta drafts whose target language is English;
- URLs/slugs;
- source marketplace values;
- canonical codes shown only in Technical details.

Examples:
- UI column `keyword` -> **Ключевой запрос**, but value `silver harness` stays `silver harness`;
- UI label `Title` -> **Название**, but product title remains English;
- `OSPM` -> **Стратег органического поиска** in normal UI, canonical code remains available in Technical details.

### Visual preservation rule

Company Control may add new owner-specific components, but must not restyle existing Product OS pages globally.
Shared CSS changes must be scoped to owner/company classes unless they are a verified bug fix.


## 12. Legacy Product OS recovery checkpoint — 2026-09-18

Owner review identified that the actual working Product OS admin had been built on the recent working branch:

- branch: `work/resume-listing-batches-20260915`
- source commit: `4807d732a16005a43da0cff021936c12470a3d7d`

This is the canonical visual/interaction baseline for the existing Commerce/Product OS admin.

Recovered into `owner-ui-v1` without replacing the Growth OS backend:

- original FEYA admin navigation and 292px sidebar;
- original Manrope / Italiana / Cormorant Garamond typography and noir/gold visual system;
- Product OS dashboard;
- product catalog and product detail;
- Listing Master, including Product DNA/search axes, keyword selection and verified SEO-decision save flow;
- SEO Engine / Studio;
- SEO brief, angle advisor, scoring, commercial review, draft preview, approval, export/apply/change-set flows;
- review queues for labels, prices and components;
- Media QA / Media SEO;
- collections, graph, content, launch and indexation workspaces;
- legacy admin API routes and supporting libraries required by those screens.

The restored Product OS is not nested inside the new Owner shell.

Integration rule:
- `/admin` = recovered Product OS / Commerce admin;
- `/admin/company` = Company & AI Team control center;
- the recovered left navigation contains one additional item: **Компания и AI-команда**;
- Company Control links back to the Product OS rather than duplicating its tools.

Localization rule remains:
- translate interface chrome, explanations, actions and statuses;
- preserve product titles, English SEO keywords/queries, target-market content, URLs and source evidence in their original language.

Safety:
- a backup branch was created before recovery:
  `backup/owner-ui-before-legacy-restore-20260918`.

Validation:
- Vercel production build for the recovered combined branch: READY;
- recovered routes include `/admin/listing-master`, `/admin/seo-engine/studio`, `/admin/products` and the full SEO/review route family;
- current Growth OS / Company Control routes remain present under `/admin/company`.


## 13. Smart localization and operational integration checkpoint — 2026-09-18

Owner confirmed that the recovered Product OS admin is the correct working baseline.

### Smart localization implemented

Normal admin chrome is being localized to Russian while preserving source/business/search data in its original language.

Localized surfaces now include:
- recovered admin navigation and dashboard;
- product catalog and product detail;
- Listing Master display terminology;
- SEO keyword bank;
- SEO Studio / briefs / scoring / metric import / commercial review;
- SEO approval / apply / change sets / export / gate / storefront preview;
- launch, indexation, content, graph and collection planning;
- Media QA / Media SEO;
- product label / price / component review queues;
- draft-generation review surfaces and their admin controls.

Preserved without translation:
- product titles;
- keyword/query text;
- English SEO title / H1 / meta / descriptions intended for the public EN storefront;
- URL slugs;
- marketplace/source evidence;
- canonical machine codes when used internally.

### Company Work no longer equates "no Growth Case" with "no work"

The Company Control Center now aggregates real read-only operational queue counts from existing safe views rather than fabricating Growth Cases.

Current deterministic sources:
- Product Fact review queue;
- Keyword Cleanup review queue;
- Content QA shadow status.

The Work screen separates:
- **Ждёт вас** — durable owner decisions;
- **Операционные очереди** — real Product OS / SEO work;
- **Задачи роста** — true Growth Cases/workflows only;
- **Команда FEYA** — role runtime/capability state.

Automatic CQA/precheck queues are explicitly shown as system work that does not require Owner attention.

This preserves the canonical work model while giving the Owner a truthful view of real activity.

### Product Workspace decision refined

The recovered Product OS already contains the mature product/SEO workspace the Owner uses.

Therefore UX-2 must NOT rebuild a second Product Workspace.

Revised UX-2:
- preserve existing Product OS routes and interactions;
- improve Russian display copy incrementally;
- add contextual Company/Growth links only where they answer a real owner question;
- reuse current Listing Master / Product Detail / SEO workflows;
- avoid duplicate product truth, SEO or review screens.

### Validation discipline

After each localization wave:
- build must remain green;
- display labels may change, canonical state codes may not;
- classification/routing logic must use stable internal codes rather than translated labels;
- public storefront preview remains English because it previews the EN storefront.

A concrete issue was caught during this wave:
translated commercial-review labels were initially being used as logic keys. This was corrected by introducing stable internal classification codes and keeping Russian labels display-only.


## 14. Owner Growth / Results / System real-state checkpoint — 2026-09-18

The Company Control Center now reflects real internal operating state instead of placeholder concepts.

### Growth

Owner-facing Growth now shows the actual search-readiness sequence:

1. keyword review queue;
2. query-cluster proposals;
3. page/query ownership;
4. indexability readiness.

Current verified state from safe views at implementation time:
- 431 keyword cleanup/review rows pending;
- 243 SEO portfolio pages;
- 0 query-cluster proposals;
- 0 page-ownership proposals;
- 0 pages with a primary query owner;
- 0 pages ready for indexation.

This is intentionally presented as a dependency chain, not as failure cards.
Zero values on later stages are expected until earlier stages are completed.

The Growth page also continues to state Google Ads / Search Console limitations instead of inventing charts.

### Results

Results now reads real registries:
- experiment registry;
- change-event registry;
- learning registry.

Current verified state:
- 0 experiments;
- 0 active experiments;
- 0 change events;
- 0 reusable learnings.

The UI explains that zero is correct before measured changes exist. It does not fabricate “AI progress”, uplift, revenue, conversion or learning.

### System

System now combines:
- launch/readiness scopes;
- source health/freshness;
- action capability map;
- execution request count;
- active incidents and mutation freezes.

Current verified execution state:
- 54 registered action capabilities;
- 0 actions currently AVAILABLE;
- 48 action definitions require an approval class;
- 0 real Execution Gateway requests;
- 0 active incidents;
- 0 mutation freezes.

This makes the authority boundary explicit: FEYA may analyze and prepare decisions, but it must not pretend to have executed external mutations.

### Company Work / Today

Real Product OS queues remain visible in Company Work and Today even when there are no Growth Cases.

This resolves the false implication that “0 Growth Cases” means “0 work”.

### Phase interpretation

UX-3 and UX-4 now have useful owner-facing v1 projections over existing safe data.
This does not mean protected write actions are enabled.
UX-5 remains blocked on verified owner authentication, audited mutation paths and unauthorized-access tests.


## 15. Protected Owner Actions security audit checkpoint — 2026-09-18

Before enabling UX-5 writes, a focused security audit was performed.

### Admin auth state

- Supabase Auth accounts exist and are confirmed, but the UI still treats protected owner actions as disabled until the FEYA admin auth flag and allowlist are intentionally enabled and tested.
- Login UI is now Russian-first.
- Login preserves the originally requested `/admin/...` route after successful authentication.
- System explicitly displays whether protected FEYA Admin auth is currently required.

### FEYA-specific database hardening completed

Two previously exposed FEYA surfaces were hardened through remote Supabase migrations:

- `20260918150426 — harden_feya_step2_import_attempts_20260918`
  - RLS enabled;
  - anon/authenticated/PUBLIC table privileges revoked.

- `20260918150523 — restrict_public_order_draft_rpc_20260918`
  - PUBLIC / anon / authenticated EXECUTE revoked from `feya_commerce_create_order_draft_v1(jsonb)`;
  - service_role execution retained.

Post-hardening focused audit:
- FEYA Commerce/Growth tables with RLS disabled: **0**;
- FEYA Commerce/Growth SECURITY DEFINER functions executable by anon/authenticated: **0**.

### Why the order-draft boundary changed

An earlier migration intentionally left the order-draft SECURITY DEFINER RPC public.
The current repository no longer has a direct browser dependency on that RPC:
- checkout attempts a server route;
- if unavailable, it falls back to local draft storage;
- payment remains disabled.

Because the RPC accepts client-supplied draft totals/product payload, keeping it directly browser-executable was not justified before a validated server checkout contract exists.

### Admin read-boundary status

The governed admin-read preview currently reports **42** internal/admin views readable by anon and authenticated roles.

This is intentionally NOT hardened yet because:
- the current preview still relies on browser-safe read projections;
- mandatory FEYA admin auth + allowlist has not been verified end-to-end;
- revoking those reads prematurely would break the existing Product OS preview.

The existing service-role-only hardening RPC remains the intended cutover mechanism after auth verification.

### Remaining UX-5 security gates

Do not enable owner mutation buttons yet.

Still required:
1. intentionally enable `FEYA_ADMIN_AUTH_REQUIRED=true`;
2. configure and verify the owner allowlist;
3. test unauthenticated and unauthorized access paths;
4. review/enable Supabase Auth leaked-password protection;
5. cut browser access to registered admin views using the governed hardening path;
6. verify all owner writes use audited service-side RPC / Execution Gateway paths;
7. rerun Vercel + Supabase security regression checks.


## 16. Russian admin localization + protected-read readiness checkpoint — 2026-09-18

Owner confirmed the recovered Product OS as the correct daily-work baseline. The next pass therefore focused on two things only:

1. smart Russian localization of the existing admin;
2. preparing internal admin reads for the later protected-auth cutover.

### Russian localization wave

Normal admin UI is now Russian-first across the main Product OS / SEO / Company surfaces.

Localized or substantially polished:
- admin navigation/dashboard;
- products and product detail;
- Listing Master;
- review overview / labels / prices / components;
- SEO Engine hub;
- SEO Studio / metric import / scoring / commercial review;
- keyword bank and keyword-review queue;
- content briefs and content QA;
- query-cluster queue and cluster proposals;
- page/query ownership proposals;
- indexability readiness/proposals;
- SEO apply/change-set/export/gate/preview flows;
- Media QA / Media SEO;
- launch / indexation / content / graph / collections;
- Business Truth;
- signals and Owner Attention diagnostics;
- roles, opportunities, strategy, experiments, learning;
- data authority, data health, metrics, execution map, executions, incidents;
- launch readiness and scenario tests;
- admin login.

Smart localization boundary is preserved:
- product titles stay in their original language;
- search keywords/queries stay in their original language;
- EN storefront copy stays EN;
- URLs/slugs and raw source evidence are not translated;
- canonical machine codes remain available where technically useful.

### Admin read-boundary preparation

All current `app/admin/**/page.tsx` routes were audited for direct use of `getSupabaseReadClient()`.

Result after migration:
- direct raw read-client usage in admin page files: **0**;
- internal admin pages now use `getAdminReadClient()` for protected-read compatibility;
- Listing Master and SEO brief server helpers were also updated so service-role/server protected reads can take over after auth cutover;
- public `/shop` remains on the public read client and is intentionally unaffected.

This means future Admin Data Boundary hardening no longer needs to redesign the Product OS UI first.

### Build gate

A TypeScript regression was detected during the localization wave:
- `seo-clusters` referenced a translated display helper that had not been inserted because the original function name differed from the expected marker.

The helper was restored, the page was fully localized, and the branch was rebuilt.

Final build for this checkpoint:
- commit: `503bdc26dda94debc179d1f617d61b3da65bdc2c`;
- Vercel: **READY**;
- Next.js compile/type/static generation: PASS.

### What is intentionally still not enabled

- protected Owner write actions;
- direct production mutations;
- Admin Data Boundary revoke cutover;
- global indexing;
- payment/checkout provider;
- fake GA4/GSC/Google Ads charts.

Those remain separate gates rather than UI decoration.
