# TheFEYA — Google review и вход владельца: checkpoint 8 октября

Основание: десять новых скриншотов 8 октября 2026, 14:32–14:36 Europe/Madrid; прямой ограниченный SELECT `auth.users`; production redeploy `dpl_9oREfU9tmqgjDCQ8ucyAmQVUb7Td`, READY/main `969652972e885c335b77262219e5de3383d4dd54`; anonymous delivery-workspace API 401. Продолжает [MASTER supplement](MASTER_ACCESS_PRIVACY_CART_EXECUTION_AMENDMENT_20261008.md) и MASTER commerce v1.2. Закрытые SEO фазы не переоткрываются.

## 1. Проверенные расхождения и решения

| Проверка | Факт | Действие |
| --- | --- | --- |
| Supabase Auth | В проекте `ysnizcgzhdwdfdkjkhud` ровно два технических Telegram-аккаунта; `manager.feya@gmail.com` отсутствует. Оценочный счётчик UI «10» не равен результату SELECT | Создать отдельный owner email/password account через Auth Admin/Dashboard; технические bot users не переименовывать |
| Vercel | Четыре новых switches видны на правильном project, Production; значения скрыты. Новый redeploy READY на main, delivery API теперь 401 | `FEYA_ADMIN_AUTH_REQUIRED=true` применился. Остальные hidden values не выдаются за прочитанные. Owner allowlist пока не добавлен по сообщению владельца |
| Кабинет | Скриншот белой страницы 503 сделан до/во время redeploy. `/admin/login` теперь 200; private API требует authentication | Без Auth user и allowlist вход не закрыт. Login показывает причину отсутствия конфигурации; blocked form не создаёт сессии |
| Google Branding | URL project ID `spheric-alcove-412016`, display name `My Maps Project`; app name `FEYA SEO Metrics Tool`; support/developer email `manager.feya@gmail.com`; Testing; homepage/privacy/terms пусты | Сохранить существующий app name. Сначала сверить Project number и существующий OAuth client с runtime, затем заполнить поля и пройти brand review |
| Authorized domain | Пока только `feya-commerce.vercel.app` | Добавить `thefeya.com` после подтверждения домена. Существующий domain/client/redirect не удалять автоматически |
| Public review pages | Marketing Tools, Privacy, Terms открылись на скриншотах. Русский текст — Chrome Translate, не переключение public EN canon | Align app name на review page; стиль и ACTIVE v12 owners сохраняются |

**Project ID и project number — разные идентификаторы.** `spheric-alcove-412016` и `826834264134` могут обозначать один проект, но скриншоты этого не доказывают. Не создавать новый project/client и не менять working credentials. В существующем защищённом `/admin/system-readiness` добавлена подсказка numeric prefix текущего OAuth client ID без самого client ID/secret/token; это диагностическая подсказка, не доказательство ownership/access. Финальная сверка: Google Cloud → Project info → Project number, затем Clients.

## 2. Минимальный owner access маршрут

В доступном Supabase connector есть SQL/read metadata, но нет Auth Admin createUser. В workspace нет service-role credential; Vercel env connector раньше отказал 403. Создание/переименование auth.users прямым SQL не заменяет supported Auth flow. Пароли/API secrets не запрашиваются в переписке. Не отправлялись invite/reset email.

