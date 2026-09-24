# C4.1 — атомарное сохранение вариантов в Product OS

24 сентября 2026. Пакет для draft PR №26. Production DB — только SELECT; новая миграция не применена. Результат удалённого CI проверять по точному head в верхнем checkpoint PR, а не переносить с предшествующего `8740222`.

## Решение и границы

Подготовлены серверное чтение/сохранение и additive schema для внутренних variant drafts. Используются существующие Product OS product/configuration/price IDs и Growth execution/change ledger. Второго product master нет. Ни шаблон, ни компонент, ни CSS не изменены. Подключение полей существующей админки — следующий C4.2.

Owner rule `owner-configuration-base-price-20260924-04`: базовая цена принадлежит комплектации; цвета и материал нейтральны по умолчанию. Все обычные варианты одной комплектации ссылаются на один quote. Исключение требует отдельной явной записи. Смена названия цвета не создаёт новый price revision; одинаковая цена не доказывает доступность комбинации.

**Save draft не подтверждает цену.** RPC принимает только `draft/retired` варианты и `unverified/range` цены. Он не принимает `active`, `verified_exact`, client actor, approval или publish flags. Исторические price rows и суммы не обновляются. Введённая сумма — внутренняя неподтверждённая версия, до отдельной проверки её нельзя использовать как покупную цену. `evidence_ref` — ссылка для проверки, не автоматически доверенное доказательство. Подтверждение фактической цены и quote service входят в C4.3.

Свежий SELECT обнаружил 1170 исходных ценовых строк: 1072 draft/not_reviewed, 73 draft/needs_review, 17 missing/needs_review, 2 excluded/needs_review, 5 approved/approved и 1 owner_reviewed/approved. Это **весь Product OS**, не число вариантов 207 кандидатов витрины. Статус сам по себе не доказывает полноту tuple или точную цену. Capture хранит определения схемы и governance, без Auth-пользователей, секретов или клиентских заказов.

## Контракт

- GET/POST `/api/admin/products/{canonical_product_id}/variants` — dynamic, no-store, noindex. По умолчанию отключены: нужен `FEYA_PRODUCT_VARIANT_DRAFT_ENABLED=true` и обязательный существующий admin Auth.
- Сервер заново вызывает Auth `getUser()`, затем проверяет существующий ID/email allowlist. Actor берётся только из Auth. `user_metadata` не даёт полномочий. POST требует совпадения Origin и ограничивает JSON размером 1 MB; поля/типы/размеры коллекций проверяются строго.
- Только server service-role имеет доступ к новым RPC/таблицам. Новые функции — SECURITY INVOKER с пустым search_path. Нет новых grants на `auth.users`/`auth.sessions`. Это не утверждение об мгновенном отзыве уже выданного JWT при logout; отдельная session-revocation модель здесь не добавлена.
- GET возвращает текущую draft revision, snapshot и source fingerprints. Потерянный/чужой parent price/configuration блокирует чтение, а не незаметно сокращает данные. Максимум 128 исходных ценовых строк на товар; превышение требует отдельного решения, не усечения.
- POST несёт UUID request_id, expected_revision, source bindings и snapshot. Каждый сохранённый binding проверяется против product/configuration/price под блокировкой. Fingerprints — MD5 сериализованной исходной строки для обнаружения изменений, не средство авторизации. Payload/snapshot имеют SHA256 для истории/повторов.
- Transaction: request lock → product/head lock → проверка источников и версии → stable attributes/tuples/quotes → канонические execution create/approve → SUCCEEDED → change event → revision/head → receipt → outbox. Ошибка откатывает весь набор.
- Новый capability `SAVE_PRODUCT_VARIANT_DRAFT` разрешает только осознанное сохранение внутреннего черновика авторизованным человеком. Его approval относится к этой операции. Существующие CHANGE_PRICE/PUBLISH_CONTENT и другие capability не активируются. Общие create/approve helpers переиспользуются; новые ledger или «agent auto approval» не создаются.
- Повтор с тем же actor/request/payload возвращает прежние IDs даже после последующей ревизии. Иной payload/actor с тем же request ID — conflict. Конкурирующие изменения одной revision: одно сохранение, второе 409. После потерянного ответа результат **unknown**; клиент должен повторить тот же request ID и payload, а не утверждать «ничего не записано».
- Старые variant/attribute/configuration IDs не удаляются и не переназначаются. Retirement — состояние новой revision. Tuple uniqueness использует NULLS NOT DISTINCT; null значит «не применимо», не wildcard. Quotes неизменяемы, price revisions монотонны внутри области цены. Архивная цена не подставляется вместо новой.
- Health gate проверяет private grants/RLS, invoker/search_path и точную capability config. Это проверка оговорённого контракта, не аудит всех функций/ACL production и не hash всех function bodies.

## Хранилище

Миграция создана `supabase migration new` CLI 2.117.0: `20260924173914_product_variant_draft_atomic_v1.sql`.

| Объект `feya_commerce_variant_*_v1` | Назначение |
| --- | --- |
| heads | Текущая revision товара; CAS, deferred FK на immutable revision |
| revisions | Неизменяемый snapshot + source bindings + actor/execution/event |
| attributes | Неизменяемые color/size IDs и dimension; labels/states находятся в revision |
| identities | Неизменяемый product/configuration/color/size tuple и variant ID |
| quotes | Одна версия цены комплектации либо явно указанного исключения |
| save_receipts | Неизменяемый результат request ID; безопасное повторение |
| draft_outbox | Pending событие для будущего потребителя; не команда публиковать |

