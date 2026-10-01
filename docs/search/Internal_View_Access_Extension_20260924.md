# FEYA — internal view access extension

Дата: 24 September 2026. Parent checkpoint: `9d93d0b4aed83192737b65db2498fa2d2e2c2e44`. Изменения подготовлены для draft PR #26; production read-only. Не разрешение на rollout или индексацию.

## Решение

Расширить существующую metric access boundary с 50 до 57 объектов, сохранив её таблицу manifest, RPC identity и связи с текущим importer. Отдельный security registry, SEO engine или approval engine не создаётся. Семь дополнительных внутренних views становятся недоступны PUBLIC/anon/authenticated; сервер сохраняет прежние права и результаты.

Новая **unapplied** migration: `20260924091540_internal_seo_view_access_extension_v1.sql`, файл создан Supabase CLI 2.117.0. Генератор: `scripts/build-internal-view-access.py`. Новая версия ответа существующего service-only health RPC — `metric_access_boundary_v2`; `verifyMetricReaderBoundary` требует именно её. Старый 50-object marker больше не разрешает новую atomic metric write route.

## Почему исходные четыре views превратились в семь

Read-only повтор каталога подтвердил четыре roots предыдущего checkpoint и их downstream closure. Проверка содержимого upstream views выявила ещё два публичных пути к внутренним очередям: review risk и API validation queue. Последняя также отдаёт данные через CSV export view. Если закрыть только четыре исходные views, эти маршруты останутся открыты.

| Дополнительный объект | Назначение | Подтверждённые потребители |
|---|---|---|
| `feya_commerce_v_keyword_cleanup_review_risk_v1` | Внутренняя оценка риска cleanup | Review-status view; private recommendation RPC |
| `feya_commerce_v_keyword_cleanup_review_status_safe_v1` | Рекомендации и состояние human review | Keyword review / Today / Work / Growth; internal reviewer |
| `feya_commerce_v_page_ownership_shortlist_v1` | Lexical candidate retrieval | Internal page-ownership runner |
| `feya_commerce_v_page_query_ownership_candidate_clusters_v1` | Очередь approved clusters без primary | Ownership admin / runner / shortlist |
| `feya_commerce_v_seo_api_validation_queue_v1` | Внутренняя очередь keyword validation | Cleanup report / CSV export |
| `feya_commerce_v_seo_keyword_ai_cleanup_report_v1` | Состояние cleanup и evidence | Studio / scoring / metric import / angle advisor / internal cleanup |
| `feya_commerce_v_seo_keyword_validation_export_us_en_v1` | Controlled CSV export | Existing import-ready / validation-report views |

Полная downstream closure этих шести roots — 10 views. Три уже защищены migration6: metric system status, metric import ready и metric import validation report. Они не получают повторных grant edits. Остальные семь входят в расширение. Новый охват: **55 views + 2 raw metric tables**.

Буквальные app callers находятся только в admin/internal code; public storefront совпадений не содержит. SQL scan нашёл два public-schema RPC caller: `feya_commerce_apply_seo_keyword_metric_import_v1(text,text)` и `feya_fn_record_keyword_cleanup_review_recommendation_v1(...)`. Для обоих live EXECUTE запрещён anon/authenticated и разрешён service_role. Source: [internal-view-rpc-callers-20260924.json](internal-view-rpc-callers-20260924.json). Dynamic SQL и другие схемы этим scan не сертифицированы.

## Сохранённые контракты

- Миграция не заменяет определения views, не меняет business rows, товарные/страничные/query IDs, цены, состав, human review, ownership или indexation intent.
- RPC health сохраняет identity/OID, owner, SECURITY INVOKER, ACL и search_path. Меняются проверяемый охват и version marker; это явный deployment dependency.
- Существующая reader boundary продолжает изолировать pending atomic observations от legacy scoring. Её manifest и 14 direct-view contracts не переписываются.
- Два существующих pure SQL helper — token set и Jaccard — остаются неизменными. Их body/owner/ACL/options входят в новую health-проверку: изменение retrieval logic не проходит незаметно.
- Общий internal token не становится permission на публикацию. OSPM proposal, SCO draft, CQA checks и HUMAN_OWNER/Core review/apply остаются прежними.

## Как migration останавливает непроверенное изменение

До revocation требуется healthy v1 reader/access, ровно 50 прежних manifest rows и точное прежнее тело health RPC. Для каждой новой view проверяются owner, ACL, security options, RLS flag и нормализованное SQL definition. Неизвестная версия/изменённая view прерывает всю транзакцию.

