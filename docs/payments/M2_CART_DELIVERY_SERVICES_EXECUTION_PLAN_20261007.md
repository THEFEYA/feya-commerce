# TheFEYA — корзина, доставка, услуги и клиентские коммуникации

Дата: 2026-10-07. База проверки: production/main `7aa17844dadbedd1adf2a278811ca4d3e51ca145`.

Статус: **модель доставки уточнена владельцем; численные примеры — DRAFT; кабинет профилей и серверный предпросмотр реализованы отдельным M2 пакетом; новый checkout ещё не подключён**. Текущая реализация и границы: [delivery workspace checkpoint](M2_DELIVERY_WORKSPACE_IMPLEMENTATION_20261007.md); production/CI receipts фиксируются в implementation PR.

Это конкретизация M2 по текущему сообщению владельца, а не замена MASTER v1.2 или повторное открытие Phase 12. Действующие Product Truth, Search Release v12 и публичная визуальная система сохраняются. Расширять функциональность корзины следует внутри существующего оформления.

Продолжение 8 октября: [exact saved-version approval](M2_DELIVERY_APPROVAL_IMPLEMENTATION_20261008.md) и [MASTER access/privacy/cart supplement](../search/MASTER_ACCESS_PRIVACY_CART_EXECUTION_AMENDMENT_20261008.md). PR #71/#72 слиты, draft и approval migrations установлены. Private approval не публикует ставки; owner access остаётся отдельным dependency. Данный подробный services/recovery backlog сохраняется полностью.

## 1. Уточнение, которое меняет предыдущий checkpoint

«Расчёт перед оплатой» означает прежде всего **расчёт на сервере по тарифам, которыми управляет владелец**:

- базовый профиль Standard / Express;
- профили для объёмных и иных дорогих в пересылке товаров;
- отдельные тарифы по стране / зоне доставки;
- привязка профиля к товару или конкретной конфигурации в существующем кабинете;
- отдельные профили производственного времени;
- понятные окна дат, обновляемые вместе с методом, адресом и заказом.

Внешний carrier API — возможное последующее улучшение, а не обязательная предпосылка этого решения. Seller Online остаётся отдельной зависимостью оплаты и transaction-party disclosure.

| Пример владельца | Статус |
| --- | --- |
| Standard $19 / Express $35 | Кандидат базовых ставок, не активирован |
| Для некоторых стран Standard $30 / Express $50 | Кандидат override, не утверждённая таблица всех стран |
| Изготовление 1–3 / 3–5 / 5–7 / 7–10 дней | Кандидаты профилей; day basis и применимость ещё не утверждены |
| Приоритетное изготовление примерно на 30% быстрее | Идея услуги; нет проверенной мощности, цены или обещания |
| Открытка $10 / подарочная коробка $25 | Примеры цен; нет активных service offers |

Текущая товарная quote authority использует **EUR**. Нельзя прибавлять USD-примеры к EUR subtotal, обозначать их знаком евро или включать произвольную конвертацию. Ставки и услуги должны иметь утверждённую валюту payable order. Публичные сроки пока остаются: производство 3–5 дней с намеренно неуточнённым типом дня; Standard 10–14 business days, Express 7–10 business days после отправки. Новый модуль не подставляет day basis за владельца.

## 2. Что реально реализовано

