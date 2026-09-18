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

Exit:
- Owner can understand one product without jumping through multiple engineering pages.

### UX-3 — Growth Workspace
Goal: consolidate OSPM/TSEO surfaces around owner questions.

Tabs:
- Возможности
- Спрос
- Страницы
- Технический поиск

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

Build:
- global search / command palette;
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
