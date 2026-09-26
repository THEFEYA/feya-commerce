# FEYA — Product / Growth integration checkpoint

Дата: 23 сентября 2026. Статус: selective integration в draft PR; не production release и не разрешение индексации.

## Источники и сохранённая граница

- UI / Growth baseline: `owner-ui-v1`, `928d8dfcfb18cec0e8b19fa27ee40faa636e2b3d`.
- Search foundation parent: `615a9c20818a0e0cf4f5401fbdf8dd83665fc6e8`.
- Product source: `work/resume-listing-batches-20260915`, `c28e112923d33eaea18c5c08aa858a4c5bb91c26`.
- Эти ветки повторно прочитаны перед интеграцией. Таблицы Supabase читались только через SELECT.
- Объединение всей Product branch удалило бы часть owner/Growth admin и заменило бы защищённые admin readers. Поэтому перенесены конкретные изменения; branch-compatibility.json остаётся исходным полным сравнением.
- Архитектура A–K, Page Portfolio schema и Keyword Research Queue остаются в соседних документах. Этот checkpoint дополняет их исполнением J3, не заменяет канон или паспорта агентов.

## Что перенесено и согласовано

| Область | Результат | Ограничение |
|---|---|---|
| Owner-reviewed corrections | Точный файл из Product source: дополнительные reviewed configurations, включая batches 28–39 и варианты количества | Не новая Product Truth, не правка источников в БД |
| Product / SEO tests | Восстановлен весь существующий tests/seo; исправлена типизация старых fixtures | Ни один тест не отключён; необходимые изменения ожиданий перечислены ниже |
| Комплекты | Отдельные функции для состава Product OS и сгруппированных строк What's Included | Группировка не создаёт отдельные варианты покупки |
| Exact selection | Сначала configuration_id; неизвестный ID и неоднозначный Full Set дают пустой результат | Не подмена выбранного товара первым похожим вариантом |
| Offer signature | Состав привязан к configuration_id, а не только к общему full_set code | При фактическом изменении подписи существующий stale-decision gate должен потребовать повторную проверку конкретного решения |
| Confirmed membership | Явно подтверждённый Full Set не расширяется всеми соседними options | Legacy completion остаётся только для неполного, не подтверждённого состава |
| Conflicts | Explicit member label сильнее автоматически полученного имени axis; конфликт двух explicit labels остаётся hold | Не снимает реальные конфликты Product Truth |
| Editorial policy | Historical unstamped output → legacy_v1; generation / new save / repair → brand_mission_v2 | Старые approvals и сохранённые snapshots не переписаны |
| Editorial memory | V6 сохранена; V7 согласует brand-close instructions, compact prompt и reference | Новая версия — engineering reconciliation из Product branch, не новая запись owner approval |
| Price helpers | Exact comparison исключает лишние и повторно учтённые компоненты | Новый comparison и audit не подключены к защищённому PDP; эвристика overhead требует подтверждённой актуальной pricing policy |
| CI | test:seo добавлен рядом с search и PostgreSQL suites | Remote checks проверяются отдельно от local build |

Порядок Full Set в selector перенесён из Product branch: Full Set первым, остальные по прежнему sort_order. Выбор Full Set по умолчанию уже существовал в ProductDetailClient; новый порядок не является переоценкой товара. Исходные цены options, currency и UUID не изменяются. Вычисляемые подписи состава, названия и savings могут отличаться при исправлении фактического состава; это не новая цена продажи.

## Почему перенос не был простым копированием

Первый запуск восстановленных тестов на owner baseline выявил 23 failures из 414 (один suite не мог загрузить отсутствующий новый helper). Прямой перенос пяти runtime libraries дал 38 failures из 424: новые редакционные запреты применялись задним числом, а единая функция состава смешивала inventory axes и сгруппированные варианты покупки. Это результаты локальных integration runs, не оценка всей Product branch отдельной сборкой.

Приняты следующие явные решения:

1. Historical read/preview сохраняет предыдущую редакционную policy. Новый save и repair проходят текущую policy и сохраняют её в output snapshot. Переданная клиентом legacy metadata не понижает серверную policy; неизвестная версия блокируется. Новые инструкции и validator теперь согласованы.
2. `sellableOfferIncludedLabels` сохраняет factual members для Product Truth / SEO. `sellableOfferPurchaseUnitLabels` группирует What's Included. Full Set display является точным разбиением: никакие две строки не считают один компонент дважды, никакая группа не добавляет extra component.
3. Для Full Set порядок и wording берутся из его подтверждённых members; порядок dropdown не переопределяет состав. Отдельно выбранная группа сохраняет свой public label. Если часть комплекта не продаётся отдельно, её inclusion не создаёт новый selector option.
4. Несколько вариантов full_set не делят одну запись signature. Смена одного состава не может незаметно переназначить другой вариант количества.