| Возможность | Проверенное состояние |
| --- | --- |
| Публичная корзина | `/cart` показывает каталоговый статус: checkout ещё не активен |
| Старые CartClient / CheckoutClient | Не подключены публичными маршрутами; демонстрационные Included / +45 и даты Jun/Jul не являются тарифами |
| Цена и policy acceptance | Quote-bound order intent v2 и immutable acceptance точного policy bundle подготовлены; public gate выключен |
| Shipping quote | v1 знает утверждённые GLOBAL EUR rate heads; активных ставок нет. Нет адресных/товарных профилей |
| Checkout snapshot | v1 складывает серверные merchandise + shipping receipts; пока нет налогов, скидок, допуслуг или provider session |
| Редактирование профилей в кабинете | Реализованы «Система → Доставка и изготовление», immutable draft versions, protected owner API, country/parcel rules и product/configuration assignments. Publication ещё отсутствует |
| Production-доступ к кабинету | Пока закрыт admin auth gate (503). Vercel env API отказал (403), CLI не имеет действующей авторизации. Нельзя считать кабинет доступным владельцу до защищённой настройки существующего allowlist и отдельного draft switch |
| Динамические даты | `lib/commerceDeliveryEstimate.ts` подключён к выполнению защищённого server admin preview. Это draft simulation сохранённой версии, не публичный payable shipping receipt |
| Priority / custom sizing / gift services | Нет действующей системы оплачиваемых допуслуг |
| Купоны / affiliate / customer referrals | Нет implementation в новом commerce path; перенос старых внешних приложений не подтверждён |
| Email / phone | В серверном intent есть контактные поля; phone допускает NULL. Это не согласие на рекламу |
| CRM и автоматическое восстановление корзины | Нет работающей CRM/recovery delivery pipeline. Упоминание в старом AccountClient — план, не интеграция |
| Поведенческие события | Контракт содержит add_to_cart / begin_checkout / purchase; production measurement выключен. Wishlist/recovery pipeline отсутствует |
| Возвраты | `/returns`, guardrail и versioned domain truth уже отражают большую часть намерений владельца; региональные раскрытия нужны перед paid launch |

Проверка кода не доказывает отсутствие приложений в старом Shopify/Etsy аккаунте. Подключение именно к custom `thefeya.com` необходимо подтверждать отдельно; OAuth-связь или установленное когда-то приложение не означает действующий checkout adapter.

## 3. Тарифы, профили и расчёт суммы

### Кабинет владельца

В существующем admin добавить разделы «Доставка» и «Сроки изготовления». Минимальные действия:

1. Создать / переименовать профиль, задать Standard / Express и явную currency.
2. Добавить страны или зоны, исключения и недоступные методы.
3. Привязать профиль к canonical product / exact configuration, с предварительным просмотром затронутых товаров.
4. Настроить quantity/parcel limits и обработку смешанного заказа.
5. Сохранить draft, увидеть пример заказа и опубликовать новую версию с audit receipt.

Переименование меняет подпись, не stable ID. Опубликованные версии и уже оплаченные заказы не редактируются задним числом. Отдельный shipping override не должен менять SEO, DNA или содержимое товара.

### Правила выбора

- Адрес начинается со структурированного ISO country code, region/postal code — по необходимости. Не извлекать страну из свободного текста.
- Использовать явный список обслуживаемых стран; глобальная ставка не означает автоматическое разрешение доставки куда угодно.
- Приоритет: exact configuration assignment → product assignment → утверждённый default profile. Внутри профиля: country/postal override → явно определённая зона → разрешённый default.
- Несколько совпадающих правил одинаковой точности — ошибка конфигурации, а не выбор случайного самого дешёвого.
- Цена задаётся целым amount_minor в валюте заказа. Нулевой тариф возможен только как явно утверждённая бесплатная доставка.
- Учитывать конфигурацию, количество, упаковку и допустимость метода; корзина с пятью объёмными товарами не должна автоматически получать цену одной посылки.
- Для нескольких профилей в одном заказе нужна **явно утверждённая parcel/combination rule**. Ни sum всех тарифов, ни max тарифа не являются универсально верной логикой.
- Для непокрытого адреса/объёма показывать request a shipping quote и не создавать платёж с придуманной суммой.

Browser передаёт выбор и адресные данные. Сервер разрешает профили и ставки из утверждённых версий, создаёт receipt, а перед provider session сверяет текущий cart/адрес/метод, срок действия и согласованный total. Изменение любой зависимости требует нового расчёта. Исторический receipt остаётся неизменяемым; опубликованный новый тариф не переписывает оплаченный заказ.

### Продолжение существующей authority chain

Текущий shipping v1 нельзя молча расширить или использовать его `GLOBAL` receipt для country-specific расчёта. Требуются versioned successor contracts:

- structured destination / basket binding в order-intent successor;
- shipping profiles, assignments, zone rules, calendars и immutable shipping quote successor;
- checkout snapshot successor с отдельными merchandise, service, discount, shipping и tax lines;
- transaction-party / provider adapter и paid-order lifecycle.

Названия будущих DB objects и версий должны быть согласованы в implementation package; они пока **не установлены**. Новый receipt связывает exact quote receipts, destination fingerprint, profile/rate/calendar version IDs, parcel rule, method, date estimate, policy evidence и expiry. Без PII в analytics; адрес хранится только в закрытых commerce records.

