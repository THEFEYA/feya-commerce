# FEYA — ответы владельца, состав выпуска и изменения вариантов

> C4.1 update, 24.09: серверный draft writer и additive migration реализованы; детали и доказательства — `Variant_Draft_Writer_20260924.md`, точный head CI — верхний checkpoint PR №26. Новые варианты сохраняются только как draft/retired, цены — unverified/range. Save не подтверждает price evidence и не меняет source prices. UI save/reload — следующий C4.2; production OFF. Нижние формулировки «будущий writer» относятся к исходному плану, утверждение цены — к отдельному C4.3.

24 сентября 2026. Продолжение C1/C4; draft PR №26. Авторитет фактов — ответ владельца на пять карточек из `Owner_Product_Questions_20260924.md`. Машиночитаемые решения и точные source bindings: `owner-product-decisions-20260924.json`. Это подготовленный пакет: production DB не менялась, storefront release, redirects, оплата и индексация не активированы.

## Решения по пяти карточкам

| Карточка / стабильный product ID | Решение и его пределы |
| --- | --- |
| 1. Gold shoulder/skirt, Etsy 4324575912; `453ffb2e-2ed9-4e8d-b74c-e891604f9644` | Оставить для будущей витрины. Одна и та же обложка не даёт преимущества по фото; выбираем более поздний approved draft от 23.09 с конкретными curved panels / fan-like details. Это редакционный выбор по поручению владельца, не доказанное преимущество конверсии. |
| 2. Gold shoulder/skirt, Etsy 4324592783; `d42dd678-7b11-4f38-890e-411de686f418` | Исключить из будущего видимого выпуска по явному поручению «оставляй одну». Сохранить запись, page/draft/option IDs, суммы и всю историю. «Скорее всего один товар» не превращаем в подтверждение физической design family. |
| 3. Witch costume, Etsy 1865813989; `340b160f-93e3-4389-866f-df79cc14dea8` | Сохранить. Оставить costume-oriented title/H1. |
| 4. Horns headpiece, Etsy 1899634207; `83ea907b-a523-47cf-834f-5a1b16b80339` | Сохранить с существующим выбором остальных частей наряда. Предложить title/H1 `Black Witch Horns Headpiece with Optional Costume Pieces`; source title и самостоятельный Horns option поддерживают направление. Основной approved текст и Primary пока не переписываются. |
| 5. Arm/leg armor, Etsy 1810806419; `a83b1b51-79be-4cae-a943-661060a34080` | Текущий материал — глянцевая веганская кожа; акрил/пластик — историческая версия. Arm Armor / Leg Armor / Full Set выбираются отдельно от цвета. Gold/Silver названы владельцем; остальные цвета — будущая возможность. |

Для №5 изменён **только exact-ID material override** общего `thefeyaSeoDoctrine`: его используют fixed PDP panel и writer prompt. Не распространять этот факт на другие товары. Approved body и meta description сохранены; будущий генератор должен получить новый truth revision, а не старый смешанный material list. В capture обложка содержит серебряную руку и золотую ногу, владелец описывает золото с чёрными ремнями. Сохраняем оба вида доказательств: нельзя назвать все фото золотыми или создать единый default color. Нужна привязка конкретных изображений к вариантам. Ответ не содержит цен, размеров, количества деталей или разрешения любой комбинации.

У №3/4 подтверждено **сохранение обеих карточек**, а не два разных физических дизайна. Изменение title само по себе не разрешает индексацию двух похожих страниц. Headpiece page должна иметь полезное описание выбора рогов, точное пояснение optional costume pieces и отдельное query ownership; источник уже подтверждает рога и групповые опции. Эти проверки можно выполнить по имеющимся данным без повторения вопроса владельцу. Если уникальной пользы недостаточно, сохранить обе в магазине, а индексируемую роль решить отдельно.

## Что действительно изменилось в количестве

