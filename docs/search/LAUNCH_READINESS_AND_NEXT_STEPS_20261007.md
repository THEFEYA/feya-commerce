# TheFEYA — текущая готовность и конечный маршрут запуска

Дата проверки: **2026-10-07**. Это операционный checkpoint, а не новый дизайн, Product Truth или Search Release.

## Решение

**Для первой органической SEO-волны сайт технически готов и уже открыт для индексации.** Search Release v12 ACTIVE. Посадочные страницы уже созданы, одобрены и опубликованы. Повторная генерация каталога, SEO-ядра или этих страниц сейчас не требуется.

**Для полноценного запуска с оплатой, измерением заказов и Merchant Center сайт ещё не готов.** Эти зависимости не нужно смешивать с уже закрытым поисковым запуском.

Текущая точка продолжения: **Phase 13 + завершение M2 commerce**, при сохранении ACTIVE v12 и утверждённого визуала.

## Какие документы использовать

1. MASTER Storefront / Search / Performance Architecture v1.0 — основа архитектуры и фаз.
2. v1.1 amendment — уточнения правил исполнения.
3. v1.2 commerce execution amendment — следующий подтверждённый checkpoint.
4. `MASTER_AMENDMENT_LEGAL_PRIVACY_COMMERCE_20261002.md` — исправляет старую зависимость публичных Privacy/Terms от полного имени/адреса продавца.
5. Этот checkpoint — актуальные наблюдения и очередь работ на 7 октября.

Live Architecture Canon v1.12 включает предшествующие v1.8–1.11; применяются последние уточнения в его конце. Visual Commerce System и briefs помогают понимать утверждённый дизайн, но старый execution prompt не разрешает его переделывать.