Итог перед оплатой: merchandise + выбранные services − допустимая discount + shipping + applicable taxes. Комиссия блогера — расход магазина, не скрытая доплата покупателя. Нельзя выдавать существующий merchandise + shipping snapshot за полный налоговый/payable total без проверки реальной transaction модели. Customs/DDP/DAP и обязанность сбора налогов определяются по подтверждённой схеме продажи, а не только текстом «всё платит покупатель».

## 4. Даты и представление доставки

Рядом с каждым методом показывать стоимость и **estimated arrival date window**, например формат «Estimated arrival: 24–30 Oct». Пример формата не является обещанием реальной даты для конкретного товара. Ниже компактно объяснить production → dispatch → transit. Использовать существующие цвета/шрифты и векторные Truck / Plane, с текстовыми labels; иконка не заменяет объяснение.

Собирать контакты один раз в checkout, а для первоначального расчёта в bag достаточно необходимых destination fields. Не повторять форму Full name / Email / Phone / Address в обоих шагах. Guest checkout остаётся основным; аккаунт и регистрация партнёра — отдельные возможности.

### Добавленный внутренний модуль

`calculateCommerceDeliveryEstimate` требует явные profile/calendar version references, server-provided timestamp, IANA timezone, cutoff, min/max и calendar/business day basis. Он:

- считает гражданские даты, не прибавляет миллисекунды «24 часа» через DST;
- учитывает выходные и праздники по отдельным календарям изготовления, отправки и transit;
- переносит отправку на рабочую дату перевозчика;
- для concurrent production и одной посылки ждёт самую позднюю готовность, не суммирует длительности всех изделий;
- различает preview assuming ready now и confirmed start;
- не выдаёт дату старта, пока не готовы мерки/спецификации;
- сохраняет ссылки на использованные версии и всегда возвращает event_date_guaranteed=false.

Это **арифметика дат, не проверка загрузки производства, разрешение ставки, carrier SLA или финальный checkout quote**. Календарь и готовность должны приходить из server resolver. Даты возвращаются в scheduling timezone; destination-local presentation и границы маршрута должны быть явно определены адаптером перед публичным подключением. Изготовление day zero / момент cutoff — выбранная конвенция модуля, требующая согласования production policy. Количество и загрузка учитываются в approved duration/start anchor; split shipments считаются отдельно.

В карточке пока достаточно краткого текста о стоимости и датах в корзине плюс ссылка на shipping policy. Не обещать точные даты раньше адреса и метода; доступная ранняя оценка поможет покупателю до ввода полных контактов.

## 5. Допуслуги без перегруженной корзины

Один свернутый блок «Make it yours / Gift options». Все платные услуги изначально выключены; итог обновляется при явном выборе. У каждой услуги: утверждённый offer ID/version, price/currency, scope per order / per eligible item / per package, применимость, описание и условия исполнения.

| Услуга | Корректная реализация |
| --- | --- |
| Gift card/message | Один раз на определённый order/package; лимит текста; без автоматического выбора. Цена пока draft |
| Gift box | Только подходящие товары; размер/вес коробки участвуют в shipping quote; точная цена и количество коробок видны |
| Custom measurements | Только eligible товары. Уточнение менеджером, утверждение мерок/спецификаций и order-specific production record; срок начинается после согласования |
| Priority production | Отдельная проверенная production profile/capacity allocation. Не применять «минус 30%» ко всей доставке и не обещать ускорение без мощности |

Custom service не должен автоматически объявлять стандартный размер S/M или каталоговый цвет юридически персонализированным товаром. Нельзя добавлять произвольный custom option к каждому SKU; нужна конкретная capability и точная запись согласованного изменения. Если окончательная custom-цена неизвестна, запросить/согласовать quote до оплаты.

Все service lines должны попасть в один серверный snapshot, order confirmation и provider amount. Если capacity недоступна, услугу нельзя продать с подтверждённым ускоренным сроком. Подарочная открытка и prepaid gift card — разные продукты; второй в эту задачу не включён.

## 6. Купоны, партнёры и клиентские рекомендации

