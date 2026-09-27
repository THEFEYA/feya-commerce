# FEYA — ассортимент и пилот страниц, 24 сентября 2026

Исторический checkpoint до сверки `883d0f1`: числа 217/26/12 ниже относятся к исходному пилоту. [Следующий этап](Inventory_Reconciliation_20260924.md) восстановил шесть предметных конфигураций; текущий воспроизводимый JSON теперь показывает 222/21/13. Исходный capture сохранён без изменений.

Статус: **проверяемый проект, не публикация**. Этот этап продолжает Search Architecture v1 и существующий Product/Growth OS. Изменений Supabase, маршрутов магазина, цен, утверждений владельца, паспортов агентов, шрифтов или цветов нет. Все восемь ранее подготовленных миграций остаются неприменёнными к production.

## 1. Что измерено

Источник — SELECT из текущей production Supabase плюс существующие точечные owner-reviewed corrections в коде `13b87b6`. Снимок содержит только каталог/SEO/операционные правила, без покупателей, заказов и секретов. SQL-запросы выполнялись отдельно: это не единый транзакционный снимок и не доказательство неизменности данных после 24 сентября.

| Проверка | Результат | Значение |
|---|---:|---|
| Product drafts | 334 | Не все относятся к текущей витрине |
| Строки storefront v4 / уникальные product IDs | 243 / 243 | Остальные 91 draft исключены из этого пилота |
| Соответствующие Product Truth и product SEO pages | 243 / 243 | SELECT с LEFT JOIN: отсутствующих truth/draft/page rows — 0 |
| Существующие seo_page_id и PDP paths | 243 сохранены | Проверка ID → `/shop/{product_slug}` воспроизводится скриптом |
| Query clusters / query ownership в базе | 0 / 0 | Предложения ниже не являются зарегистрированным владением |
| Разрешаемый текущим resolver состав selector | 217 | Состав конфигураций, не готовность к покупке/публикации |
| Неразрешённый состав selector | 26 | Адресная CPIM-очередь в JSON-отчёте |
| Дополнительно: утверждённые номерные варианты без типа | 1 | Их названия/ID сохраняются; тип не угадывается из title |
| Raw Product Truth с диагностическими blockers | 230 | Не отменять более поздние предметные owner corrections |
| Метка Burning Man в storefront | 76 | Вычислена из title; не подтверждение suitability |
| Исторические metric snapshots | 168 | Последний fetched_at — 8 июля 2026; свежих измерений в этой таблице не обнаружено |

`category_label`, `world_label`, часть цветовой классификации в SQL v4 вычисляются регулярными выражениями по title. В `public-collections.ts` текущие подборки дополнительно используют substring-поиск по title/description/material. Это discovery/навигационный механизм. Он не может стать источником подтверждённого SEO membership. В частности, `body` и `arm` имеют более широкий смысл, чем конкретные bodysuit/armor товары.

Существующий `/admin/collections` уже выполняет планирование. Его priority score и пороги 2/3 карточки — внутренние эвристики; они не подтверждают поисковый спрос, достаточность разных дизайнов или допуск страницы. Новый результат готовится для этого процесса, а не создаёт вторую админку.

## 2. Ограниченный пилот

| Кандидат | Известное совпадение по реальным конфигурациям | Неизвестно | Решение |
|---|---:|---:|---|
| TYPE-ARMOR: `/collections/shoulder-armor` | 65 product IDs | 27 | Готовить brief отдельного type hub |
| TYPE-HARNESS: `/collections/harness` | 12 product IDs | 27 | Готовить узкий fashion/body harness brief |
| EVENT-BM: `/collections/burning-man-looks` | 0 подтверждений event-оси в этом контракте | 243 | Hold; это отсутствие structured evidence, не отсутствие подходящих товаров |
| SHOP: существующий `/shop` | Текущий каталог 243 | Заказываемость не подтверждена этим аудитом | Сохранить композицию; затем registry/release/pagination integration |
| GUIDE-COMPONENTS: `/guides/choosing-a-costume-set` | Не требует inventory threshold | Нужен reviewed utility content | Подготовить объяснение комплекта и выбора конфигурации |

65 и 12 — **карточки с подходящими selectable options**, не число отдельных дизайнов и не «товары готовы к индексации». Подтверждённые design families и orderability не доступны в исследованных контрактах; в отчёте они `null`, не 0. `primary_component_family_id`, конфигурация, цвет, размер, source listing и canonical_product_id не подменяют design identity. Числовой inventory policy не назначен: пример «4 дизайна» из архитектуры остаётся предложением.

