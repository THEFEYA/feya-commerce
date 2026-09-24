# Одобренный контент: адресные заголовки и подключение к PDP

24 сентября 2026. Продолжение C1/C3; целевой каталог — **все 208 товаров**. Пять прежних примеров не ограничивают ассортимент. Production DB и Vercel environment не изменялись.

## Что изменено

Разобраны все 64 кандидата с совпадением title/H1. Подготовлены **39 адресных предложений**, у **5** сохраняется одобренная формулировка, **20** имеют конкретный unresolved reason. Основные описания, meta descriptions, intro, benefits, keyword selections, цены, UUID и существующие одобрения не переписаны. Сохранённые drafts не изменены.

`metadata-distinction-review-20260924.json` содержит точные product/page/draft IDs, исходный content SHA256, старые значения, предложенный field diff и цитату из сохранённого approved copy. Это **проверка Codex и предложения для review**, не новая owner approval и не человеческий CQA. Перенос существующего уникального SEO title в H1 не создаёт новый факт о товаре. Отличительный состав описывает варианты покупки; он не означает, что весь набор включён в каждую цену.

Симуляция предложений на всех 208 оставляет 7 групп повторяющихся title и 7 H1; их объединение — 18 товаров, все явно на hold. Ещё два hold — противоречия title/offer или цвета. Отсутствие повторов не доказывает отдельную физическую модель или решённую query ownership. Никаких редиректов, canonical merge и новых design-family присвоений нет.

## Реальное подключение существующего экрана

- `app/shop/[slug]/page.tsx` получает approved payload на сервере; `generateMetadata`, Product JSON-LD и существующий `ProductDetailClient` используют одну request-scoped версию через React cache.
- Обнаружено расхождение прежних fallback origins: metadataBase использовал `zofeya.com`, PDP JSON-LD — `thefeya.com`. PDP теперь использует общий `absoluteSiteUrl` из siteConfig; проверяется равенство полного canonical и schema URL. Это устраняет внутреннее расхождение, но не подтверждает владение доменом: реальный production origin по-прежнему требует проверки перед release.
- `config/approved-content-review-bindings.json` содержит **208** точных привязок product/page/draft/path/content hash/updated_at. Полные служебные записи и предложения metadata не импортируются в клиент.
- На каждом запросе читается **текущий latest draft**, проверяется approval, архивирование, hash, URL и версия updated_at с микросекундной точностью. При отозванном одобрении, новой версии, изменённом пути или ошибке чтения review закрывается; старый текст не подставляется.
- Использован существующий `getAdminServiceClient`: каждое привилегированное чтение требует текущей Auth session и allowlist; нет публичного service-role reader.
- По умолчанию функция выключена. Единственный подготовленный режим: `FEYA_APPROVED_CONTENT_REVIEW=approved-catalog-20260924-v1`, `VERCEL_ENV=preview|development`, `FEYA_ADMIN_AUTH_REQUIRED=true`. Неизвестная версия/окружение или production блокируют его. **Ни один hosted flag не переключался.**
- Review всегда `noindex,nofollow`, кнопка покупки отключена через уже существующий `previewMode`; Product JSON-LD не заявляет Offer. Это не разрешение публикации или принятия платежей.
- **39 новых предложений пока не подменяют approved copy**. Они проверяются отдельной функцией с allowlist только `seo_title`/`h1`; перед выпуском нужна выбранная версия content review.

C3 теперь реализован как закрытая проверка на настоящем PDP route. Публичный разрешённый reader/release, Shop cohort, exact quotes, 20 предметных holds и C2 query ownership остаются задачами до запуска. Независимость visibility / purchasability / indexability сохраняется.

## Сохранность оформления

Компоненты, CSS, шрифты и цвета не менялись. Из 41 hash-frozen файла изменён только серверный PDP route для разрешённого пользователем подключения существующих текстов; его hash обновлён в том же changeset. Правило проверки не ослаблено.

Дополнительный AST regression сравнивает всю прежнюю JSX-разметку с baseline commit `c916280`; нормализуются исключительно два новых data props `draft`/`previewMode` существующего компонента. Все классы, стили, порядок узлов и остальные атрибуты должны совпасть. Это предотвращает незаметный редизайн под видом обновления hash.

## Проверки и пределы

Локально: **108 Search + 441 Product/SEO tests PASS**, TypeScript, admin boundary, Owner UI, 41-file freeze и воспроизводимые audits PASS. Тесты проверяют все 208 привязок, stale/revoked/archived/hash/path cases, микросекундный drift, неизменность body/intro/meta и запрет расширить scope metadata patch.

Добавлено расширение существующего isolated Supabase/Auth/PostgREST/Next/Chromium runtime: 208 фактических server-rendered PDP, metadata/canonical/JSON-LD/body parity, private canaries, anonymous denial, desktop/mobile hydration, revoked/stale copy и default-off fallback. Публичное product view в этом тесте — синтетическая проекция захваченных данных; фотографии — нейтральный placeholder. Это не проверка реального hosted catalog, полного импорта или ценовых комбинаций. Результат exact-head CI фиксируется отдельно после исполнения; предыдущий `c916280` подтверждён **9/9 CI** (run 36013211196).