**Купон:** ссылка «Have a promo code?» открывает поле. Валидный код из referral link можно применить автоматически с видимыми размером скидки и возможностью удаления. Eligibility, срок, валюта, минимальный чек, usage limits, сочетание скидок и атомарная redemption проверяются сервером. Не доверять frontend discount/total. Недействительный купон не ломает обычную покупку; истечение скидки перед оплатой требует повторного review нового total.

**Creator / affiliate:** отдельная регистрация и одобрение, ссылка + код, dashboard с кликами/оплаченными attributable orders и начислениями. Проценты и attribution window пока не определены. Paid webhook, частичные refunds, chargebacks и отмены изменяют комиссионный ledger; выплаты после применимого периода hold, с определённой базой и правилами anti-fraud/self-referral. Блогеру не показывать адрес, email, мерки или другой PII покупателя.

**Customer referrals:** опциональная ссылка после покупки / в кабинете, без требования регистрации до оплаты. Reward не выдавать за незавершённый заказ; eligibility и сроки определить отдельно. Не отправлять письма «другу» от имени магазина только потому, что покупатель ввёл чужой email.

Для платного продвижения/commission relationships подготовить понятные disclosure инструкции партнёрам. First-party referral code не равен разрешению на скрытое cookie/fingerprint tracking. Не подключать тяжёлый affiliate widget ко всем landing/PDP.

## 7. Email, phone, согласия и CRM

- Email нужен для подтверждения, вопросов к заказу и tracking. Phone — optional, кроме конкретного обязательного carrier/provider требования с коротким объяснением. Не требовать номер ради увеличения маркетинговой базы.
- Данные, необходимые для заказа, обрабатываются для этого назначения; consent на рекламные письма — отдельная задача. Принятие Terms не является marketing opt-in.
- **Одна обязательная, первоначально пустая галочка** для точного текущего Terms / Returns / Shipping bundle. Acceptance version/hash/time сохраняются сервером. Не делать отдельную галочку для каждого подпункта возврата.
- **Одна необязательная, первоначально пустая галочка email marketing**, явно включающая соответствующие cart reminders/offers. Отказ не препятствует покупке. SMS/WhatsApp consent добавлять отдельно только если канал действительно запускается; не загружать checkout неработающими опциями.
- Cookie analytics consent и согласие на email marketing независимы. Не требовать обязательного «согласия на всю Privacy» для обычного исполнения заказа. Для отдельных услуг, если применимый закон требует дополнительного согласия, показывать его контекстно.

Пример текста в рамках уже согласованного checkout contract: «I agree to the Terms, Returns & Exchanges and Shipping policy.» Ссылки доступны рядом. Пример marketing label: «Email me TheFEYA offers and reminders about my saved bag.» Оба текста — proposed UI copy, не опубликованное legal acceptance.

CRM продолжает существующий company/Growth OS: customer/order references, contacts с ограниченным доступом, support history и отдельный consent ledger (purpose/channel/text version/when/how/withdrawal). Unsubscribe/suppression действует перед каждой отправкой, включая уже поставленную в очередь. Retention/erasure отдельно от обязательного хранения order/dispute evidence. Email, phone, address, фото и мерки не отправлять в GA4/LLM prompts по умолчанию.

## 8. Брошенные корзины и предложения

Operational cart/checkout records и optional behavioural analytics — разные данные. Анонимную корзину нельзя автоматически привязать к email неизвестного посетителя. Полученный для заказа email сам по себе не разрешает глобальную рекламную рассылку.

Для первой версии recovery использовать положительный email opt-in; не строить worldwide разрешение на одном UK soft-opt-in исключении. Просмотр сайта, в том числе залогиненным пользователем, недостаточен для автоматического признания маркетингового разрешения.

Proposed workflow:

1. Клиент сам оставил email; сохранены current opt-in, cart token и разрешённая цель обработки.
2. Проверены inactivity, нет paid order, suppression и ограничения частоты.
3. Первое короткое напоминание; coupon только при approved campaign eligibility/margin rule.
4. Непосредственно перед отправкой повторно проверить purchase и withdrawal. Не дублировать отправки при retry; recovery links не содержат открытых контактов/адреса.
5. После покупки или отказа дальнейшие напоминания прекращаются.

Пример задержек 1 день / 2–3 дня — гипотеза, не включённое расписание. Автоматическая большая скидка каждому обучит ждать скидок и может снизить маржу: начать с controlled cohorts и измерения paid recovery/contribution margin, не только opens/clicks. Viewed-product/wishlist campaigns — отдельная поздняя очередь с соответствующим opt-in и tracking basis, а не повод собирать всё обо всех уже сейчас.

