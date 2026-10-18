# TheFEYA Growth OS — цельная операционная система, Target Blueprint v1.0 (DRAFT)

**Состояние:** ДИЗАЙН / GOVERNED PROPOSAL; не расширяет полномочия, не заменяет Growth OS v1.0 CANONICAL, MASTER или паспорт сотрудника.  
**Дата и проверка:** 2026-10-18, GitHub main 7d9ab6deaa3f1ca19cc57b2b43db70acc9a99911, read-only Supabase inventory.  
**Авторитет:** FEYA Growth OS Architecture/Core v1.0, восемь CANONICAL Agent Passports, Decision & Interaction Map, Implementation & Data Prerequisites, актуальный Storefront/Search/Performance MASTER, задачи #145 и #149.  
**Цель:** владелец управляет стратегией и исключениями; команда получает атрибутированные наблюдения, принимает ограниченные решения, выполняет допустимые действия, измеряет последствия и накапливает проверяемый опыт. Не выдаём интерактивную картинку за автономный бизнес.

## 0. Требования, которые нельзя обходить

- ONE Growth OS: только THEFEYA/feya-commerce + текущий Supabase/Postgres, действующий Owner UI /admin/company; не создавать второй диспетчер задач, ещё один storage событий и девятую роль ради интерфейса.
- Existing Product OS, SEO Studio, Product Truth/DNA/варианты/цены, английский публичный сайт, оригинальные утверждённые 207 PDP и дизайн V13 не перерабатывать; ACTIVE Search Release v12 имеет 18 index-allowed маршрутов, 207 PDP остаются noindex до отдельного одобрения.
- Русский язык владельца; английские SEO-ключи/URL, raw source identifiers и имена товаров не переводить.
- Вне скоупа текущей публикации: новые платные сервисы, BigQuery по умолчанию, фоновый платный LLM без бюджета, Seller Online без одобрения, Google Ads без владельца, старые paused бизнес-направления и их 12 Cron.
- Owner Human выбирает стратегию, product design, цены, лимиты расходов, значимые риски и расширение автономии. Ни оператор чата, ни AI-агент не подписывает решение вместо человека.
- Данные с неизвестной свежестью и отсутствующие метрики — UNKNOWN/NOT_OBSERVABLE; отсутствие заказов в неприсоединённом Commerce ≠ ноль заказов.
- Новый механизм добавляется только когда существующие registry/Core/Execution Gateway/Owner Attention не покрывают реальный проверенный сценарий.
- Любой новый UI-элемент с действием обязан иметь реальный endpoint, нужный capability, объяснимые предусловия, доступный статус или явный disabled reason. Никогда декоративных кнопок «Запустить».

## 1. Как компания зарабатывает и где границы

TheFEYA — made-to-order fashion для сцены, фестивалей, исполнителей и фотосъёмок; ассортимент построен на утверждённом Product DNA, вариациях/комплектах, ограничениях материалов и сроках изготовления. Выбираем не «максимум страниц» и не «максимум трафика», а устойчивый вклад подтверждённых заказов при качестве выполнения, возвратах и разумных расходах.

**Северная звезда — proposal для будущего утверждения владельцем:** подтверждённая ценность выполненных заказов, при соблюдении нормальной маржинальности, сроков и клиентского опыта. До подключения Seller Online / валидированной себестоимости не превращать этот ориентир в публикуемую численную метрику.

**Иерархия результата:**
1. Business Outcomes: подтверждённые оплаченные заказы, net revenue (с учётом возвратов), contribution после появления verified variable cost, выполнение обещанного срока, обращения/проблемы по доставке.
2. Customer Funnel: eligible sessions → product exposure → detail → cart → checkout → verified transaction; раздельно по устройству/рынку/категории/товару/наборам, когда GA4 consent и Commerce Truth работают.
3. Demand and Acquisition: GSC confirmed clicks / impressions / query-page ownership / relevant organic landings; внешние ключевые слова Keyword Planner — оценка спроса, не «рейтинг SEO» и не продажи.
4. Technical Quality: live HTTP, intended vs observed vs Google-known search state, broken canonical/redirect, LCP/INP/CLS field p75, ошибки, latency backend.
5. Operational Quality: время решения, ложные сигналы, число безосновательных правок winners, обратимость, полнота доказательств, стоимость одного полезного подтверждённого результата.

