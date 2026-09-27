# FEYA — atomic review draft storage checkpoint

Дата: 23 сентября 2026. Продолжение Search Architecture v1, sprint J2/J3. Изменения подготовлены в draft PR #26; production schema, цены, approvals и индексация не изменялись.

## Найденные расхождения и решение

| Наблюдение в коде / данных | Исправление | Граница полномочий |
|---|---|---|
| Draft и `draft_created` event записывались двумя независимыми PostgREST inserts. Ошибка второго оставляла draft без события | Одна SQL RPC-транзакция вставляет draft, event и receipt; ошибка любого шага отменяет все три записи | Service-only `SECURITY INVOKER`, без повышения привилегий |
| Повторный HTTP request мог создать ещё один draft | Уникальный request key, transaction advisory lock, SHA-256 исходного JSONB payload; replay возвращает существующие draft/event IDs | Изменение данных с тем же explicit key → 409; не перезапись |
| Explicit resave preview мог валидироваться как legacy, а save принудительно требовал текущую editorial policy | Оба маршрута stamp `brand_mission_v2` и вызывают один `validateSeoReviewDraft` | Обычный read-only preview не нормализует старую запись и не пересматривает утверждение |
| Preview сохранял часть старого validation snapshot и не проверял storage blockers целиком | Preview получает новый полный validation result; `resave_ready` и `ready_for_storage` учитывают storage blockers | Отсутствие keyword evidence не превращается в разрешение save/approve/publish |
| Health endpoint указывал на отсутствующие legacy SQL/handoff файлы | Ссылка на реальную новую миграцию и этот документ; health проверяет версию atomic RPC | При отсутствующей миграции запись блокируется; fallback к двум inserts отсутствует |

Никакой новый Growth approval engine не создан. Запись в legacy draft event log описывает создание review artifact; она не заменяет Growth execution request, change event, CQA или owner authority. Паспорта агентов не изменены.

## Контракт хранения

Миграция `supabase/migrations/20260923223420_seo_draft_atomic_save_v1.sql` создана через Supabase CLI. Зависимости — существующие `feya_commerce_seo_pack_drafts_v1` и `feya_commerce_seo_pack_draft_events_v1`. Старые таблицы и строки не изменяются. Добавлены:

- `feya_commerce_seo_draft_save_receipts_v1`: private append-only для service role; request key PK, payload hash, unique FK draft/event, время. RLS включён, anon/authenticated/PUBLIC без grants.
- `feya_commerce_save_seo_review_draft_v1(text,jsonb)`: один атомарный save, explicit список разрешённых полей, только review statuses, not_reviewed, passing validation и текущая policy; assembled pack должен оставаться непубликуемым.
- `feya_commerce_seo_draft_save_contract_v1()`: service-only read-only readiness marker.

Новые UUID выдаёт существующая БД. Replay возвращает те же UUID. Если draft позже утверждён обычным разрешённым процессом, retry исходного save возвращает текущее состояние записи и не сбрасывает approval.

Существующий UI не требует новых полей. Без `Idempotency-Key` сервер хеширует весь построенный JSON payload с сортировкой object keys. Это дедупликация одинаковой ревизии, а не вечная уникальность текста: изменившиеся Product Truth, keywords или validation evidence дают другую ревизию. С explicit key (8–200 разрешённых ASCII символов) identity привязана к product ID; изменение payload под тем же key отклоняется. Повторная нормализация проверена на стабильность. Клиент не передаёт hash БД и не может заменить им содержимое.

Старые scripts/routes, которые пишут в legacy draft tables напрямую, этой RPC не переписаны. Утверждение «все записи всей системы атомарны» не делается. Перед интеграцией других writers им нужен отдельный контракт/аудит. Receipt предотвращает удаление связанного нового draft/event через FK; штатное архивирование остаётся доступным. При действующей retention/purge задаче необходимо сначала согласовать сохранение provenance, не удалять receipt для обхода FK.

## Доказательства и ограничения проверки

**Наблюдаемая структура, не полный backup.** Read-only SQL получил FK closure из 14 таблиц: canonical products/pages, legacy draft/event/brief queue, Growth executions/change events/cases/incidents, source dependencies и auth.users structure. Зафиксированы 300 columns, constraints, indexes, RLS, grants, triggers, supporting function и две legacy review views. Пользователи, пароли, сессии и customer rows не копировались. Файл `observed-schema-20260923.json` содержит DDL metadata. Capture query воспроизводится из `scripts/capture-search-dependencies.sql`; SQL function bodies просмотрены перед восстановлением.

Восстановление воспроизводит широкие observed default privileges до запуска миграций. Это проверяет, что явные REVOKE действительно закрывают новые объекты, а не случайно проходят на более строгой пустой базе. Existing review views сохраняют observed service-only ACL. Все новые receipt/FK индексы покрыты PK/unique indexes.

**Реальный исторический пример.** Один сохранённый approved draft прочитан без изменения БД и закреплён как regression fixture. Исторический текст, ID, validation snapshot и approval сохраняются побайтно по JSON-содержимому. Его перенос в explicit current-policy resave не наследует старое разрешение: новый результат может быть blocked.

