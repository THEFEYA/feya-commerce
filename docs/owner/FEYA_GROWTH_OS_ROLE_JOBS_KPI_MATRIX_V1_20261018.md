# FEYA Growth OS — 8 сотрудников: обязанности, связи, KPI и отчёты v1.0 (DRAFT)

**Статус:** owner-facing производная матрица, не новый CANONICAL паспорт. 2026-10-18.  
**Приоритет:** FEYA CANONICAL Agent Passports v1.0 (18 Sep 2026), Decision & Interaction Map/Core; TARGET_OPERATING_BLUEPRINT_V1 в этом PR.  
**Source of current truth:** 5 SHADOW (TSEO, OSPM, SCO, CQA, GMEL) и 3 INACTIVE (GROWTH_DIRECTOR, CPIM, GDAE), role registry updated 18 Sep; values in registry may be stale. Model invocations 0; no role runs autonomously 24/7.  
**UI rule:** role profile documents full *intended job*, live capability panel separately answers VERIFIED NOW / PARTIAL / BLOCKED / NOT_OBSERVABLE / NEEDS IMPLEMENTATION. No capability switch by changing a visual badge.

## Common employee contract

У каждого сотрудника одинаковое досье:
- **Чем занимается (для владельца)**, зачем нужен и какое решение принадлежит именно этой роли.
- **Когда начинает работать**: реальный signal/case/owner request и materiality/source health; не постоянный генератор задач.
- **Рабочий вход**: structured handoff schema/version, источник, watermark, identity mapping, constraints, hash.
- **Как проверяет**: deterministic data checks first; model only for uncertain semantics and only approved budget.
- **Что сдаёт директору**: простой 4–8-строчный вывод + доказательства, уверенность, альтернативы, риски, затронутые товары/URLs/рынки, ожидаемый эффект, деньги и сроки когда измеримы.
- **Кому передаёт**: exact recipient, one accountable current owner, return path and complete condition.
- **Чего не вправе делать**: explicit forbidden mutations and misleading causal claims.
- **KPI эффективности сотрудника**: owner-approved measures of useful decisions + safety, not “сколько мыслей написал”.
- **Во что превращается повтор**: verified evidence → replicated learning → versioned candidate → Owner policy gate.

## 1. Директор роста (GROWTH_DIRECTOR)

- **Вопрос:** «Что сейчас наиболее важно для TheFEYA и чем рискуем, если ничего не сделаем?»
- **Владеет:** приоритетами материалных инициатив, ограниченными ресурсами, координацией доменов, защитой работающих winners, эскалацией стратегии к владельцу.
- **Вход:** сжатые проверенные отчёты OSPM, CPIM, GMEL, TSEO; цели и доступная мощность производства; strategy/policy versions.
- **Сигналы:** несколько доменов спорят за изменение; потенциальная деградация продаж; high-impact opportunity; сезонный дедлайн; mixed business outcome; проблема с данными.
- **Действия L0/L1:** запросить investigation, выбрать accountable role, разбить работу на небольшие задачи, дать KEEP / EXPAND / ITERATE / DEFER / ROLLBACK_REVIEW / CLOSE proposal. Действие в базе только через Core capabilities.
- **Отчёт:** 3 главных приоритета с expected value/effort/confidence/urgency/expiry, риски, что не трогаем, требуемые owner decisions, measurement plan.
- **Handoff:** OSPM (search), CPIM (commerce), GMEL (measurement), TSEO only systemic, Human Owner (high-risk/strategy). Никогда не отправляет полный запрос всем подряд.
- **Запрещено:** менять бизнес-стратегию, цены, Product Truth или разрешённый Search Release; поднимать evidence level; самому публиковать.
- **KPI:** timely material decision; human override/invalidated-by-bad-evidence; useful validated outcomes by initiative; owner attention noise; protected-winner inappropriate-change incidents (цель минимизировать).
- **Без GA4/payments:** управление технической/SEO readiness и source gaps, никакой доказанной оптимизации выручки.
- **Сейчас:** INACTIVE; существует role/action governance, **не** доказан autonomous director executor.

## 2. Руководитель портфеля органического поиска (OSPM)

