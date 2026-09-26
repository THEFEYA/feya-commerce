# FEYA — подготовка всего одобренного каталога

24 сентября 2026. Решение владельца `owner-full-approved-catalog-20260924-03`. Основной актуальный checkpoint вместо трактовки пятёрки как размера первого магазина.

## Объём и политика изменений

Целевой каталог — **все 208 одобренных карточек**. Ранее выбранные пять остаются технической выборкой для проверки пути renderer → metadata → release; они не ограничивают каталог. Полный список product IDs сохранён в owner manifest. 19 ранее отложенных формованных корсетов и зеркальных комплектов не пересекаются с этими 208.

Одобренные идеи, преимущества, основные описания, выбранные оси и роли keywords сохраняются. Прежние данные Google Keyword Planner используются с исходными датами и ограничениями. Текущая дата чтения не делает их свежими. Возраст реального периода измерения нельзя определять только по last_checked; предположение владельца о давности не превращаем в точную дату.

Точные исправления допускаются при фактической ошибке, неоднозначном заголовке, несоответствии товару/варианту или техническом разрыве. Совпадение широкого Primary и общий шаблон блоков сами по себе не вызывают переписывание. Ключи не заменяются новыми обещаниями спроса. При недостатке данных — сохранять unknown, а не изображать нулевой спрос или прекращать подготовку всего каталога.

## Проверено по текущим данным

| Проверка | Результат | Значение |
| --- | ---: | --- |
| Последние approved drafts | 208 | Все вошли в аудит и целевой manifest |
| Совпадение полных DB-record hashes с предыдущим capture | 208/208 | Прежние тексты и решения не были подменены между чтениями |
| Заполнены title, H1, meta description, intro и 4 описательных блока | 208/208 | Данные есть в реальном `agent_output_snapshot` |
| Точные повторные SEO-title | 19 групп / 43 карточки | Предметный review различий |
| Точные повторные H1 | 24 группы / 59 карточек | Частично пересекаются с title |
| Объединённая очередь title/H1 | **64 карточки** | Остальные 144 не затронуты этими точными совпадениями |
| Точные повторные meta description / intro | 0 / 0 | Нет причины массово менять эти поля |
| Точные повторные полные описания | 0 | Нет основания перегенерировать весь корпус |
| Близкие полные описания по five-word shingle Jaccard ≥0.8 | 0 пар | Только локальная эвристика; не гарантия смысловой уникальности и не порог Google |
| Один повторный блок преимуществ | 2 карточки | Проверить полезность/правдивость общего текста; не считать дублем всей страницы |
| Подготовлены точные content projections | **208/208** | Одинаковая версия для PDP и metadata, без генерации |
| Состав resolved с подготовленным owner correction | **208/208** | Не подтверждает полную price/availability tuple и checkout |
| Поля текущего storefront view отличаются от approved draft | 208/208 | Витрина ещё не подключена к выбранным одобренным версиям |

Сравнение текстов нормализует Unicode NFKC, регистр и whitespace. Пунктуация/синонимы не считаются содержательной уникальностью. Полные данные и exact-ID группы: `approved-catalog-audit-20260924.json`.

Все 208 CQA statuses сейчас `not_run`. Поэтому автоматический аудит не называется независимым ручным CQA каждого факта. В сохранённых metric statuses: 136 validated, 53 primary_needs_metric_validation, 15 без recorded status, 3 partial, 1 missing. Это доказывает неоднородность сохранённых статусов, а не необходимость заново утверждать все тексты. Остаточные human_review_required и product_truth flags нужно сверять с более поздними owner decisions. Новая массовая генерация не запускается, старые flags не очищаются в БД вслепую.

## Исправление состава по уже данному ответу

`40384eea-fd82-40f4-98e7-804383c42796` раньше имел безымянный Option и неизвестный состав Full Set. В существующий exact-ID correction layer добавлено:

| Configuration price ID | Обозначение | Состав | Сумма EUR — сохранена |
| --- | --- | --- | ---: |
| `a415b1cc-1001-4c8b-b03e-7ed6a27f7ad6` | Bra | Bra (существующая ось top) | 96.50 |
| `ebf42918-4916-46c1-b2a9-75a8e2fe4ae0` | Skirt | Skirt | 135.10 |
| `40b8d2ce-8267-42b8-a4a3-f6a7ea24f212` | Full Set | Bra + Skirt | 175.46 |

Основание: ответ владельца + исходные варианты/price lineage. Дополнительные пояс, чёрная одежда или состав материала юбки не добавлены. ID, исходные суммы, currency, price confidence и размерно-цветовая неизвестность сохранены. Весь каталог 243 теперь даёт 223 composition-resolved и 20 hold; из последних 19 отложены владельцем, один legacy headpiece-only case находится вне этих 208. Исторический price capture из 21 товара/142 строк сохраняется: разрешение состава не разрешает автоматически точную цену комбинации.

## Передача одобренной версии в витрину

`prepareApprovedContentProjection` формирует данные под существующий `ProductDetailClient.draft` и соответствующие metadata. Тело, heading и порядок сохранённых блоков передаются без нормализации текста и без повторного writer/editor. Клиентская часть projection содержит только customer copy; internal notes, review metadata, raw truth и цены не передаются.

Привязка содержит canonical_product_id + seo_page_id + draft_id + content SHA256 + текущий URL. `matchApprovedContentBinding` отклоняет чужой продукт/страницу, изменённый draft, route или payload. Верхнеуровневые поля и сохранённый output обязаны совпадать; автоматического fallback на устаревший текст нет. Metadata и PDP должны использовать один подготовленный payload из одного серверного чтения.