**Синтетический успешный сценарий.** Copy fixture из существующего regression test адаптирован только внутри tests; source evidence и gate inputs обозначены synthetic. В нём нет нового оценочного search volume/competition. Выполняются настоящие normalizer, structural/commercial/keyword validators, assembler, payload builder, production RPC caller, SQL body, latest view и preview mapper. OpenAI не вызывается. SQL transport adapter не выдаётся за реальный Supabase HTTP endpoint.

| Проверка | Локальный результат |
|---|---|
| SEO regressions, включая current/legacy policy и stable retry identity | 441 PASS |
| Search policy simulations | 21 PASS |
| SQL tests: minimal parents + observed dependencies | 18 PASS; 3 concurrency cases пропускаются в PGlite |
| Native concurrent transactions | Отдельный обязательный CI job `Isolated PostgreSQL 17 integration`; результаты смотреть у точного PR commit |
| Typecheck / Next production build / admin + visual contracts | Проверяются перед push; build сохраняет существующие warnings |

CI service использует PostgreSQL 17.6, как прочитанная production major/minor version, пустую loopback DB `feya_test`, synthetic rows и ephemeral test-only password. Нет Supabase production URL/credentials. Runner отказывается работать с другой host/database или непустой схемой. Native job повторяет 8 integration cases и добавляет 3 проверки: восемь одновременных одинаковых saves дают одну пару draft/event; два разных payload с одним key дают одного победителя; два конкурентных page versions одного номера дают одну immutable version.

Это **не** полный Supabase staging restore и **не** browser → authenticated Next route → PostgREST E2E. Supabase Auth session, owner allowlist, PostgREST schema cache, фактические deployed env и полный frontend runtime остаются отдельными gates. Vercel SSO protection не отключается ради проверки. Пропущенные locally concurrency cases считаются закрытыми только после зелёного native CI job.

## Read-only security observations

Live advisor возвращает широкие legacy findings вне новых таблиц. Их нельзя автоматически исправлять массовой сменой grants/RLS: это способно сломать действующие admins и RPC. Данный проход проверяет конкретный dependency scope и новые объекты. RLS enabled/no policy у service-only tables может быть намеренным. Default-definer review views оценены вместе с их service-only ACL, а не по названию warning. Общесистемный auth/API exposure review остаётся pre-index blocker; blanket «security PASS» не выдан.

Primary references для дальнейшего review: [Supabase functions и execute privileges](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL transaction advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html), [RLS without policy advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [view security advisor](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [function search path advisor](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [RLS disabled advisor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

## Deployment sequence / definition of done

| Шаг | Owner | Input → output | Validation / DoD | Blocker / rollback |
|---|---|---|---|---|
| 1. Isolated DB integration | Engineering + GDAE | Captured reviewed schema + two migration files → private test schema | Local suite + native CI на точном commit, failures/roles/concurrency pass | Любой fail: исправить draft branch; production не участвует |
| 2. Supabase staging runtime | GDAE + TSEO | Staging schema parity, Auth/allowlist, service-only env → deployed review flow | Anonymous/unauthorized denied; owner can read historical; dry_run no writes; save + replay produce one draft/event; injected failure rolls back | Нет изолированного Supabase/Auth runtime: gate OPEN. Не использовать production как стенд |
| 3. Migration rollout preparation | GDAE + Core | Exact migration hash, preflight, backup/restore plan, current schema diff → reviewed release package | No incompatible drift; old app reads work; flag OFF; canonical ID parity | При lock timeout/failure транзакция rollback; не ремонтировать constraints обходом |
| 4. Apply reviewed migration, then compatible app | Release authority | Staged package → health marker visible + deployed atomic route | PostgREST cache exposes exact RPC; health passes; flag remains OFF until runtime smoke | Не deploy merged save route без migration: он намеренно откажет в записи |
| 5. Enable review storage only | Existing operational authority | Passing auth/runtime/validation checks → review saves | Current policy, immutable historical approvals, expected IDs/events, no publish/index switch | Disable FEYA_SEO_DRAFT_STORAGE_ENABLED first; retain receipt/evidence tables |

Production rollout этим checkpoint не выполнялся. Откат приложения — на совместимую проверенную версию с storage flag OFF. Нельзя восстанавливать live запись двумя inserts как fallback. Пополненные receipts не удалять: retain dormant, сохранить provenance. Search foundation migration отдельно остаётся подготовительной и не создаёт public release pointer.

## Что дальше

Следующая независимая работа — мост существующего keyword CSV/import/scoring к demand evidence и page ownership: сначала переиспользовать уже сохранённые данные, отделить measured от placeholders, проверить повторный импорт и разбор null/zero. Затем несколько inventory/page briefs, единый release manifest и authenticated crawl. Глобальная индексация остаётся закрытой до полного K-gate.

От владельца сейчас не нужны новые исследования или повторное подтверждение Product Truth. Если после разбора существующих metrics останется конкретный пробел, запросить точный Keyword Planner batch из готовой очереди, а не общий новый SEO report. Доступ к staging/Auth или business decisions запросить только на соответствующем незаменимом этапе с конкретным проверяемым результатом.