`shoulders`, `shoulder_x1`, `shoulders_x2` явно входят в правило брони. Quantity aliases сохраняют разные configuration IDs и не создают дополнительные товары. `harness` требует именно harness option. Пояс, choker, garters или harness только на фотографии не считаются совпадением. Если деталь доступна лишь внутри `Top + Shoulders`, она не попадает в standalone-подборку; отдельный режим `any_configuration` сохраняет исходную grouped option без выдуманной отдельной покупки.

У двух type-подборок сейчас 3 общих product IDs. Это измеренное пересечение известной части ассортимента; оно не доказывает каннибализацию. Неизвестные membership не считаются отсутствующими: для event сравнения коэффициент пересечения остаётся `null`.

## 3. Владение запросами и URL

| Предлагаемый owner | Scope | Исключить |
|---|---|---|
| TYPE-ARMOR | Один cluster `DECORATIVE_SHOULDER_ARMOR_COMMERCIAL`, US/en-US; armor/armour — варианты написания | Protective armor, исторические реплики, how-to, конкретные модели |
| TYPE-HARNESS | Один cluster `FASHION_BODY_HARNESS_COMMERCIAL`, US/en-US | Safety/climbing/dog harness; garters без harness; how-to; конкретные модели |
| EVENT-BM, пока hold | `BURNING_MAN_OUTFITS_COMMERCIAL`, US/en-US | Общий festival scope и информационный what-to-wear |
| SHOP | `THEFEYA_SHOP_NAVIGATIONAL` | Автоматическое присвоение всех generic type/event запросов |
| GUIDE-COMPONENTS | Обоснованная buyer utility; primary cluster пока не нужен | Дублирование коммерческого outfit hub |
| Существующие PDP | Конкретный дизайн/предмет/конфигурация на прежнем seo_page_id | Массовое владение общими type/event clusters |

Имена кластеров — **проектные коды**, не созданные UUID. `seo_page_id` и `query_cluster_id` для новых кандидатов остаются `null`. Проверка одинаковых primary cluster/scope между пятью briefs даёт 0 конфликтов предложений; она не заменяет SERP/intent review и проверку актуального portfolio перед apply.

Разрешены два явных уточнения предварительного B2:

- Для harness использовать уже присутствующий в ссылках slug `/collections/harness`, а не создавать конкурирующий `/collections/harnesses`.
- Для event при реализации предпочесть уже присутствующий `/collections/burning-man-looks`; `/collections/burning-man-outfits` не создавать параллельно.

В текущем checkout репозитория публичного `app/collections/[slug]` и rewrite для него нет, хотя PDP уже выводит такие ссылки. Это **статически выявленный пробел маршрутизации**, а не выполненный live HTTP crawl. Широкий `/collections/armor` нельзя автоматически перенаправить на плечи: scope отличается. TSEO должен сверить домен/URL history и подготовить план существующих ссылок до включения release. В этом этапе ссылки и внешний вид не меняются.

## 4. Шаблоны и связи пилота

- Type hub: deterministic product/configuration IDs, точный состав, цена только из того же проверенного offer-контракта; researched intent и короткое объяснение выбора; AI может предложить текст из evidence; CPIM проверяет факты, CQA — самостоятельную ценность и отсутствие подмены intent. Дизайн берётся из согласованной витрины. Shop → type → PDP; PDP → один primary parent; другие контексты — отдельные reviewed links.
- Event hub: тот же каркас плюс product-scoped suitability evidence. Ни world label, ни event keyword, ни изображение не дают таких прав. Не обещать playa safety, weather resistance или гарантированную доставку.
- Utility guide: 3 проверенных примера — отдельная деталь, grouped choice, full set. Примеры должны ссылаться на реальные option IDs. Объяснить различие изображения, выбранной комплектации и её цены; не публиковать generic AI-пересказ коллекции. Guide → подходящий hub и примеры PDP; обратные ссылки добавлять при пользе для выбора.
- Shop: сохраняет согласованную композицию/фильтры. Новый deterministic link graph использует только reviewed существующие targets, не все значения Product DNA.

Schema/canonical/sitemap/robots наследуют раздел H архитектуры и единый будущий release resolver. Этот пилот не выпускает Schema Offer, не назначает availability и не меняет noindex. Actual purchase/return policies и согласованные production/shipping facts проверяются отдельно перед release.

## 5. Следующий запрос данных

Подготовлен **Q02 из 9 исходных seeds**: `shoulder armor`, `shoulder armour`, `shoulder armor costume`, `costume shoulder armor`, `festival shoulder armor`, `body harness`, `fashion harness`, `festival harness`, `costume harness`.

Цель — подтвердить/уточнить разделение type-intent и spelling aliases. Это не прогноз трафика; Ads competition не становится SEO difficulty. Контекст US/en/GOOGLE_SEARCH, фактические последние 12 полных месяцев, исходная currency и provenance — через уже существующий CSV/API evidence workflow. Исторический отчёт спроса сохраняется; новая дата чтения не делает июльские данные свежими. Запрос ещё не отправлен.