- 208 source products / approved bindings остаются неизменными и доступными для внутренней проверки.
- 207 **кандидатов** видимого выпуска после одного разрешённого исключения; это не число готовых к оплате или индексации страниц.
- Очередь 64 metadata cases: 43 предложения title/H1, 8 сохранений, 12 holds, 1 исключение из будущего выпуска. Proposals не применены к исходным approved drafts.
- 12 оставшихся metadata collisions относятся к шести другим парам; ответы по текущим пяти карточкам записаны, повторный запрос не нужен. Прежние 16 в отчёте C1/C2/C5 — исторический checkpoint.
- Query audit сохраняет исторические Primary всех 208 записей. Для нового inventory evidence подавленная карточка не считается. Это не переименование Primary, не измеренная каннибализация, не пересчёт search volume.

В 207 visible candidates найдено 59 shoulder / 12 harness / 33 bodysuit configuration matches. Прежние 60 shoulder включали подавленную золотую карточку; никакого физического товара из источников не удалено. Эти числа по-прежнему не доказывают количество уникальных дизайнов или готовность к заказу.

`selectLaunchSources` сверяет product/page/draft/content hash обеих сторон. Stale binding, неизвестный target, duplicate IDs/path, цепочка или цикл подавлений блокируют сборку. Результат содержит будущий redirect candidate, **activation_authorized=false**. Перед применением заново сверить source version и действующие canonical domain/routes. Shop, links, schema, sitemap и redirect должны читать один будущий release manifest. Нельзя просто удалить строку из БД либо установить redirect, пока соответствующий target не выпущен. У двух золотых объявлений разные option IDs и суммы; цены не объединяются. Исторические заказы и измерения остаются на прежних IDs; для сравнения допустим отдельный versioned reporting roll-up, не перепись сырых событий.

## Уточнение владельца: комплектация определяет базовую цену

После первоначального пакета владелец уточнил правило `owner-configuration-base-price-20260924-04`: **цвет и материал обычно не влияют на стоимость; цену определяет выбранная комплектация, отдельные исключения возможны**. Это бизнес-правило по умолчанию, а не универсальное утверждение, что все исторические цены одинаковы.

Архитектура исправлена до подключения writer: одна подтверждённая `base_price` у `configuration_price_id`; каждый явно доступный цветовой вариант ссылается на неё через `pricing.mode=configuration_base`. Сумма не копируется на каждый цвет. Исключение хранится как `exception_override` с конкретной областью применения, причиной, evidence и собственной quote revision; автоматических наценок за Gold, покрытие или материал нет. Неполное исключение блокирует покупку и не подменяется обычной ценой.

Product revision и price revision разделены. Добавление или переименование price-neutral цвета сохраняет исходный quote ID/revision; повторно подтверждать ту же цену для каждого цвета не нужно. Изменение базовой цены создаёт новую quote version для всей комплектации, не переписывая прошлые заказы. Изменение одного исключения затрагивает только его варианты. Доступность размера/цвета/комплектации проверяется отдельно: наследование цены не создаёт комбинации и наличие.

Для №5 Arm Armor / Leg Armor / Full Set имеют свои базовые price-row IDs; Gold/Silver используют цену выбранной комплектации без отдельной наценки по умолчанию. Сначала нужно подтвердить сами source amounts/price bindings для commerce, а не спрашивать цену каждой расцветки. Прежние source ranges, size-dependent rows и известные исключения не выравниваются автоматически. Материал сейчас — product fact; этот ответ не добавляет селектор материала и не возвращает исторический акрил в продажу.

## Аудит текущего сохранения цвета

`variant-schema-capture-20260924.json` содержит точные SELECT и результаты из public schema проекта `ysnizcgzhdwdfdkjkhud`. Это целевые запросы, а не утверждение об отсутствии любого иначе названного сервиса в другом репозитории.