`approved-catalog-content-bindings-20260924.json` содержит все 208 entries со статусом prepared_not_released. Он **ещё не подключён к публичному route**. До конкретного release authority visibility, purchasable и indexable остаются false. Нельзя импортировать этот внутренний manifest целиком в клиентский bundle. Следующий server adapter должен выбирать только разрешённую запись по точному product/page ID, возвращать allowlisted payload и повторять актуальную version check. Index/commerce проверки остаются самостоятельными.

В существующем `app/shop/[slug]/page.tsx` чтение идёт из storefront view; `ProductDetailClient` пока вызывается без draft prop. Следовательно, чтение approved draft в админке ещё не публикует его текст. Анонимная live проверка по прежнему preview ограничена Vercel SSO; этот вывод сделан по коду и DB source, не по открытому browser crawl.

## Адресные метаданные

`metadata-distinction-queue-20260924.json` фиксирует все 64 affected IDs, текущие draft hashes и поля, которые нужно сохранить. Для четырёх карточек подготовлены конкретные title/H1 diffs на основе подтверждённых комплектов: choker/плечи, top/leg covers, top+shoulders+skirt и top/skirt/panties options. Новых точных совпадений эти варианты не создают. **Они не применены**, descriptions/meta description/keyword selections сохранены. Остальные 60 строк требуют такого же предметного разбора; никаких ID-суффиксов или случайной замены синонимов ради уникальности.

Одно семейство/одна фотосессия не означают дублирующийся товар. Если состав и физическая модель совпадут, OSPM/CPIM выбирают вариант/отдельную страницу по смыслу, сохраняя stable IDs и историю; нельзя маскировать настоящий дубль новым заголовком.

## Подтверждённая внешняя опора и пределы вывода

- Google Search Central, [Title links](https://developers.google.com/search/docs/appearance/title-link), проверено 24.09.2026: descriptive distinct titles и отсутствие повторного boilerplate. Это обосновывает точечное различение заголовков, а не тотальную регенерацию описаний.
- Google Search Central, [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), проверено 24.09.2026: canonical предназначен для duplicate/very similar pages. Одного одинакового Primary или H1 недостаточно для автоматического merge/noindex.
- Next.js 15, [generateMetadata](https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata), проверено 24.09.2026: metadata и page data должны согласованно читать одну версию; React cache подходит для memoized server reader там, где нет fetch memoization. Новые API Next.js 16 сюда не перенесены.

Это архитектурные выводы на базе указанных docs; FEYA Search ranking/traffic/conversions этим аудитом не измерялись. Само число товаров не является нашей метрикой SEO качества.

## Маршрут до запуска — текущий приоритет

| Этап / owner | Вход → выход | Проверка, blocker | Rollback / done |
| --- | --- | --- | --- |
| C1 Завершить точечные metadata diffs / SCO + CQA + CPIM | 64-row queue, photos/truth/approved text → конкретные различимые title/H1 | Сохранять смысл, Primary roles и body; подлинные identical-design случаи вынести в OSPM | Старые immutable drafts; done: все 64 рассмотрены, accepted diff либо обоснованное сохранение |
| C2 Уточнить query ownership / OSPM | Existing Primary selections, будущие hubs, current page IDs → accountable cluster owners | Не превращать product secondary relevance в конфликт; неизвестные metrics не выдумывать | Предыдущая ownership version; done: разрешены затронутые intents, целевой список 208 сохранён |
| C3 Подключить approved copy / Engineering + TSEO | 208 bindings + C1/C2 → серверное чтение разрешённых записей и существующий PDP renderer | Hash/ID/URL, server HTML, отсутствие private data, метаданные/JSON-LD/description совпадают | Release OFF + прежний deployment; done: все целевые страницы проверены, визуальные contracts проходят |
| C4 Товарные/технические допуски / Commerce + TSEO | Тот же каталог → точные quotes, ссылки/хабы, canonical/sitemap/schema/pagination | Не требовать закрыть отложенные 19; конкретные неизвестные не делать покупаемыми/индексируемыми | Per-product flags и release version; done: каждая карточка имеет проверенный статус и причину исключения, если есть |
| C5 Company и оплата / Owner + Engineering | Существующие identity/policies, domain map → публичные доверительные страницы, sandbox payment | Собрать факты прежде запроса владельцу; SSO/public access и admin protection | Предыдущее развёртывание, checkout OFF; done: реальный проверяемый company/commerce release |
| C6 Выборочный Search cutover / Core + TSEO | Exact release, C1–C5 → pre-index gate и rollout | Нет автоматического открытия из copy approval; current config проверяется на конкретном deployment | Manifest/index flags OFF; done: утверждённый scope пройден, мониторинг запущен |

C5 готовится независимо от C1–C4. Отдельные проблемные URL получают конкретные причины, но пять технических примеров не превращаются в постоянный размер магазина.

## Проверки этого изменения

Локально: **103 Search tests + 441 Product/SEO tests PASS**, TypeScript PASS, Product OS freeze (41 files) PASS, Owner UI contract PASS. Включены проверки exact projection/hash/identity, сохранения текста и цен, отсутствие внутренней информации в payload, точный состав Bra/Skirt и отказ на изменённом наборе опций. Исторические audits регенерированы с новым correction layer; 142 price rows сохранены.

Воспроизведение: `node --experimental-strip-types scripts/audit-approved-catalog.ts --check`. Полный CI для опубликованного commit фиксируется отдельно в PR; локальные результаты не выдаются за production проверку. Рабочая БД не изменялась; OpenAI calls — 0; индексация не включалась.

**От владельца сейчас ничего дополнительного не требуется. Следующие задачи — завершить 64 адресных metadata reviews и подключение всех 208 одобренных версий, параллельно с company/domain/policy подготовкой.**
