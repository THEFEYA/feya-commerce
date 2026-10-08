# TheFEYA — MASTER: доступы, минимальные раскрытия и продолжение корзины

Дата: 2026-10-08. Canonical execution supplement к MASTER commerce v1.2 и Legal / Privacy / Commerce amendment 2026-10-02. Новые решения следуют иерархии MASTER: текущие официальные требования → фактические роли/данные FEYA → более ранние исследования. Публичный визуал, Product Truth, DNA, цены и ACTIVE Search Release v12 сохраняются.

Последующее уточнение по десяти скриншотам владельца 8 октября, 14:32–14:36 Europe/Madrid: [Google review и owner access checkpoint](GOOGLE_REVIEW_OWNER_ACCESS_CHECKPOINT_20261008.md). Оно конкретизирует текущий OAuth app name, отсутствие owner Auth account, применившийся redeploy и минимальные действия владельца; подробная очередь корзины ниже сохраняется.

## 1. Что действительно завершено

- Phase 12 / первая органическая волна завершены: immutable v12 ACTIVE, 18 разрешённых URL, включая 10 одобренных посадочных страниц. Это разрешение на индексацию, не обещание позиции и не свежий счётчик Google.
- M1: серверная price authority для 207 товаров / 856 конфигураций закрыта. Цены в browser storage не становятся суммой оплаты.
- M2: intent с policy acknowledgement, прежний GLOBAL shipping contract и provider-neutral snapshot установлены как отдельные основы; live paid checkout выключен.
- PR #71: существующий кабинет доставки редактирует профили/назначения и рассчитывает server draft preview. PR #72: сохранённая версия проверяется и может иметь отдельное неизменяемое owner approval. Оба PR слиты; PR #72 — production READY `e66d536fadc5e313755b5f1bdb4d705b72b7e273`, exact-tree CI 19/19 SUCCESS. Миграция approval установлена, approvals=0. Запись утверждения сама не публикует тарифы.
- Public `/privacy`, `/terms`, `/marketing-tools` предназначены для доверия и Google review без подстановки неактивного продавца. Они не являются разрешением собирать GA4 или принимать оплату.

Текущая общая оценка launch checklist — 75–80%; дополнительные непубличные основы не закрывают платежи, юридические роли, настоящую аналитику или field CWV. Полная CRM/affiliate payroll и экспериментальные агенты не добавляются в обязательный знаменатель первой продажи.

## 2. Ключи приложения и права настройки — разные вещи

Скриншоты владельца 8 октября показывают правильный Vercel project `feya-commerce`, production PR #72 READY и существующие переменные Supabase / OpenAI / Google Ads. Скрытые значения и их актуальность скриншотами не проверены.

| Имя на скриншоте | Назначение | Чего оно не заменяет |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client и Supabase Auth | Пароль владельца / разрешённый список |
| `SUPABASE_SERVICE_ROLE_KEY` | Закрытые server-side RPC | Вход человека или право менять Vercel env |
| `FEYA_INTERNAL_API_TOKEN` | Определённые внутренние endpoints | Owner authentication, произвольный обход admin |
| `OPENAI_API_KEY` | Запросы приложения к OpenAI | Одобрение Google / публичного продавца |
| `GOOGLE_ADS_CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` | OAuth приложения | Google API access level или разрешение рекламировать |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Историческая настройка | Текущий API access level; FEYA runtime его уже не отправляет |

Vercel API этой сессии отказал в чтении env metadata и создании нового production switch (403); CLI не авторизован. Пароли Vercel/Google и секретные API значения не нужны в переписке. Владелец может самостоятельно внести пять безопасных настроек ниже, не раскрывая секреты. Переход к браузеру после недостаточного connector потребовал бы отдельного разрешения по правилам browser fallback; это не требуется для ручного маршрута.

### Точный ручной маршрут для рабочего кабинета