Все семь таблиц имеют RLS, anon/authenticated не имеют CRUD. Service может читать/добавлять; UPDATE только heads/outbox. Immutable triggers запрещают UPDATE/DELETE истории даже владельцу таблицы. SQL schema validator и TypeScript parser используют один JSON shape; SQL дополнительно обеспечивает связи/версии/атомарность.

**Sitemap не меняется при сохранении draft.** Outbox consumer ещё не реализован. C3.2 должен сформировать один immutable release и согласованно обновлять Shop/PDP/metadata/schema/links/sitemap. Повторная доставка event не должна повторно публиковать. Никаких новых indexable color URLs этот пакет не создаёт.

## Проверка и пределы доказательств

Локально: 116/116 Search, 457/457 Product/SEO, 81 SQL PASS + 9 native-only SKIP; TypeScript, воспроизводимые metadata/query audits, admin boundary, Owner UI и freeze 41 файла PASS. Новый SQL suite: 14 локальных PASS, две конкурентные проверки требуют настоящего Postgres. Эти числа не заменяют удалённый CI.

CI расширен до десяти jobs. Новый отдельный PostgreSQL 17.6 job запускает все 16 SQL сценариев, включая конкуренцию. Real Supabase/Auth/PostgREST/Next/Chromium suite дополнен восемью сценариями: dependency restore; anonymous/default-off/origin; настоящий outsider; save/reload с одной ценой двух цветов; replay/forgery; two tabs race; полный rollback при ошибке outbox; ACL drift и сохранность source prices. Существующий прогон 208 server-rendered approved review PDPs сохранён.

Полная captured FK-closure нового writer — 14 таблиц, восстановленных из SELECT metadata в отдельной БД. В общем runtime уже существующие таблицы сохраняют ранее описанные fixture ограничения. Тестовые товары, пользователи и цены синтетические. Общий security advisor сохраняет upstream findings; успешный C4.1 не превращает K12 или весь pre-index gate в PASS. Hosted parity, реальный UI editor, order/payment, live Google и release activation этим прогоном не доказываются.

## Rollout и rollback

1. Проверить exact-head CI и новую миграцию на разрешённой изолированной/staging БД с реальными schema dependencies/ACL, без копирования секретов/клиентских данных. Проверить source capture parity, Auth, ограничения и старые потоки.
2. При будущем разрешённом rollout держать variant flag OFF; применить миграцию до совместимого API. Health + authenticated read/write нужны на точном deployment. Только затем можно включить **внутренний draft writer**, отдельно от checkout/index flags.
3. Для остановки: flag OFF, завершить/дождаться in-flight requests, выполнить `supabase/rollback/product_variant_draft_v1_disable.sql`. Он отключает только новый capability и отзывает service EXECUTE у read/write/health. **Не DROP и не DELETE**: revisions, quotes, receipts, events, pending outbox и исходные строки сохраняются.
4. Возврат после исправления: по проверенному diff восстановить ровно исходную capability config/version и private EXECUTE, пройти health/runtime; затем отдельное включение flag. Исходные config не восстанавливать вслепую поверх чужих изменений. В тесте disable/re-enable сохранённая receipt по-прежнему возвращает прежний event ID.
5. Исправление содержимого — новая компенсирующая draft revision с теми же историческими IDs и нужными retirement states; не переписывание аудита. Checkout/indexing весь этот процесс не включает.

## Следующий исполняемый пакет

| Задача / owner | Вход → выход | Validation / blocker | Rollback / definition of done |
| --- | --- | --- | --- |
| C4.2 Engineering + CQA | C4.1 RPC + существующие Product/Growth readers → edit/save/reload без редизайна | Один источник обеих админок; two tabs; стабильные IDs; request повторяется после timeout; цена наследуется, неизвестные сочетания не создаются. Hosted flag OFF до проверки | Flag OFF, история сохранена. Done: конкретный экран сохраняет и перечитывает одну revision, визуальный контракт PASS |
| C3.2 Engineering + TSEO | 208 approved bindings / 207 visible candidates + variant drafts → immutable release manifest | Content/truth/price readiness отдельно; Shop/PDP/schema/metadata/sitemap читают одну release version; draft event не публикует | Предыдущий manifest; Done: целостный server-rendered каталог и производные URL доказаны |
| C4.3 Commerce + CPIM | Подтверждённая комплектация/цена/доступность + release → server quote/cart/order sandbox | Исходные суммы/диапазоны и size exceptions; stale cart; price change/retirement; никаких base fallback для неполного override | Checkout OFF; Done: точная выбранная комбинация и сумма подтверждены в заказе |
| C5 Owner + Engineering | Company/domain/returns/provider evidence → конкретный business review пакет | Недостающие факты сначала искать в каноне; спросить владельца только по реально неизвестному | Предыдущий release; Done: достоверные страницы и provider sandbox |
| C6 Core + TSEO | Exact release + business/security/commerce gates → выборочная индексация | Все K blockers бинарно PASS для разрешённых URL, ownership не конфликтует | Предыдущий release/selective noindex; Done: разрешённый cutover и мониторинг |

**От владельца сейчас ничего не требуется.** Ответы по пяти карточкам закрыты, 19 отложенных изделий не блокируют текущий пакет. Дальше C4.2; новые keyword exports не нужны для повторного выполнения уже согласованной работы.