| Наблюдение в проверенном коде/схеме | Следствие |
| --- | --- |
| `feya_commerce_product_drafts.color` — text; `feya_commerce_color_aliases` нормализует названия | Эти поля не доказывают продаваемую матрицу вариантов. Alias не означает наличие цвета у товара. |
| `sellable_configuration_id` — родитель конфигурации; `configuration_price_id` — строка опции/цены | В существующем UI `configuration_id` часто содержит именно price-row ID. Их нельзя считать взаимозаменяемыми. |
| `lib/storefront.ts` может вывести цвета из title/material при отсутствии явных полей; builder detail отдаёт color fields как null | Такой fallback допустим как наблюдение для legacy browsing, но не как источник продаваемых вариантов, Offer или checkout. Перед public release нужны явные значения. |
| Listing Master server actions сохраняют SEO focus и отдельно component assertions; product detail admin здесь read-only | Сохранение SEO-оси не сохраняет продаваемый цвет. Нужен Product OS writer, а не второй независимый SEO каталог. |
| Cart line key сейчас включает выбранные строковые labels | До платежей заменить identity cart line на stable variant ID и хранить revision/quote. Переименование Gold не должно создавать новый товар в аналитике. |
| Sitemap сейчас берёт indexable active portfolio rows, возвращает URL без lastmod | Сохранение черновика не является событием sitemap. Не подставлять общий updated_at или текущее время. |

По целевым schema-запросам поля `variant_id`, `color_id`, `product_revision`, `release_id`, `published_content_changed_at` не найдены. Полная матрица ранее также не найдена в 142 исходных ценовых строках. **Автоматическая запись новых цветов и её распространение ещё не подключены.** В этом пакете реализованы чистый контракт, resolver и проверки; DB writer, RPC и UI wiring — следующий C4.1 пакет.

## Контракт Product OS: конкретная реализация следующего пакета

Один источник записи — Product OS в существующую Supabase БД. Growth OS читает подтверждённые revisions и создаёт предложения/задачи; SEO focus остаётся отдельной сущностью. Новые таблицы ниже — **проект additive schema**, не применённая миграция. Перед SQL сверить PK/FK, типы существующего execution ledger и серверные роли. Использовать текущие product/page/price IDs; не создавать параллельный product master.

| Дополнение к существующей схеме | Поля и ограничения |
| --- | --- |
| Product catalog head | `canonical_product_id UUID PK/FK`, `current_revision BIGINT > 0`. Строка для transaction lock/CAS; первая ревизия создаётся с обработкой concurrent unique violation. Не хранить здесь отдельный public pointer: он принадлежит общей release версии. |
| Product revisions | `(canonical_product_id, revision) PK`, immutable validated snapshot JSONB, content hash, actor ID из server session, existing execution/change reference, evidence refs, created_at. Snapshot содержит состав, размеры, цвета, exact variant/quote mappings и gallery bindings; предыдущую версию не обновлять. |
| Product option values | `option_value_id UUID PK`, `canonical_product_id FK`, dimension color/size, label, state proposed/confirmed/retired, revision provenance. ID не зависит от label; label correction сохраняет ID, замена самого оттенка/размера получает новый ID. Alias dictionary только помогает нормализации. |
| Variant identity registry | `variant_id UUID PK`, `canonical_product_id FK`, `configuration_price_id FK`, `color_id UUID NULL`, `size_id UUID NULL`, created revision. Immutable tuple; composite FK/проверка гарантирует один product у конфигурации и атрибутов и правильную dimension. Unique по product + configuration + color + size с `NULLS NOT DISTINCT` на поддерживаемом Postgres. Null означает явно «не применимо», никогда «любое». Старые IDs нельзя удалить или переиспользовать; retirement хранится в revision. |
| Versioned configuration quotes и explicit exceptions | `quote_id UUID PK`, price_revision, `canonical_product_id FK`, `configuration_price_id FK`, amount_minor BIGINT, currency, status unverified/range/verified_exact, evidence refs, actor/reviewer, created_at. Default scope — configuration; override дополнительно ссылается на stable exception/variant ID и содержит reason. Exactly one pricing source per variant: base либо exception. Product revision хранит ссылки на immutable quotes; новая product revision не требует новой цены. Валюта/minor-unit exponent проверяются сервером; source range не превращается в exact low price. |