1. В [Supabase Auth → Users](https://supabase.com/dashboard/project/ysnizcgzhdwdfdkjkhud/auth/users) выбрать принадлежащий владельцу существующий аккаунт. Если его нет, создать **Create new user** с личным email и паролем непосредственно в Supabase; не использовать Invite, если не требуется письмо. Аккаунт должен иметь подтверждённый email. Supabase login — отдельный аккаунт от Vercel/Google, публичная регистрация магазина не включается.
2. В [Vercel Environment Variables](https://vercel.com/alexs-projects-5419f9ec/feya-commerce/settings/environment-variables) проверить `NEXT_PUBLIC_SUPABASE_URL`: ожидается `https://ysnizcgzhdwdfdkjkhud.supabase.co`. Существующие public/service keys не заменять и не присылать. При несовпадении проекта остановить настройку доступа и исправить точное соответствие, не смешивать ключи проектов.
3. Добавить или изменить следующие настройки **только для Production**. Сохранить существующих разрешённых владельцев; при добавлении email не стирать старые email/UUID allowlists.

| Key | Value |
| --- | --- |
| `FEYA_ADMIN_AUTH_REQUIRED` | `true` |
| `FEYA_ADMIN_ALLOWED_EMAILS` | email выбранного Supabase Auth аккаунта; несколько разрешённых email — через запятую |
| `FEYA_DELIVERY_WORKSPACE_DRAFT_ENABLED` | `true` |
| `FEYA_DELIVERY_WORKSPACE_APPROVAL_ENABLED` | `false` до отдельной проверки фактических условий |
| `FEYA_OWNER_ACTIONS_ENABLED` | `false` |

4. В Deployments → последний **Production/main** → **Redeploy**. Сохранение env само по себе не меняет уже работающий deployment. Не переактивировать Search Release и не включать commerce/analytics flags.
5. Открыть [рабочий кабинет](https://thefeya.com/admin/company/delivery); войти выбранным Supabase email/password через `/admin/login`. Пароль вводится только на странице входа. Сообщить результат входа и email, если требуется дальнейшая проверка allowlist; пароль/API secrets не нужны.

Установка env — ручной dependency, а не выполненное действие агента. По новым скриншотам и проверке redeploy auth switch уже применился: private delivery API теперь требует вход (401), owner email/allowlist ещё отсутствуют. Общие owner actions остаются закрыты; последующие scopes открываются отдельно. Минимальный оставшийся маршрут указан в новом checkpoint выше.

## 3. Для чего имя и адрес нужны, а для чего — нет

| Задача | Идентификационные требования / решение FEYA |
| --- | --- |
| Первая индексация Google Search | Техническая indexability не зависит от Seller Online, GA4 или восстановления ФОП. Не обещает освобождение от любых применимых требований к коммерческому сайту |
| Google Ads API / OAuth brand review | Правдивое публичное описание приложения, проверенный домен, support contact, Privacy/Terms и disclosure использования Google data. Публиковать домашний адрес только ради этой проверки не требуется перечисленными OAuth критериями |
| GA4 / обработка данных | Нужен действительно определённый controller, его идентификация/доступный contact, privacy review, законное основание/consent и правильный stream. Controller может быть реальным физическим лицом; это не делает его автоматически зарегистрированным продавцом |
| Продажи покупателям | До paid launch подтвердить реального продавца/сторону договора и применимые сведения, включая географический адрес там, где он обязателен. Для целевого EU distance selling обязательные pre-contract сведения нельзя заменить одним названием бренда |
| Merchant / advertising verification | Отдельно business identity/address/phone в соответствующей системе и согласованность с сайтом. Публичный достижимый contact может быть email, но это не отменяет обязательных seller/address сведений или проверки аккаунта |
| Производство / возврат / showroom | Это разные адресные роли. Закрытый showroom не объявляется открытой точкой посещения/самовывоза. Return destination подтверждается отдельно под реальную transaction/fulfillment модель |

Владелец назвал физический адрес и предпочёл не публиковать личные сведения без необходимости. Полный адрес намеренно не копируется в Git, env или public schema. Google Maps lookup не дал достоверной карточки именно FEYA; сторонние магазины в том же здании не принимаются за FEYA. Карточка Maps в любом случае не подтверждает юридическую регистрацию, продавца, controller или пригодность адреса для претензий.

Решение сейчас: не публиковать домашний адрес и не возобновлять/открывать ФОП лишь ради Google API review. Перед реальными продажами выбрать и подтвердить transaction модель с Seller Online; по её фактам и налоговому резидентству определить необходимую регистрацию с компетентным бухгалтером. Нельзя обещать, что Seller Online автоматически устраняет обязанности изготовителя/оператора или что обязательно нужен именно украинский ФОП. Если адрес станет обязательным, нужен настоящий соответствующий его роли business/service address; произвольный showroom или почтовый ящик не подставляется вместо адреса establishment.

### Исправление в коде

Ранее `publicLegalIdentityReady()` требовал имя + полный почтовый адрес оператора для consent UI, а API context проверял лишь два analytics flags и GA4 ID. Теперь одно server-only правило используется layout, Privacy и context API:

- `FEYA_PRIVACY_CONTROLLER_CONFIRMED=false` по умолчанию;
- `FEYA_PRIVACY_CONTROLLER_NAME` — реальное подтверждённое имя/название controller;
- `FEYA_PRIVACY_CONTROLLER_CONTACT_EMAIL` — подтверждённый действующий privacy contact;
- production environment + `FEYA_ANALYTICS_ENABLED=true` + `FEYA_ANALYTICS_PRIVACY_READY=true` + валидный, отдельно проверенный `G-...` ID.

Наличие postal seller identity не подтверждает controller. Controller identity не публикует адрес, не включает checkout и не заменяет seller disclosures. Privacy-ready flag требует отдельной проверки применимых правовых сведений/представителя/адресных требований, consent и stream: функция не является юридическим заключением об их достаточности. Никакой реальной идентичности и ни одного production flag этим пакетом не задано. Даже при технической readiness Google tag и measurement session по-прежнему требуют consent посетителя. Имя/contact controller не входят в measurement response/events.

## 4. Google API: следующий уже конкретный шаг

По MASTER Cloud project: **826834264134**, Ads Manager **333-242-7758**. Последняя записанная access level — EXPLORER; актуальный статус проверяется непосредственно в Cloud Console, не выводится из старого токена. Для KeywordPlanIdeaService необходим Basic/Standard: Explorer ограничивает planning services. Это отдельный процесс от GA4/GSC, Merchant и запуска платных кампаний.

В [Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding?project=826834264134) сверить:

| Поле | Значение для текущей review surface |
| --- | --- |
| App name | `FEYA SEO Metrics Tool` — фактическое существующее имя на новых скриншотах; публичная review page выравнивается с ним без создания нового OAuth client |
| App homepage | `https://thefeya.com/marketing-tools` |
| Privacy | `https://thefeya.com/privacy` |
| Terms | `https://thefeya.com/terms` |
| Authorized domain | `thefeya.com` |
| Support / developer contact | Доступный уполномоченному владельцу contact; storefront contact — `manager.feya@gmail.com` |

Для новой Basic application официальный Ads guide требует **External + In production**, даже если фактический инструмент используется только собственной командой. Это classification для review, не публичный доступ к admin. Пройти Verify Branding и опубликовать подтверждённый branding. Затем открыть Google Ads API → Overview того же проекта и запросить Basic, если он ещё не предоставлен. Не возвращаться к legacy заявке API Center. Browser/app/secret данные, advertiser verification и campaign activation не объединяются с этой заявкой. При provider rejection сохранить точную ошибку; не удалять billing и не создавать новые проекты без конкретного диагноза.

Ссылки приложения технически можно предоставлять Google сейчас; полной оплаты и Merchant feed для данного brand review не требуется по опубликованному списку. Это готовность surface, не заявленная гарантия одобрения или уже поданная заявка.

## 5. Корзина: без потери требований владельца

Основной подробный backlog и исследования остаются в [M2 cart/delivery/services plan](../payments/M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md). Перепроектирование внешнего оформления не требуется.

1. Владелец настраивает и проверяет фактические ставки/валюту, serviced countries, country/postal overrides, bulky/parcel limits, product/configuration assignments, production day basis/calendars/capacity/cutoff. $19/$35, $30/$50 и $10/$25 — примеры, не автоматическая конверсия существующей EUR authority.
2. Структурированные страна/индекс даются до полного contact form. Новый public shipping successor связывается с exact current offer receipts, approved delivery version, country/postal/basket/method, датами и expiry. Изменение количества, упаковки, адреса или метода требует нового расчёта. Не использовать GLOBAL shipping v1 как адресный receipt.
3. Guest cart показывает товар/конфигурацию/quantity, выбранную доставку и ожидаемое окно **получения**, включающее изготовление + отправку + транзит. Standard и Express имеют свои стоимость/окно и существующие лёгкие векторные icons. Express не обещает ускорение изготовления. Для custom measurements start основан на согласованных спецификациях, не просто сегодняшней дате.
4. Перед оплатой показать точные merchandise + services − discounts + shipping + applicable taxes. Обязательные fees заранее раскрываются и соответствуют Merchant settings. Итог не является payable до подтверждения налоговой/transaction модели и binding snapshot.
5. Услуги явным выбором: gift card/box по фактической цене и eligibility; box учитывается в посылке. Rush/custom sizing включаются после проверки capacity/specification flow; обещание «на 30% быстрее» не придумывается. 1–2 подтверждённые gift services и minimal coupon допустимы до запуска, но optional module не блокирует обычный заказ.
6. Одна первоначально пустая mandatory policy acknowledgement с доступными Terms/Returns/Shipping links и server hash/time; отдельный пустой marketing opt-in. Email нужен заказу; phone optional до доказанной carrier/provider необходимости. Контакты вводятся один раз; account registration не требуется для покупки.
7. Промокод — сворачиваемое поле, server validation/eligibility, понятный результат и пересчёт. Affiliate/referral registration — добровольно после покупки; комиссия не скрытая надбавка клиенту.
8. CRM/recovery после paid-order proof: opt-in, purchase suppression, unsubscribe, idempotency/frequency/margin caps. Анонимный просмотр не даёт email для рассылки. PII не отправляется в GA4/LLM. AI/агенты используют существующую evidence → diagnosis → proposal → validation → scoped execution → measured outcome цепь Growth OS; отсутствие первых показов не разрешает менять Product Truth или ACTIVE copy.

## 6. Конечная очередь и критерии закрытия

| Очередь | Следующее действие | Критерий |
| --- | --- | --- |
| Независимо, сейчас: Google API | Branding / Basic в выбранном Cloud project | Provider-side Verified / нужный access level, затем один ограниченный keyword/report receipt |
| Access | Supabase owner + Production env + redeploy | Реальный авторизованный вход и denied outsider; private draft workspace usable |
| M2 shipping | Exact approved version → destination-aware quote → intent/snapshot successors | Серверные суммы/версии/expiry; unsupported/stale/changed basket не оплачивается |
| Seller/legal | Письменная роль Seller Online для домена, действующий seller/operator/controller, региональные правила | До оплаты понятны договорная сторона, нужные раскрытия и доступные remedies |
| Paid checkout | Adapter/credentials/test transaction/replay-safe webhook/order confirmation | Проверенный paid receipt, одинаковый payable/provider total, повтор callback не создаёт второй заказ |
| GA4, параллельно после своих gates | Подтверждённый controller/stream, consent, existing event engine/ingestion | No-consent/withdrawal/environment tests; реальные события; purchase только server paid truth |
| Merchant, после payable proof | Live product feed + правильная production Ads связь | Совпадают price/currency/availability/shipping; покупка реально завершается |
| Phase 13 / Toyota cycle | GSC + GA4 + commerce evidence / field CWV | Измеренные причины, scoped change, измеренный результат; без повторного открытия закрытых фаз |

Не нужны новый broad SEO research, регенерация всех текстов или новый dashboard. Нужны конкретные provider/access/business facts и следующие versioned contracts. Сегодняшний GSC indexed count / current OAuth verification / provider approval не выдаются за известные без новых доказательств.

## 7. Первоисточники и пределы вывода

Проверено 8 октября 2026:

- [Google Ads API — developer-token migration](https://developers.google.com/google-ads/api/docs/api-policy/developer-token): токен больше не управляет access; используется Cloud project OAuth credentials.
- [Google Ads API — Brand verification](https://developers.google.com/google-ads/api/docs/api-policy/brand-verification): Brand prerequisite для Basic; конкретное External/In production правило выше общего internal exemption.
- [Google Ads API — access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels): planning service restriction Explorer, отдельный Basic path.
- [Google OAuth brand requirements](https://support.google.com/cloud/answer/13464321): homepage/domain/privacy/data-use disclosure. Домашний адрес/ФОП не добавляются к этому списку модельной догадкой.
- [GDPR Article 13](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679): controller identity/contact; это не blanket вывод об отсутствии иных обязанностей. Indexed official text использован; live EUR-Lex HTML встретил anti-bot.
- [EC Consumer Rights guidance](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021XC1229(04)): trader/geographical-address и pre-contract disclosures. Применимость конкретной business/residence/transaction модели уточняется до paid launch; indexed official text, live HTML anti-bot.
- [Merchant contact requirements](https://support.google.com/merchants/answer/12472091): видимый достижимый contact, business verification, consistency; не universal отказ от postal disclosure.
- [Merchant checkout requirements](https://support.google.com/merchants/answer/9158778): guest/security, clear mandatory charges, consistent price/currency and necessary data only.
- [Baymard — delivery dates](https://baymard.com/research-articles/shipping-speed-vs-delivery-date) и [payment UX](https://baymard.com/blog/payment-ux): сравнимые окна дат, итог до оплаты, меньше отвлекающих coupon/payment элементов. Это UX evidence, не обещанный uplift TheFEYA.

Production/CI receipts этого пакета фиксируются в implementation PR. Локально после изменения: 445/445 search tests, TypeScript и полный production build PASS. Добавлена browser/runtime матрица реального context API и Privacy для unconfirmed/incomplete controller, production без seller postal identity и preview; её прохождение подтверждается exact-head CI, а не существованием тестового файла.