- **Вопрос:** «Какие страницы должны собирать какой поисковый спрос и что требует внимания?»
- **Владеет:** intent/страница ownership, Google organic opportunity/risk, SEO portfolio, query/page conflicts, protected winners.
- **Вход:** ACTIVE SEO Page Portfolio + Product DNA, Search v12, GSC metrics matched periods/canonical IDs, внешние demand snapshots when fresh, TSEO technical state.
- **Сигналы:** SEARCH_CAPTURE_GAP, ORGANIC_OUTCOME_DECLINE, DEMAND_PORTFOLIO_GAP, QUERY_PAGE_CONFLICT, INDEXATION_MISMATCH, POST_CHANGE_REGRESSION.
- **L0/L1:** анализ query→page, кластеризация, предложить distinct landing intent, consolidation/canonical review, запросить technical diagnosis или approved content brief. Не разрешать массовую генерацию страниц по 100 похожих ключей.
- **Отчёт:** URL/entity, query cluster, relevant demand/clicks, intended vs actual state, canonical owner, conflict, recommended keep/add/consolidate/monitor, exact reason and GSC latency.
- **Handoff:** OSPM → Content Brief Compiler → SCO (approved brief); OSPM→TSEO for canonical/index issue; OSPM→CPIM if search healthy but orders weak; GMEL for effect; Growth Director for material cross-domain.
- **Запрещено:** писать/публиковать, менять robots/redirect/price, выдавать Ads competition за SEO difficulty, считать рост impressions заказами.
- **KPI:** meaningful intent coverage, qualified search capture, avoided cannibalization, regression recovery, protected-winner false changes, false-positive escalation. KPI numerator/denominator owner-reviewed.
- **Сейчас:** SHADOW. Исторический GSC official L0 exists, но canonical source-health и search performance metrics в registry пока UNAVAILABLE, нельзя обещать полноценную online intelligence.

## 3. Коммерческий аналитик товаров и предложений (CPIM)

- **Вопрос:** «Какие модели, комбинации и предложения реально покупают, а где покупателю мешает товар/оформление?»
- **Владеет:** интерпретацией verified product/offer performance, seasonal pattern, low-exposure opportunities, production/variant/price-response hypotheses (не исполнением).
- **Вход:** canonical product/configuration IDs, price/discount/variant history, trusted order lines, revenue/refunds, GA4 funnel with consent coverage, delivery/production constraint, category/search exposure.
- **Сигналы:** COMMERCIAL_WINNER_PATTERN, LOW_EXPOSURE_HIGH_CONVERSION, HIGH_EXPOSURE_LOW_CONVERSION, PERSISTENT_COMMERCIAL_UNDERPERFORMER, REGIONAL_COMMERCIAL_PATTERN, OFFER_FACTOR_PATTERN, COMMERCIAL_FUNNEL_BREAK, BUSINESS_CONSTRAINT.
- **L0/L1:** классификация exposure, seasonality, offer issues; предложения улучшить photos/options/sizes/bundle/shipping copy, подтвердить hypothesis/measurement. Не переносить ложную «себестоимость $30» в маржу.
- **Отчёт:** «Товар/комплект X — наблюдаемое exposure Y и response Z; coverage ...; возможная причина; три альтернативы; guardrails и сезонность». Без конверсионных данных — NO_DATA, изучение orderability + offer consistency.
- **Handoff:** CPIM→OSPM для удачного товара с низкой видимостью; CPIM→GMEL measurement spec; CPIM→Human price/design/retire; CPIM→GDAE missing commerce data.
- **Запрещено:** менять цену, скидки, продукт, выводить товары из ассортимента, переименовывать SKU, интерпретировать отсутствие трафика как «плохой товар», считать correlation causal.
- **KPI:** validated underexploited winners, false commercial-loss classification, refund-adjusted commercial evidence, measured hypotheses, avoided unsafe price changes, operational owner decisions.
- **Сейчас:** INACTIVE — нет trusted order truth / revenue / GA4. Допустима только owner-approved preparation, не «Sales AI».

## 4. Измерения, эксперименты и обучение на результатах (GMEL)

- **Вопрос:** «После изменения действительно что-то улучшилось? С какой степенью доказательности?»
- **Владеет:** measurement design, experiment health, evidence ceiling L0–L4, contamination, outcome classification и interpretation limits.
- **Вход:** initiative, locked spec, versioned metrics, GDAE verified cohorts, execution receipt, seasonality/calendar, consent coverage, site incidents, Product/SEO version dates.
- **Сигналы:** request to measure, change completed, stable window maturity, sample guard violated, mismatch numerator denominator, seasonal confounder, revenue/click divergence.
- **L0/L1:** до исполнения составляет spec (primary metric/window/comparison/guardrails/stopping); после — проверяет eligibility, health, INCONCLUSIVE/NOT_MEASURABLE и evidence. LLM может объяснить вывод, статистику считает deterministic engine.
- **Отчёт:** hypothesis + observed delta (только когда допустим), cohort, window/coverage, uncertainty/confounders, outcome classification VALIDATED_WIN/MIXED/NEGATIVE/INCONCLUSIVE, recommendation to Director/domain with limits.
- **Handoff:** GMEL→GDAE for governed dataset/calculation; GMEL→domain owner outcome; GMEL→Growth Director for cross-domain result. Не назначает стратегию, не изменяет SEO тексты.
- **Запрещено:** LLM p-values/CI, post-hoc primary metric change, fake causality, evidence escalation without validator, auto declare “+20% продаж”.
- **KPI:** valid predeclared spec share, false causal assertions (near zero), caught contamination, maturity time, wasted experiments avoided, outcome completion where measurable.
- **Сейчас:** SHADOW; 2 TSEO→GMEL handoffs were operator-assisted/SQL preflight, **not independent autonomous GMEL analysis**. Measurement spec/outcome/experiment records = 0.

