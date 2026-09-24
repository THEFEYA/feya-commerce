# FEYA — First implementation sprint


Актуальное продолжение 24 September: [Google_Ads_Atomic_Adapter_20260924.md](Google_Ads_Atomic_Adapter_20260924.md) — существующий atomic RPC расширен Google API evidence contract, явный targeting/period/selection, immutable first-capture receipt и атомарные fetch statuses. Migration8 unapplied; exact-head proof фиксируется в PR. Live Google и production activation отдельно; следующий этап — inventory/page pilot.

Дата: 23 сентября 2026. Результат: foundation и выборочная Product/SEO integration, проверенные локально. Подробности следующего прохода — Product_Growth_Integration_20260923.md. Production indexing остаётся закрытой. Полная интеграция Product OS / Growth OS и pre-index gate ещё не завершены.

## Продолжение: isolated storage integration

Следующий завершённый implementation package: [Internal_View_Access_Extension_20260924.md](Internal_View_Access_Extension_20260924.md) — семь дополнительных внутренних views, охват 50→57, строгий v2 marker и fixture restore 84 views/39 tables. Migration7 unapplied; exact-head proof фиксируется в PR. Следующий dependency — Google Ads evidence adapter, затем inventory/page pilot. Owner input пока не нужен.

Актуальное продолжение 24 September: [Internal_API_Boundary_20260924.md](Internal_API_Boundary_20260924.md) — аудит 10 internal endpoints, 8 RPC, 16 relations и 28 capability records; общий закрытый token guard и строгий dryRun. GET не может запускать metric write. Legacy Google Ads atomic adapter и четыре view families остаются release blockers; новые owner inputs пока не нужны.

Новый checkpoint — [Atomic_Draft_Save_20260923.md](Atomic_Draft_Save_20260923.md): восстановление 14-table dependency schema, единая current-policy validation для resave/save, атомарный draft+event+receipt и отдельный native PostgreSQL CI. Ниже сохранены исходные результаты foundation; новые результаты и deployment dependencies описаны в checkpoint. Production migration и indexing не выполнялись.

## Продолжение: demand evidence bridge

Следующий checkpoint — [Demand_Evidence_Bridge_20260923.md](Demand_Evidence_Bridge_20260923.md): read-only audit 168 snapshots и 15 exact seed matches из существующего keyword bank, общий CSV parser, сохранение range/null/zero/provenance, блокировка конфликтующих наблюдений и отказ от автоматических SEO-баллов/Primary. Экраны CSV и scoring используют новый review contract. Persistent atomic import ещё не включён; Auth/browser/PostgREST gate остаётся открытым. Ниже исторические counts исходного sprint, актуальные результаты — в checkpoint и PR.

## Продолжение: atomic metric storage

[Atomic_Metric_Import_20260923.md](Atomic_Metric_Import_20260923.md): атомарный staging + snapshot + receipt на существующих таблицах, проверка 7-table dependency schema, сохранение zero/range/currency/capture и отдельный concurrency CI suite. Migration не применена, write activation закрыта: выявлены 17 legacy SQL readers, которые необходимо согласовать с новым context gate. Это следующий prerequisite перед включением импорта, а не отмена исторических approvals.

## Продолжение: metric reader reconciliation

[Metric_Reader_Reconciliation_20260923.md](Metric_Reader_Reconciliation_20260923.md): совместимая изоляция atomic observations в 17 direct SQL paths, 23 predicates до legacy selection/scoring, сохранение ACL/security_barrier и fingerprint health. Новый snapshot adapter сохраняет evidence и удерживает source-context review. SQL migration подготовлена и проверяется в isolated CI; production не менялась. Следующие gates — Supabase staging/advisors и authenticated runtime, затем context review и inventory/page pilot.

## Продолжение: authenticated runtime

