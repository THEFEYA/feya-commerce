# TheFEYA — legacy private access closure and launch checkpoint

Дата: 2026-10-08. Base main: `2dff0767f461a4f2a2056d6e38a255a35e9da329`.

## Продолжение по MASTER

[PR #75](https://github.com/THEFEYA/feya-commerce/pull/75) слит: approved delivery resolution, exact tested head `dd89c4105290c4dd573178e2a8e02459d04e303a`, tree `165c692c93682417bdd744b38eabca8e8393e309`. [CI](https://github.com/THEFEYA/feya-commerce/actions/runs/37807448521) = 19/19 SUCCESS, native delivery suite = 22/22 без skips, local search tests = 457/457, production READY. Граница и следующая shipping quote задача: [M2 checkpoint](../payments/M2_APPROVED_DELIVERY_RESOLUTION_IMPLEMENTATION_20261008.md).

## Конкретная причина дополнительного исправления

При обязательном Supabase advisor review установлено, что legacy `public.dashboard_tokens`, `feya_sales.contacts`, `feya_sales.lead_contacts` не имели RLS и имели anon/authenticated SELECT. У `dashboard_tokens` были также anon write privileges. Точный ACL review выявил широкие EXECUTE grants на legacy dashboard token creator.

Это проверенные **DB privileges**, не доказательство чтения данных посторонними и не утверждение, что каждый legacy schema опубликован в REST. Значения токенов, персональные строки и контакты не читались. Прямых dependent views этих трёх таблиц в catalog review не найдено. В current storefront/app source нет ссылок на эти legacy таблицы или token creator.

Собирать CRM/customer data до исправления таких прав нельзя. Поэтому узкая изоляция выполнена отдельным пакетом, без изменения Product Truth, SEO, визуала, денег или Search v12.

## Что установлено

`20261008163518_legacy_private_contact_access_v1.sql` установлен в production через поддерживаемый Supabase MCP после локального DB теста. CLI ранее отсутствовал и ограниченная загрузка завершилась timeout; filename использует реальный timestamp серверной migration history.

- RLS включён на трёх существующих private tables.
- Table **и column** grants от PUBLIC/anon/authenticated удалены; наследованный PUBLIC доступ не сохраняется случайно.
- Прежние effective table/column permissions service_role зафиксированы до изменения, восстановлены адресно и сверены после. Нет произвольного расширения service capabilities.
- Existing `gen.create_dashboard_token(integer,text)` закрыт для PUBLIC/anon/authenticated. Прежний effective service EXECUTE сохранён. Schema USAGE не добавляется.
- Legacy boolean token validation не изменяется; закрытие raw token listing/write и minting не требует изменения механизма проверки существующей capability.
- Никаких DML, удаления данных, ротации токенов или изменений записей customer/order/price/rate не выполнено. На fresh installation отсутствующие legacy объекты пропускаются; неожиданный relation kind или privilege drift отменяет транзакцию целиком.

Production postconditions:

| Проверка | Результат |
| --- | --- |
| Три таблицы | RLS=true |
| anon/authenticated table или column privileges | false |
| Backend SELECT трёх таблиц | true |
| anon/authenticated token creator EXECUTE | false |
| Прежний service creator EXECUTE | true |
| Existing quote / delivery approval health | ready=true |
| Delivery approvals | 0, public rates / payment не активированы |
| Три объекта в `rls_disabled_in_public` advisor findings | Отсутствуют |

Локальная DB suite: 11/11 PASS. Четыре добавленных сценария проверяют отсутствие legacy objects, реальные read/write/mint denials с positive backend path, сохранение column-only permissions без расширения table grants и atomic rollback при schema drift. Ранее проверенные 57 internal objects и публичная storefront projection также проходят. Exact-head native CI и production receipts добавляются в implementation PR.

## Оставшаяся очередь без потери фокуса

1. Owner login: создать Auth user для подтверждённого support email, добавить `FEYA_ADMIN_ALLOWED_EMAILS` в Production и redeploy. Точные ссылки/действия находятся в [owner / Google checkpoint](GOOGLE_REVIEW_OWNER_ACCESS_CHECKPOINT_20261008.md). Никакие пароли в чат не требуются.
2. Утвердить реальные delivery/production facts в существующем кабинете; сейчас zero approvals. Dollar examples не включены в EUR commerce authority. Следующий инженерный пакет — persisted quote/expiry/idempotency и destination-bound intent/snapshot successors, затем guest checkout/provider paid proof.
3. Подтвердить Google Cloud project number/runtime client соответствие; заполнить готовые Branding links, External/In production и Brand/Basic review. Google API application не ждёт подключения оплаты; Ads и GA4 решают разные задачи.
4. Продолжить существующий Seller Online ticket #403264; получить подтверждённую role/transaction model/technical integration. Actual operator/controller, налоги и regional policy obligations закрываются перед paid launch. Контактное лицо не назначается автоматически юридическим продавцом.
5. Правильный custom GA4 stream + consent + private ingestion; дальше Merchant/production Ads. До этого measurement остаётся false. CRM recovery, affiliates/referrals и rush/custom services следуют полной [M2 очереди](../payments/M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md).
6. Остальная legacy advisory база требует отдельно scoped triage перед расширением private ingestion/agent access. Исправление этих трёх таблиц **не означает**, что 500 legacy views/functions или весь Supabase audit закрыт; нельзя массово менять их без dependency/permission evidence. Проверять actual exposure, защищать private consumers и сохранять approved public storefront projections.

Search Phase 12 остаётся закрытым; первые 18 URL разрешены, включая 10 collection landing pages. Текущий indexed count не перепроверялся в этом пакете. Full paid-launch readiness 75–80% — прежняя приблизительная оценка, не процент индексации, не новый exact score и не обещание полной security certification. Точное закрытие launch blockers определяется результатами перечисленных проверок.