Десять ожиданий в `storefrontIncludedOptions.test.ts` согласованы с этим контрактом, при сохранении строгих equality assertions: пять изменений порядка (women harness, bra/panties, white men's set, GoGo, punk); четыре изменения member wording из Full Set (captain, female warrior, gold skirt set, warrior); одна допустимая детерминированная группировка witch (`Corset` + `Horns + Spine`). Исходные fixtures и correction mappings не переписаны для получения PASS. Добавлены самостоятельные regression cases для порядка, количества, ID, exact partition и conflicts.

## Проверка на реальных данных

`tests/seo/fixtures/liveOfferReplay20260923.json` — SELECT snapshot v7 storefront RPC, три специально выбранных edge cases, 16 configurations:

| Product UUID | Риск | Проверено |
|---|---|---|
| 437a20cd-27a3-4aaf-b154-3353899e0ebd | Все raw labels = Option | Четыре номера варианта восстановлены по существующим mappings; ID и цены сохранены |
| ebd949d5-6596-4a7c-aec7-11e258dae417 | Arm/leg x1, x2 и комбинированные options | Choices не объединяются по одному SEO axis; цены сохранены |
| a7109e93-df1f-43a6-bb6f-62bdf74e4c4f | Два Full Set x1/x2 с общим code | Отдельный выбор по ID и независимые signature members; цены сохранены |

Это измеренная структурная проверка snapshot, не conversion evidence, не live purchase и не выборка всего каталога. Платные OpenAI requests и записи в production не выполнялись.

## Validation

- `npm run test:seo`: 437 PASS, 0 FAIL; 424 перенесённых tests + 13 дополнительных regression cases.
- `npm run test:search`: 21 PASS; `npm run test:search-db`: 10 PASS.
- `npm run typecheck`: PASS; production Next build: PASS.
- Admin boundary: PASS. Product OS visual freeze: 41 files PASS. Owner UI contract: PASS.
- JSX, CSS, шрифты, цветовые tokens, frozen manifests, auth и agent passports не изменены. Build сохраняет существующие warnings owner UI; новые warnings этим проходом не добавлены.
- Read-only schema preflight: все четыре UUID keys существуют, NOT NULL, с точным уникальным ключом; требуемые Supabase roles присутствуют; page_type = text; имена пяти таблиц и трёх функций свободны. Воспроизводимый запрос: `scripts/preflight-search-schema.sql`; фактический результат: `schema-preflight-20260923.json`.

Local PGlite проверяет PostgreSQL constraints на минимальных parent fixtures. Schema preflight не заменяет full Supabase staging restore, advisors, concurrent requests и authenticated browser/API validation. Предыдущий Vercel preview был закрыт SSO; наличие deployment READY не считается проверкой его страниц.

## Отложенные изменения — конкретно

| Source change | Решение | Следующая проверка |
|---|---|---|
| ProductDetailClient: prices в selector, badge/comparison layout, variant_guide, heading | Не переносить JSX в эту интеграцию | Отдельный узкий visual diff на согласованном дизайне; проверка x1/x2 и отсутствия ложной скидки |
| ListingMasterPage: transient 57014 / statement timeout retry | Подготовлен отдельный минимальный patch; protected file не изменён | Проверить bounded retry/cancellation на staging; admin reader сохранить |
| ListingMasterPage: замена getAdminReadClient на публичный read client | Отклонено | Продолжать использовать существующую admin boundary |
| lib/types.ts: удаление Growth типов | Отклонено | Существующие agent/execution/change-event contracts сохранены |
| Checkout, payment routes и прежние migrations Product branch | Не активированы | Commerce readiness и утверждённый способ заказа — отдельная зависимость |
| Новые indexable pages / auto-publishing | Не создавались | Intent, inventory, ownership, demand evidence, release manifest и K gate |

## Следующий исполнимый этап

1. Подготовить изолированную полную схему и проверить migration + существующие reads, RLS, default privileges, advisors и rollback. В подключённом Supabase проекте на момент проверки нет готовых database branches; production не используется вместо staging.
2. Проверить связанный сценарий Product Truth → keyword decision → draft generation fixture → save/preview → approval guard в тестовом окружении. Отдельно проверить impacted signature cases; не сбрасывать все approvals каталога.
3. Повторно использовать существующий CSV/metrics workflow и snapshots; новый Keyword Planner export запрашивать только для незакрытого Q01–Q03 decision gap.
4. Затем подключать page inventory snapshots, query ownership и общий release manifest. Production indexing остаётся заблокированной до полного K gate.

Владелец сейчас не должен заново присылать исследования, цены или Product Truth. Если для staging/runtime понадобится конкретный доступ, запрос должен назвать нужный ресурс и уже проверенные альтернативы. Перед release отдельно нужны актуальные canonical-domain, returns/order и measurement решения, если в действующих records они всё ещё открыты.

Rollback: revert этой integration commit на foundation parent `615a9c2`; при уже записанных тестовых drafts сохранять policy stamp и не интерпретировать v2 как legacy. Production rows, env и indexing flags этим проходом не менялись.