Индексы: все child FK, `(canonical_product_id, revision)`, поиск variant tuple, unique request key в существующем execution ledger; масштабировать после EXPLAIN на реальном workload. Private tables: RLS/закрытые grants, anonymous никакого доступа; admin роль проверяется в server action/RPC, service credential только на сервере. JSON runtime schema с allowlist/reject unknown fields, лимитами batch size, размеров строк и числа комбинаций обязателен. TypeScript pure validator **не является** auth или DB enforcement boundary.

### Сохранение и публикация

1. Admin отправляет canonical product ID, expected revision, request UUID и **явно перечисленные** изменения. Сервер читает actor из проверенной сессии; клиентские actor/approval/price-verification флаги не принимаются. Product и sellable price IDs сверяются с текущей БД и доступом.
2. Одна транзакция: проверить idempotency key + hash payload, lock catalog head, compare expected revision, проверить tuple references/ценовое доказательство, добавить option/variant identities и immutable revision/quotes, записать existing execution/change event и durable delivery state, обновить head. Одинаковый request+payload возвращает прежний результат, другой payload с тем же key — conflict. CAS mismatch — conflict, не last-write-wins. Ничего не писать частично.
3. UI получает сохранённую revision и показывает подтверждение только после commit. Ошибка сети после commit разрешается повтором того же request ID. Открытая во второй вкладке старая форма получает conflict и свежую ревизию; не перезаписывает ответ первого редактора.
4. Добавление Gold/Silver не создаёт Cartesian product с размерами/комплектациями. Явное добавление supported tuples возможно после preview; по обычному правилу они наследуют единственную подтверждённую цену комплектации, без копирования суммы и нового approval на каждый цвет. Исключение требует отдельного evidence/override. Неопределённая комбинация остаётся draft/unavailable. У №5 сейчас нет основания отметить все 3×2 combinations как оплачиваемые только из ответа о цене.
5. Product draft revision сразу доступна админке, но публикация — отдельная операция существующего Core release gate. Изменение состава, материала, gallery, цены или color availability помечает зависимые approved copy/schema/membership как требующие проверки **только затронутого товара**, без массовой генерации 208 текстов. Сравнивать structured diff с фактами, которые использовала прежняя copy version.
6. При выпуске один immutable manifest связывает product revision, page version, query ownership, price/availability revision, image mappings и indexation decision. В одной транзакции переключить shared release pointer и записать change event. Коммерческая цена повторно проверяется сервером при quote и checkout; устаревшая цена в корзине требует подтверждения новой, а не молчаливого списания.
7. После commit outbox consumer обновляет зависимые Next.js caches по product/page/collection/release tags. Событие идемпотентно по change ID. Каждый ответ использует один зафиксированный release, включая metadata/schema/render; нельзя смешивать новую цену и старую комплектацию. При задержке invalidation — старая согласованная версия, безопасный отказ заказа, повтор доставки; никаких обещаний мгновенного обновления поисковой выдачи.
8. Release rollback возвращает прежний manifest и восстанавливает его links/schema/sitemap. История редактирования, заказы, оплаты, event IDs и registry не откатываются. Нельзя вернуть к покупке отозванный вариант просто откатом страницы: серверный orderability gate проверяет актуальный запрет.