## Порядок продолжения

| Шаг | Owner / вход → выход | Validation / blocker | Rollback / done |
| --- | --- | --- | --- |
| C1.2 Закрыть 20 предметных cases | CPIM + SCO; source options, прежние truth решения, фото → конкретное различие или design-review decision | Не придумывать модели; два copy/truth конфликта разрешить фактами. При необходимости 2–5 точных вопросов владельцу | Сохранённые исходные drafts; done: каждое hold имеет подтверждённое решение |
| C2 Query ownership | OSPM; 208 page IDs, сохранённые Primary и hub briefs → accountable owners для важных clusters | Повторный Primary сам по себе не означает cannibalization; не выдумывать demand | Предыдущая ownership version; done: конфликтующие intents явно распределены |
| C3.2 Content release | Engineering + CQA; проверенный закрытый renderer, выбранные metadata diffs → public-safe immutable release | Утверждённая версия, protected draft access, current state; все 208 остаются target | Review flag OFF / предыдущий commit; done: проверенный публичный reader и cohort, без автоматического index/checkout |
| C4/C5 Товары и магазин | Commerce + TSEO; существующие policy/domain сведения, 142 price rows → exact quotes и company/checkout sandbox | Неизвестные варианты не получают выдуманную цену; сначала собрать факты, затем один конкретный запрос владельцу | Checkout OFF; done: истинные сведения и проверенный заказ |
| C6 Index release | Core + TSEO; C1–C5 и exact deployment → binary pre-index gate | Все обязательные gates PASS для выбранных URL; noindex остаётся до этого | Index flags OFF, release rollback |

**Сейчас от владельца ничего не требуется.** Данных и инструментов хватает для сверки оставшихся metadata cases, intent ownership и подготовки следующего release шага. Не требуются повторные общие исследования, подключения или файлы.

## Источники технических решений

Next.js 15 `generateMetadata` / React cache: https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata (проверено 24.09.2026). Google title guidance подтверждено предыдущим этапом; новые «правила Google», SEO пороги или обещания ранжирования здесь не вводятся. FEYA источники — versioned captures и owner scope из этого репозитория.

## Выполненный runtime: основной changeset

Commit `bd0a0718b60899b333afdbe73311587a8b5ad200`, [CI 36016560285](https://github.com/THEFEYA/feya-commerce/actions/runs/36016560285): **9/9 jobs success; 36/36 runtime scenarios PASS**. Отчёт подтверждает `approved_copy_rendered_products=208`, `approved_content_runtime_pass=true`, `production_connected=false`. Самостоятельно скачан и проверен artifact `10814494175`, SHA256 `39032a8e51340cbf1fafe0f935c7ab2cdf8c8b70ec985cc80e986da6520db321`; срок хранения до 01.10.2026. Desktop 1440 и mobile 390 screenshots просмотрены: текст и прежняя структура отображаются, кнопка Preview only отключена; фото в этом тесте намеренно заменено placeholder.

Последующий commit `4934d9efc272a7a06ca15e8b559a603dc7f2b652` унифицирует только canonical origin и усиливает соответствующую runtime assertion; TypeScript / JSX freeze проверены. На момент этого checkpoint его отдельный workflow ещё не отображается, а PR read model показывает предыдущий head, хотя `git ls-remote` уже подтверждает `4934d9e`. Результат предыдущего CI не выдаётся за exact-head CI этой правки. Актуальный статус фиксируется в верхнем checkpoint PR №26.

## Конкретные оставшиеся C4/C5 проверки

- Серверное подключение проверяет основной approved copy. Правая колонка PDP берёт отдельную политику из `lib/thefeyaSeoDoctrine.ts`; её readiness не следует из `approved_copy_rendered_products=208`.
- Doctrine содержит production **3–5 business days**, express **6–9 business days**; канон A1 фиксировал production **3–5 days без типа дней**, express **7–10 business days**. Сверить актуальный business-truth registry и прежние owner решения; не выбирать срок по принципу «последний текст выглядит лучше».
- Footer сейчас направляет Shipping & returns / production links в `/shop`, About в `/`, social/email — в `/`; выделенных публичных policy/contact/checkout routes в текущем дереве нет. Это незавершённые функции, а не готовые trust pages.
- Footer содержит `Berlin`, `brushed chrome`, `patinated brass` и `Visual concept`. Эти шаблонные подписи не являются подтверждением юридического адреса, материалов или готовности магазина.
- Следующая C5 работа: извлечь уже имеющиеся подтверждённые company/policy сведения, собрать конфликты в один пакет, подготовить реальные маршруты в существующем оформлении; только оставшиеся факты спрашивать у владельца. Эти пункты не требуют новых SEO исследований.
