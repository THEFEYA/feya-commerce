# FEYA — legacy metric permissions and function hardening

24 September 2026. Owner: Engineering + GDAE; compatibility review: Core/OSPM. Production использована только для SELECT catalog metadata и чтения advisor report. Ни одна migration не применена; business rows не читались и не изменялись в этом проходе. Approved storefront, fonts, colors, prices, stable IDs, agent passports и решения владельца не изменены.

## Результат сверки

Источник: `tests/search-db/fixtures/observed-metric-security-20260924.json`, catalog timestamp `2026-09-24T00:55:12.512577+00:00`. Это измеренные свойства FEYA, а не предположение по локальному стенду.

| Проверка | Наблюдение | Вывод |
|---|---|---|
| Dependency closure от двух metric tables | 2 tables + 48 views; все имеют SELECT для anon/authenticated | Закрытие лишь 14 direct views не устраняет все точки доступа: downstream owner-rights views проверяют underlying permissions от своего владельца |
| Две raw metric tables | RLS включён | Наличие SELECT grant само по себе не доказывает доступ к строкам |
| 48 views | Owner postgres; 40 без reloptions, 8 с security_barrier=true; security_invoker не включён | security_barrier не заменяет invoker/RLS isolation; текущий доступ нужно пересмотреть как единый API surface |
| Три legacy import functions | SECURITY DEFINER; EXECUTE только postgres/service_role | Нет подтверждения, что эти RPC доступны анонимному посетителю; scope исправления — search_path, не новые запреты бизнес-функций |
| Триггер keyword bank | SECURITY INVOKER; mutable search_path | Фиксируется trusted path; вызов обычного trigger function через RPC не равен запуску table trigger |
| Public schema | CREATE запрещён anon/authenticated | Не заявляем, что обычный посетитель может создавать spoof functions в public |
| Literal function-reference scan по public | 8 functions упоминают closure; все недоступны anon/authenticated | Подтверждена связь с signal admission, query proposals, keyword plans и metric batches. Dynamic SQL/другие schemas не покрыты |
| Repository scan | 14 файлов с literal references; публичных app route hits нет | Поддерживает server-admin направление; не доказывает отсутствие внешних клиентов или косвенных RPC dependencies |

Полный список 50 relations и восьми RPC сохранён в fixture. Repository mapping: [metric-security-caller-map-20260924.json](metric-security-caller-map-20260924.json), baseline commit `7506c7d4369292495e6268ead28feca1e8251bfc`.

Особая совместимость: `getAdminReadClient()` выбирает service_role при `FEYA_ADMIN_AUTH_REQUIRED=true`, но anon при false. Поэтому массовый REVOKE до вывода старого режима может сломать существующие admin pages. Production env в этом проходе не проверялась и не объявляется защищённой по одному состоянию кода.

## Исправление четырёх функций

CLI создал `20260924005636_keyword_metric_function_search_path_v1.sql`. Генератор: `scripts/build-metric-function-hardening.py`; никакого подключения к БД в нём нет.

| Function | До | После |
|---|---|---|
| `feya_commerce_apply_seo_keyword_metric_import_v1(text,text)` | search_path=public | pg_catalog, pg_temp |
| `feya_commerce_fn_promote_keyword_metric_import_v1(text)` | caller-dependent | pg_catalog, pg_temp |
| `feya_fn_apply_manual_keyword_metrics_v1(text)` | caller-dependent | pg_catalog, pg_temp |
| `seo_keyword_bank_v1_set_updated_at()` | caller-dependent | pg_catalog, pg_temp |

Все business relations в этих bodies уже schema-qualified. `pg_catalog` стоит первым, `pg_temp` явно последним; public/user-controlled schemas не участвуют. Bodies, function OIDs, signatures, владельцы, SECURITY DEFINER/INVOKER и ACL сохраняются. Уже реализованные predicates `demand_observation_key IS NULL` не снимаются. Исторические метрики по-прежнему работают; новые observations остаются на context review.

Перед изменением migration требует здоровый 17-object reader contract и сверяет четыре body hashes/owner/ACL/security/options с утверждённым состоянием после reader migration. Неожиданное отличие отменяет всю транзакцию. После ALTER обновляются **только три** function entries в закрытом reader manifest; все 14 view entries сохраняются. Health остаётся fail-closed при следующем изменении definition/ACL/options. Trigger не входит в runtime reader manifest: его проверяют migration pre/postflight и advisors, это явная граница текущего health contract.

Применение по зависимости: atomic metric import → reader boundary → function search_path. SQL artifact подготовлен к изолированной проверке, а не разрешает production activation или обход K12.

## Проверки и пределы доказательства

Новый SQL suite содержит семь сценариев:

1. OID/body/signature/owner/ACL parity и неизменность 14 view contracts.
2. Три legacy operations с положительным результатом при hostile caller search_path; fake lower/btrim/now не вызываются; caller settings восстанавливаются.
3. Bank trigger сохраняет ID, score, approval и использует настоящий clock.
4. Atomic/context-pending batch не попадает в legacy promote/apply/candidate update.
5. Function path drift закрывает reader health.
6. Guarded rollback и повторное применение сохраняют observations и approval history.
7. Unknown trigger body блокирует migration до первого изменения settings/contracts.