НЕТ согласованных абсолютных KPI-порогов/обещанного ROI — их версия и допустимые guardrails устанавливаются только после базовой линии и решения владельца. Различать *metric*, *KPI* и *target*. Метрика ≠ KPI без сознательного выбора бизнесом.

## 2. Канонический цикл, одна задача — один ответственный

OBSERVE → DETECT → INVESTIGATE → FORM HYPOTHESIS → CHECK EVIDENCE → DECIDE → APPROVE → EXECUTE → MEASURE → LEARN → REVIEW POLICY.

Важное разделение:
- **Deterministic Core**: идентичность, дедупликация, права, версии, source health, eligibility, схемы, epochs/leases, approvals, бюджет, audit.
- **Domain role**: только интерпретация, гипотезы/специальная экспертиза в границах паспорта.
- **GMEL**: measurement design + evidence ceiling/outcome; не решает, что коммерчески делать.
- **Execution Gateway**: только конкретно одобренный write path с preflight/diff/receipt/postflight/rollback.
- **Owner**: выбор стратегии и high-risk решений, изменяемые бюджетные/автономные политики.
- **History/Learning**: неизменяемые evidence refs + policy candidates. Чат не является памятью проекта.

Текущая Case FSM (из docs/GROWTH_CASE_CORE_V1.md): OPEN → TRIAGED → INVESTIGATING → DECISION_READY → ACTIONING → MEASURING → LEARNING → CLOSED; альтернативно BLOCKED, DEFERRED, NOT_OBSERVABLE, CANCELLED. Реализовывать переходы через существующий atomic Core transition по allowed edges — запрет OPEN → CLOSED напрямую сохраняется. Workflow COMPLETED — не Case CLOSED, Human Attention RESOLVED — не workflow success.

**Передача / handoff (строгий envelope):** case_id, workflow_run_id, ownership_epoch, source_domain, target_domain, purpose/decision_question, evidence_refs+hash, snapshot_watermark, source_capabilities, known_unknowns, output_schema/version, status, expiry, retry key, budget_ref, consent/permissions, expected_next_action. Только один accountable_domain, no broadcast-to-all default, reject stale epoch/duplicate fingerprint/loop unchanged evidence.

## 3. Архитектура — reuse вместо микросервисного зоопарка

### Уже есть, использовать

- Current Supabase: feya_growth_cases_v1, case items/events, workflow runs/events, handoffs, role activation, registry items, owner attention/events, execution requests/receipts, source health, metrics, measurement specs/outcomes, experiments, learnings/evidence, scenario runs, AI invocations and budget policies.
- Next.js + React + Vercel: защищённые /admin/company/Сегодня, Работа, Рост, Товары, Результаты, Система, Mission Control v0, SEO/Product OS отдельными рабочими поверхностями.
- Действующие источники: утверждённые 207 Product Truth bindings; ACTIVE Search Release v12; прямые official GSC immutable observations (3 receipts, отдельная точка L0); реальные event/decision receipts. Некоторые существующие admin-content инструменты имеют dry-run CQA/SCO path — инвентаризировать, не заменять.
- Для экранов только vetted owner-safe projections с серверной авторизацией, ограниченной выборкой, указанием source timestamps; не открывать raw service_role или приватные документы в клиенте.

### Целевая схема

Sources (Google/Site/Product/Orders) → GDAE ingestion+quality → versioned Metric/Demand/Technical/Commerce marts → deterministic Signal/Eligibility → Growth Case + Owner/Domain → staged Domain Analysis → independent Quality/GMEL → Exact Approval → Execution Gateway → measured Outcome → Learning Evidence → policy candidate → approved policy release.