1. [Supabase Users](https://supabase.com/dashboard/project/ysnizcgzhdwdfdkjkhud/auth/users) → Add user → **Create new user**: email `manager.feya@gmail.com`, свой пароль непосредственно в Supabase, email confirmed. Не выбирать существующих Telegram users.
2. [Vercel Environment Variables](https://vercel.com/alexs-projects-5419f9ec/feya-commerce/settings/environment-variables) → создать **Production** `FEYA_ADMIN_ALLOWED_EMAILS` = `manager.feya@gmail.com`. При наличии других allowlists не удалять владельцев. Четыре switches сохраняют прежний план: auth true / draft true / approval false / owner actions false.
3. Latest Production/main → **Redeploy** → [кабинет доставки](https://thefeya.com/admin/company/delivery). Password только в форме входа. В [готовности системы](https://thefeya.com/admin/system-readiness) сверить безопасную Google project hint с Cloud.

Owner actions, delivery publication, checkout и GA4 этим не включаются. Login policy сохраняет отдельный owner-action step-up mode для approved previews; создание внешнего аккаунта само по себе не даёт allowlist grant.

## 3. Точные поля Google

Сначала подтвердить **Project number 826834264134** в Project info того проекта, где находятся используемые runtime OAuth credentials и перенесённый Ads access. Если номер иной, сохранить конкретное расхождение; не переносить клиента вслепую.

После сверки: [Branding](https://console.cloud.google.com/auth/branding?project=826834264134).

| Поле | Значение |
| --- | --- |
| App name | `FEYA SEO Metrics Tool` |
| Support email | `manager.feya@gmail.com` |
| App home page | `https://thefeya.com/marketing-tools` |
| Privacy policy | `https://thefeya.com/privacy` |
| Terms | `https://thefeya.com/terms` |
| Authorized domain | `thefeya.com` (добавить) |
| Developer contact | `manager.feya@gmail.com` |

**Save → Audience: External / Publish app / In production → Branding: Verify Branding → Publish branding.** После Verified открыть [Google Ads API Overview того же проекта](https://console.cloud.google.com/apis/api/googleads.googleapis.com/overview?project=826834264134), проверить текущий Access и подать Basic при сохранённом Explorer. Текущий статус не выводится из старого developer token. Официальный Ads guide требует External/In production даже для инструмента собственной команды. OAuth scope `adwords` не объявляется read-only scope: ограниченный характер текущих действий обеспечивается самим FEYA workflow.

### Готовый текст purpose/use case для Google

> FEYA SEO Metrics Tool is an internal marketing application for TheFEYA, a handmade festival and stage outfit brand. Our public catalog and application information are available at https://thefeya.com and https://thefeya.com/marketing-tools. The tool is intended for our own authorized operators and Google Ads accounts. It uses OAuth-authorized Google Ads data for keyword planning, historical keyword metrics and marketing reporting to support our store's search and advertising decisions. It is not offered as a public multi-tenant SaaS service. Google data and credentials are handled server-side and are not sold or used for unrelated purposes. Our Privacy Policy is at https://thefeya.com/privacy and our Terms are at https://thefeya.com/terms. We request Basic access because our intended KeywordPlanIdeaService functionality is restricted under Explorer. We will validate access using a small, bounded keyword batch. Paid checkout, Merchant Center feeds and advertising campaign activation are separate processes; this application does not require them to be active for brand review.

Если форма запрашивает текущие реализованные функции, отделять approved foundations / intended planning от живого API доступа, который пока не доказан. Суточный traffic/операции не придумывать; сначала bounded receipt и отдельный reviewed budget. Review links технически готовы; заявка в Google этой работой **не отправлена**, Verified/Basic не утверждены.

## 4. Контакты и Seller Online

Владелец предоставил контактное лицо/владельца бренда как физическое лицо, support email и телефон. Это не подтверждённая предпринимательская регистрация, seller-of-record contract или privacy-controller appointment. Полное личное имя и домашний адрес не копируются в публичный Git. Английская официальная транслитерация не угадывается. Телефон поддержки `+380636556288` предоставлен для связи WhatsApp/Viber/Telegram; добавляется на non-indexable application info page в существующем стиле. Точные Instagram URLs не подтверждены и не выдумываются.

Для Google API brand review не открывать ФОП только ради формы. Published Seller Online user agreement допускает услуги физическим лицам и описывает модель buyer/reseller; конкретное подключение `thefeya.com`, KYC и роль требуют их письменного подтверждения. Это не налоговое освобождение или доказательство возможности вести регулярные продажи без регистрации. Решение о регистрации до paid launch принимается по реальной стороне договора, деятельности и налоговому резидентству, а не по отсутствию требования в OAuth форме.

По предыдущему доказанному checkpoint заявка Seller Online уже отправлена 2 октября; получено acknowledgment **ticket #403264**, запрос передан техническому отделу. Это не approval/credentials. Подготовлено **уточнение в существующей переписке**, не новая заявка и не отправленное письмо:

> Hello, following up on ticket #403264 regarding thefeya.com. Our custom Next.js storefront is publicly accessible and we are preparing its checkout integration. Please confirm whether you can onboard the brand owner as an individual, which legal/KYC details you require, and Seller Online's exact contractual role for purchases on this domain. Please also provide the supported API or hosted checkout documentation, testing process, currencies, webhook authentication and retry/idempotency requirements, and the required public seller/payment disclosures. We will align our checkout and policies with the confirmed model before activating payments. Thank you.

## 5. Порядок без искусственных зависимостей

1. Owner access закрывается тремя короткими действиями выше; затем заполняются реальные delivery profiles/calendars/country overrides.
2. **Google brand/Basic review и Seller Online technical/legal confirmation идут параллельно.** Оплата не является prerequisite для Google application; GA4 также имеет собственные controller/stream/consent gates.
3. Инженерный M2 successor: approved delivery version → destination/postal/basket/method-bound receipt с суммой, dates и expiry → exact intent/snapshot → provider integration и paid/webhook proof. Старый GLOBAL v1 не становится адресным расчётом от включения owner access.
4. До paid launch — transaction party, applicable policies/returns/taxes и обязательные disclosures. Контактное лицо не заменяет этот review.
5. Merchant feed/production Ads link после реально завершающейся покупки; GA4/GSC/commerce evidence дают Phase 13/Toyota improvements. CRM/recovery/affiliate/услуги сохраняют очередь из подробного M2 плана.

First search wave готова, десять collection landings уже существуют. Никаких новых SEO текстов/DNA/ценообразования/visual styles этим пакетом не меняется. Общая оценка launch 75–80% не увеличивается из-за docs/setup help. Нужны точные факты и доступы, не повторное широкое исследование.

## 5a. Новый owner login incident — поздний checkpoint 8 октября

В production Supabase у `manager.feya@gmail.com` обнаружена **новая учётная запись** (создана позже ранее проверенной), `email_confirmed_at = null`, пароль задан, но `last_sign_in_at = null`. Предыдущий successful sign-in относится к прошлой записи и не подтверждает работу нового аккаунта. Реальный сайт направил владельца на `/admin/login?error=invalid_credentials`.

В `app/admin/login/actions.ts` все ошибки `signInWithPassword` до нового исправления переводились в один `invalid_credentials`. Действие: отдельно показывать `email_not_confirmed`, `invalid_credentials`, `rate_limited` и недоступность сервиса; никаких raw Supabase ошибок, токенов, хешей, паролей в URL/логи. Логи с `referer=http://localhost:3000` могут быть результатом изолированных CI-тестов и не доказывают ошибку конкретной попытки пользователя.

**Human owner single required step:** Supabase Dashboard → Authentication → Users → существующая запись `manager.feya@gmail.com` → подтвердить её email в предусмотренном Auth UI или официальным Admin Auth способом. Если пароль после этого всё ещё не принимается, провести поддерживаемый процесс сброса пароля/установки нового пароля в Supabase (не Gmail). **Не изменять напрямую auth.users SQL, не удалять учетную запись и не отключать публично FEYA admin protection.** В текущем подключённом Supabase Tool нет `auth.admin.updateUserById`; credentials к service-role для вызова Admin Auth не извлекать через сообщения.

Публичный storefront не меняется. M2 shipping quote v2 и Search v12 остаются закрытыми/утверждёнными техническими фазами; доступ владельца и коммерческая публикация тарифов — отдельные owner gates.

## 6. Первичные источники и validation receipts

- [Google Ads brand verification](https://developers.google.com/google-ads/api/docs/api-policy/brand-verification), проверено 8 октября, updated 7 октября: Basic prerequisite, External/In production, Verify/Publish.
- [Google OAuth requirements](https://support.google.com/cloud/answer/13464321): public homepage/privacy/domain and data-use disclosures.
- [Supabase Auth createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser): server/admin API; supported user creation, не произвольная SQL вставка.
- [Seller Online user agreement](https://seller-online.com/privacy/): individuals/business entities, buyer/reseller model и identity checks; не domain-specific approval.

Implementation validation и exact-head CI/production receipts фиксируются в PR этого пакета. Четыре новые настройки на скриншотах не заменяют readback; публикация app name/support phone не включает analytics/payments.
