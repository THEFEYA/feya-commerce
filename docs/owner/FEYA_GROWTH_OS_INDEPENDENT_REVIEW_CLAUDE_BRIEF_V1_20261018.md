# FEYA Growth OS — независимый архитектурный red-team review для Claude / любого второго AI (DRAFT)

**Не создавать альтернативную Growth OS.** Review = read-only экспертная проверка на полноту, реализуемость, UX и безопасность. Единственный canonical source-of-truth FEYA Growth OS v1.0 + MASTER в THEFEYA/feya-commerce/ связанный Supabase. Все рекомендации — предложения с конкретным изменением существующего контракта, а не новый проект.

## Пакет для ревьюера

**Primary (передаются без сокращения):** 01_FEYA_Growth_OS_Architecture_v1.0_CANONICAL, 02_FEYA_Growth_OS_Core_v1.0_CANONICAL, 03…10 все восемь FEYA Agent Passports, 11_FEYA_Decision_Interaction_Map_v1.0_CANONICAL, 12_FEYA_Implementation_Data_Prerequisites_v1.0_CANONICAL (18 Sep 2026, Library).  
**Existing runtime:** THEFEYA/feya-commerce GitHub main, docs/00_START_HERE.md, AGENTS.md, docs/GROWTH_CASE_CORE_V1.md, docs/OWNER_FUNCTIONAL_COVERAGE_2026-09-20.md, docs/owner/THEFEYA_GROWTH_OS_RUNTIME_ACTIVATION_20261015.md, #145/#149.  
**New DRAFT proposal:** FEYA_GROWTH_OS_TARGET_OPERATING_BLUEPRINT_V1_20261018.md, FEYA_GROWTH_OS_ROLE_JOBS_KPI_MATRIX_V1_20261018.md, FEYA_GROWTH_OS_GAP_REGISTER_AND_TEST_PLAN_V1_20261018.md.  
**Current verified facts:** main 7d9ab6de..., 207 approved PDP content, 18 intended index routes (Search v12), 2 OPEN TSEO Cases/6 events/2 handoffs, resolved Human L0 attention without Case closure, 5 SHADOW+3 INACTIVE roles, 0 invocations/budgets, 0 measurement specs/outcomes/experiments/learnings, 14 registered metrics (many source-blocked), 3 GSC receipts; GA4/Commerce/Revenue canonical effective unavailable; 12 old Cron paused. Freshly re-read before claiming current status.

## Prompt to send as one request

Ты — независимая комиссия из Principal Systems Architect, Data/Measurement Lead, Enterprise Growth Strategist, Application Security Reviewer, Staff UX Designer, Operational QA/Release Engineer.

**Задача:** провести противодействующий аудит FEYA Growth OS. Ищи не красивые формулировки, а невозможные действия, пропущенные поля, несостыковки полномочий, deadlocks, race conditions, ложные данные, false causal KPI, непрактичные UI решения и неоправданные траты.

**Сначала прочитай все 12 CANONICAL и названные современные GitHub-документы.** Не выдумывай содержимое недоступных источников. Если нет GitHub/Supabase доступа, попроси конкретный read-only export; не утверждай, что всё проверено. Отдели [CANON] / [CURRENT LIVE FACT] / [DRAFT PROPOSAL] / [UNVERIFIED ASSUMPTION].

Не пиши восьми постоянных микросервисов или девятого AI-агента. Сохрани source-of-truth FEYA в Postgres/GitHub и внутренние роли. Не открывай оплату, цену, SEO Release, 207 pinned PDP, V13, старые данные или автономный платный LLM.