[Authenticated_Metric_Runtime_20260924.md](Authenticated_Metric_Runtime_20260924.md): временный Supabase Auth/PostgREST + Next/Chromium в CI, проверка настоящего admin login, CSV preview и атомарного хранения; исправление устаревшего контракта формы/сводки с сохранением визуальных классов. Hosted staging и production activation остаются отдельными gates; фактический runtime статус фиксируется в PR.

## Что реализовано

Продолжение после function hardening: [Admin_Metric_Access_Boundary_20260924.md](Admin_Metric_Access_Boundary_20260924.md). Guarded server admin clients без anon fallback; false/missing Auth теперь закрывает routes. Полная SELECT closure 80 views/38 tables; шестая unapplied migration закрывает 50 metric objects и вводит access drift health. Public storefront и 41 frozen file сохранены. Следующий production prerequisite — оставшийся DB API surface и hosted cutover; read-only demand/inventory pilot не требует новых исследований владельца.

Последний dependency checkpoint: [Legacy_Metric_Security_20260924.md](Legacy_Metric_Security_20260924.md). Live read-only сверка 50 relations / четырёх функций / восьми RPC callers; подготовлена пятая unapplied migration — trusted search_path для четырёх функций с guarded rollback и семью SQL scenarios. K12 остаётся FAIL до закрытия legacy view surface; следующий шаг — server-only admin read contract и полный dependency restore перед ACL migration. Owner input сейчас не нужен. Ниже исторические foundation counts относятся к исходному checkpoint, свежие run/commit результаты находятся в PR.

| Блок | Реальный результат | Граница |
|---|---|---|
| Baseline | Isolated branch from owner-ui-v1 `928d8df…`; exact branch comparison in branch-compatibility.json | Product branch `c28e112…` не слит вслепую; отличия не потеряны |
| Portfolio policy | Intent/ownership/family/inventory/truth checks, distinct design count, parent-cycle detection | Advisory: всегда can_publish=false и can_index=false |
| Demand evidence | Source/targeting/date/volume/range/bid validation; null и zero различаются; Ads competition не SEO difficulty | Подготовлен модуль, подключение к legacy importer/scorer — следующий этап; прошлые approvals не переписаны |
| Environment gate | Preview/local deployment не откроется из-за inherited indexing flag; explicit canonical-origin confirmation | Unified per-page release manifest ещё не реализован |
| Sitemap | Полное paginated чтение, no implicit Home, no operational lastmod, явные ошибки источника/дубликатов | Current safe view пока остаётся источником; immutable manifest будет следующим источником |
| Database | Additive 5-table migration, FK/RLS/grants, immutable versions и atomic membership snapshots | Только файл и локальная PostgreSQL simulation, production migration не применена |
| Reproducible audit | Read-only export 243 candidate pages; 0 clusters / 0 owners; offline replay report | Не переоценивает live Product Truth и не отменяет item-specific approvals |
| Deliverables | Full A–K architecture, executable schema + mapping, exact 8 seed batches, this sprint | No fabricated metrics / no auto-generated landing pages |
| CI | PR checks теперь применимы к owner-ui target, npm ci lockfile, policy + SQL tests | Remote CI/deployment — отдельный результат после push |

## Локальная проверка

- `npm run test:search`: 21 PASS, 0 FAIL.
- `npm run test:search-db`: 10 PASS, 0 FAIL; PGlite / actual PostgreSQL semantics, minimal observed-parent fixture.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; существующие warnings в owner UI остаются, их исправление не включено в этот scope.
- `check:admin-boundary`, `check:product-os-freeze`, `check:owner-ui`: PASS в build.
- Product OS freeze: 41 защищённый файл и зафиксированный CSS prefix без изменения. Manifest не переписан для обхода проверки.
- `scripts/audit-search-portfolio.ts`: 243 structural holds из-за отсутствия новых page specs; ownership registry пуст. Это пробел подготовки search layer, не 243 новых продуктовых блокера.

