# FEYA — Metric reader reconciliation

Дата: 23 September 2026. Предыдущий checkpoint: [Atomic_Metric_Import_20260923.md](Atomic_Metric_Import_20260923.md).

## Результат

Подготовлена совместимая граница для 17 ранее найденных SQL readers. Новые atomic observations исключаются **до** legacy latest-row selection, scoring и promotion. Исторические строки продолжают давать прежние результаты; stored evidence сохраняется в тех же canonical staging/snapshot tables, с теми же IDs.

Это намеренная versioned compatibility policy. Старые формулы не должны превращать новый Ads competition или CPC в organic difficulty и автоматически назначать Primary. Текущие решения Page Portfolio читают исходные observations через demand evidence contract. Новый keyword core или альтернативное хранилище метрик не создаются.

Production использован только для SELECT. Migration `20260923234026_keyword_metric_reader_boundary_v1.sql` **не применена**. Write path и production indexing остаются выключенными. Закрыта инженерная зависимость legacy-reader isolation; Supabase staging/Auth/PostgREST/browser validation и context review остаются отдельными gates.

## Что проверено в текущем каталоге

| Scope | Наблюдение | Реальное изменение |
|---|---|---|
| 14 direct views | 16 чтений исходных metric tables | Inline predicate `demand_observation_key IS NULL` перед selection/aggregation; прежние columns, ACL, owner и options сохранены |
| `feya_fn_apply_manual_keyword_metrics_v1` | 2 чтения staging | Обе выборки исключают atomic observations; new-only batch не обновляет manual candidates |
| `feya_commerce_fn_promote_keyword_metric_import_v1` | 4 staging scopes + 1 snapshot lookup | Все 5 ограничены legacy rows; atomic rows не перепродвигаются и не модифицируются |
| `feya_commerce_apply_seo_keyword_metric_import_v1` | Raw table упоминается только как INSERT target; source — ready view | Body не изменён: ready view уже отфильтрован, new-only batch даёт zero inserts |
| View dependency graph | 48 downstream views в public, включая 14 direct | Зависимые имена/колонки не менялись. Это catalog lineage, не полный browser/agent E2E |
| Application | Прямой reader страницы seo-clusters использует существующий query-cluster view | Получает тот же контракт columns; JSX, fonts, colors не менялись |
| Google Ads internal writer | Прямой API writer остаётся отдельным legacy путём | Его ранее найденный targeting/period provenance risk не объявлен исправленным этим changeset |

Все 23 SQL guards перечислены в `metric-reader-boundary-plan-20260923.json`. Captured definitions, ACL/options, dependency columns и downstream graph: `tests/search-db/fixtures/observed-reader-boundary-20260923.json`.

## Почему использованы inline predicates

Predicate добавлен внутри SQL input relation, до `DISTINCT ON`, оконных функций и `ORDER BY fetched_at`. Поэтому pending row с более новой датой не вытесняет прежнее наблюдение. Простая фильтрация уже выбранной latest row могла бы потерять старое допустимое значение.

Новые общие views между существующим reader и таблицей не добавлялись: изменение invoker/owner semantics на таком промежуточном слое могло бы изменить права старых consumers. Существующие SECURITY DEFINER functions сохраняют свои прежние права и options; новых SECURITY DEFINER функций нет. Их более широкий legacy security review не подменяется этой миграцией.

При local simulation обнаружено, что CREATE OR REPLACE VIEW без явного WITH сбрасывает `security_barrier=true` у двух views. Generator теперь явно переносит captured options, а postcondition проверяет их перед COMMIT. Это исправлено в изолированной проверке, не после production rollout.

## Защита от schema drift

Migration генерируется детерминированно из reviewed catalog capture:

```sh
python scripts/build-metric-reader-boundary.py
```

Перед заменой каждого объекта проверяются definition, owner, ACL и options. Для views PostgreSQL сам парсит captured и current SELECT во временные views и сравнивает canonical definitions. Это устраняет ложные различия от автоматически добавляемых UNION aliases, не удаляя пробелы/литералы или SQL predicates. Временные views удаляются в той же транзакции. Неожиданное отличие прекращает migration, а не перезаписывается автоматически.

После замены повторно проверяются security metadata. Private RLS table `feya_commerce_seo_metric_reader_contracts_v1` хранит fingerprints 17 рассмотренных объектов. Service role имеет только SELECT. Это migration manifest, не data warehouse и не keyword bank.

`feya_commerce_metric_reader_boundary_health_v1()` проверяет definitions/privileges/options и наличие новых незарегистрированных **direct views/materialized views**, а также новых функций с прямыми ссылками на raw metric tables. При изменении или отсутствии объекта возвращается null. В API перед будущей записью требуется точный contract `metric_reader_boundary_v1`; missing migration, schema drift, permission failure или network failure не разрешают импорт.

Этот health check не является универсальным анализатором произвольного dynamic SQL, нового application code или всех внешних integrations. Такие изменения требуют code review и отдельной source-context policy. Проверка не даёт права публикации страниц.

## Чтение новых observations

`searchStoredDemandAdapter.ts` подключён к существующему snapshot adapter:

