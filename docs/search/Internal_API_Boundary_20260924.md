# FEYA — internal API boundary and agent authority reconciliation

Дата: 24 сентября 2026. Статус: подготовленный app patch в draft PR #26; production не изменена. Parent: `a60582cd1acc1b4548c19e28f1513517e701415e`. K12 и общий pre-index gate остаются FAIL.

## Доказательства и область проверки

- Исходный код: все 10 `app/api/internal/*/route.ts` (11 HTTP handlers), `internalAuth`, `openAiUsage`, `ownerActionAuth`.
- Live SELECT каталога: [internal-api-catalog-20260924.json](internal-api-catalog-20260924.json) — определения и права восьми непосредственно вызываемых RPC; права/RLS/policies 16 используемых relations. RPC в production не выполнялись.
- Live SELECT реестра: [internal-api-registry-20260924.json](internal-api-registry-20260924.json) — 28 активных capability/action записей. Это сохранённые состояния и ограничения, а не повторное исполнение всех агентов. Числа очередей в текстах registry могут быть историческими.
- Предыдущий FEYA canon и роли сохраняются; этот checkpoint согласует конкретные HTTP-обработчики с текущими capability записями. Он не заменяет полные паспорта, предыдущие 15 scenario PASS или authority Core.
- Platform reference: [Supabase database functions](https://supabase.com/docs/guides/database/functions), проверено 24 September: privileges и pinned search_path рассматриваются отдельно. Наличие `security_barrier=true` не означает, что view доступна только администратору.

## Выявленные противоречия и исправления

| Наблюдение | Решение в candidate branch | Практическая граница |
|---|---|---|
| Google Ads GET с `dry_run=false` мог вызывать provider и изменять snapshots/batch | GET execution возвращает 405 до создания service client; `Allow: POST` | GET preview сохранён |
| Строка с опечаткой/пустое значение `dryRun` у Google Ads превращались в false | JSON требует boolean; query принимает только `true`/`false`; конфликт источников, повторный query key и некорректный тип → 400 | Пустой body / отсутствие flag → preview; явный POST false сохраняет прежнюю семантику |
| Ошибочный JSON молча подменялся `{}`, `null` мог аварийно завершить route | Общий parser для восьми POST routes; malformed/non-object → 400 до DB/provider | Это проверка параметров, не новый approval engine |
| OpenAI health публично раскрывал состояние конфигурации с HTTP 200 | Все 10 endpoints используют общий token guard: missing config → 503, wrong/missing token → 401 | Секрет передаётся только прежними Bearer / x-feya-internal-token headers; query/cookie не заменяют токен |
| Ответы внутренних handlers не имели общего явного cache contract | Guard добавляет `Cache-Control: private, no-store` к возвращаемым ответам, включая отказ | Auth проверяется перед body parsing, DB client и provider work |

HTTP token подтверждает внутреннего вызывающего. Он не удостоверяет отдельный agent passport, action capability, owner approval или право публикации. Общий токен остаётся текущим совместимым transport contract; granular Core execution authorization требует отдельного завершения.

## Сопоставление с действующими ролями

| Route | Accountable роль в registry | Допустимый результат текущего обработчика | Что он не утверждает |
|---|---|---|---|
| seo-keyword-cleanup | OSPM | AI cleanup proposal, `review_status=pending` | Human approval, Primary, публикацию |
| seo-keyword-review | OSPM | Independent recommendation, включая значение `APPROVE` | Значение recommendation не является изменением human review_status |
| query-cluster-proposals | OSPM | Proposal только из текущих approved/unclustered candidates; SQL повторно проверяет eligibility | Создание canonical cluster или ownership |
| page-ownership-proposals | OSPM | Proposal для approved cluster, page только из supplied shortlist | Canonical apply и индексирование |
| sco-shadow | SCO | Shadow draft с truth/brief/model/version/hash snapshots | Approval и публикацию |
| content-prechecks | CQA | Детерминированные проверки и события черновика | Text similarity не решает query cannibalization |
| content-qa | CQA | CQA status/result/event с expected-status guard | Human review, strategy change и publish |
| google-ads-keyword-metrics | GDAE | Legacy demand fetch/preview; capability остаётся DEGRADED | Проверенный provider access и готовность нового demand ingest |
| openai-health / google-ads-health | Engineering / provider diagnostics | Authenticated диагностический ответ | Domain authority или launch approval |

`REVIEW/APPLY_QUERY_CLUSTER_PROPOSAL`, `REVIEW/APPLY_PAGE_OWNERSHIP_PROPOSAL`, `APPLY_KEYWORD_CLEANUP_HUMAN_REVIEW` остаются HUMAN_OWNER, protected_ui_locked. `REVIEW_SCO_SHADOW_DRAFT` зарегистрирован за Core с Human Owner UI; approval черновика не равен publication. `PUBLISH_CONTENT` остаётся UNAVAILABLE / not_implemented. Паспорта, runtime capability states и owner decisions в БД не изменены.

## Что именно означает dryRun

- Для Google Ads metrics: читает batch/keywords и готовит request; не вызывает Google и не пишет metric snapshots.
- Для шести AI routes: модель всё ещё может вызываться, а `recordOpenAiInvocation` может записывать operational usage даже при dryRun. Бизнес-результат не сохраняется. Это не offline simulation и не обещание нулевого расхода.
- Для content-prechecks: вызывается preview RPC; apply RPC не вызывается.
- Health GET не имеет dryRun: при наличии provider credentials выполняет диагностический provider call. Автоматический публичный uptime check должен использовать публичный site endpoint, а не эти приватные routes.
- Этот checkpoint не выполнял реальные Google/OpenAI запросы. CI runtime удаляет GOOGLE_/OPENAI_ credentials и использует только локальные fixtures.

## SQL boundary: проверенное и незавершённое

Все восемь проверенных RPC: owner postgres; SECURITY DEFINER с пустым pinned search_path; EXECUTE только postgres/service_role, anon/authenticated запрещён. Это положительный catalog result для названных функций, не доказательство отсутствия иных RPC или dynamic-SQL путей.

Из 16 relations восемь — таблицы с RLS и без policies. Шесть из этих таблиц имеют anon/auth grants, но grants сами по себе не доказывают видимость строк: RLS и контекст доступа учитываются отдельно. Другие восемь — views; шесть имеют public-role SELECT и owner postgres без security_invoker. Две из шести уже входят в подготовленную migration6 (CQA shadow status и query-cluster proposal queue). Четыре требуют отдельного dependency/caller review:

1. `feya_commerce_v_keyword_cleanup_review_status_safe_v1`
2. `feya_commerce_v_page_ownership_shortlist_v1`
3. `feya_commerce_v_page_query_ownership_candidate_clusters_v1`
4. `feya_commerce_v_seo_keyword_ai_cleanup_report_v1`

Публичный SELECT этих views подтверждён, текущие private rows через публичный API не выгружались. Перед revoke нужно проверить downstream closure и public storefront callers. Новая SQL migration здесь не создаётся на основании одного имени view. Каталог `pg_db_role_setting` не содержит `pgrst.db_schemas`; фактический hosted exposed-schema configuration этим запросом не установлен.

## Незавершённый legacy API import — явный release blocker

Старый Google Ads POST ещё использует snapshot upsert, затем отдельные batch-keyword и batch updates. Он не проходит новый atomic observation/receipt/context gate. В частности:

- сохранённые geo/language происходят из batch (с US/en fallback), request targeting — из env; равенство контекстов не проверено;
- retry может перезаписать snapshot по batch-keyword/source; транзакции на весь ответ + batch state нет;
- новые rows не имеют `demand_observation_key`, поэтому их нельзя считать автоматически изолированными от legacy scoring;
- close variants требуют явного group provenance, не независимой оценки спроса для каждой строки;
- string/UUID identities, реальные batch columns и фильтрацию requested ID нужно согласовать с observed schema вместо legacy `.or(...)` по предполагаемым колонкам.

Следствие: исправление HTTP boundary не разрешает включать Google Ads production ingest или менять provider configuration. Следующий adapter должен использовать общий нормализованный evidence contract и atomic persistence; существующий CSV путь остаётся подготовленным fallback. Наличие действительного internal token или прошедших unit tests не снимает этот blocker.

## Проверка и дальнейшие зависимости

Локально: 57 search tests PASS (52 прежних + 5 новых групп), TypeScript PASS, production build PASS; visual/freeze guards включены в build. Новые группы проверяют auth-before-handler, два token headers, отсутствующий token config, default preview, boolean coercion, malformed JSON, conflicting/repeated flags и GET execution denial.

Isolated runtime расширен двумя проверками через реальный Next server: все 11 handlers отказывают без правильного token; все восемь POST routes отказывают при некорректном input; GET execution запрещён; authorized health работает без provider secrets. В existing locked-mode scenario дополнительно проверяются все handlers без configured token. Exact commit/run/result фиксируются в PR после завершения CI; наличие теста не считается результатом исполнения. Полный suite не выполняет live генерацию или каждый domain RPC.

| Следующая задача | Owner | Inputs → output | Validation / blocker | Rollback / done |
|---|---|---|---|---|
| Завершить isolated HTTP proof | Engineering | Patch + local Auth/PostgREST → exact-head runtime artifact | Все проверки PASS, без cloud credentials | App-only revert возможен, но возвращает найденные риски; production promotion не выполняется |
| Закрыть 4 remaining view families | Engineering / Core | Catalog + downstream/caller map → scoped migration и fixture restore | Service parity, anon denial, public storefront, drift/rollback | Reviewed ACL rollback; done только после isolated proof и отдельного hosted cutover |
| Согласовать API demand adapter | GDAE + Core | Actual request targeting + raw response + existing IDs → immutable observations/receipt | Context mismatch, null/zero/range, group variants, failure/replay/concurrency | Disable importer; preserve evidence/history; без provider access CSV остаётся доступен |
| Inventory/page pilot | OSPM + Product OS | Confirmed Product Truth + prepared keyword batches → eligible page membership и decision brief | Intent/inventory/value/query owner; unknown demand остаётся unknown | Draft-only; не создаёт indexable pages автоматически |

Ни шрифты/цвета/страницы, ни цены/конфигурации товаров, ни IDs, ни owner approvals не менялись. От владельца на этом этапе новые исследования, подключения или данные не нужны. Production indexing остаётся закрытой до всех A–K gates.