Tests include: inherited preview flag; missing/invalid canonical host; duplicate IDs/paths; API pagination cap and failure; candidate exclusion; wrong source/market and stale demand; zero/null/range semantics; duplicate product/design depth; stale truth; current ownership overlap and half-open periods; immutable SQL evidence; incomplete snapshot commit; FK mismatch; public/private grants.

Сборка проверялась без production Supabase secrets. Она не доказывает успешное подключение каждого admin route к live database. PGlite не заменяет Supabase staging restore, concurrent transaction tests, реальный browser crawl, SQL migration advisor или полный агентный E2E. Legacy tests/seo восстановлены из Product branch и согласованы с versioned editorial и offer contracts: 437 PASS. Вместе с search и SQL — 468 PASS. Три live RPC snapshots проверены без изменения исходных ID и цен. Read-only schema preflight подтверждает UUID keys и отсутствие конфликтов имён; полноценный staging gate ещё открыт.

## Следующие зависимости

| Шаг | Owner | Input → output | Validation / Done | Blocker / rollback |
|---|---|---|---|---|
| 1. Reconcile Product branch — выполнена nonvisual часть | Engineering + CPIM | branch-compatibility.json, current owner corrections/RPC callers → selective nonvisual integration | Product fixtures, exact approval/price/config parity; no silent overwrite | Если меняется защищённый UI, подготовить отдельный точный diff; revert changeset |
| 2. Staging migration | GDAE | Existing schema restore + SQL → private foundation tables | Full schema drift/FK/default privileges/RLS checks and previous app reads | Need isolated DB, not production shortcut; keep dormant tables on rollback |
| 3. Inventory/brief pilot | CPIM + OSPM | Current truth v4 + confirmed selection rule → a few candidate briefs/snapshots | Unknown excluded, designs deduped, inventory policy approved, owner reserved | Missing truth/intent → hold; stable IDs retained |
| 4. Demand bridge | GDAE + OSPM | Reuse existing metrics, then Q01–Q03 export → traceable normalized snapshots | Idempotent CSV/API ingest, actual targeting/period, null handling | API access can remain unavailable; CSV fallback; rollback staging run |
| 5. Shared release and crawl | TSEO + Core | Specs/versions/ownership → manifest + unified metadata/render/sitemap/schema; pagination | Failure injection, representative live crawl, no preview leak | Do not turn indexing on before this; previous manifest/deployment rollback |
| 6. Full pre-index review | CQA + TSEO + Owner authority | Exact deployment and policies → K01–K18 evidence | Every binary gate PASS | Business/domain/source decisions when concrete; keep indexing disabled |

## Что потребуется от владельца

Для подготовки foundation ничего дополнительно не требуется. Следующие подключения/решения запрашиваются предметно, когда без них нельзя завершить конкретный этап:

- Для нового demand evidence: один исходный Google Keyword Planner CSV по готовым пакетам, если существующий доступ/API всё ещё не позволяет получить metrics. Сейчас batch подготовлен, запросы не отправлены.
- Перед production release: окончательный canonical domain; утверждённые return terms и реальный способ заказа, если эти вопросы ещё не закрыты актуальным решением.
- Для measurement activation: доступ/ownership к production GA4 и GSC, а затем выбранный consent/commerce contract. Не нужен новый общий SEO research report.

Не просить владельца повторно вводить уже подтверждённые Product Truth/цены/материалы. Сначала читать актуальные records и историю решений. Массовая новая генерация текстов, переключение индексации и production migration не являются частью этого подготовительного прохода.

## Review / rollback

Reviewable scope: новые policy modules/tests/docs, environment/sitemap hardening, private migration file, CI/lockfile. Не изменены storefront JSX, шрифты, цвета, prices, protected UI files, generation approvals или agent passports.

Следующая единица работы — staging validation и authenticated runtime scenarios; protected visual deltas перечислены в integration checkpoint. До её окончания branch является foundation draft, а не replacement текущего live deployment. Откат кода — revert draft changeset; production DB/environment не менялись, откатывать их в этом проходе не требуется.