- распознаёт atomic contract без изменения legacy branch;
- сохраняет original source_ref, region/language/network, capture date, period, ranges, bids/currency и monthly evidence;
- сопоставляет denormalized columns и fetched_at с сохранённым evidence;
- не преобразует потерявший точность numeric bigint ID в якобы корректную строку;
- возвращает `source_context_review_required`; статус `fresh_manual_import` не выдаёт atomic observation за проверенное;
- missing/malformed contract и расхождение полей остаются blockers.

Сохранение в DB не доказывает корректность targeting и не утверждает роли ключей. Отдельное source-context review ещё должно получить traceable evidence и recorded outcome; этого workflow данный checkpoint не изображает готовым. Старые keyword approvals не пересматриваются задним числом.

## Проверки и пределы доказательств

Локально: **441 SEO + 46 Search + 40 SQL = 527 PASS**, 6 native-only concurrency cases явно skipped. Новый reader suite содержит 9 SQL scenarios; новые adapter/health tests — 6 scenarios. Typecheck и build включены в проверку; итоговые remote run/commit/preview IDs фиксируются в draft PR #26.

Reader suite создаёт точные definitions 14 direct views и 3 functions, включая наблюдаемые ACL и security options. Входящие внешние business relations представлены **typed boundary fixtures** с captured columns. Это не полный restore их исходной бизнес-логики. Existing seven-table metric storage восстанавливается своим полным FK/constraint/index/generated-column fixture.

Проверены:

1. Компиляция всех direct views и неизменность baseline rows, columns, owner, ACL, security options.
2. Новое pending observation с более поздней датой и большим volume не меняет captured view results.
3. Manual updater берёт исторические 90 в синтетическом примере, не новые 999999; эти числа — test fixtures, не FEYA demand data.
4. Old promoter продолжает работать для legacy batch и игнорирует atomic batch.
5. Ready-view apply path не принимает atomic row даже при совпавших master/export joins.
6. Service-only health/manifest не расширяют public access; legacy function grants сохраняются.
7. Grants/options drift и новый direct reader закрывают health.
8. Несовпадение migration preflight останавливает замену, последующие изменения не затираются.
9. Adapter сохраняет provenance/IDs и удерживает неподтверждённые либо противоречивые observations.

В CI добавлен отдельный native PostgreSQL 17.6 `metric-readers` job. Все DB suites используют отдельные пустые loopback databases. CI и preview READY не заменяют authenticated runtime proof и не подтверждают всю логику 48 downstream views на production данных.

## Порядок rollout и rollback

| Порядок | Owner | Input → output / Definition of done | Blocker / rollback |
|---|---|---|---|
| 1. Isolated restore | GDAE + Engineering | Existing metric schema + atomic migration + reader migration; preflight, advisors, relation grants PASS | Production не использовать для тестовой записи. При drift получить актуальный capture и рассмотреть diff |
| 2. Runtime flow | CQA + Engineering | Authorized admin session → CSV dry-run → explicit import → retry → receipt → held source review | `METRIC_IMPORT_RUNTIME_VERIFIED=false` до проверки. Не выключать Auth для прохождения теста |
| 3. Source-context review | GDAE + OSPM | Подтверждённые source/target/period/capture → versioned review outcome | Source ref alone недостаточен; неизвестное остаётся hold; не копировать arbitrary score в Primary |
| 4. Inventory/page pilot | CPIM + OSPM | Текущий Product Truth, distinct designs, query clusters → несколько конкретных page briefs | Page creation/indexing требуют intent, inventory, unique value и ownership; один DNA axis не создаёт страницу |
| 5. Activation | Engineering + CQA | Reviewed DB migration order, both health contracts, Auth runtime proof, explicit storage flag | До этого write requests возвращают 423; indexing gate остаётся независимым |

`METRIC_IMPORT_CONSUMERS_READY=true` означает готовность реализованной boundary policy. Фактическую установленную DB migration проверяет health RPC. `METRIC_IMPORT_RUNTIME_VERIFIED=false` сохраняет закрытый write path даже при включённом environment flag. Это отдельный ранее открытый gate, не замена настоящей runtime проверки boolean-переключателем.

При rollback приложения закрыть storage flag и **сохранить SQL boundary**, если в canonical tables уже появились atomic observations. Возвращать старые неотфильтрованные definitions на populated data нельзя: это снова отдаст новые pending rows старым формулам. Receipts, evidence и stable IDs не удалять. Если сама migration не прошла preflight/postcondition, её транзакция откатывается целиком.

Источники технической проверки: [PostgreSQL CREATE VIEW](https://www.postgresql.org/docs/17/sql-createview.html), Supabase function/RLS/grant guidance и текущий changelog. Выводы о FEYA schema получены из SELECT metadata; никаких новых claims о Google volume, ranking или conversion не добавлено.

От владельца сейчас не требуется повторно подтверждать цены, Product Truth или дизайн. Следующий шаг — isolated Supabase/runtime flow и source-context review, затем page brief pilot. Если для этого понадобится невосстановимый исходный Google export, запрос должен содержать конкретные seeds и обязательный контекст, а не новый общий research brief.
