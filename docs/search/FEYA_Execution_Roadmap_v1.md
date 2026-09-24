# FEYA Search + Commerce: маршрут до запуска

Актуализировано 24 сентября 2026; постоянный checkpoint для следующих сессий. Основа: `FEYA_Search_Architecture_v1.md` (A–K), `FEYA_Page_Portfolio_Schema_v1.md`, `FEYA_Keyword_Research_Queue_v1.json`, `Launch_Track_Decision_20260924.md`, Product/Growth contracts, предметные audits. Статус из этого документа проверяется по фактическому commit, БД и deployment, а не по памяти разговора. Owner отвечает за стратегические бизнес решения; Core проверяет роли/версии и исполняет только разрешённый changeset.

## Текущий checkpoint: C1/C3, 24.09.2026

Продолжать с `Approved_Content_Integration_20260924.md`. Все 208 товаров остаются target. Все 64 metadata candidates разобраны: 39 адресных предложений, 5 сохранений, 20 предметных holds (18 physical-design, 2 copy/truth). Предложения не записаны поверх approved drafts. Закрытое серверное подключение approved copy к настоящему PDP подготовлено для 208 точных версий; по умолчанию OFF, только authenticated review, noindex и previewMode. Метаданные/JSON-LD/description используют одну версию. Публичный release и C2 ownership ещё не завершены.

Следующий порядок: exact-head runtime evidence → C1.2 предметные holds + C2 query ownership → C3.2 public-safe release → C4 exact quotes/SEO gates; C5 company/domain/policy готовить независимо. Отложенные 19 не возвращать на критический путь. От владельца сейчас ничего не требуется.

## Неподвижные ограничения

- Публичный язык EN, admin RU. Шрифты, цвета, компоненты storefront и Product OS защищены; визуальный редизайн — отдельная задача.
- Product Truth конкретного изделия выше SEO draft/названия/фотографий. Никакой генератор текста не создаёт состав, цену, наличие или право продажи.
- Стабильные `canonical_product_id`, `configuration_price_id`, `seo_page_id`, `query_cluster_id`; все изменения через versioned evidence, owner/agent authority, change history и rollback.
- Исследования Google и конкурентов — доказательства и гипотезы, не FEYA продажа/частотность и не лицензия создавать страницы на каждую ось DNA.
- Не менять production DB, платежи, домен, опубликованные политики и index flags без конкретного проверенного release и соответствующего решения владельца.

## Карта этапов и зависимостей

| Этап | Статус на 24.09 | Owner; вход → результат | Условие готовности / при сбое |
| --- | --- | --- | --- |
| 0. Базовая интеграция | Код синхронизирован: draft PR №26, `c2b5cd4`; CI 9/9 и preview READY; hosted env/DB mapping открыт | Engineering + Core; сверка Product/Growth/старого канона → versioned repo/deployment/data map и опубликованный проверенный PR | Точный head CI, защищённые UI contracts, source DB identity; откат commit/feature flag, без слепого merge |
| 1. Truth и покупки | 223 состава resolved / 20 hold во всём каталоге; 208/208 resolved в целевой группе после correction; tuple price требует отдельной проверки | CPIM + GDAE; выбранный release inventory → точные composition/design/binding; остальные случаи — отдельный backlog | Точная server-side quote для каждой продаваемой комбинации; нет auto Cartesian, label dedupe и цены по умолчанию; иначе соответствующий товар остаётся недоступным для заказа |
| 2. Company/API review | Нет доказанного публичного release на утверждённом домене | Owner + TSEO; identity/contact/policy/application description → правдивые страницы для проверки компании и назначения внутренней аналитики | HTTPS, реальные сведения, недоступность private admin, точный scope заявки; Google API permission проверяется независимо от сайта |
| 3. Товарный и поисковый портфель | 243 сохранённых page IDs, пять briefs; 0 confirmed query owners; хабы — candidates | OSPM + CPIM + SCO; inventory families, existing demand, Q02 decision seeds → page specs, intent owners, unique-value briefs | Нет конфликта primary query ownership; достаточный доказанный ассортимент; несостоявшиеся хабы остаются фильтрами/holds |
| 4. Content и release manifest | Целевой каталог 208 approved; 208 exact content bindings подготовлены, 64 metadata reviews; публикация не разрешена | CQA + TSEO + Engineering; approved Product Truth и briefs → EN home/shop, подтверждённые PDP, полезные service pages, обоснованные hubs и только eligible editorial | Факты/состав/материал/размер/FAQ/schema согласованы; server HTML, canonical, sitemap, robots, pagination и internal links соответствуют одной release версии |
| 5. Commerce и платежи | Checkout decision, provider, политики returns — открыты | Owner + Commerce + Engineering; реальные условия и approved bindings → provider sandbox → оплата/подтверждение/возврат | Полная успешная и ошибочная покупка, consistency сервера и UI, order persistence; при сбое checkout feature flag OFF |
| 6. Измерение и аналитика | Atomic import подготовлен, восемь миграций не применены; live Ads capability неизвестна | GDAE + GMEL; staged DB/app contract, GA4/GSC/Ads credentials → проверенные events, snapshots, diagnostics и decision loop | Hosted staging + advisors + Auth + rollback; actual GA4/GSC/Ads permissions, real paid order для purchase; CSV fallback пока API закрыт |
| 7. Выборочная индексация | FAIL; ничего не открывать по умолчанию | TSEO + Core + Owner; exact release и утверждённые страницы → K01–K18, browser crawl, URL inspection после релиза | PASS каждого blocker на конкретном release, canonical domain, policy и ownership; откат release/manifest и selective noindex, историю сохранить |
| 8. После запуска | План, не измеренный результат | GMEL + OSPM + CQA; GSC/GA4/order data/change history → наблюдение, content refresh, keep/merge/retire proposals | Thresholds предварительно заданы; достаточная выборка, задержка данных и сезонность; никакой причинности из простого before/after |