После расширения health проверяет точный набор 57 объектов, определения и metadata, отсутствие privileges у public roles, service SELECT, два SQL helper и отсутствие новых downstream views/materialized views. Ошибка postcondition откатывает всю migration. После установки drift даёт NULL; приложение закрывает **новый atomic importer**. Это детектор drift перед следующей записью, а не запрет любых последующих DDL и не защита всех routes по одному RPC.

## Проверка

Catalog fixture: `tests/search-db/fixtures/observed-internal-view-closure-20260924.json` — 23 relation contracts и два SQL helper, только schema metadata. Для 18 пересекающихся объектов exact definitions/columns/constraints/owner/options/ACL/RLS/dependencies совпали с предыдущим fixture. Дополнение существующего стенда: одна table и четыре views; объединённый SELECT restore — **84 views / 39 tables**.

В новых fixtures используются только синтетические keyword, cleanup/recommendation, product, cluster и page. Все семь добавленных views возвращают положительные данные до/после migration: сравнение не основано на семи пустых результатах. Production business rows и credentials не копируются.

Новый SQL suite проверяет:

1. Preflight drift без частично изменённых grants/manifest.
2. Неучтённый downstream consumer: атомарный отказ migration.
3. Равенство service results всех 84 views, их OID/SQL/options и health privilege identity.
4. **114 SELECT denials**: две public roles × 57 protected objects; service не редактирует manifest; публичная storefront projection доступна.
5. Grant/PUBLIC/definition/helper-body/new-view/materialized-view drift → NULL health.
6. Сохранность product/page/cluster/recommendation IDs, historical approved_draft, score, cleanup pending и отсутствие нового primary ownership.
7. Guarded rollback и запрет слепого повторного применения после него.

Isolated Auth/PostgREST/Next/browser runtime расширен проверками: запрет чтения всех 10 связанных views двум public roles; service shortlist с точным page ID; реальный экран keyword review показывает fixture recommendation; новое нарушение grants блокирует HTTP metric write с 503 и без изменения receipts. Старые Auth, CSV, retry/conflict/failure, drift и history проверки сохраняются. CLI security advisors проверяют расширенный охват. Конкретный exact-head run, artifact digest и результат находятся в PR; наличие сценария само по себе не считается PASS.

Restore предназначен для SELECT/permissions. Он сохраняет ранее описанные ограничения на external FKs, non-core triggers/indexes и не является полной DML-копией production. Live Google/OpenAI, production owner actions и publication не запускались.

## Rollout и rollback

| Порядок | Owner | Input → output | Validation / blocker | Rollback / done |
|---|---|---|---|---|
| 1. Rehearsal | Engineering | Observed fixture + migrations3–7 → isolated SQL/runtime report | Native PostgreSQL + actual Auth/API/browser; advisors | Удалить только ephemeral stand; done при exact-head PASS |
| 2. Hosted preflight | Engineering / Core | Actual deployment/schema/config → compatibility record | Новая app требует v2, старая app ждёт v1; storage OFF на переходе; public caller review | Сохранить текущий deployment; никаких grants по догадке |
| 3. Reviewed release | Release authority | Reviewed migration7 + compatible app → v2 service health | Auth/cutover и все соответствующие release prerequisites | Не выполнено в этой сессии |
| 4. Observation | Engineering / GDAE | v2 health + logs/receipts → readiness evidence | Missing/NULL/old marker → отказ новой записи | Storage OFF при отклонении |

`tests/search-db/fixtures/rollback-internal-view-access.sql` — только rehearsal / отдельно рассмотренный emergency rollback. Он восстанавливает прежние grants **семи** views, оставляет предыдущие 50 закрытыми и не трогает business rows. Это вновь открывает legacy exposure, поэтому storage/indexing должны оставаться OFF. Manifest сохраняет 57 reviewed rows, health возвращает NULL и writer остаётся закрытым. Forward recovery требует новой reviewed migration; исходный файл не следует применять вслепую повторно. Rollback приложения тоже не является способом обойти v2 gate.

## Что остаётся дальше

Этот checkpoint закрывает обнаруженные root/upstream/CSV пути данной группы. Он не сертифицирует все остальные DB views, публичные projections, dynamic SQL, hosted exposed schemas или всю инфраструктуру. **K12 и общий indexing gate остаются FAIL** до оставшегося review и hosted cutover.

Следующий содержательный dependency — legacy Google Ads API adapter: фактический request targeting вместо batch fallback, immutable evidence, close-variant groups, stable string IDs, единая atomic receipt/транзакция и отсутствие обхода context review. До этого API ingest не включать; подготовленный CSV workflow сохраняется. Затем read-only inventory/page pilot с distinct intent, подтверждённым ассортиментом, unique value и query ownership.

Новых действий, исследований или подключений владельца этот этап не требует. Шрифты, цвета, UI, цены и паспорта не меняются.