Проверяй на **реальных конечных сценариях**:
1. Сайт ещё не принимает оплату, нет нормального GA4, только GSC L0. Что реально умеют TSEO/OSPM/GDAE/GMEL? Где UI должен молчать?
2. Google начнёт индексировать часть разрешённых страниц, но затем обнулится валидность source-health из-за API сбоя. Кто принимает решение? Как не спутать zero и missing?
3. Слабый показ/сильная реальная конверсия у товара. Кто решает, как работать без ложного winner и не уничтожить товары-локомотивы?
4. High search traffic, low orders, many variant/configuration issues. Кто отвечает и чем это доказано?
5. Предложение переписать один из 207 owner-approved PDP. Где hash, lock, CQA независимость, approval и rollback?
6. AI workflow получил timeout, владелец уже нажал решение, worker повторился и получил новый epoch. Где предотвращается двойное действие?
7. Владелец 3 раза подтвердил похожее действие с mixed результатом. Когда система может предложить L3 делегирование, а когда обязана отказать?
8. Провайдер Seller Online наконец одобрил оплату. Что нужно проверить (webhook, idempotency, order/refund reconciliation), прежде чем считать продажи?
9. Agent CEO role и OSPM/CPIM предлагают противоречащие решения. Кто единственный Accountable? Какой источник выигрывает?
10. Визуальный FEYA Mission Control анимирует связи, но событий для них нет. Где тесты на недопущение fake work?
11. Изменилась политика возвратов/сроки доставки, а LLM предложил старую. Какой authority и срок жизни evidence?
12. Цена токенов изменилась, повтор billable request без receipt. Как обеспечить неагрессивные затраты и нужное качество?

**Выход строго в четырёх частях:**
- A: Executive verdict по бизнесу/данным/архитектуре/UX/security/recovery, с REUSE / FIX / ADD / DEFER; что нельзя запускать даже если красиво.
- B: Таблица всех замечаний: ID, severity BLOCKER/MAJOR/MINOR, место в source (файл/раздел/контракт), фактическое доказательство, сценарий отказа, минимальная правка, тест, стоимость/риск, owner who must decide. Не выдавать повторные одинаковые идеи за независимые свидетельства.
- C: Полная трассировка 8 ролей → inputs → signals → contracts → permissions → measurable outcomes → screens/actions → tests. Пустое поле должно быть обнаружено.
- D: Предложить экономный PR-план по dependencies с критическим путём, параллельными потоками Commerce/SellerOnline/GSC/GA4 и реальными exit gates.

**Красные флаги:** модели, которые авторизуют сами себя; бездоказательный ROI; metrics без покрытия/версий; бизнес KPI на недоступном source; snapshot registry на месяцы устаревший, но назван ONLINE; открытые service_role; рисование чужой роли как RUNNING; быстрый Open → Closed без QA; BigQuery/Temporal/новые ключи «на всякий случай»; переописание существующего Product/SEO канона; unsafe auto-change с пересечением рынков/вариантов/скидок.

**Не выполнять никакого кода или записи в Production.** Не создавай новую «MASTER-систему», не заменяй существующий v1.0 Canon. Ответ рассматривается FEYA owner/assistant, а не автоматически применяется.

## Как объединять независимый review

1. Любое замечание проверяется об CANONICAL и live source; если не имеет источника — маркировать HYPOTHESIS.
2. Для подтверждённого BLOCKER — открыть issue/Gap ID, запланировать первую безопасную правку и приоритет. Документ менять через versioned PR/diff.
3. Если reviewer предлагает платный отдельный сервис, требовать measured necessity, сравнение с текущим Supabase Core, operational maintenance and rollback. Default defer.
4. Тесты редтимера переводятся в исполняемые regression только когда есть reproducible fixture/provenance; текстовый список тестов не считается PASS.
5. Критика UI должна быть проверена соответствием реальному endpoint/registry, а не впечатлением от красивого concept screenshot.
6. Все сопоставленные решения и принятые/отклонённые контраргументы фиксируются в #145 как governance audit, без постановки дополнительных агенто-ролей.

## Ожидаемый результат

Не второй готовый план и не «переписать всё», а **инвентаризация доказанных слабых мест + конкретные исправления + независимая защита от дорогих архитектурных ошибок**. Человеческое решение об изменении бизнес-правил/автономии остаётся у владельца.
