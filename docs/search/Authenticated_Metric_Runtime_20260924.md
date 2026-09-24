# FEYA — isolated authenticated metric runtime

Дата: 24 September 2026. Продолжение [Metric_Reader_Reconciliation_20260923.md](Metric_Reader_Reconciliation_20260923.md).

## Изменение

Добавлен воспроизводимый CI стенд: Supabase CLI **2.117.0**, настоящий PostgreSQL/Auth/PostgREST, production build Next.js и Chromium через pinned Playwright **1.63.0**. Cloud project не создаётся и не подключается. Production credentials не передаются. API/DB должны иметь loopback hostname и фиксированные local ports; existing public tables запрещены. После прогона удаляется только созданный стендом временный local project.

Восстановление использует ранее captured metric schema (7 tables), exact direct-reader definitions и typed fixtures для внешних бизнес-зависимостей. Это не полный restore всей FEYA schema. Настоящие Supabase роли создаёт сама платформа; тестовый helper их не заменяет.

`tests/runtime/metric-runtime.mjs` проверяет:

1. Восстановление schema и обеих metric migrations на local Supabase.
2. Schema-cache visibility двух service-only contracts через настоящий PostgREST.
3. Denial для anon/authenticated: private RPCs и receipts.
4. Настоящий browser login через существующий Next Server Action, signed cookies и owner ID allowlist.
5. Отказ постороннему пользователю, даже если он записал admin claims в user-editable metadata.
6. Существующую CSV форму → API → preview, zero writes, no fabricated save success.
7. Некорректный CSV и неполный source context без записей.
8. Atomic receipt, stable string IDs, same-key replay и conflict 409.
9. Failure injection в receipt → полный rollback → успешный retry.
10. Reader drift закрывает health; исторические approvals/IDs/metrics не меняются; robots остаётся закрытым.

Первый зелёный runtime прогон: commit `f4bfa09d58dcb6a311594a8759cbe2e1f6bdb36d`, [CI 35939007790](https://github.com/THEFEYA/feya-commerce/actions/runs/35939007790), **16/16 PASS**. Он отдельно доказал authenticated Next preview/423 и успешные service PostgREST writes, явно с `next_write_path_verified=false`. Browser screenshot просмотрен; новые сообщения читаемы, literal CSS classes сохранены.

Следующий проверяемый changeset устанавливает `METRIC_IMPORT_RUNTIME_VERIFIED=true` на основании local Auth/PostgREST proof и требует успешного полного Next write сценария в CI. Теперь runtime suite не содержит обходного service-only write пути: POST с действительной browser cookie → дополнительный claims/allowlist check внутри route → оба SQL health checks → RPC. При false compile-time gate suite завершается ошибкой, а не подменяет endpoint прямым RPC. API дополнительно проверяет неполный контекст → 422/zero writes и неизменность can_assign_primary/can_publish/can_index=false.

Это проверка release candidate в draft branch. Hosted activation требует отдельного `FEYA_METRIC_IMPORT_STORAGE_ENABLED=true`, обязательного Auth и установленных SQL migrations. Production SELECT на 24 September подтвердил отсутствие atomic import RPC и reader health RPC; production migrations/env flags не менялись. Отсутствующий SQL contract блокирует запись независимо от compile-time readiness.

`report.json` теперь берёт фактический checked-out commit через git, а GitHub event/merge SHA хранит отдельным полем. В первом отчёте поле commit содержало event SHA; artifact metadata и checkout связывают тот прогон с указанным head commit.

Local CLI security advisors выполняются отдельно и сохраняются как evidence. Findings на captured legacy views и typed boundary fixtures не объявляются production findings или зелёным release gate. Новые private contracts дополнительно проверяются реальными role-denial tests.

Первый реальный прогон восстановил schema и оба PostgREST contracts, затем выявил ошибку test config: отключение `auth.email.enable_signup` также выключило email login. Исправление ограничивает запрет регистраций глобальным `auth.enable_signup=false`; добавлен реальный отрицательный signup test. Production Auth не менялся.

## Исправление перехода после отказа во входе

Настоящий Chromium обнаружил: middleware возвращает правильный login error, но после Server Action redirect Next 15 сохраняет адрес защищённой страницы и показывает login внутри её shell. Данные защищённой страницы не отображались; это не подтверждённая утечка.

Теперь login Server Action проверяет тот же ID/email allowlist через общий `adminAccessDecision`, завершает только текущую неразрешённую сессию и возвращает пользователя прямо на login error. Middleware продолжает проверять каждое защищённое обращение, включая заранее созданную действительную сессию постороннего пользователя. Editable user metadata не участвует в решении. Пустой allowlist по-прежнему закрывает доступ.

## Обнаруженная несовместимость старого экрана

`/admin/seo-engine/keyword-metrics` ещё обращался к старому external-metrics status view и ожидал `accepted_rows/import_batch_id` в ответе API. После перехода API на preview это могло дать ложное сообщение «импорт готов» и undefined counts.

Исправлено:

- форма явно отправляет `dry_run:true`, CSV передаёт в общий серверный parser; отдельный упрощённый CSV parser убран;
- шаблоны содержат пустые неизвестные значения, без вымышленных volume/intent/fit scores;
- результат показывает проверенные/held rows, reasons и **Сохранено: 0**;
- status читает существующие canonical snapshots целиком с pagination, global distinct keywords не складываются повторно между sources;
- при ошибке следующей страницы не возвращается правдоподобная частичная сводка;
- сводка показывает историю наблюдений, не выдаёт среднее между разными периодами за текущий спрос;
- literal CSS class lists в форме и странице сохранены. Storefront, цены и паспорта агентов не менялись.

## Проверка и оставшиеся границы

Локально: Search 50/50, direct-reader SQL 9/9 и typecheck PASS. В этом workspace Docker отсутствует; реальный runtime выполняется отдельным GitHub CI job. Точный commit/run/status и проверенный screenshot фиксируются в PR #26 после прогона. До получения evidence runtime не считается пройденным.

Артефакты CI: `report.json`, `metric-preview.png`, build/runtime logs. Нет auth storage state, passwords, API keys или traces с session cookies. Данные синтетические; 0/90/77 — fixtures, не измерения спроса FEYA.

Hosted Supabase staging/schema parity, platform advisors, реальные deployed env/allowlist, source-context review и production activation остаются отдельными gates. Local runtime не подтверждает весь агентный граф, всю production business logic или готовность к индексации.

## Запуск и откат

CI job `Supabase Auth, PostgREST and browser` запускается на PR вместе с существующими проверками. Для локального запуска нужен Docker, Supabase CLI 2.117.0, locked npm dependencies и установленный Chromium:

```sh
npm ci
npx --no-install playwright install --with-deps chromium
node --experimental-strip-types tests/runtime/metric-runtime.mjs
```

Команда не использует `link`, `db push`, remote migrations или production credentials. При ошибке cleanup runner уничтожает временные контейнеры. Rollback приложения не удаляет SQL reader boundary/receipts из populated canonical storage.

Следующий owner-independent шаг после зелёного полного прогона — source-context review workflow и inventory/page pilot. Для production release нужен отдельный точный staging/activation пакет; текущий PR остаётся draft, indexing выключен.

Технические источники: [Supabase CI testing](https://supabase.com/docs/guides/deployment/ci/testing), [Supabase local config](https://supabase.com/docs/guides/local-development/cli/config), [Playwright CI](https://playwright.dev/docs/ci-intro), текущие Supabase changelog и CLI help.
