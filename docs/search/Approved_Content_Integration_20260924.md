# Одобренный контент: адресные заголовки и подключение к PDP

24 сентября 2026. Продолжение C1/C3; целевой каталог — **все 208 товаров**. Пять прежних примеров не ограничивают ассортимент. Production DB и Vercel environment не изменялись.

## Что изменено

Разобраны все 64 кандидата с совпадением title/H1. Подготовлены **39 адресных предложений**, у **5** сохраняется одобренная формулировка, **20** имеют конкретный unresolved reason. Основные описания, meta descriptions, intro, benefits, keyword selections, цены, UUID и существующие одобрения не переписаны. Сохранённые drafts не изменены.

`metadata-distinction-review-20260924.json` содержит точные product/page/draft IDs, исходный content SHA256, старые значения, предложенный field diff и цитату из сохранённого approved copy. Это **проверка Codex и предложения для review**, не новая owner approval и не человеческий CQA. Перенос существующего уникального SEO title в H1 не создаёт новый факт о товаре. Отличительный состав описывает варианты покупки; он не означает, что весь набор включён в каждую цену.

Симуляция предложений на всех 208 оставляет 7 групп повторяющихся title и 7 H1; их объединение — 18 товаров, все явно на hold. Ещё два hold — противоречия title/offer или цвета. Отсутствие повторов не доказывает отдельную физическую модель или решённую query ownership. Никаких редиректов, canonical merge и новых design-family присвоений нет.

## Реальное подключение существующего экрана

- `app/shop/[slug]/page.tsx` получает approved payload на сервере; `generateMetadata`, Product JSON-LD и существующий `ProductDetailClient` используют одну request-scoped версию через React cache.
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