Все стрелки проверяемы через IDs/version/records и имеющийся API. Визуальный Graph — только проекция этой схемы, не самостоятельный движок.

**Интеграционная граница:** e-commerce сайт, Seller Online provider, внешние Google services и paused направления не переводятся в отдельную «систему агентов». Логический workspace+полномочия+data authority отделяют бизнесы, сервисные ключи и период хранения — физическое выделение отдельного Supabase только после доказанной необходимости по security/restore/cost/traffic.

**Warehouse:** BigQuery записан как целевая опция CANONICAL prerequisites, но *не* обязательная покупка v1. Сначала bounded Postgres-read models, immutable imported receipts и недорогие daily marts; решение о BigQuery по фактическому объёму/стоимости/данным, не по моде.

## 4. Доступность данных и будущие этапы автоматизации

| Факт / источник | Состояние 2026-10-18 | Что разрешить до него | Что открывается после проверки |
| --- | --- | --- | --- |
| Product Truth/DNA/размеры/варианты | 207 pinned approved bindings | фактические проверки, guarded proposals | content/technical batches по разрешённым scope |
| SEO Page Portfolio + Search v12 | active intended index=18 / noindex=210 | TSEO intended state и сайткарты; риски невнезапной индексации | observed crawl и owner-controlled next Search wave |
| GSC official observations | 3 immutable receipts; отдельный daily capture, source registry всё ещё stale/unavailable | L0 тренд конкретного совпадающего периода, с missing/late revisions | scoped OSPM search performance после freshness+lineage+coverage validation |
| External keyword demand | старый snapshot в registry | «историческая гипотеза спроса» | contextual demand при новом quota-safe capture |
| GA4 behavioral analytics | disabled until controller/consent/duplicate pageviews checked | только on-site page metadata и технические тесты | consent-aware funnel/cohorts без «полных» охватов |
| Seller Online, order truth | техническая проверка провайдера, confirmed orders нет | carrier+quote preflight, owner approvals и orderability review | verified payment/order/refund events + commerce reconciliation |
| Product cost / shipping | owner commercial rule known; full trusted per-unit COGS нет | REVENUE_MODE, осторожные коммерческие гипотезы | CONTRIBUTION_MARGIN_MODE только после line-item costs |
| SEO field performance | HTTP source timing есть, browser p75 не доказан | TSEO backend diagnosis, constrained CI/postflight | CWV p75 по device/template с достаточной выборкой |
| AI model/spend | 0 invocations, 0 approved AI budgets | deterministic L0/L1, Human review, mock/offline eval | semantic LLM only after spending policy/queues/caps/observability |
| Learning/outcomes | 0 measurement specs/outcomes, 0 experiments/learnings | proposals и сценарии с UNKNOWN/NO_EFFECT | replicated policy candidates, затем candidate autonomy |

**Activation protocol for every new source:** source identity & legal access → contract/version → immutable representative receipt → completeness & latest watermark/consent → mapping QA → reconciliation → source-health guarded promotion → metric registry implementation → eligible signal/agent. Ни одно «configured=true» без runtime receipt не повышает качество доказательств.

## 5. Сигналы: когда система реагирует, когда молчит

Сигнал — не каждая статистическая флуктуация; Signal/Eligibility Core должен проверять materiality, источник, полноту, базовую линию, seasonality, owner strategy, protected winner, число однотипных сигналов и cost of action.

