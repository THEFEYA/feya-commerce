# FEYA — Demand evidence bridge, 23 September 2026

## Результат и граница

Существующие экраны CSV metrics и Scoring preview подключены к общей проверке доказательств спроса. Нормализация больше не придумывает регион, язык, дату получения и период; рекламная конкуренция не превращается в сложность SEO. Подготовлен read-only адаптер существующих snapshots и keyword bank к решениям Page Portfolio.

Это checkpoint подготовки, не разрешение на production launch. Запись импортируемых метрик, публикация страниц, назначение Primary и индексация не включены. Production Supabase использовался только для SELECT. Существующие approvals, цены, Product Truth, паспорта агентов и storefront не изменены.

## A. Что реально найдено

Источник наблюдений: `demand-audit-input-20260923.json`, captured SELECT at `2026-09-23T22:52:14.714435+00:00`; время policy replay — `2026-09-23T23:00:00Z`. Это snapshot состояния, не обещание неизменности live database.

| Объект | Измеренное состояние | Следствие |
|---|---|---|
| `seo_keyword_bank_v1` | 9,613 rows; 4,834 `approved_draft`, 3,474 `hold`, 1,305 `reject` | Исторические решения сохраняются. `approved_draft` не означает разрешение создавать индексируемую страницу |
| `feya_commerce_seo_keyword_metric_snapshots_v1` | 168 rows: 150 API placeholders, 18 CSV observations | Заготовки с `api_not_connected` и пустым fetched_at не считать измерениями |
| CSV snapshots | Импортированы 8 July 2026; 18/18 без column-level currency/target hash | Из сохранённого raw payload восстановлены UAH для 18/18 и явно записанный период Jun 2025–May 2026 для 14/18 |
| Четыре CSV snapshots | IDs 159–162 без записанного периода | Период остаётся неизвестным; соседние записи не являются доказательством |
| Existing staging | 18 `promoted_to_snapshots`, 14 `error` | Сохранять этот путь хранения; разбирать ошибки отдельно от нового импорта |
| Research Queue v1 | 80 seeds / 8 batches; 15 exact normalized matches в keyword bank | Сохранены source refs и UUID найденных строк. Новые дубликаты keyword core не нужны |
| Старый import endpoint | Ссылался на отсутствующие `feya_keyword_import_batches_v1` и `feya_keyword_metrics_v1` | Заменён явным dry-run для существующего staging; write request возвращает 423 |

Ноль пригодных текущих наблюдений в replay относится к 168 snapshots + 15 exact seed matches, **не ко всем 9,613 строкам bank**. В этой выборке отсутствуют подтверждённые network/capture context; даты старые либо метрик нет. Суммарный спрос не вычислялся. Close variants и связанные фразы нельзя автоматически складывать.

Записанная валюта UAH не доказывает украинский рынок. Import timestamp не доказывает дату получения исходных метрик. Статус `fresh_manual_import`, сохранённый в июле, не делает запись свежей в сентябре.

## B. Совместимость с действующей системой

| Слой | Существующий источник / экран | Теперь | Следующий контракт |
|---|---|---|---|
| Исходный файл | `/admin/seo-engine/metric-import` | Общий CSV/TSV parser, hash decoded source text, сохранение raw metadata, ошибки и конфликты | Отдельная подтверждённая запись targeting/capture context с evidence reference |
| Проверка | `/admin/seo-engine/scoring/preview` | Проверка provenance и completeness; score null, role hold; экспорт reviewed CSV | Ручное решение об интенте и inventory на уровне cluster/page |
| Staging | `feya_commerce_seo_keyword_metric_import_staging_v1` | Dry-run payload proposal, writes_performed=0 | Atomic batch + receipt + deduplication + rollback на существующих таблицах |
| Метрики | `feya_commerce_seo_keyword_metric_snapshots_v1` | Read-only recovery явных raw полей; исходные IDs сохраняются | Reviewed promotion сохраняет range, currency, network, period и capture provenance |
| Keyword identity | `feya_commerce_seo_keyword_master_v1`, `seo_keyword_bank_v1` | Exact normalized matching; bank UUID сохраняется | Связать snapshot IDs с cluster evidence без нового keyword core |
| Исторические коммерческие метрики | `feya_commerce_seo_commercial_keyword_metrics_v1` | Сохраняются; не названы доказательствами текущего спроса автоматически | Отдельный адаптер после проверки их provenance |
| Page decision | `buildDemandDecisionBrief` + portfolio ownership policy | Stable page/cluster IDs; ровно один scoped current owner; максимум `ready_for_intent_inventory_review` | Достаточность distinct designs, Product Truth, unique value, intent и release manifest |

Новый stricter demand review не переоценивает старые генерации задним числом. Legacy `hasTrustedSeoMetricSnapshot` не переписан в этом changeset. Его consumers требуют отдельного согласования перед включением общего release manifest. Историческая scoring formula на справочных страницах остаётся справочной; импортированный CSV её больше не использует.

## C. Нормализация и решения

