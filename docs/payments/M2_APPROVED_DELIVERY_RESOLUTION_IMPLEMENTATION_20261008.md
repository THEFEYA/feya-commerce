# M2 — approved delivery resolution

Дата: 2026-10-08. Base main: `f45abf663f18154646a80074f109d958fc3d1a68` (PR #74).

## Закрытая граница этого пакета

Реализованы service-only чтение точной утверждённой версии и серверный расчёт доставки по current merchandise receipts + ISO country + postal code + Standard/Express. Новый контракт: `commerce_approved_delivery_resolution_v1`.

Это внутренний расчёт, **не сохраняемый shipping quote, не payable receipt и не запущенный checkout**. Результат явно содержит `persisted=false`, `payable=false`, `public_rates_enabled=false`, `payment_enabled=false`, `provider_session_enabled=false`. Публичного маршрута, browser import, нового UI, script/dependency или feature flag в этом пакете нет.

Предыдущий [owner / Google checkpoint](../search/GOOGLE_REVIEW_OWNER_ACCESS_CHECKPOINT_20261008.md) и полный [services / recovery backlog](M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md) сохраняются. MASTER v1.2, ACTIVE Search v12 и visual freeze не меняются.

## Authority и проверка устаревания

- Один `STABLE SECURITY INVOKER` RPC `feya_commerce_approved_delivery_context_v1(uuid[])` читает approval head, immutable workspace **по approval.workspace_version_id/revision**, current catalog и merchandise receipts под одним statement snapshot.
- Editable draft head не используется. Владелец может сохранить следующий черновик; его ставки не попадут в расчёт до отдельного approval. Тест изменяет draft Standard с synthetic 1900 на 9999 и подтверждает расчёт по прежней утверждённой ставке 1900.
- Проверяются snapshot/catalog hashes, current active offer head, product/variant/configuration/color/size, price identity/revision/source, server unit/line amounts, quantity limit, merchandise expiry и единые currency/release. Missing/stale receipts не пропускаются и требуют нового расчёта.
- Запрос содержит только receipt IDs и destination/method choices. Client amount/currency/quantity/date/specifications-ready отклоняются до RPC. До 20 distinct receipts; общая нагрузка производства и посылок проверяется сохранёнными профилями.
- Две variant lines одной configuration суммируются для parcel/production capacity. В binding остаются обе exact variant/receipt identities.
- Postal input нормализуется; применяется существующий приоритет postal → country → zone → default. Unsupported destination, disabled override, неопределённые day basis/calendar, превышенная capacity и непроверенные custom specifications закрывают расчёт.
- Результат фиксирует approval ID/revision, workspace ID/revision/hash, catalog hash, exact merchandise IDs, basket/destination fingerprints, method, currency, shipping amount, parcels, calendars/production references, server calculation timestamp и estimated arrival window.
- Даты сохраняют `start_basis=preview_ready_now` и `event_date_guaranteed=false`. Они не подтверждают оплаченный заказ, production slot или полученные мерки. Изготовление и Express transit остаются отдельными этапами.
- Native PostgreSQL JSON timestamp с микросекундами и timezone offset нормализуется в ISO milliseconds на server boundary; сохраняется тот же DB instant. Этот случай проверяется отдельной regression проверкой и native integration suite.

Basket/destination fingerprints служат внутренней сверке. Hash почтового индекса не делает данные анонимными: не отправлять destination/контакты/fingerprints в GA4 или LLM. Полный адрес в этот контракт не входит; tax/region/address authority должна быть определена в checkout successor.

## Schema / verification receipts

Миграция `20261008160534_commerce_approved_delivery_context_v1.sql` установлена в `ysnizcgzhdwdfdkjkhud`. Только additive read function; нет новых таблиц или записей тарифов/заказов. SQL из проверенного локального файла применён поддерживаемым Supabase MCP. CLI отсутствует, ограниченная 25-секундная попытка загрузки завершилась timeout; timestamp локальной миграции взят **из серверной migration history**, не придуман вручную.

Production verification после установки:

- function is invoker, volatility `s`, fixed empty search_path;
- anon execute=false, authenticated execute=false, service_role execute=true;
- approval_count=0, approved_head_count=0 до установки; approval_count=0 после;
- quote/approval boundaries ready=true;
- production test read корректно отклонён с `approved_delivery_approval_required` при нулевом approval head;
- security advisors совпадают с исходным baseline, новый RPC не фигурирует в findings. Это не утверждение, что legacy baseline всего проекта свободен от замечаний.

Локально: 457/457 search tests, TypeScript, production build и scoped lint прошли. Delivery DB suite: 20 PASS, 2 native concurrency checks skipped в PGlite; native PostgreSQL CI обязан выполнить все 22. Тесты охватывают immutable approved-vs-draft selection, exact current/expired/missing merchandise, aggregate variant capacity, country/postal/disabled method, currency/specifications, public-role denial и permission drift. Финальные exact-head CI/production receipts записываются в implementation PR.

## Следующий обязательный пакет M2

1. Immutable shipping quote successor: destination + exact basket + approval/settings/method binding, server expiry, same-request replay, conflict detection и атомарная повторная проверка authority перед сохранением. Этот resolution нельзя просто сериализовать в браузере и объявить оплатной котировкой.
2. Structured destination / quote-bound order-intent successor и checkout snapshot successor: shipping + merchandise + реальные service/discount/tax components. Проверять истечение, изменение корзины/адреса/метода/approval до provider session; historical receipts не переписывать.
3. Рабочий owner login → реальные EUR либо согласованные заново валютные ставки, обслуживаемые страны, quantity/parcel rule, production day basis/calendar/cutoff → отдельное exact-version approval. USD-примеры владельца не активированы и не конвертированы.
4. Подтверждённые Seller Online mode/role/credentials, actual operator/controller и региональные policy obligations → guest checkout в текущем стиле → provider paid-order/webhook proof → Merchant/production Ads.

Google Brand/Basic application и Seller Online technical follow-up идут параллельно M2. GA4 требует отдельно правильного custom web stream, controller и consent proof. Фото/визуал, CRM recovery/referral и production priority не открываются в этом пакете. Индексация первых 18 URL уже разрешена; готовность полного paid launch остаётся ориентировочно 75–80%, а не увеличивается от внутреннего helper.