| Сценарий | Триггер + защита | Кому | Допустимый результат |
| --- | --- | --- | --- |
| Search capture gap | GSC queries/page trend, релевантный спрос, mapped page ownership | OSPM | review соответствия intent / landing eligibility; не mass publish |
| Intended vs observed/Google search mismatch | saved Search v12 + live crawl/Google-known sample | TSEO ↔ OSPM | report/technical proposal, не toggle index автоматически |
| Long-tail topics without owner | validated Keyword Planner + query clusters | OSPM → SCO only approved brief | предложить brief/page, проверка дубликата и ассортимента |
| High exposure / low purchase | trusted GA4 funnel+Commerce+privacy coverage | CPIM → GMEL | проверить UX/вариации/размеры/доставку; не «переписать SEO» |
| Low exposure / high confirmed conversion | exposure and order cohorts joined by Product IDs | CPIM → OSPM | усилить search visibility для подтверждённого winner |
| Material/option/size inconsistency | Product Truth vs approved copy/options | CQA / owner Product OS | reject unsupported claims, content revision draft only |
| Technical performance regression | site error/field CWV + deployment correlation | TSEO | bounded diagnosis, rollback candidate with approval |
| Search post-change regression | version receipt + stabilized GSC comparison | OSPM + GMEL + TSEO | diagnose with lag controls; not causal by default |
| Critical source data gap | schema/metric reconciliation, missing GA4/transaction | GDAE → Core incident | quarantine metric and suppress derived recommendations |
| Delivery/fulfillment constraint | provider-verified rate/country/production ETA | CPIM/Owner/Commerce | orderability/risk proposal, no fabricated shipping service |
| Winner at risk of unnecessary edit | proven positive response + change request | Core/OSPM/CPIM | protect unless approved experiment with stronger justification |

Владелец видит *только материальные исключения*, не поток всех логов. P0 systemic / P1 decision soon / P2 scheduled / P3 collapsed by default. Dedup by source+entity+scenario+policy+window, cooldown и acknowledgement history. Нет согласованного порога — показывать policy_not_defined, не подставлять «20% падения» из воздуха.

## 6. KPI, Measurement Specs и доказательность

**Метрика должна содержать:** metric_code/version, объяснение для владельца, numerator/denominator/unit/currency, точный источник/authority, identity mapping, market/device/product cohort, время события и ingestion, consent coverage, freshness SLA, сравнимые окна, исключения, known confounders, direction, guardrails, owner-approved target/version.

Предлагаемый стартовый «управленческий лист» (численные цели ещё не утверждены):
- Qualified completed orders = count distinct verified completed transactions; paid authorization/refund status guard. Пока нет — NOT_OBSERVABLE.
- Net revenue = confirmed gross less valid refunds/discounts/tax/shipping as agreed business formula; versioned, не выводить из GA4 purchase alone.
- Conversion = verified orders / eligible consent-observed sessions; без надёжного знаменателя показывать ограниченную coverage, не общий sitewide rate.
- Organic capture = GSC clicks/impressions for matched canonical pages, query ownership and comparable windows; CTR/average position diagnostic, не target by default.
- Funnel drop-off = stage-qualified events with dedup + mapped consent cohorts; missing source ≠ zero.
- Product performance = confirmed order lines by canonical product, configuration, market, price/discount/promo and season; prevent low-exposure punishment.
- Technical = critical URL defects, availability, crawl/canonical drift, LCP/INP/CLS p75 field with sample sufficiency; source backend p95 separate.
- Operational = alerts per useful owner decision, evidence escape rate, time to route/resolution, duplicate/retry error, cost/validated outcome.
- Customer fulfillment = verified order ETA conformance, return/refund rate with event definition.

GMEL выбирает измерительный дизайн **до** action; эксперимент имеет baseline, primary KPI, secondary/guardrails, window, minimum useful effect, sample/stop rule, cohorts, locked fields, confounders, variant/control and attribution limits. L0 observation, L1 association, L2 plausible support, L3 quasi-experimental, L4 randomized/controlled only after criteria. Для малых объёмов и сезонного SEO корректнее проверяемые pre/post/cohorts либо INCONCLUSIVE, чем выдавать фиктивную статистическую уверенность. LLM не считает p-values/CIs и не меняет primary KPI задним числом.