Более свежий v1.3 supplement находится в [PR #68](https://github.com/THEFEYA/feya-commerce/pull/68). На момент этой проверки PR открыт, документ не входит в `main`. Его сведения о заявке Seller Online и M2 независимо подтверждены ниже. Он не является доказательством состоявшейся оплаты или одобрения провайдером.

Старые checkpoint-файлы сохраняются как исторические доказательства. Статусы `Phase 9 next`, `Privacy 404`, `checkout snapshot under CI`, `indexed=0` на 2 октября и запрос неактивного ФОП не являются текущими инструкциями.

## Подтверждённое live-состояние

| Объект | Проверка 7 октября до нового engineering package |
| --- | --- |
| GitHub main | `97678c5d31b2ef8c32677c3991d33df371053851` — checkout snapshot authority |
| CI этого main | [FEYA validation 37009639486](https://github.com/THEFEYA/feya-commerce/actions/runs/37009639486), SUCCESS |
| Production Vercel | `dpl_9MpHv3uJai9LywJ7fY3vrWAhCtst`, READY, тот же main |
| Supabase | `ysnizcgzhdwdfdkjkhud`, ACTIVE_HEALTHY, eu-west-1; Functions dub1 |
| Search Release | ровно один ACTIVE: `organic-wave-a-20260926`, v12 |
| Release ID / hash | `2dc86d7c-6269-5327-9154-6b5178931254` / `05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b` |
| Strict production crawl | PASS, 18/18 `200 + index, follow + canonical`; 2/2 redirects; 3/3 utility states; filter state PASS |
| PDP indexing | 207 PDP в immutable manifest — `noindex`; HTTP sample 24/24 PASS |
| Sitemap | точные 18 URL из ACTIVE v12, без фильтров/PDP/utility |
| Privacy / Terms / Marketing Tools | публичные 200, собственные canonical, `noindex, follow`; legal links доступны |
| Measurement context `/` | production, правильные page/version/release IDs, `measurement_enabled=false`, Measurement ID не раскрывается |
| Order Intent v2 | ready; exact quote receipts и policy acknowledgement обязательны; оплата/заказ выключены |
| Shipping authority | schema ready; **0 standard EUR и 0 express EUR rate heads**, authority not ready |
| Checkout snapshot v1 | ready; серверный total и revalidation подготовлены; transaction party / order / payment / provider session выключены |
| Merchant Center 5322859215 | 0 товаров, 0 Ads links; issue `No Google Ads account linked` |
| GA4 | видны только старые свойства Feya-Portupeya, Etsy, FEYA (Shopify); правильный production stream custom-сайта не подтверждён |

Источник текущего crawl: `tests/runtime/phase12-production-origin-crawl.mjs`, fixture v12. Он проверяет все 18 index owners и детерминированную выборку 24 PDP; не нужно утверждать, что новый HTTP-проход проверил все 207 PDP.

Действующие sitemap URL: `/`, `/collections`, десять коллекций ниже, `/about`, `/size-guide`, `/care`, `/shipping`, `/returns`, `/contact`.

### Чего эта проверка не доказывает

- Свежий отчёт GSC сейчас недоступен через подключённые аналитические инструменты: один вызов вернул ошибку, другой — пустой список sites. Состояние `18 submitted / 0 warnings / 0 errors` и `indexed=0` в старом отчёте относится к 2 октября. **Количество проиндексированных страниц 7 октября не подтверждено.**
- Допуск к индексации не означает гарантированную индексацию или высокую позицию. Google принимает эти решения отдельно.
- Готовая схема checkout не доказывает успешную оплату, заказ, возврат или получение webhook.
- Зелёный CI и оптимизированная архитектура не доказывают хорошие p75 Core Web Vitals у покупателей.

## Посадочные страницы и действующее SEO-ядро

Все десять коммерческих owners в ACTIVE release имеют `CQA_PASS`, primary intent evidence `confirmed`, immutable content version и membership snapshot. Каждая содержит title, H1, meta description, intro, два полезных текстовых модуля, два FAQ и 3–4 связанных ссылки.

| Посадочная страница | Primary query cluster | Версия в ACTIVE v12 |
| --- | --- | ---: |
| `/collections/shoulder-armor` | `QC_US_EN_SHOULDER_ARMOR` | 3 |
| `/collections/bodysuits` | `QC_US_EN_COSTUME_BODYSUIT` | 3 |
| `/collections/costume-masks` | `QC_US_EN_COSTUME_MASKS` | 3 |
| `/collections/costume-headpieces` | `QC_US_EN_COSTUME_HEADPIECE` | 3 |
| `/collections/costume-belts` | `QC_US_EN_COSTUME_BELT` | 3 |
| `/collections/festival-outfits` | `QC_US_EN_FESTIVAL_OUTFITS` | 3 |
| `/collections/rave-outfits` | `QC_US_EN_RAVE_OUTFITS` | 2 |
| `/collections/burning-man-outfits` | `QC_US_EN_BURNING_MAN_OUTFITS` | 3 |
| `/collections/performance-costumes` | `QC_US_EN_PERFORMANCE_COSTUMES` | 3 |
| `/collections/festival-skirts` | `QC_US_EN_FESTIVAL_SKIRT` | 3 |

Это US/English research scope первой волны. Международная доступность магазина не равна завершённому исследованию всех стран/языков. Региональные/языковые волны вводятся позже по доказанному спросу, реальным условиям продажи и отдельному release.

Исследования, ownership, Product DNA, фильтры и тексты уже существуют. Например, `phase-b-fresh-keyword-metrics-20260926.json` фиксирует источник, дату, US/English scope и реальные seed metrics. Эти значения — датированный evidence snapshot, а не обещание актуального спроса или позиций.

Сохраняются правила: один primary intent — один owner; состав коллекции определяется Product Truth и immutable membership; фильтры не порождают автоматически SEO-страницы; действующий owner не переписывается в обход новой версии/release.

Публичные PDP URL пока длинные legacy slugs. Это известно: их 207 страниц находятся вне индексируемой волны. Массовый rename сейчас добавит миграцию и риски ссылок без подтверждённой пользы. Перед следующей PDP-волной отдельно решается URL/redirect/variant contract; действующий ACTIVE v12 менять ради эстетики URL не нужно.

## Скорость и инженерия

Уже внедрены server-first rendering, slim read models, управляемый shared cache/invalidation, близкие регионы Supabase/Vercel, локальная фильтрация нормализованного индекса, SSR при прямом открытии фильтра, Next image pipeline, responsive sizes, intent prefetch и загрузка hover media по действию пользователя. Шрифты, цвета, композиция и карточки остаются утверждёнными.

Историческое сравнение card read model показало сокращение DB row payload на 72.9%: 1,194,478 → 323,700 bytes. Это уменьшение конкретного серверного payload, **не** утверждение о размере всей страницы или скорости в секундах.

Один текущий cached GET главной дал полный HTML 272,759 bytes после распаковки, transfer 22,831 bytes. TLS занял 8.87 s, первый байт пришёл в 9.06 s; около 0.19 s между TLS и первым байтом. Это измерение из среды исполнения с её сетевым маршрутом. Оно непригодно для объявления пользовательского TTFB или p75; содержимое не включает загрузку всех картинок, JS и шрифтов.

Обнаружен конкретный Phase 13 gap: `web_vital` был в контракте, но runtime не собирал LCP/INP/CLS. Текущий engineering package добавляет стандартный Google `web-vitals` через отложенную загрузку **только после разрешённого production context и согласия**. Пример размера самой SDK: 8,967 bytes, Brotli 3,034 bytes; финальный Next chunk проверяется отдельно при сборке.

Правила нового измерения:

- ровно одна регистрация observers на document;
- события привязаны к navigation page/version/release, а не к странице, открытой позже;
- metric ID, cumulative value, delta и navigation type сохраняются для корректной агрегации;
- query/hash, DOM targets и raw PerformanceEntry не передаются;
- private/admin/API surfaces исключены;
- после отзыва согласия отчёты этого document прекращаются; повторное согласие требует нового document для CWV, чтобы не включить запрещённый интервал;
- GA4, privacy и purchase gates остаются закрыты до своих условий;
- стандартные document CWV не выдаются за измерение каждой SPA-навигации.

Цели MASTER: p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1; инженерные цели строже. Статус сейчас: **архитектура подготовлена, field evidence ещё нет**. Требуется калиброванная mobile/desktop lab baseline и затем consented field cohort; отсутствие CrUX до достаточного трафика не требует выключать исправный Search Release.

## Seller Online: факты вместо предположений

Заявка на подключение `thefeya.com` действительно отправлена 2 октября: Gmail message `1a0fcab081be0778`, тема «Заявка на подключение thefeya.com к Seller Online + API/checkout».

Найден ответ 2 октября, 13:47 UTC, ticket **#403264**, message `1a0fcde68e279b07`: запрос интеграции Next.js передан техническому отделу; финальные особенности и реквизиты будут сообщены после подтверждения. Это подтверждение получения и маршрутизации заявки, **не одобрение подключения и не выдача credentials**. Других писем с `thefeya` в этой проверке не найдено.

Следовательно, повторно подавать ту же заявку сейчас не нужно. Письма в этой сессии не отправлялись.

Сроки изготовления/доставки уже подтверждены. Стоимость доставки — отдельный отсутствующий факт. Не использовать исторические «standard included» / «express +45» как payable authority.

## Оценка завершённости

**Приёмочные условия текущей органической волны: выполнены на 100%.** Это процент закрытых launch checks данного scope, не процент индексации Google и не процент всего каталога.

**Общий объём инженерной подготовки полного storefront launch: ориентировочно 75–80%; остаётся 20–25%.** Это управленческая оценка, а не измеренный KPI. Прозрачная модель ниже даёт около 77/100; веса можно пересмотреть, если провайдер подтвердит иной масштаб интеграции.

| Launch package | Условный вес | Текущая готовность | Вклад |
| --- | ---: | ---: | ---: |
| Catalog / truth / architecture / admin foundation | 30 | 100% | 30 |
| Первая organic release wave | 20 | 100% | 20 |
| Performance architecture + измерение/приёмка | 15 | ~80% | 12 |
| Trust / public policies / API review surfaces | 10 | ~70% | 7 |
| M2 shipping / payment / paid-order lifecycle | 15 | ~40% | 6 |
| Production analytics и измеримый feedback loop | 8 | ~25% | 2 |
| Merchant feed / intended Ads connection | 2 | 0% | 0 |

Даже небольшой по объёму незакрытый payment/identity gate блокирует коммерческий запуск. Процент не разрешает включить оплату раньше проверки. Будущие расширения агентной системы и A/B experimentation не включены в обязательный launch denominator.

## Конечная очередь: что осталось

| Порядок / параллельная линия | Работа | Критерий закрытия |
| --- | --- | --- |
| A — commerce | Получить owner shipping charge model: точные EUR Standard/Express ставки для действующего scope либо проверяемый расчёт перед оплатой | Утверждённая authority; runtime shipping receipt и checkout total совпадают с ней |
| B — commerce, параллельно A | Получить финальный ответ Seller Online: role, разрешённый mode, credentials, sandbox и callback requirements | Provider/domain-specific evidence; публичные transaction disclosures соответствуют реальной схеме |
| C — после A/B | Подключить существующие контролы к exact quote → policy-accepted intent → shipping → snapshot → подтверждённому provider session | Успех/отказ/повтор/idempotency; проверка amount/currency; authenticated webhook и replay; реальный server order receipt; recovery/refund path |
| D — analytics, независимо от Merchant | Подтвердить privacy-controller identity и correct `thefeya.com` GA4 web stream; настроить consent и event validation | Production-only page/product/landing/release attribution; withdrawal; DebugView/Realtime proof; paid purchase только из server truth |
| E — Google API, параллельно commerce | OAuth Branding verification для project 826834264134 и Basic access при необходимости | Provider approval; Keyword Planning выполняется с нужным доступом; EXPLORER не выдаётся за Basic |
| F — после реальной покупки | Merchant feed и подтверждённый production Ads link | Feed price/currency/availability совпадают с purchasable flow; intended account, не Keyword Research; live diagnostics без несовпадений |
| G — Phase 13 | GSC access + lab/field baseline + GA4/commerce ingestion в существующий Growth OS | Датированный baseline; case → hypothesis → approved change → measured outcome; уровень доказательности не повышается без данных |

Аналитика поведения может включиться раньше Merchant/оплаты, когда выполнен её собственный gate. Commerce purchase measurement включается только после настоящего paid order. Органика не ждёт одобрения Ads API или Merchant.

Для внутренней команды используются уже построенные Product OS / Growth OS, stable entity IDs, review queues, versions, execution receipts и locked Measurement Specs. Запускать новый параллельный кабинет или переписывать агентов сейчас не требуется. Автоматические выводы об эффекте на заказы, causal claims и A/B тесты ждут данных и достаточного объёма. На первом цикле — observation/recommendation с человеческим контролем.

## Исследования и контроль

Большое повторное исследование SEO/дизайна перед этой волной не нужно. Дальнейшие исследования должны отвечать конкретному вопросу: provider contract, regional demand, запрос без owner, конкурирующие landing pages, низкая конверсия или медленная когорта. До таких сигналов сохраняются Product Truth, approved content, DNA и visual freeze.

Каждая следующая работа должна иметь один конечный результат, критерий приёмки и запись evidence. Закрытые M1/Phase 12 не пересчитываются при смене чата. Проверки повторяются только при изменении версии, authority, runtime failure или внешней зависимости. Микропроверки не считаются новыми этапами проекта.

## Первичные платформенные источники

- [Google: technical indexing requirements](https://developers.google.com/search/docs/essentials/technical)
- [Google Ads API: brand verification](https://developers.google.com/google-ads/api/docs/api-policy/brand-verification)
- [Google Web Vitals library: loading, lifecycle, aggregation and navigation attribution](https://github.com/GoogleChrome/web-vitals)

Допуск Google, схема Seller Online и фактические сроки внешних review не гарантируются проектным процентом. До подтверждения mode нельзя честно обещать точную дату всей payment-интеграции.

## Проверка engineering package

- 395 search policy/contract tests: PASS, в том числе шесть новых проверок CWV lifecycle и проверка signed delta aggregation.
- TypeScript: PASS.
- Изменённые measurement-файлы проверены текущим flat ESLint Next config: 0 errors / 0 warnings.
- Общий `npm run lint` имеет существующую baseline-ошибку: legacy `FlatCompat` пытается загрузить уже flat Next 16 config и падает до анализа кода. Это известный tooling debt; он не скрыт под утверждением «весь lint зелёный». Текущий пакет не меняет глобальные правила и остальные файлы проекта.
- Локальный production build: PASS; admin boundary, Product OS freeze и owner UI checks: PASS.
- Remote CI/deployment фиксируются в PR/последующем receipt; до этого подготовленный пакет не считать развёрнутым.
