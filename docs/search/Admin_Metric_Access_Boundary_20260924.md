# FEYA — guarded admin reads and metric API permissions

24 September 2026. Продолжение [Legacy_Metric_Security_20260924.md](Legacy_Metric_Security_20260924.md). Scope: существующая админка и SELECT dependency closure двух metric tables. Production SELECT-only; изменения подготовлены в draft branch. Public indexing, production flags, business data и agent passports не менялись.

## Что изменено

`getAdminReadClient()` больше не возвращает anon client. Исторический `getSupabaseServiceClient()` сохранён как совместимое имя для session-guarded admin client: менять 41 frozen Product OS/storefront files не понадобилось. Три anon fallbacks в SEO brief loaders удалены; один raw service read в Company/System переведён на тот же guard. JSX, классы, порядок блоков, шрифты, цвета и цены не изменены; freeze manifest не переписан.

Каждый privileged HTTP fetch сначала проверяет действительную signed Supabase session и owner allowlist; отсутствие/ошибка/посторонний actor не вызывает DB transport. Используется существующая `adminAccessDecision`, user-editable metadata игнорируется. `React.cache` ограничивает повторную проверку рамками RSC request; глобального actor/session promise нет. Admin requests принудительно `cache:no-store`. Server-only module marker запрещает попадание privileged factories в client bundle. Internal agent executor остаётся отдельным: его существующие route-specific service credentials/authority gates не подменены browser session.

Middleware теперь возвращает **503** на `/admin` и `/api/admin` при false/missing `FEYA_ADMIN_AUTH_REQUIRED`; `/admin/login` доступен для восстановления настройки. Включённый Auth по-прежнему требует session/allowlist; flag=false больше не означает анонимную админку. Login всегда проверяет allowlist и завершает неразрешённую локальную сессию. Никакой production flag не переключался. Прежний необязательный режим просмотра намеренно выводится из нового candidate; старые deployment остаются отдельными до reviewed cutover.

## Точная SQL-граница

Read-only catalog capture: `tests/search-db/fixtures/observed-metric-closure-20260924.json`:

- **50 protected objects:** две raw metric tables + 48 direct/downstream views, включая Growth signals, admission и query proposals.
- Полная SELECT dependency closure: **80 actual view definitions / 38 table contracts**, один bound SQL helper `feya_commerce_slugify(text)`. Все владельцы postgres; все 38 tables с RLS, policies нет; user-defined column types отсутствуют.
- Оригинальный write fixture семи metric tables сохраняет свои constraints/indexes/triggers. Другие 31 таблица восстанавливаются с observed columns/defaults/generated values/checks/keys/internal FKs/RLS/grants. **16 external FKs, secondary indexes и non-core triggers не включены**: эта проверка доказывает SELECT/permissions compatibility, а не все исторические DML workflows или full database restore.

CLI-created migration: `20260924081403_keyword_metric_access_boundary_v1.sql`, генератор `scripts/build-metric-access-boundary.py`. Она требует healthy reader contract после atomic import, reader boundary и function search_path migrations. Сверяет owner/ACL/options/RLS всех 50 объектов и определения downstream views; неизвестное изменение отменяет транзакцию. Для 14 direct readers definitions уже покрыты существующим fingerprint health; для других 34 применяется parser-canonical comparison. Затем REVOKE ALL у PUBLIC/anon/authenticated на этих 50 объектах. Service grants, view bodies/OIDs, security_barrier, functions и бизнес-данные сохраняются.

Только 14 reviewed view ACL entries обновляются в старом reader manifest. Новый private `feya_commerce_seo_metric_access_contracts_v1` хранит 50 identities/fingerprints/metadata. Service-only invoker `feya_commerce_metric_access_boundary_health_v1()` проверяет фактическую closure, definition/ACL/owner/options/RLS, отказ публичным ролям и service SELECT. Новый downstream view/materialized view или grant drift даёт NULL. Это детектор drift для дальнейшего импорта, а не запрет администратору БД создавать новые объекты и не универсальный scanner dynamic SQL.

Next write route теперь требует **оба** reader/access health contracts. Reader-only installation, revoked public access drift или rollback permissions закрывает новые writes. SQLhealth проверяется при каждом save, но не заменяет release review всей БД и не обещает отсутствие concurrent DBA changes между запросами.

## Проверки