Pure implementation сейчас: `lib/commerceVariantContract.ts`. Resolver принимает только точные stable IDs и expected revision; отвергает отсутствующий tuple, draft/retired вариант, неизвестный/неподтверждённый attribute и неподтверждённую/range цену. Transition validator не позволяет удалять/переназначать старый variant ID или перепривязывать configuration price к другому родителю. Product и price revisions независимы: нейтральное изменение цвета не инвалидирует подтверждённую базовую цену. Server gate проверяет configuration scope, pricing policy и явные исключения; новый quote создаётся при изменении самой цены или её основания, а не при каждом сохранении атрибута. Валидатор не доказывает истинность произвольной строки evidence_ref: будущий DB writer обязан разрешить её в существующее авторитетное доказательство.

### Sitemap и поисковые страницы

Цвет остаётся вариантом той же PDP, пока отдельный intent, inventory, unique value и query ownership не оправдывают другую страницу. Новые color/size option IDs не порождают новые indexable paths или query owners. Для shareable selection можно подготовить параметр `?variant=<stable-id>`; на будущей реализации он должен детерминированно выбирать существующий вариант, а canonical оставаться основным PDP согласно утверждённой URL policy.

Sitemap строится из того же release и только разрешённых canonical URLs. `published_content_changed_at` обновляется при существенном опубликованном изменении основной страницы/структурированных данных; сохранение draft, служебный updated_at или retry события его не меняют. Пока такой timestamp не реализован и проверен, отсутствие lastmod корректнее вымышленной даты. Для retired/suppressed страниц применять утверждённую disposition той же release; не держать redirect URL в sitemap.

### Аналитика и устойчивые связи

FEYA contract: GA4 `item_id = canonical_product_id`, предлагаемый `item_variant = variant_id`; readable color/size/configuration labels — отдельный snapshot, не identity. В собственном event ledger хранить event_id, product/page/variant IDs, product revision, release ID, quote ID, currency, amount, consent/event time. Custom GA4 parameters отправлять по проверенному allowlist; не перегружать GA4 динамическими размерностями. Сопоставление GSC: URL history → seo_page_id → release interval. Ads keyword/campaign IDs и настройки рынка остаются source-specific; цвет не создаёт автоматическую кампанию. Будущий Merchant feed ID закреплять отдельно и стабильно, если/когда включён feed.

Переименование цвета сохраняет variant identity и связь с историей. Изменение самого варианта создаёт новый variant ID с predecessor link при необходимости; прошлые orders/purchase/refund events не переписываются. Duplicate suppression золота сохраняет отдельные исходные product IDs для исторических данных; аналитический roll-up с датой вступления — отдельное представление. Purchase возможен только по подтверждённому payment event и dedup transaction ID, а не клику кнопки. Обычное admin save не посылает ecommerce событие.

## Следующие задачи по зависимости

| Задача; owner | Вход → результат | Validation / blocker | Rollback / definition of done |
| --- | --- | --- | --- |
| C4.1 Engineering + CPIM + Core | Этот контракт, actual schema, auth/execution ledger → additive migration и transaction RPC сохранения вариантов | Изолированный Postgres: wrong actor/product, CAS race, retry-after-commit, key reuse, partial failure, tuple FK и price evidence. Live deployment identity ещё не подтверждена | Новая feature flag OFF; миграция только review/staging. Done: одна доказанная server write authority, no public writes |
| C4.2 Engineering + CQA | RPC + существующая admin UI → поддержка color/size/config fields с прежним дизайном | Save → reload → cross-admin read; two tabs conflict; label rename сохраняет IDs; unknown tuple не получает price | Writer flag OFF, revisions остаются; done: запись и перечитывание той же ревизии в обеих админках |
| C3.2 Engineering + TSEO | 208 immutable bindings + 207 selection + product revisions → closed release manifest/Shop reader | Anonymous leakage, stale/revoked version, single manifest для render/metadata/schema/sitemap; без production activation | Previous manifest/flag OFF; done: reviewable exact release с согласованными публичными полями |
| C1.4/C2.2 CPIM + OSPM + CQA | Existing headpiece copy/options, 12 remaining metadata holds, secondary refs → адресные content/ownership proposals | Headpiece page имеет отдельную пользу; остальные пары сначала проверить по источникам. Нет synonym-only pages | Revert proposals; done: каждый launch page имеет owner/роль либо explicit indexing hold |
| C4.3 Commerce | Exact tuple evidence + release → server quote/cart/order sandbox | Actual supported combinations, price change/retirement при старой корзине, payment success/failure/refund | Checkout OFF; done: цена и состав в заказе доказаны; unknown tuples unavailable |
| C5 → C6 Owner/Engineering/TSEO | Company/domain/returns review + technical/commerce gates → конкретный launch packet | Восстановить доступные бизнес-факты, затем только точечные вопросы; final release проходит pre-index checklist | Previous release/selective noindex; done: утверждённый cutover с проверенным rollback |

