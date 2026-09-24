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

При `METRIC_IMPORT_RUNTIME_VERIFIED=false` стенд отдельно доказывает 423 на Next write endpoint; storage scenarios выполняются через service PostgREST. Отчёт явно фиксирует `next_write_path_verified=false`. Это **не** выдаётся за успешную запись через Next. Если проверенный release candidate снимает этот compile-time gate, тот же стенд выполняет запись с authenticated browser cookies через настоящий Next endpoint и должен подтвердить `next_write_path_verified=true`. Auth/allowlist и environment storage gate при этом остаются обязательными.

Первый реальный прогон восстановил schema и оба PostgREST contracts, затем выявил ошибку test config: отключение `auth.email.enable_signup` также выключило email login. Исправление ограничивает запрет регистраций глобальным `auth.enable_signup=false`; добавлен реальный отрицательный signup test. Production Auth не менялся.

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

Локально: Search 48/48, direct-reader SQL 9/9 и typecheck PASS. В этом workspace Docker отсутствует; реальный runtime выполняется отдельным GitHub CI job. Точный commit/run/status и проверенный screenshot фиксируются в PR #26 после прогона. До получения evidence runtime не считается пройденным.

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

Следующий owner-independent шаг после зелёного прогона — проверка оставшегося Next write gate и source-context workflow. Для production release нужен отдельный точный staging/activation пакет; текущий PR остаётся draft, indexing выключен.

Технические источники: [Supabase CI testing](https://supabase.com/docs/guides/deployment/ci/testing), [Supabase local config](https://supabase.com/docs/guides/local-development/cli/config), [Playwright CI](https://playwright.dev/docs/ci-intro), текущие Supabase changelog и CLI help.