## 9. Прежняя политика и безопасное продолжение

Основные источники внутри проекта:

- `docs/legal/FEYA_Commerce_Policy_Legal_Guardrails_20260926.md`;
- `supabase/migrations/20260926123000_owner_domain_returns_policy_truth_v1.sql`;
- текущие `/returns`, `/shipping`, `/terms`;
- M2 checkout policy bundle v1 и acceptance v2.

В более старой переписке найдено: обращение в течение 7 дней, buyer-paid voluntary return, адрес после prior notice, sale → store credit, custom exceptions, обработка refund/store credit в течение 7 business days после получения, историческая отмена в течение 24 часов. **24h не переносится обратно**: текущие store policy и новое сообщение владельца строже. Старые абсолюты о гигиене/самовольном возврате нельзя копировать без mandatory-law scope. Точный срок отправки назад после одобрения и полный список подключённых приложений прежними источниками не подтверждены.

Предлагаемая коммерческая модель:

- prompt inspection, обращения по добровольному fit exchange в течение 7 дней;
- индивидуальное согласование adjustment/remake/replacement, добровольного exchange/store credit;
- для добровольного обмена — разумная примерка, без event use/стирки/повреждений, инструкции и подтверждённый адрес;
- custom specifications record и factual seal evidence, если используется реально применимое hygiene exception;
- cancelled shoot/event и покупательское «мне уже не нужно» не являются дополнительным обещанным магазином refund основанием;
- дефекты, ошибка исполнения и statutory remedies рассматриваются отдельно от voluntary policy;
- сроки и стоимость обратной отправки сообщаются до решения клиента; конкретный return address зависит от подтверждённой transaction/fulfillment модели.

**Региональная реализация важнее общей фразы «mandatory rights unaffected».** Перед paid launch добавить применимые withdrawal/remedy disclosures и форму, где требуется. В ЕС стандартные каталоговые опции не становятся персонализацией только от изготовления после заказа. В UK sale не отменяет consumer rights. Срок 7 дней не закрывает позднее обнаруженный производственный дефект; обязательный refund не заменяется принудительным store credit. Для US shipment delay нужен процесс notice/consent/cancel/refund. Отсутствие добровольной гарантии event date не освобождает от принятого конкретного deadline или иных обязательных delivery remedies.

Защита от «аренды» строится на прозрачной voluntary policy и evidence: exact configuration, реальные согласованные мерки/custom изменения, показанные даты/quote, policy versions, paid confirmation, QC, tracking и factual condition inspection. Примерка и использование на мероприятии различаются. Если применяется statutory withdrawal, учитывать документированное уменьшение стоимости по действующим правилам; не объявлять автоматический полный запрет возврата. Checkbox не запрещает обращения к банку и не гарантирует выигрыш chargeback.

### Мягкая основа public copy — draft, не опубликована

> Each TheFEYA piece is made with care. Please inspect your order on arrival and contact us promptly if there is a production or order issue. For our voluntary fit-exchange process, contact us within 7 days of delivery so we can discuss an adjustment, remake, exchange or store credit. Eligible voluntary exchanges require items to be unworn beyond a careful fitting and returned according to the instructions we provide. A cancelled event or a change of plans does not create an additional voluntary refund entitlement. Please contact us before returning an item so we can confirm the correct address and next steps. These voluntary conditions do not limit any statutory cancellation, return or remedy rights that apply to your purchase. Defective or incorrectly supplied items are handled under the applicable legal remedies.

Эта основа нуждается в отдельном конкретном regional rights block; она не заменяет обязательные сведения и не используется как новый policy bundle без версионирования.

## 10. Конечная очередь и условия приёмки