Новые исследования, CSV, подключения и повторные ответы по этим пяти карточкам сейчас не нужны. Следующий исполняемый пакет — C4.1; C5 можно продолжать независимо. Закрытие текущих ответов не означает готовности production checkout или индексирования.

## Проверка и источники

- `audit-metadata-review.ts --check`: 208 preserved → 207 launch candidates; 43/8/12/1 metadata states; source hashes и неизменность body/meta/keywords.
- `audit-approved-query-plan.ts --check`: исторические Primary сохранены, suppress-aware inventory и blockers. 50 proposals не становятся автоматически зарегистрированными owners.
- `searchLaunchSelection.test.ts`: stale ID/hash, missing target, chain/cycle, preservation и обе witch listings.
- `commerceVariantContract.test.ts`: точный tuple, shared base price двух цветов, явное исключение без fallback, отдельные цены комплектаций, независимые product/price revisions, отсутствие auto Cartesian, range/unverified, revision conflict, rename, retirement и immutable IDs. Все ценовые данные этого теста синтетические, не FEYA quotes.
- `thefeyaRightPdpPanel.test.ts`: exact owner material в PDP/writer без навязанного цвета; прежние fulfillment/material rules сохранены.
- TypeScript, Search/Product/SEO suites, owner UI freeze и admin data boundary. Полный CI относится к точному новому head PR; его результат записывается в checkpoint PR отдельно. Database/RPC concurrency нового writer пока **не тестировалась**, поскольку writer ещё не реализован.

Локально перед отправкой: **111/111 Search, 457/457 Product/SEO**, TypeScript, оба воспроизводимых audit scripts, Owner UI contract, Product OS freeze (41 файл) и admin boundary — PASS. Один прежний Batch09 тест ожидал unknown substrate для №5; его ожидание обновлено по точному owner decision, остальные продуктовые material assertions сохранены.

Внешние источники проверены 24.09.2026; факты Google отделены от принятой FEYA реализации:

1. [Google: ecommerce URL structure](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites): описывает идентификацию вариантов и canonical для optional variant parameters. Решение FEYA не создавать страницу на каждый цвет — архитектурное, а не универсальный запрет Google.
2. [Google: sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical URLs и lastmod существенного изменения страницы; отправка sitemap не гарантирует обход/индексацию. FEYA применяет это через единый release и проверяемую дату, а не operational updated_at.
3. [Supabase changelog](https://supabase.com/changelog) и Supabase Postgres skill использованы для проверки актуального контекста. Требования атомарности, revision/CAS, stable IDs и outbox — FEYA implementation decisions; skill не является подтверждением уже работающей интеграции.

Первоначальный пакет `2518847bf6781d57a55dabf2e6a96c09c5c3e824` прошёл CI run `36028260487`: 9/9 jobs, 36/36 isolated runtime, 208/208 approved review PDPs; production_connected=false. Artifact `10820078071`, SHA256 `2445d4866f8ff19719d1b80369e68fcf52b3f524d8398df59de25641d396fa92` проверен. Уточнение pricing policy после него проверяется отдельным новым head; прежний CI не подменяет эту проверку.
