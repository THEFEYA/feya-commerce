# FEYA — Atomic metric import checkpoint

Дата: 23 September 2026. Предыдущий checkpoint: [Demand_Evidence_Bridge_20260923.md](Demand_Evidence_Bridge_20260923.md).

## Сделано

Реализован и проверяется в isolated PostgreSQL атомарный импорт в существующие `feya_commerce_seo_keyword_metric_import_staging_v1` и `feya_commerce_seo_keyword_metric_snapshots_v1`. Одна транзакция создаёт staging row, snapshot и receipt. Новый keyword core не создаётся. Старые snapshots, keyword bank approvals, Product Truth, цены, UI и паспорта агентов не переписываются.

Migration `20260923232105_keyword_metric_atomic_import_v1.sql` создана через Supabase CLI и **не применена в production**. Production использован только для SELECT metadata. API подключён к storage adapter, но фактическая запись заблокирована до согласования legacy readers и authenticated runtime проверки. Это завершённый контракт хранения с проверенными сценариями, а не разрешение его включить.

## Схема и стабильные идентификаторы

| Объект | Изменение | Значение |
|---|---|---|
| Existing staging | Nullable `demand_observation_key`, `demand_evidence_json`; unique key; pair check | Старые rows остаются с null. Новые сохраняют полный observation document |
| Existing snapshots | Те же два nullable поля; unique key; FK на staging observation key | Одна canonical observation имеет одну пару строк |
| New `feya_commerce_seo_metric_import_receipts_v1` | Request key, payload, entries, created_at | Журнал транзакций, не альтернативный keyword bank |
| Existing master | Exact normalized phrase lookup | Existing bigint keyword_id связывается, новые master rows автоматически не создаются |
| Existing bank | Проверка UUID + phrase + market + language при переданном ID | Ссылка сохраняется; score, role, review_status и метрики bank не обновляются |
| Historical snapshot reference | При переданном ID проверяется phrase + market + language | Это provenance reference, не разрешение переписать старую строку |

DB вычисляет observation identity из normalized phrase, source, source_ref, market, language, network и периода. Значения сравниваются отдельно. Один source identity с иными числами или metadata вызывает конфликт, а не обновление. Исправленный источник должен иметь новую явно рассмотренную revision/source_ref.

Bigint IDs в квитанциях передаются строками. Значения выше точности JavaScript Number не округляются. SQL сохраняет original capture date в fetched_at, а время импорта — отдельно в existing created_at/imported_at. UAH не преобразуется в USD и не определяет market. Zero остаётся 0; range хранится в evidence, scalar volume остаётся null.

## API и transaction contract

Read-only preview по-прежнему используется по умолчанию. Для будущей записи нужны `dry_run:false`, исходные rows/CSV, `context_evidence_ref` и включённые deployment gates. Проверяются **все строки**, passing subset молча не импортируется. Exact duplicate rows нормализуются до одного observation до транзакции.

`context_evidence_ref` сохраняет ссылку на подтверждение контекста оператором; сам текст ссылки не доказывает достоверность Google-данных и не означает SEO approval. Новые snapshots получают `context_review_required`, не `fresh_manual_import` или `validated`.

Request key по умолчанию зависит от canonical payload. Optional `Idempotency-Key` даёт явную identity запроса:

- тот же key + тот же payload → прежние row IDs, replay 200;
- новый key + уже записанные observations → новые receipt, прежние staging/snapshot IDs;
- тот же key + другой payload → 409, без перезаписи;
- другой key + conflicting source observation → 409, транзакция целиком откатывается;
- snapshot/receipt failure → ни одной частичной строки; retry допустим;
- transport failure после возможного commit → повторить **тот же** key; ошибка транспорта не объявляется доказательством отсутствия записи.

RPC — `SECURITY INVOKER`, empty search_path, UTC date semantics. PUBLIC/anon/authenticated не могут его вызывать. Receipt RLS включён, service_role имеет SELECT/INSERT без UPDATE/DELETE. Новые staging/snapshot observations защищены от UPDATE/DELETE; legacy rows сохраняют прежнее поведение. Для всех observation locks задан единый порядок, чтобы reversed overlapping batches не захватывали их в противоположной последовательности.

Health RPC обязателен; отдельных INSERT как fallback нет. SQL повторно проверяет context, даты, типы, ranges, integer bounds существующих колонок, currency и monthly history. JSON string `"10"` не становится SQL measured number. Null в половине evidence pair не обходит CHECK constraint.

## Найденная несовместимость и принятое решение

Read-only capture содержит 7 таблиц с полной FK dependency closure и 14 generated alias columns, а также определения **17 прямых SQL readers** (14 views, 3 functions). Это список прямых ссылок на staging/snapshots, не полный транзитивный граф всех consumers. Исходные definitions сохранены в `tests/search-db/fixtures/observed-metric-schema-20260923.json`.