`vegan leather harness` отложен: смешанное raw поле `Leather, Faux leather` не доказывает vegan material конкретного товара. Q01 ждёт предметного event membership; Q03 — material evidence и решения о type owner. Отдельные запросы для utility guide пока не меняют решение и не нужны. Сейчас владельцу не требуется новый CSV или исследование.

## 6. Разрешение расхождений и совместимость с агентами

1. **Raw blockers против точечных подтверждений.** Использовать существующий `applyOwnerReviewedStorefrontCorrections` внутри того же sellable-offer resolver. Старые diagnostics сохраняются в capture. `ready` означает разрешаемый selector, но не закрывает остальные gates. Не сбрасывать batch approvals и не переписывать источник цены.
2. **Derived labels против Product Truth.** Метки помогают найти review candidates. Подтверждение оси требует предметного evidence reference, точного значения и актуального snapshot binding. Отсутствие evidence означает unknown.
3. **Номерная конфигурация против типа.** Variant #1–4 остаются утверждёнными вариантами; тип до предметной проверки unknown. Не переименовывать в shoulders из title.
4. **Планировщик против publication policy.** Старые scores остаются workflow hints. Единственным дальнейшим допуском служит утверждённый page spec, inventory policy, владение запросами и release gate.
5. **Observed hash против approval.** SHA256 фиксирует прочитанный набор данных и версии resolver/corrections. Он не является truth approval/version. Перед записью membership в portfolio нужны настоящие ссылки на актуальные предметные решения; missing version остаётся hold.
6. **Роли.** OSPM отвечает за intent/ownership; CPIM — состав, material/suitability/design mapping; SCO — draft; CQA — независимую проверку; TSEO — маршруты/crawl; GDAE — измерения; Core — identity/version/capability; Execution Gateway применяет только approved changeset. Новых authority или паспортов этот код не вводит.

## 7. Следующие задачи по зависимостям

| Задача / owner | Вход → выход | Проверка и blocker | Rollback / done |
|---|---|---|---|
| I1 CPIM + Engineering | 26 unresolved offers + 1 type row, прежние owner decisions → предметная сверка | Exact product/config IDs, сохранить цены и подтверждения; недостаток первичных фактов | Отдельный draft changeset; done: по каждой строке evidence или адресный вопрос |
| I2 CPIM + OSPM | 65/12 matches, первичные карточки → proposed design-family mapping и inventory policy | Не объединять/разделять дизайн по одному цвету/названию; неизвестные не считать | Versioned proposal; done: конкретный список групп и обоснование порога для review |
| I3 OSPM + GDAE | Q02, готовый evidence adapter → валидированный demand/intent review | Provider/staging readiness; targeting, period, raw provenance; не суммировать close variants | Сохранить raw history и отозвать только draft interpretation; done: retain/merge/split decision |
| I4 SCO + CQA + CPIM | Проверенные offer примеры → utility draft и два type briefs | Unique value, факты и existing approval class | Предыдущая immutable draft version; done: reviewable content без release |
| I5 TSEO + Engineering/Core | Registry/URL history + briefs → plan routes/links/pagination/release bindings | Сейчас отсутствуют публичные collection routes; production indexing gate остаётся FAIL | Предыдущий release/deployment, indexing switch off; done: все targets проходят crawl на проверяемом preview |

Владелец нужен только для конкретных фактов/решений, которые нельзя восстановить из уже утверждённых источников. До такого запроса сначала выполняется I1 и собирается предметный пакет. Финального разрешения индексации этот документ не запрашивает.

## 8. Воспроизведение и проверки

Артефакты: `inventory-capture-20260924.json` (исходные данные), `page-pilot-plan-20260924.json` (5 briefs и 9 seeds), `inventory-pilot-report-20260924.json` (все product IDs/results/reasons и очереди), `lib/searchInventorySelection.ts` (bounded tri-state evaluator). Скрипт не подключается к production и не пишет в БД.

```sh
node --experimental-strip-types scripts/audit-search-inventory.ts --check
node --experimental-strip-types --test tests/search/inventory.test.ts
npm run test:search
npm run typecheck
npm run check:product-os-freeze
npm run check:owner-ui
```

Локально: 9/9 новых сценариев, 70/70 search tests, TypeScript и оба UI contract checks прошли. Новые сценарии проверяют grouped/standalone scope, unknown/stale/conflicting evidence, дубликаты, номерные варианты, некорректные правила, воспроизводимость фактического capture и сохранность ID. CI для опубликованного commit фиксируется отдельно в draft PR #26. Полный production launch gate по-прежнему **FAIL**.