- `0`, missing, диапазон и ошибочное число различаются. `1,000` в integer volume читается как 1000; неоднозначная decimal comma блокируется без явного формата. Валюта не удаляется из числа для получения искусственного значения.
- Диапазон хранит обе границы; midpoint не вычисляется. Monthly history извлекается из фактических headers, не из зашитого года. Нули и пустые месяцы сохраняются.
- Поддерживаются comma/tab/semicolon, BOM, UTF-16LE/BE через существующие file inputs, quoted multiline cells. Неверные quotes, duplicate headers и несовпадение числа columns не исправляются молча.
- Исходные raw values, source refs, существующие IDs и monthly metadata проходят CSV roundtrip. SHA-256 здесь относится к декодированному тексту, **не к исходным бинарным байтам файла**; hash даёт идентичность файла, но не доказывает достоверность его содержимого.
- Один context/phrase/source повторно не увеличивает число usable observations. Противоречащие значения одного observation identity блокируют все затронутые строки.
- Policy target `US / en / GOOGLE_SEARCH` — контекст текущей очереди, не автоматически присвоенные свойства файла. Другой target требует отдельного явно выбранного context, а не переписывания импортируемых данных.
- `60 days` для capture freshness и `60 + 31 days` для окончания периода — консервативная FEYA review policy v1. Это **не правила Google и не ranking thresholds**. Старый период нельзя освежить сегодняшним import timestamp.
- Bids и advertising competition остаются наблюдениями Ads. Ни CPC, ни competition index, ни слово `festival` в notes не создают organic difficulty, conversion likelihood или trend score.
- Даже complete evidence не создаёт страницу. Нужны intent, confirmed selection logic, достаточный eligible inventory, unique value и query ownership. Advisory output всегда `can_publish=false`, `can_index=false`.

## D. API и storage boundary

`POST /api/admin/seo-engine/keyword-metrics/import` принимает `csv_text` **или** `rows` и optional explicit `context`; maximum 2 MB / 5,000 rows. По умолчанию это review preview. `dry_run:false` возвращает HTTP 423 `storage_bridge_not_enabled`; прежней записи в отсутствующие таблицы нет.

Dry-run возвращает причины hold, source content hash, stable evidence keys, replay identity и предложения для существующего staging. Повторный dry-run с теми же наблюдениями даёт ту же identity. Это **не доказательство durable idempotent DB ingestion**: transaction, unique constraint, receipt, retries и rollback для нового импорта ещё предстоит реализовать и проверить в isolated database. Предложения нельзя направить в legacy promotion без нового контракта: range/context metadata должны сохраниться до snapshots.

Обнаруженный отдельный риск Google Ads API: фактический request targeting берётся из environment, а записываемые geo/language могут приходить из batch defaults; target hash не заполнен. До активации API требуется связать response с точным request context, сетью, валютой аккаунта, периодом и returned keyword/close variants. В этом проходе API не вызывался, его credentials и environment не менялись.

## E. Проверки и оставшиеся gates

Локально: Search 40/40, SEO 441/441, SQL 18 PASS + 3 native-only SKIP. Typecheck/build прошли; итоговые GitHub CI и preview проверяются на commit этого checkpoint и записываются в PR. Native PostgreSQL CI остаётся отдельным job, не подменяется PGlite.

Новые сценарии проверяют числа/ranges, malformed CSV, unknown context, даты, валюту, повторные observations, конфликт, roundtrip, сохранение исторических IDs и запрет обхода ownership. Source audit воспроизводится:

```sh
node --experimental-strip-types scripts/audit-search-demand.ts
npm run test:search
```

Class lists обоих изменённых CSV компонентов совпадают с прежними; storefront/styles/fonts/prices не менялись, Product OS freeze и Owner UI checks проходят. Это structural preservation check, не pixel comparison.

Browser verification в этой среде не выполнена: agent-browser browser download завершился TLS certificate error; штатный Playwright download вернул невалидный archive. Защита TLS и Auth не отключались. Authenticated browser → API → PostgREST → DB E2E остаётся открытым gate. Сборка и pure tests его не заменяют.

## F. Следующая зависимость, владельцы и rollback

| Порядок | Owner | Input → output | Validation / Definition of done | Blocker / rollback |
|---|---|---|---|---|
| 1 | GDAE + Engineering | Observed existing staging/snapshot schema + demand bridge → additive atomic import contract | One source/context identity; retry no duplicates; partial failures roll back; null/range/context preserved; isolated PostgreSQL tests | Сначала проверка полных constraints/triggers. Production не используется как тест. Revert code; dormant additive schema оставить до отдельной review |
| 2 | CPIM + OSPM | Existing truth + exact matched keywords → few page briefs | Stable IDs, distinct designs, explicit inventory eligibility, one owner per scoped cluster, unresolved evidence marked hold | Missing truth/intent → hold, не дублировать страницы |
| 3 | GDAE + OSPM | Original exports/context recovery → только недостающие decision-changing metrics | Q01–Q03 first; request market/language/network/period captured; no volume invented | Если исходные файлы нельзя восстановить, запросить точный CSV у владельца. Не нужен общий новый research report |
| 4 | CQA + TSEO | Exact preview + authorized Auth session + isolated storage → E2E evidence | Upload → normalize → review → atomic ingest → decision brief; no publication/indexing side effects | Browser/Auth environment required. Keep pre-index gate closed |

Паспорта GDAE/OSPM/CPIM/CQA/TSEO не переопределяются: в этом checkpoint нет новых прав публикации и нет automation, отменяющей human authority. Нет запросов к владельцу сейчас: сначала завершаются importer contract и inventory briefs. Production indexing, migration и merge не выполняются этим checkpoint.
