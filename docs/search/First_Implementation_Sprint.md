# FEYA — First implementation sprint

Дата: 23 сентября 2026. Результат: foundation и выборочная Product/SEO integration, проверенные локально. Подробности следующего прохода — Product_Growth_Integration_20260923.md. Production indexing остаётся закрытой. Полная интеграция Product OS / Growth OS и pre-index gate ещё не завершены.

## Продолжение: isolated storage integration

Новый checkpoint — [Atomic_Draft_Save_20260923.md](Atomic_Draft_Save_20260923.md): восстановление 14-table dependency schema, единая current-policy validation для resave/save, атомарный draft+event+receipt и отдельный native PostgreSQL CI. Ниже сохранены исходные результаты foundation; новые результаты и deployment dependencies описаны в checkpoint. Production migration и indexing не выполнялись.

## Продолжение: demand evidence bridge

Следующий checkpoint — [Demand_Evidence_Bridge_20260923.md](Demand_Evidence_Bridge_20260923.md): read-only audit 168 snapshots и 15 exact seed matches из существующего keyword bank, общий CSV parser, сохранение range/null/zero/provenance, блокировка конфликтующих наблюдений и отказ от автоматических SEO-баллов/Primary. Экраны CSV и scoring используют новый review contract. Persistent atomic import ещё не включён; Auth/browser/PostgREST gate остаётся открытым. Ниже исторические counts исходного sprint, актуальные результаты — в checkpoint и PR.

## Что реализовано

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