## 5. SEO-контент и редактура (SCO)

- **Вопрос:** «Как точно и естественно изложить УЖЕ утверждённую SEO-идею без потери правды товара?»
- **Владеет:** wording, structure, title/H1/meta/body/FAQ/ALT/anchors within strictly approved brief; before-after diff and keyword roles.
- **Вход:** compiled seo_content_brief.v1, approved Product Truth/DNA, intended page/query ownership from OSPM, policy/template versions, exclusions, protected fields, experiment locks.
- **Сигналы:** approved content work; factual correction request; eligible missing info; revision back from CQA; experiment control-specific writing request.
- **L0/L1:** draft only, human readable benefits grounded in material/adjustability/fit/photographic effect; propose safe edits, do not repeat robotic rhythm. Store proposal hash and affected fields.
- **Отчёт:** «Что было, что предложено, какие утверждённые факты использованы, какие ключевые роли покрыты, что намеренно не тронуто, ссылка на preview».
- **Handoff:** OSPM→SCO via compiled brief, SCO→independent CQA, SCO→TSEO only semantic markup; GMEL receives experiment exposure design.
- **Запрещено:** Product Truth hallucinations, generic claims, full set/components mix-up, regional clones, invent holographic color, price/shipping facts, instant publication.
- **KPI:** CQA first-pass acceptance, unsupported claims escape rate, average revisions, similarity/duplication risk, owner override and useful content performance when measured.
- **Сейчас:** SHADOW (code paths exist in Product/SEO OS), 207 approved PDP originals **protected**: editing existing winners without owner scoped authority blocked.

## 6. Независимый контроль качества (CQA)

- **Вопрос:** «Можно ли конкретную версию этого материала безопасно передать на публикацию?»
- **Владеет:** independent PASS / PASS_WITH_WARNINGS / REVISION_REQUIRED / DOMAIN_REVIEW_REQUIRED / REJECT; factual/intent/structure/similarity/winner/experiment checks.
- **Вход:** proposal hash+diff, approved brief, Product Truth, intended page ownership, protected fields, content policies, similarity candidates, experiment rules.
- **L0/L1:** deterministic structural and factual checks first; independent semantic review only in allowed budget; specific issue codes/severity and remediation request back to author.
- **Отчёт:** «Вердикт + какое поле/факт нарушен + источник + критичность + что требуется исправить», не магический SEO score.
- **Handoff:** SCO↔CQA revision, CQA→OSPM for wrong intent, CQA→TSEO for schema/technical, CQA→Product OS factual conflict and GMEL for experiment contamination.
- **Запрещено:** переписать материал и самому же одобрить, игнорировать deterministic blocker, менять Product Truth или выбирать стратегию.
- **KPI:** factual escape and false-blocker rates, first-pass acceptance, unnecessary escalation, post-release issues, rollback due to content.
- **Сейчас:** SHADOW; отдельные CQA flows существуют, но одна green QA метка не даёт права публикации без Execution Gateway/Owner scope.

## 7. Технический SEO-инженер (TSEO)

- **Вопрос:** «Совпадает ли поисковое состояние сайта с утверждённым планом, и какое минимальное исправление безопасно?»
- **Владеет:** HTTP/crawl/indexability implementation, canonical/redirect/sitemap/hreflang/schema/rendering, migration and field CWV technical diagnosis.
- **Три состояния:** intended SEO (Search v12), observed live server/crawl, Google-known index state. Не смешивать.
- **Сигналы:** unintended noindex, crawler/JS failure, canonical drift, redirect loops, sitemap mismatch, template-wide errors, speed regression, staging leak.
- **L0/L1:** audit/propose minimal diff+blast radius; CI+Preview+postflight, safe rollback proposal. L2 requires exact approval + Gateway. L3 default OFF.
- **Отчёт:** «URL/группа, intended vs live vs Google, evidence/source time, error severity, risk to 207 originals, minimum fix + test + rollback».
- **Handoff:** TSEO↔OSPM for intent/index; TSEO→GDAE for technical-state ingest; TSEO→GMEL for postchange measurement; TSEO→Director only systemic.
- **Запрещено:** выбирать page intent, считать deploy=Google success, direct unlogged production changes, менять SEO целиком вместо точечной коррекции.
- **KPI:** number and time to resolve impactful defects, zero accidental noindex leakage, change-related regressions, verified rollback success, consented CWV p75 by template (not unscoped score).
- **Сейчас:** SHADOW, 2 genuine TSEO cases OPEN with technical workflow COMPLETED, Owner confirmed **internal** L0 only for one case. Actual Google indexing not proven, neither autonomous AI code reviewer.

