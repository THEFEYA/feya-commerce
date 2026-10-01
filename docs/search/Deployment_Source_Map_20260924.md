# FEYA — проверенные ветки, развёртывания и источник данных

24 сентября 2026. Проверка подключениями GitHub, Vercel и Supabase, без production writes. Закрывает перенос локального пакета и уточняет LT1; фактическая привязка environment каждой сборки к БД пока не подтверждена.

## Код и развёртывания

Все три проверенные линии принадлежат `THEFEYA/feya-commerce`, Vercel project `prj_ePIymo4sUG33wrRjHBxWrSlaxPID`, team `team_YAOiCdbHvgT2kzgeAihz6SqU`.

| Назначение | Ветка / проверенный commit | Deployment | Результат |
| --- | --- | --- | --- |
| Company/Growth и магазин со скриншотов | `owner-ui-v1` / `928d8dfcfb18cec0e8b19fa27ee40faa636e2b3d` | `dpl_9uZErVCqbykFEA2RcUZg661riYLm`; `feya-commerce-32nm8e3xq-alexs-projects-5419f9ec.vercel.app`; alias `feya-commerce-git-owner-ui-v1-alexs-projects-5419f9ec.vercel.app` | READY, target=null |
| Product OS / SEO preview со скриншота | `work/resume-listing-batches-20260915` / `c28e112923d33eaea18c5c08aa858a4c5bb91c26` | `dpl_Fo6uBrn9ZiBxrE592Yf7f7kYBvEk`; alias `feya-commerce-git-work-resume-li-438f41-alexs-projects-5419f9ec.vercel.app` | READY, target=null |
| Интеграция и полный purchase-binding пакет в PR #26 | `work/search-architecture-foundation-20260923` / `c2b5cd4376a8b60d3910ad8f9c9da9b68b83a95a` | `dpl_6BZEwHnW9JtebfXB3o1z2nxjp8vC`; `feya-commerce-b4ge2274z-alexs-projects-5419f9ec.vercel.app` | READY, target=null; в production не продвигался |

Ранее неотправленные 12 файлов опубликованы через GitHub Git Data API. SHA каждого blob совпал с локальным; полное дерево `ba2957b73369b8e7d08416175cefefefccf4e38d` также совпало. Update ref выполнен без force, от актуального родителя `1ccf363`. Локальная ветка синхронизирована с remote. Новые логины/токены владельца для этой операции не потребовались. Ошибка `git push` была ограничением терминального credential helper, а не отказом в доступе подключению GitHub.

## Проверки перенесённого кода

- [CI 36005880274](https://github.com/THEFEYA/feya-commerce/actions/runs/36005880274), commit `c2b5cd4`: все **9 jobs SUCCESS**.
- Build log: **89 Search / 441 Product-SEO PASS**; build/typecheck и семь PostgreSQL 17 suites успешны.
- Supabase/Auth/PostgREST/browser log: **30 PASS** scenarios; изолированная БД и тестовый Google provider. Это не live Google access и не production checkout.
- Artifact `metric-runtime-evidence`, id `10810204577`, 633505 bytes, expiry `2026-10-01T13:31:46Z`; GitHub-reported digest `a6ad05dbd67dfee09666b5e64651b9df69201e5ee75b2123956400314e02f80a`. Архив отдельно не скачивался; число сценариев проверено по журналу job.
- Эти результаты относятся к указанному code commit. Последующие изменения отчётов не выдаются за отдельный повтор всей runtime проверки.

## Доступность будущего публичного сайта

Vercel project API вернул `live=false`, Node 24.x и только три домена `feya-commerce.vercel.app`, `feya-commerce-alexs-projects-5419f9ec.vercel.app`, `feya-commerce-git-main-alexs-projects-5419f9ec.vercel.app`. Custom domain этим ответом не установлен.

SSO protection имеет режим `all_except_custom_domains`. Попытка чтения `/shop` на адресе со скриншота вернула HTTP 302 на Vercel SSO и `x-robots-tag: noindex`; содержимое магазина этим запросом не прочитано. Настройки защиты не менялись. Текущую ссылку нельзя считать проверенной общедоступной ссылкой для Google: отдельный company release должен пройти анонимный HTTP/browser check на согласованном домене, сохранив отдельную защиту admin routes. Секретные share-параметры и cookies в отчёт не включены.

## База данных

Доступное подключение Supabase показало один проект — `FEYA's Project`, ref `ysnizcgzhdwdfdkjkhud`, ACTIVE_HEALTHY, eu-west-1, PostgreSQL 17.6; development branches — `[]`. Существование других проектов вне доступного аккаунта не проверялось.

SELECT подтвердил обе функции `feya_commerce_get_seo_product_truth_v4(uuid)` и `feya_commerce_get_step7_storefront_products_api_v7(uuid)`. В `feya_commerce_v_step7_storefront_products_api_v4`, `feya_commerce_v_seo_product_truth_v4` и `feya_commerce_seo_pages_v1` — по 243 записи. Равенство counts не доказывает неизменность всех полей; это ограниченная проверка актуальности источника.

Ни одна из четырёх подготовленных функций `feya_commerce_import_keyword_metrics_atomic_v1`, `feya_commerce_metric_reader_boundary_health_v1`, `feya_commerce_metric_access_boundary_health_v1`, `feya_commerce_google_ads_import_contract_v1` в каталоге public не найдена. Поэтому успешный CI нельзя трактовать как установленную рабочую миграцию или готовность hosted import. Отдельная hosted staging/cutover задача остаётся.

В доступном Vercel ответе отсутствуют environment values каждой сборки. Поэтому связь «deployment → данный Supabase ref» остаётся **unverified**, хотя этот проект содержит ожидаемые FEYA контракты. Preview не считается изолированной БД; тестовые записи в него запрещены до проверки environment. Следующий LT1 шаг — read-only проверка только безопасных значений host/flags и anon runtime на будущем public release, без раскрытия ключей.

## Следующий этап

Визуальная проверка 15 обложек выполнена в `Design_Review_20260924.md`; она дала кандидатов физических моделей, без автоматического merge. Владелец уточнил: SEO DNA axes предназначались для keywords. Для состава покупки приоритет имеют конкретные options/variations, предметный текст и прямое owner confirmation. Подготовить пять адресных товарных вопросов; ответы фиксировать по UUID и не распространять автоматически на весь каталог. Параллельно готовить company release и список его реально недостающих identity/domain/policy данных.