**Success taxonomy в каждой инициативе:** NO_DATA, READY_TO_MEASURE, RUNNING, VALIDATED_WIN, POSITIVE_ASSOCIATION, MIXED, REGRESSION, INCONCLUSIVE, NOT_MEASURABLE; «success» допустим только с outcome receipt и предзаданными условиями. Дополнительно guardrail violation и protected-winner breach имеют veto.

## 7. Взаимодействие восьми сотрудников (без девятой роли)

Role codes из восьми Canonical Passports: GROWTH_DIRECTOR, OSPM, CPIM, GMEL, SCO, CQA, TSEO, GDAE. Они не являются отдельными daemon-processes.

Human Owner ↔ Growth Director (только стратегия/high-risk) ↔ доменные владельцы.
- OSPM owns search portfolio, page intent and opportunity. OSPM → SCO через утверждённый Content Brief; OSPM → TSEO при техническом mismatch; OSPM → CPIM если search healthy, коммерция weak.
- CPIM owns commercial interpretation. CPIM → OSPM если validated winner underexposed; CPIM → GMEL для measurement; CPIM → Owner для pricing/product/retirement.
- SCO owns scoped content proposal, never actual publishing; SCO → CQA independent QA, revision loop; TSEO schema semantic validation.
- CQA owns independent content quality gate: PASS / PASS_WITH_WARNINGS / REVISION_REQUIRED / DOMAIN_REVIEW_REQUIRED / REJECT. Не редактирует и не утверждает собственный текст.
- TSEO owns technical intended/live/Google-known diagnosis, deploy pre/post/rollback proposal, NOT page strategy.
- GMEL owns evidence ceiling, experiment feasibility/outcomes; receives from domains, returns limits+effect; does not dictate SEO/business strategy.
- GDAE owns instrumentation/freshness/marts/reconciliation; отвечает на governed capability requests, not ad hoc arbitrary SQL.
- Growth Director aggregates scarce material cases, prioritizes with deterministic policy, asks Human for strategy; may not override Source Truth or write production.

Каждому паспорту требуется карточка employee-JD: миссия (одна фраза), границы, закреплённые источники, входной тип запроса, outputschema и артефакты, регулярный рабочий ритм, KPI, примеры полезного отчёта, downstream handoff, decision rights L0-L3, когда молчит, escalation SLA. Версионировать, показывать откуда паспорт (CANONICAL), текущую возможность (VERIFIED/STALE/BLOCKED/NOT_IMPLEMENTED) отдельно от **проектно возможной** функции.

Подробная матрица — в соседнем документе FEYA_GROWTH_OS_ROLE_JOBS_KPI_MATRIX_V1_20261018.md.

## 8. Ритм настоящего директора: какие отчёты получать

**Ежедневно, only exceptions:** что сломалось, что стало наблюдаемым, какие решения просрочены, какие важные возможности истекают, ближайший дедлайн. Если ничего — «нет новых проверенных исключений», без AI-текста ради AI.
**Еженедельно:** портфель кейсов с business priority/owner/action, GSC и funnel coverage, запущенные и доказанные outcomes, wins/mixed/regressions, время/стоимость/guardrail, что сохранить, усилить, пересмотреть, остановить.
**После значимого действия:** before receipt, exact approval, deployed version, postflight, locked measurement window, next observation date, stop/rollback guard, direct link.
**Ежемесячно:** recurring decision patterns, policy candidate с benefit/risk/cost, источники данных, надежность агентов и источников, что можно предложить делегировать на L3, но не продвигать без отдельного Owner approval.

Каждая owner decision card: **что произошло / почему важно / насколько достоверно / что неизвестно / варианты (одобрить, изменить, отклонить, отложить, следить) / конкретная рекомендация / что затронет / какие права нужны / что будет измеряться / когда вернуться**. Кнопки только для допустимых действий по фактическому состоянию, никаких «approve everything».

## 9. Память и постепенная автоматизация

