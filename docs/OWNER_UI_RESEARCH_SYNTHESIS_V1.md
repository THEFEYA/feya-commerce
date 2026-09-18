# FEYA Owner UI — Research Synthesis v1

Status: ADOPTED DECISION MEMO
Date: 2026-09-18
Inputs:
- FEYA Owner-First UX Blueprint (Deep Research)
- FEYA Owner UX Blueprint (secondary external research)
- current FEYA Growth OS implementation state

## 1. Overall conclusion

The two independent research outputs converge on the same core architecture:

- Owner Command Center / Today;
- Work Inbox / durable work;
- Growth;
- Products;
- Results;
- System;
- Owner Attention is cross-cutting, not a seventh top-level destination;
- Team FEYA is secondary inside Work;
- database views and registries must not become navigation;
- list-first Work, board secondary;
- progressive disclosure;
- evidence and source freshness next to decisions;
- technical traces in Advanced;
- no fake progress, fake confidence or fake real-time agent animation;
- Russian semantic localization;
- no backend rewrite for presentation.

This convergence is strong enough to use as an implementation baseline.

## 2. Additional ideas adopted from the secondary research

### Data quality adjacent to metrics
Adopted.

Reason:
If GSC/GA4/Commerce is delayed or incomplete, the limitation belongs beside the affected number/signal, not only in System.

Owner copy:
- Данные актуальны
- Данные обновлены с задержкой
- Показатель временно неполный
- Недостаточно данных для вывода

### Four evidence types
Adopted.

Every important statement should visually distinguish:
- Подтверждено данными
- Вероятное объяснение
- FEYA предлагает
- Нужно проверить

This directly reduces accidental conversion of hypotheses into "AI truth".

### Approval is separate from execution
Adopted as an explicit UI contract.

A decision sheet may authorize an action.
A separate governed execution step performs it.
The UI must not imply success until the canonical execution receipt/state confirms it.

### Root-cause grouping
Adopted.

Multiple correlated technical events should map to one owner-level situation where appropriate.
Owner Attention must not multiply because several backend signals describe the same business decision.

### Time in state
Adopted selectively for Work.

Show age/time in state when it helps diagnose waiting/blocking.
Do not turn it into another KPI wall.

### Read-only global search earlier
Adopted with a boundary.

UX-1 may include navigation-only search across products/pages/work/signals.
Commands that create work or mutate state remain in a later controlled-action phase.

## 3. Differences where FEYA keeps the stricter/simpler choice

### Product Workspace tabs
Secondary research proposed more separate sections (Positioning, SEO, Content, Commerce).

FEYA choice:
keep fewer top-level product tabs:
- Обзор
- Факты
- Контент и поиск
- Медиа
- Цены и варианты
- История

Product DNA / positioning lives inside Overview/Facts.
SEO + content remain together while they share one product/page context.
"Commerce" is not promoted to a full analytics surface before real order truth exists.

Reason:
The Owner explicitly asked to reduce page/tab sprawl.

### Product readiness percentage
Secondary wireframes showed examples like "Готовность 82%".

FEYA choice:
do not show an arbitrary readiness percentage.

Allowed only when a deterministic denominator exists.
Preferred:
**3 из 4 обязательных проверок пройдены**

Reason:
A calculated ratio is auditable; a synthetic percentage creates false precision.

### Global period selector
Secondary research suggested a permanent period control in the top bar.

FEYA choice:
period controls are contextual, not global.

Growth/Results may use them.
Today/Work should show source freshness and comparison window at the affected object.

Reason:
Today mixes decisions, work states, blockers and data from different horizons. One global period would imply a false shared time scope.

### Role names
Keep the simpler and more domain-precise FEYA vocabulary:
- OSPM -> Стратег органического поиска
- CPIM -> Аналитик товаров и продаж
- SCO -> Редактор SEO-контента
- CQA -> Контроль качества контента
- TSEO -> Специалист по техническому SEO

Reason:
Avoid "manager" titles where they broaden the perceived authority beyond the canonical role.

### Virtual office
Deferred.

It may become a secondary ambient/demo Team FEYA view later, but never the primary truth surface.

## 4. Current implementation order after synthesis

### UX-0 — complete
- implementation plan;
- Russian terminology canon;
- research synthesis;
- owner-ui-v1 branch.

### UX-1 — next
Build one coherent read-only vertical slice:
1. persistent six-section Russian sidebar;
2. compact top bar;
3. Today v1;
4. Work v1;
5. data freshness in context;
6. Russian role/status/action presenters;
7. basic read-only global search/navigation;
8. Team FEYA secondary view;
9. Advanced gateway to legacy diagnostics.

No owner writes yet.

### UX-2
Unified Product Workspace and Product Fact context.

### UX-3
Growth workspace.

### UX-4
Results + System aggregation.

### UX-5
Protected Owner Actions after auth/hardening.

### UX-6
Operator + command actions + personalization.

### UX-7
Real analytics after authoritative GA4/GSC/Commerce sources exist.

## 5. Implementation guardrails

Before adopting any UX idea, require:
- a real owner question it answers;
- a real canonical data source;
- truthful state semantics;
- no duplicate business object;
- no authority bypass;
- no fake confidence/progress;
- no English/internal jargon in normal owner mode;
- a clear migration path from the current diagnostic admin.

If a proposal fails these checks, DEFER or reject it.

## 6. Final owner principle

**Сложность остаётся в системе. На поверхности остаётся решение.**

Normal state should be quiet.
Material change should be explained.
Safe work should proceed without unnecessary interruption.
Human authority should pause and ask.
Result should be measured.
Learning should be stored.