| Legacy reader | Наблюдение | Почему нельзя включать новый поток заранее |
|---|---|---|
| `feya_fn_apply_manual_keyword_metrics_v1` | Latest staging по keyword, без нового source/context gate | Может перенести новый observation в manual candidates до проверки |
| `feya_commerce_fn_promote_keyword_metric_import_v1` | Capture time = now(); scalar volume required | Теряет смысл исходной даты и range-only observations |
| `feya_commerce_apply_seo_keyword_metric_import_v1` | Использует старый ready view; пишет now() и fresh_manual_import | Не знает нового evidence contract |
| `feya_commerce_v_seo_keyword_metric_validation_queue_v1` | Latest snapshot; blacklist отдельных legacy statuses | Новый pending status сам по себе не гарантирует hold |
| `feya_commerce_v_query_cluster_review_queue_v1` | Latest snapshots и прежний 90-day gate | Может разрешить дальнейший шаг без network/period/context review |
| Candidate/promotion/fit views | Повторяют latest-metric joins и собственные scoring rules | Нужна выборочная reconciliation с сохранением существующих approvals |

Поэтому одного environment flag недостаточно. В `searchMetricAtomicStorage.ts` установлен compile-time `METRIC_IMPORT_CONSUMERS_READY=false`. Write route возвращает 423 даже при включённом storage flag. Это временный release gate с конкретной причиной, не запрос нового owner approval. Его снимает отдельный проверяемый changeset после устранения перечисленных несовместимостей и runtime validation.

Migration не меняет legacy view/function definitions и не переоценивает существующий bank. Сначала подготовлен воспроизводимый contract audit; широкая замена всех старых readers вслепую не выполняется.

## Доказательства проверки

Тесты `tests/search-db/metric-import.test.mjs` восстанавливают наблюдаемую структуру, constraints, indexes, generated columns, triggers, RLS и широкие grants. Business test rows **синтетические**; они не изображают измеренный FEYA спрос. Captured fixture содержит schema/code, без Auth users, passwords, sessions или customer data.

Локальные проверки: 441 SEO, 40 Search, 31 SQL PASS; 6 concurrency cases требуют native PostgreSQL и явно skipped в PGlite. Typecheck/build и существующие Admin boundary/Product OS freeze/Owner UI checks включены. CI разделён на независимые PostgreSQL 17.6 jobs: прежние review-save tests и новый metric-import suite; каждый запускается с отдельной пустой loopback database.

Новый suite: 13 local cases + 3 native concurrency cases. Проверены исторические IDs/approval, RLS/grants, zero/range/currency/capture, repeated requests, conflicting values, invalid SQL input, rollback при snapshot и receipt failure, immutability, null CHECK bypass и отсутствие unsafe fallback. Native cases проверяют восемь одинаковых запросов, reversed overlapping batches и conflicting concurrent writers. Финальные remote run/deployment IDs и фактические результаты — в PR #26.

Это SQL transport integration, **не Supabase Auth/PostgREST/browser E2E**. Staging advisors и реальная проверка Auth должны пройти после isolated Supabase restore и до production activation. Предыдущая browser-download проблема этим changeset не решается.

Документация проверена: [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [Supabase changelog](https://supabase.com/changelog), правила grants/RLS и consistent lock ordering. Новые RPC получают явные grants; они не рассчитывают на автоматическую Data API exposure. Никаких новых утверждений о Google ranking behavior этот changeset не вводит.

## Порядок включения и rollback

| Dependency | Owner | Output / Definition of done | Blocker / rollback |
|---|---|---|---|
| 1. Reader reconciliation | GDAE + OSPM | Проверить 17 direct readers и downstream consumers; новые observations учитываются только через versioned context policy; исторические approvals сохраняются | Gate остаётся false; revert integration changeset |
| 2. Isolated Supabase restore | Engineering + GDAE | Additive migration, advisors, service-only grants, PostgREST schema visibility и regression reads PASS | Production не служит тестовой базой; migration не применяется до проверки |
| 3. Authenticated runtime | CQA | Admin session → dry-run → explicit write → same-key retry → receipt → snapshot; unauthorized calls blocked | Витрина/индексация не меняются; оставить storage flag off |
| 4. Deployment activation | Engineering | Reviewed migration before compatible app; health RPC + reader gate + Auth gate PASS | При ошибке storage flag off, rollback app; сохранить populated receipts и evidence columns |
| 5. Page brief pilot | CPIM + OSPM | Stable page/cluster IDs, distinct designs, source evidence, accountable ownership | Evidence storage не назначает Primary и не создаёт страницы |

Нельзя откатывать populated migration удалением receipts/columns или менять ключи задним числом. При неполадке закрыть write path, вернуть совместимый app deployment и сохранить evidence для расследования. Отсутствие health RPC блокирует новый writer; fallback в старый importer запрещён.

## Бинарный gate перед включением записи

- [x] Atomic SQL contract и исходный schema capture подготовлены.
- [x] Повторные запросы, конфликт и partial failure проверены локально.
- [x] Витрина, цены, исторические keyword approvals и паспорта не изменены.
- [x] Native concurrency scenarios включены в CI; фактический PASS на release commit обязателен и фиксируется в PR.
- [ ] 17 direct readers и downstream paths согласованы с context policy.
- [ ] Isolated Supabase migration/advisors/PostgREST пройдены.
- [ ] Authenticated browser/API flow пройден.
- [ ] Gate снят отдельным changeset; deployment environment включён после этих проверок.

Indexing gate остаётся отдельным и закрытым. От владельца сейчас не требуется ни новый общий research report, ни повторное подтверждение Product Truth. Следующая инженерная работа — reader reconciliation, затем inventory/query-owner pilot; запрос конкретного Google CSV появится только для невосстановимых и действительно влияющих на решение метрик.