Owner decisions и execution/outcome receipts уже должны жить в Core, а не в чате. Интеллектуальная система предложений об автоматизации:
1. Collect candidate repeated decision/action signature (role, entity family, scope, policy_version, outcome, confounders, risk, original reviewer).
2. Для повтора вычислить **сходство условий**, а не только совпадение надписи на кнопке; не схлопывать разные материалы/рынки/периоды.
3. Validate across *independent qualified contexts* и достаточной истории, включая неуспешные варианты; threshold/evidence maturity → owner sets/versioned policy, не invent.
4. GMEL validates outcome and uncertainty; CQA/TSEO/Product Truth guard checks for forbidden collateral effects; Core evaluates abuse/risk.
5. Create POLICY_CANDIDATE with simulated impact, affected scope, permissions, spend cap, kill switch, test plan, rollback. Owner can ACCEPT / REJECT / DEFER / ASK_FOR_MORE_EVIDENCE.
6. Shadow-run same decision on new real cases and compare with Human; require no critical disagreement before candidate constrained promotion.
7. L3 narrow autonomous action only after owner-controlled approval, budget, rollout %/quorum, telemetry and guardrails. Monitor drift, auto-pause and human override. Pricing/product design/major index/deletion/policy/permissions/paid Ads remain Human gates.

One approved incident or two similar clicks **never** imply a successful enterprise policy. Store reasons, evidence and exact policy versions; dedup notes without leaking private customer data.

## 10. UI/UX и визуальный runtime как проекция

Сохранить главные разделы Сегодня/Работа/Рост/Товары/Результаты/Система. Mission Control внутри Работа; не создавать второй dashboard, не переписывать SEO Studio.

**Surface A — Командный центр:** восемь современных роботов FEYA, русский язык и role-code secondary, интерактивные связи из настоящего Handoff/Capability Registry; Office / Graph / Route-case (case-filter) без трёх отдельных двигателей. Наведение объясняет role JD; click открывает drawer; двойной click/fullscreen раскрывает комнату. Pan/zoom/fit, chips filters, clickable edges, hover provenance, signal trails only on persisted RUNNING+lease or marked replay. Inactive gray, source missing UNKNOWN, UI легенда не путает связь «может взаимодействовать» со связью «уже передал».
**Surface B — Комната сотрудника:** Overview, Tasks, Data+Source, Capabilities, Handoffs, Decisions/Owner, KPIs, Learning, History, Policy/Permissions (read-only until gated). Шапка: role/mission, source health, running vs shadow, blocked reason, next specific eligible action. Lazy load details by role+case; action rows linked to existing narrow endpoints or explicitly disabled.
**Surface C — Маршрут кейса:** case purpose → evidence → responsible → branch decisions → independent QA → scoped approval → execution → postflight → measurement → learning. Один active step, past immutable, future conditional not completed; substeps, dependencies and stale waits. Owner change-of-plan is new version/diff, not editing history.
**Surface D — Сегодня/Executive Brief:** material decisions, pending approvals, current trusted KPIs with missingness explanation, deadline, recommended options, quiet status. Direct links to case/role/measurement/recipient.
**Surface E — Результаты/learning:** cohorts and experiments including NO_DATA/NOT_MEASURABLE, costs and confounders, accepted/rejected decision history, policy candidates.
**Surface F — Система:** health, stale capability registries, budget, governance, connector status, worker lease age/errors, paused providers, security, recovery; no raw credentials.

Визуальные роботы: современный clean sci-fi, небольшие чёткие зоны без лишней мебели/ретро-пикселей; FEYA noir/gold, neon cyan/teal/purple/amber by semantic status, reduced-motion, focus/keyboard/table fallback, mobile compact dossier. Аватар — presentation asset, **не источник состояния**. Прототипные нарисованные проценты, fake success/ROI, «8 онлайн», «24/7», «Сейчас запущено» без receipt запрещены.

## 11. Data + Interaction contracts (proposed, no migration permission)