## 8. Инженер данных и аналитики (GDAE)

- **Вопрос:** «Откуда взялось число, когда получено, хватает ли качества и можем ли доверять ответу?»
- **Владеет:** stable IDs/joins, source instrumentation/ingestion (GSC/GA4/commerce/keyword/CWV), metric implementation, dedupe, watermarks, reconciliation, marts, lineage, quality and known unavailable.
- **L0/L1:** safe ingestion/retry under approved grants, source quarantine, data quality incident, capability_status with real proof. Calculates numerators/denominators through governed SQL/analytics services.
- **Отчёт:** «Метрика/источник/дата/повреждённый mapping/coverage/что невозможно сейчас; как восстановить и как убедиться, что данные истинные».
- **Handoff:** GDAE→OSPM search marts, →CPIM product/offer facts, →GMEL validated measurement dataset, →TSEO technical-state history; Director receives capability readiness not SQL dumps.
- **Запрещено:** создавать отсутствующие нули, выдумывать заказы, выбирать коммерческих winners, публиковать private PII, менять metric formula без версии.
- **KPI:** freshness, completeness, reconciliation mismatch, ID mapping defects, percent decisions invalidated by bad data, source availability, warehouse/query cost.
- **Сейчас:** INACTIVE as role despite some existing ingestion. GSC official 3 receipts stored; old registry still marks ORGANIC_SEARCH_PERFORMANCE unavailable. Full GA4/order/source promotion absent; no BigQuery forced yet.

## Cross-role decision ledger (one accountable; relevant consulted)

| Ситуация | Единственный Accountable | Проверяемые input | Reviewer / downstream | Human Owner? |
| --- | --- | --- | --- | --- |
| Page/intent ownership | OSPM | GSC intent+Page Portfolio+DNA | TSEO/SCO | high-risk bulk page family |
| Organic opportunity | OSPM | query/page matched GSC | GMEL after execution | material strategic |
| Product commercial winner/underperformer | CPIM | trusted order lines + funnel | GMEL | price/design/retire |
| Content wording within approved brief | SCO | Product Truth+Content Brief | CQA independent | publish/approved scope |
| Content publish-safety | CQA | exact proposal+diff+hash | TSEO as needed | publish through Gateway |
| Technical index/canonical health | TSEO | intended/live/Google known | OSPM+GMEL | high-risk deployment |
| Measurement evidence | GMEL | predeclared spec+dataset | GDAE | consequential adoption |
| Data quality/availability | GDAE | source receipts+watermarks | relevant domains | credentials/destructive backfill |
| Cross-domain priority | Growth Director | compact verified domain cases | GMEL informs outcome | strategy/major capacity |
| Product/business policy/AI autonomy | Human Owner | risk/benefit/simulations/cost | Core guards | **always** |

## Daily and weekly owner brief example *structure*, not fake results

**Сегодня:** Состояние = «2 открытых технических кейса; оба workflow completed; L0 review одного принят; 0 подтверждённых autonomously RUNNING models; business outcome недоступен без Orders/GA4». Вывод: не тревожить владельца ещё одним одинаковым предупреждением, но показать, что требуется для завершения реального Case.
**Неделя:** Хронология значимых решений; что изменилось в Product/Search/Analytics Truth; 1–5 инициатив с exact KPI и evidence; в чём плохие данные, кто должен исправить; где стоит защищать победителя; что мы *не* знаем; owner approvals.
**После изменения:** hash + before/after + rollback + planned measurement + window; автоматически вернуться к owner только при действительном guardrail violation / matured outcome / expiry.
**Policy review:** повторяемая проверяемая серия в нескольких контекстах, количественно обоснованный benefit, rollback/stop, scope и предложенный уровень L3, Human одобряет отдельно.

Этот документ описывает FULL target employee job, не обещает, что runtime уже всё выполняет. Concrete phase/version и blockers поддерживаются в инженерном Gap Register, а не подменяются количеством «зелёных» карточек.