Этапы 1 и 2 готовятся параллельно; 6 можно готовить независимо от 3–5. Публичный company release не ждёт всех product holds или Keyword Planner; фактический checkout требует доказанной цены выбранной комбинации. Полное снятие `noindex` ждёт этапы 1, 3, 4, 5 и нужные технические/security части 6–7 для конкретных коммерческих URL. Если решён каталог без оплаты, это отдельное явное решение с корректной семантикой страниц, не скрытый обход commerce gate.

## Следующий bounded work package

Текущий checkpoint: [Deployment_Source_Map_20260924.md](Deployment_Source_Map_20260924.md). Прежний локальный пакет полностью опубликован в `c2b5cd4`, 12 Git blobs и полное дерево проверены; CI 9/9, runtime log 30 PASS, preview READY. Установлены обе screenshot branch/deployment связи. Supabase ref и 243-record contracts проверены SELECT; привязка Vercel environment к БД ещё неизвестна. На проверенном preview действует Vercel SSO; public release нуждается в отдельном анонимном тесте. 15 cover images просмотрены; результаты записаны в Design Review.

Актуальный приоритет: [Approved_Catalog_Launch_20260924.md](Approved_Catalog_Launch_20260924.md), decision `owner-full-approved-catalog-20260924-03`. **Все 208 approved товаров — целевой каталог. Пятёрка — только техническая выборка, не лимит выпуска.** Предыдущие 28 — результат узкого traceability preflight, не сокращение ассортимента и не отзыв остальных approval.

1. C1: закончить предметный разбор 64 карточек с точными повторными title/H1. Четыре field-level proposals готовы; сохранить основные тексты, преимущества, meta descriptions, keywords и IDs. Точных дублей полных описаний и meta descriptions среди 208 нет.
2. C2: назначить accountable query ownership в пределах 208 PDP и обоснованных hubs. Повторный широкий Primary не означает автоматический конфликт или необходимость переписать страницу. Старые metric dates сохраняются; live Ads API не требуется для повторения уже выполненной работы.
3. C3: подключить подготовленные 208 projections к разрешённой серверной release версии и существующему PDP renderer. Metadata/PDP должны использовать один immutable payload/hash. Сейчас public route ещё читает storefront view с отличающимися полями.
4. C4: проверить реальные tuple quotes/variants, canonical/schema/links/sitemap/pagination по всему целевому списку. Исправление Bra/Skirt подготовлено, состав разрешается у всех 208; orderability из этого не следует.
5. C5 / LT1: независимо подтвердить public domain, deployment→DB связь и company/contact/policy данные, затем платёжный sandbox. Если отсутствует бизнес-факт, сначала подготовить конкретный reviewable пакет, затем запросить владельца.
6. C6: exact release и pre-index checks, затем разрешённый cutover/rollback и мониторинг. Отложенные 19 изделий и весь дополнительный ассортимент не стоят на критическом пути. Поддержку Dress/Jacket и расширение вернуть после релевантного решения/данных.

Текущие source fingerprints, 208 exact IDs/bindings и все различия: `approved-catalog-audit-20260924.json`, `approved-catalog-content-bindings-20260924.json`, `metadata-distinction-queue-20260924.json`. Production DB SELECT only, indexing OFF; новых подтверждений или файлов от владельца сейчас не требуется.

## Формат ответа владельцу после каждого этапа

Коротко: **что готово → что остаётся заблокированным → следующий шаг → что требуется от вас сейчас**. Указывать отдельно локальный результат, remote PR, production DB и индексацию. Если действий владельца пока нет, говорить об этом явно. Если требуется факт, показывать конкретный товар/решение и почему источники его не содержат.