MissionCard = {case_id,case_version,accountable_role,case_status,current_step,workflow_run_id,ownership_epoch,source_health_refs,materiality,priority,decision_due_at,blocking_reason,latest_event_at,measurement_spec_ref,attention_ref}.
EvidenceRef = {entity_id,source_code,observed_at,ingested_at,watermark,period_start/end,scope,consent_coverage,snapshot_hash,data_quality_state,limitations}.
RoleCapability = {role_code,action_code,status,implementation_state,source_evidence_updated_at,requested_scope,allowed_context,requires_owner_approval,requires_model,spend_policy_ref,reason_if_disabled}.
Handoff = {case_id,source_role,target_role,ownership_epoch,purpose,question,evidence_refs,output_schema_version,idempotency_key,expiry,return_channel,status}.
DecisionReceipt = {attention_id,decision_code,actor_id,role/authority,expected_case_epoch,policy_version,evidence_hash,chosen_action,reason,created_at,expiry,side_effect_scope}.
ExecutionReceipt = {approval_ref,change_set_hash,source_version,target_version,preflight,executor,environment,idempotency_key,postflight,rollback_reference,impact_scope}.
MeasurementOutcome = {spec_hash,primary_result,guardrails,cohorts,periods,coverage,confounders,evidence_level,comparison_version,outcome_state,interpretation_limits,maturity}.
LearningCandidate = {repeated_case_refs,outcome_refs,distinct_contexts,risk_scope,proposed_policy_version,shadow_eval_results,approval_state,kill_switch,rollback}.
No client receives raw secrets, arbitrary SQL, raw prompt data or uncontrolled result_json. No contracts materialize as duplicated tables until mapped against existing columns.

## 12. Nonfunctional requirements, economics, controls

- Authorization: server-side allowlists + tight action grants; RLS and invoker-safe views; no service_role in browser; approval != UI button alone.
- Execution: atomic CASE compare-and-swap and epochs, deterministic idempotency, optimistic lease ownership, bounded retries/backoff, dead-letter/reconciliation, restart post-deploy and replay recovery.
- Change control: diff scope, version+hash, no stale approval, exact environment, staging preflight, narrow deployment, postflight/rollback, protect winner and 207 frozen originals.
- Data: source health watermark, late GSC partitions, identity mapping, privacy consent, dedupe, revenue/order reconciliation, schema contracts, PII minimization and retention policies.
- Observability: correlation trace_id across case→handoff→model/tool→approval→change→outcome; event lag, error/timeout, budget, token usage; follow OpenTelemetry convention *where applicable* but do not persist full prompts/PII by default.
- Cost: prefer SQL/rules then compact evidence then model; fixed max evidence payload, budget per role/action/day/run, paused when ledger unavailable, no auto retries of billable calls without safe identity. Owner approval of actual numeric limits first.
- UX: loading/error/empty/stale/permission differences, URL/deeplink stable, saved layout preference only local UI; keyboard/reduced motion and accessible graph alternative; no polling every second by default. Show data last-updated and provenance on hover.
- Reliability: disaster recovery runbook **is not a verified backup**. Validate restores before changing grants or deleting paused data. Legacy Cron stays OFF unless separately scoped.
- KPI guards: all latencies and percentage thresholds in this document are PROPOSED policy fields, not endorsed service levels; instantiate only when source baselines and cost measured.

## 13. Стадии реализации: полная модель заранее, контролируемый rollout