Локально: новый suite **7/7 PASS**; полный SQL suite **47 PASS, 6 native-only SKIP, 0 FAIL**. CI дополнен отдельным PostgreSQL 17 job для этих семи проверок. Real Supabase runtime теперь применяет третью migration перед browser→Next→PostgREST flow и требует отсутствия `function_search_path_mutable` для четырёх исправленных функций. Точный remote commit/run/result фиксируется в PR; локальный успех не подменяет remote result.

## Как интерпретировать advisors

Прошлый isolated runtime дал 34 findings: 14 security_definer_view, 3 mutable paths, 17 RLS-disabled. Последние 17 относились **к typed test stand-ins**. Live catalog подтверждает: реальные counterparts — девять views и восемь tables с включённым RLS и без policies. Следовательно, нельзя переносить эти 17 локальных предупреждений на production как 17 новых незащищённых таблиц. Восемь таблиц без policies могут быть намеренно service-only; public SELECT grant не отменяет RLS.

Live advisory summary сохранён отдельно: report вернул 500 security_definer_view, 166 mutable paths, 166 RLS-disabled, 4 exposed materialized views и другие notices во всей старой БД. Это шире FEYA metric closure, не результат наших migrations и не доказанные exploit counts; 500 может быть лимитом ответа. Нельзя объявлять ни полную безопасность БД, ни полное число уязвимостей по этому ответу. Во время этого прохода не проверялась эксплуатация и не менялись посторонние schemas.

После function patch 14 legacy view findings остаются ожидаемо открытыми, а stand-in RLS warnings сохраняются как ограничение test restore. Runtime report прямо хранит `advisor_release_pass=false`, даже когда targeted function-path check проходит.

## Следующая единица работы: закрытие внутреннего API surface

| Зависимость | Owner | Input → output | Validation / definition of done | Blocker / rollback |
|---|---|---|---|---|
| 1. Admin client contract | Engineering | Existing Auth/allowlist + 14 caller files → server-only admin reads, явный retirement anon fallback | Allowed owner видит старые screens; outsider/anon не получают data; public storefront не зависит от admin client | Текущие deployment flags и service credentials проверить без вывода secrets; code revert до DB change |
| 2. Полный catalog closure | GDAE | 50 relations + восемь literal RPC callers + upstream definitions → exact SQL/ACL/RLS restoration | Все 48 views и agent-dependent reads компилируются и дают прежний authorized result; dynamic/external consumers отмечены явно | Typed fixtures недостаточны для этой части; no blind migration |
| 3. Reviewed permission migration | GDAE + Core | Caller inventory + public storefront contract → REVOKE admin-only surface либо reviewed invoker/RLS policy | Role matrix anon/customer/owner-service; direct и downstream API calls; не открывать tables ради работающего invoker view | Versioned manifest обновить только для reviewed metadata; transactional failure retains old state |
| 4. Hosted exact-deployment verification | Engineering + CQA | Candidate code+schema+flags → signed release evidence | Admin/Growth/Product parity, no sensitive browser data, resolved or explicitly justified advisory surface; K12 evidence complete | Production activation остаётся закрытой; для отката сохранить schema compatibility и import hold |

Выбор revoke или invoker определяется реальным data contract. Одно blanket `security_invoker=true` может убрать нужные строки из админки; одно blanket REVOKE на 14 views оставит downstream exposure. Не меняем agent authority/passports для обхода permission boundary. Следующий source-context/inventory pilot можно готовить read-only; activation зависит от закрытия этой цепочки.

## Rollback

`tests/search-db/fixtures/rollback-metric-function-hardening.sql` — проверяемый isolated rehearsal/emergency artifact. Он требует здоровый текущий reader manifest и точный hardened state четырёх функций; неизвестные изменения блокируют откат. Возвращает только прежние search_path options и три соответствующих manifest entries. Не удаляет tables/receipts/evidence, не отменяет reader isolation, не переписывает business data. Повторное применение forward migration проверено.

В production предпочтителен forward fix. Если когда-либо понадобится rollback settings, сначала остановить metric writes, сохранить diff/receipt evidence и учитывать, что mutable-path notices вернутся. Сейчас production rollback не требуется: туда ничего не применялось.

## Официальные основания

Проверены через текущий Supabase docs search 24 September 2026; это технические факты платформы, не FEYA Product Truth:

- [Supabase RLS / views](https://supabase.com/docs/guides/database/postgres/row-level-security): owner-rights views могут обходить underlying RLS; security_invoker меняет эту семантику.
- [Database functions](https://supabase.com/docs/guides/database/functions): trusted search_path для SECURITY DEFINER, schema-qualified relations, ограничения EXECUTE.
- [Advisor: publicly executable definer function](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable): отдельно проверять PUBLIC и named-role grants.
- [Advisor: mutable function search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- [Advisor: security definer view](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).

От владельца сейчас ничего не требуется: общий SEO research или повторное подтверждение Product Truth не нужны для этого технического этапа.