| Проверка | Что доказывает |
|---|---|
| Два transport unit scenarios | Anonymous/outsider/disabled/error не вызывают privileged transport для GET/POST/PATCH/DELETE; owner request не оставляет разрешение следующему actor; cache disabled |
| 80-view parity | Authorized rows до/после revoke совпадают; исключены только явные generated clock fields; все view definitions/OIDs/options сравниваются полностью |
| 100 SQL denials | SELECT на каждом из 50 объектов запрещён anon и authenticated; проверены и эффективные privileges |
| Storefront/approval | Public storefront projection читается; bank ID/77 score/90 metric/approved status не изменены |
| Drift | Direct grant, PUBLIC inheritance, new downstream view/materialized view закрывают access health |
| Preflight/rollback | Unknown security option блокирует migration; rollback восстанавливает прежние permissions, сохраняет reader isolation/data, держит access health NULL |
| Real runtime | Supabase/Auth/PostgREST/Next/Chromium; настоящие role denials, защищённые cluster/signal screens, CSV preview/save/retry/failure; false и missing Auth flags проверяются отдельными Next processes с existing owner cookie |
| Advisors | Требуется 0 definer-view findings на protected closure и 0 RLS-disabled на restored tables; остальная старая schema не объявляется безопасной |

Локально: **6/6 новых SQL scenarios**, **52/52 Search**, production build и UI contracts PASS. Полный SQL/native/runtime exact-head результат фиксируется в PR, чтобы не запускать новый кодовый релиз ради отметки о предыдущем. Новый CI matrix добавляет PostgreSQL 17 access-boundary job; runtime использует все 80 definitions вместо 17 typed stand-ins.

## Применение и откат

| Task / owner | Input → output | Validation / done | Blocker / rollback |
|---|---|---|---|
| Guarded admin candidate / Engineering | Existing helpers + signed allowlist → safe factories и locked unconfigured state | Существующие screens читают после login; outsider/flag-off denied; approved UI unchanged | Production account/flags не проверены этим isolated run; code revert только до DB cutover |
| Metric permission candidate / GDAE | Observed closure + three prior migrations → bounded revoke + manifest | 80-view service parity, 100 denials, reader/access health, isolated advisors | Любой schema drift → transactional rollback; не подменять captured metadata |
| Exact hosted cutover / Core + Engineering | Prepared code/schema + real Auth config → reviewed deployment evidence | Intended owner login/logout, caches, internal agents, representative Product/Growth screens; K12 scope complete | Production changes ещё не выполнены; сначала concrete preview/cutover review |
| Remaining API inventory / GDAE + Core | Broader advisor catalog + all admin/internal consumers → explicit allowed public data contract | Остальные views/RPC классифицированы; unauthorized read/write tests; no broad grants | Этот 50-object patch не закрывает всю legacy DB; indexing stays off |

Rollback artifact: `tests/search-db/fixtures/rollback-metric-access-boundary.sql`. Требует точного healthy hardened state. Он восстанавливает captured role grants на 50 объектах и ACL entries старого reader manifest, **оставляет** новый manifest/RPC и делает access health NULL. Не удаляет evidence/receipts и не снимает `demand_observation_key IS NULL`. Такой rollback вновь открывает старый доступ, поэтому это reviewed emergency/rehearsal artifact, а не автоматическое действие при ошибке. Forward recovery требует следующей reviewed migration; повторный запуск уже применённого CREATE TABLE artifact не является recovery strategy. В production сейчас нечего откатывать.

## Статус запуска и следующий шаг

K12 остаётся **FAIL для production release**, даже если isolated scope полностью зелёный. Остальная DB API surface, реальные production Auth settings/owner account и exact hosted cutover требуют отдельного подтверждения фактами. Source-context review и inventory/intent pilot могут продолжаться read-only; автоматическая публикация/назначение Primary/индексация не включены.

От владельца сейчас не нужны исследования, CSV или повторное подтверждение Product Truth. Следующая работа — сверить оставшийся admin/internal API surface и готовить read-only demand/inventory pilot. Конкретные недостающие подключения или бизнес-решения будут запрошены только после проверки уже имеющихся данных.

Технические источники проверены 24 September: [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/nextjs), [RLS/views](https://supabase.com/docs/guides/database/postgres/row-level-security), [definer view advisor](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), текущий changelog (relevant breaking changes не найдено). FEYA canon и authority остаются бизнес-источником истины.