| Этап | Что делаем | Exit artifact / тест | Кому нужно решение |
| --- | --- | --- | --- |
| G0 — Canon map | этот blueprint, typed role/action/evidence contract, traceability/gap matrix, source coverage | approved PR for docs, complete critical gap ledger | Owner approves architecture direction, not payment |
| G1 — Truth/Metrics | authority registry reconciliation after verified GSC/GA4/Commerce receipts, consent and coverage matrix | 1st valid source promotion with tested missing data | Owner controller/privacy/provider gates |
| G2 — Workflow hardening | first bounded durable real case lifecycle after already resolved L0 attention; leases, QA, recovery, valid CAS edges | tests restart/stale/duplicate/timeout/approval | Owner only material decision |
| G3 — First measurable initiative | One objective, baseline, approved measurement spec and low-risk actual action | predeclared spec+postflight, honest outcome | Human approves material write |
| G4 — Learning | evidence packages, repeated context, outcomes and candidate policy staging | no policy promotion without replicated scenarios | Owner on policy/adoption |
| G5 — Limited automation | small allowlist of non-destructive exact actions, spend guard, budgets, rollback | live run with independent audit and no critical failures | Owner explicitly sets scope/budget |
| G6 — Full owner UI | targeted upgrades Mission Control + Room + Case Route + Reports + source health per action | every visible control mapped to real safe capability; data/UX tests | Owner approves visual details |
| G7 — maturity | evaluate Trigger.dev/Temporal/BigQuery only if measured limits justify | proof against current Supabase cost+reliability baseline | Owner approves infra expense |

G6 design contracts are defined **now**, while safe implementation can proceed in parallel with G1/G2 and commerce launch. Screens are never a critical-path blocker for Seller Online or public SEO launch.

## 14. External engineering practices and reuse (considered, not adopted automatically)

- React Flow / xyflow: candidate UI interaction layer for typed nodes, pan/zoom/mini-map/keyboard; **optional** if the existing FEYA SVG+React implementation remains correct and performant. MIT core; check exact license/version before adding.
- Claude Office-type local visualizers: event hooks + WebSocket + pixel-office are useful examples of *event-driven presence*; FEYA must **not** replace Core or assume local Claude session logs are business facts. Robot design may be inspired, code cannot replace Source of Truth.
- Temporal / Inngest: durable retry, wait for human, event replay and timeout patterns; **learn design lessons first**, no separate paid worker until current Supabase Core demonstrably fails requirements.
- OpenTelemetry: trace/span relationships and minimal correlation IDs, without recording customer prompts/raw PII by default.
- OpenFeature: conceptual separation of capability flag and authorization; not a substitute for existing FEYA approval Core.
- OWASP LLM guidance: untrusted search/docs are data, least privilege, human authorization and adversarial tests before promoting autonomous action.

Verified references: https://reactflow.dev/learn/advanced-use/accessibility ; https://github.com/W17ant/Claude-Office ; https://docs.temporal.io/workflows ; https://www.inngest.com/docs/durable-execution/durable-workflows ; https://opentelemetry.io/docs/specs/semconv/ ; https://openfeature.dev/specification/sections/evaluation-context/ ; https://genai.owasp.org/llmrisk/llm01-prompt-injection/ ; https://developers.google.com/analytics/devguides/collection/ga4/ecommerce .

## 15. Hard success criteria для Growth OS как компании

- Учёт: 100% *необходимых* решений имеет single accountable owner, source refs, explicit next action или reason blocked; не стремимся к «100% подключённых данных» при юридически недоступных источниках.
- Каждое значимое исполнение имеет scoped permission + immutable receipt + measurement/stop plan, или честную запись, почему пока нельзя измерить.
- Нет необъяснимых «AI-агентов ONLINE», самопубликаций без approval, пропущенных ошибочных платежей, duplicate orders или PII leakage.
- Со временем появляются подтверждённые улучшения business KPIs, связанные с аккуратными measurement specs; агент не получит бонус за рост сырых кликов при падении заказов или ухудшении маржи.
- Управленческая нагрузка владельца сокращается без увеличения surprise changes или false alerts, а повторяемые операции проходят безопасное доказательное делегирование.

**DoD для этого документа:** полный target architecture + роли + варианты входных данных + KPI/outcomes + UI pathways + learning/autonomy + testable gaps; все изменения статуса implementation требуют отдельного code/DB evidence. Более точные доработки и risk register — в соседних документах, подчинённых исходным паспортам.