| Очередь | Пакет | Проверка завершения |
| --- | --- | --- |
| Launch 1 | Утвердить валюту, тарифную матрицу обслуживаемых стран, parcel rule, production day basis/calendar/cutoff | Можно воспроизвести стоимость и даты для обычного, bulky и mixed orders; нет двусмысленных правил |
| Launch 2 | Profiles/admin + destination-aware quote/intent/snapshot successors | Серверные суммы и версии; недоступные адреса не оплачиваются; stale quote перерассчитывается; negative tests |
| Launch 3, параллельно | Подтверждённый Seller Online mode/role/credentials; operator/privacy-controller disclosures; regional policy blocks | Документы совпадают с реальной схемой; exact rendered policies и version/hash evidence согласованы |
| Launch 4 | Корзина/checkout в существующем стиле, без дублирования контактов; одна policy ack; оплата и подтверждение | Guest mobile flow, success/failure/retry/webhook replay; real paid order и totals; возврат/поддержка |
| Launch 5, отдельная линия | GA4 правильного web stream + consent, company ingestion | No-consent/withdrawal/production-only proof; private PII не уходит в analytics; paid purchase только из server truth |
| Optional launch module | Minimal coupons и 1–2 подтверждённые gift services | Явный выбор; eligibility и totals/provider amount совпадают; disabled features не блокируют обычную покупку |
| После paid-order proof | Opt-in recovery/CRM, creator program, customer referral | Suppression/idempotency; refunds/commission reconciliation; контроль маржи |
| После capacity proof | Priority production и расширенное paid custom sizing | Реальные слоты/цены/specifications; понятный start и date window |

Купоны и услуги нужны в целевой системе; отсутствие необязательного модуля не является причиной повторно закрывать индексацию или бесконечно откладывать базовую оплату. Полная affiliate payroll, AI campaigns и wishlist retargeting не добавляются в mandatory launch denominator. Готовность search wave и прежняя ориентировочная launch оценка 75–80% не повышаются от одного документа или непубличного helper.

## 11. Проверка календарного пакета PR #70

Локальная проверка: 405/405 search tests прошли, в том числе 10 новых calendar tests и существующие shipping/intent/snapshot boundaries; TypeScript passed. Scoped lint новых TypeScript файлов: 0 errors / 0 warnings. Известная проблема глобального legacy lint config не исправляется в этом пакете. Финальная CI/build receipt добавляется в PR после проверки. Ни DB migrations/rates, ни публичные страницы, ни production feature flags этим пакетом не меняются. Модуль не импортирован в клиентскую сборку; новых зависимостей или маркетинговых скриптов нет.

## 12. Первичные исследования и правила, проверенные 2026-10-07

Эти источники подтверждают конкретные правила. Выбор очередей, модулей, времён recovery и маржинальных ограничений — инженерные/коммерческие предложения для FEYA, а не заявленный доказанный uplift.

- [Baymard: delivery date versus shipping speed](https://baymard.com/research-articles/shipping-speed-vs-delivery-date) — даты у каждого shipping option облегчают сравнение.
- [Baymard: payment UX](https://baymard.com/blog/payment-ux) — полный total перед оплатой, сворачиваемый promo field, меньше отвлекающих элементов.
- [Baymard: required/optional fields](https://baymard.com/research-articles/required-optional-form-fields) — явно различать необходимые и необязательные поля.
- [EU Your Europe: distance selling](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm) — pre-sale disclosures, active paid extras, withdrawal и ограниченные exceptions; diminished value при использовании сверх проверки.
- [European Commission CRD guidance, section 5.11.2](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021XC1229(04)) — standard predefined options сами по себе не personalised specifications.
- [EU consumer guarantees](https://europa.eu/youreurope/business/selling-in-eu/consumer-contracts-guarantees/consumer-guarantees/index_en.htm) — statutory defect remedy и связанные costs отдельно от store return policy.
- [GOV.UK: accepting returns](https://www.gov.uk/accepting-returns-and-giving-refunds) — distance withdrawal, sale rights и ограниченные exceptions.
- [ACCC: repair/replace/refund](https://www.accc.gov.au/business/problem-with-a-product-or-service-you-sold/repair-replace-refund-cancel) — mandatory remedies и разумные return costs для non-conformity.
- [FTC: internet order merchandise rule](https://www.ftc.gov/business-guidance/resources/business-guide-ftcs-mail-internet-or-telephone-order-merchandise-rule) — разумное основание shipping promises и процесс при задержке.
- [ICO: PECR email rules](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/) — отдельный active channel consent; soft opt-in только при всех условиях, browsing не является negotiation.
- [FTC: CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) — маркетинг отдельно от transaction messages; identity/address/unsubscribe.
- [FTC: influencer disclosures](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) — раскрытие material/commission relationship.
