# Growth OS G2b — договорённость о первом решении владельца (DRAFT)

**Приоритет:** MASTER #145 → G2 #178 → G2a (merged PR #179) → G2b (draft PR #180) → G2c/G2d. Исходные двенадцать Growth OS v1.0 CANONICAL документов сохраняют приоритет. Это не новый движок и не новый агент.

## Функция владельца

Принимать только **один конкретный TSEO-кейс** на следующий этап жизненного цикла Core: `OPEN → TRIAGED`. Это означает «взято к структурированной проверке», а не «исправлено», «проверено независимым AI», «проиндексировано Google» или «бизнес улучшился».

Карточка появляется только если доказательства подтверждены и независимая функция разрешена. Владелец отмечает понимание ограничений L0 и нажимает одну кнопку. Без подтверждения отдельного флага/усиленной авторизации кнопка не появляется, а текущая read-only карта кейса остаётся доступной.

## Текущая подтверждённая ситуация

- Кейс `23049f6b-35bd-4211-973c-d1ea3a82f708`: владелец роли TSEO, статус OPEN, ownership_epoch=1, завершённое строго `RECORD_INDEXABILITY_PROPOSAL`, persisted TSEO→GMEL L0 handoff, и Human Owner Attention `CONFIRM_INTERNAL_L0_ONLY`.
- Другой TSEO-кейс OPEN **не имеет** этого human decision evidence и в G2b не допускается.
- Истинных `measurement_specs/outcomes` пока нет; включённая оплатная/коммерческая аналитика не предполагается.

## Требования к данным и полномочиям

**Вход:** case ID, expected last case-event ID, expected status OPEN, epoch, фиксированное action code `TRIAGE_TSEO_L0_V1`, объяснение владельца, acknowledgement L0, retry request ID.

**Проверяемые source-of-truth:** canonical case + latest case event, workflow run + indexed release receipt, ACTIVE Search Release, структурированный handoff, сохранённое HUMAN L0 решение и его audit-event. Любая несовместимость CASE/STATUS/EPOCH/SOURCE/OWNER-EVENT → DENY.

**Граница:** browser POST → owner auth allowlist / step-up / same-origin → deterministic validation → существующий service-role-only `feya_fn_transition_growth_case_v1` CAS → выборка новой строки кейса и точного `STATUS_TRANSITIONED` event → verified response. Права клиента `anon/authenticated` на выполнение Core RPC не расширяются.

**Флаги:** `FEYA_GROWTH_CASE_TRIAGE_ENABLED=false` по умолчанию. Нужны отдельно `FEYA_OWNER_ACTION_AUTH_REQUIRED=true`, `FEYA_GROWTH_SHADOW_WORK_ENABLED=true` и `FEYA_GROWTH_CASE_TRIAGE_ENABLED=true`. Наличие первых двух флагов НЕ включает G2b автоматически. Общий `FEYA_OWNER_ACTIONS_ENABLED` не используется.

**Идемпотентность:** сервер строит SHA-256 key с actor ID, case, epoch, immutable prior event, action, target TRIAGED, reason и request ID. PostgreSQL Core раньше мог возвращать квитанцию по старому idempotency key до проверки нового intent. Поэтому успешный RPC **не считается успехом**, пока сервер не проверит: сохранённый event exact key, actor, from=OPEN, to=TRIAGED, epoch, reason и current Case status=TRIAGED. Повтор после оборванной HTTP-сессии использует ровно тот же request ID и независимое readback, без второй записи.

**Выход:** только статус TRIAGED, event audit и подтверждение. CASE остаётся незавершённым. Ни цены, ни SEO-тексты, ни ссылки, ни источник данных, ни режим автономии не меняются.

## Обязательные отрицательные сценарии

Чужой пользователь / origin / без step-up / выключенный triage-флаг; ошибка/отсутствие source; подменённый Release; stale epoch/event; ложный GMEL PASS; внимание OPEN вместо RESOLVED; чужой или отсутствующий owner decision event; попытка CLOSED; одинаковый request ID с другой причиной/actor; ответ RPC другого этапа; успешная запись без readback; повтор после network timeout; переход из TRIAGED другой задачей.

## Граница выпуска

PR — **черновик для технической проверки**, не разрешение на Production-изменение. Включение G2b требует: точного проверенного SHA, CI и Owner Auth browser, Vercel Preview, контрольных запросов Supabase, отдельного Owner release approval, ревизии флагов в Vercel без передачи secrets в чат, и затем отдельного реального owner click. Никакого автоматического выполнения при деплое.

## Открытый инженерный долг

Задокументированный риск общей функции `feya_fn_transition_growth_case_v1`: при повторе старого ключа другой вызывающий код может прочесть старый event до проверки параметров. Новый G2b endpoint закрывает свою границу (fingerprint + readback), но глобальное исправление Core с rollback-only PostgreSQL regression следует вынести в отдельную миграцию и проверить все существующие callers, не менять функцию произвольно.

**Дальше:** G2c — реальная независимая QA по отдельному источнику/исполнителю и безопасной передаче; G2d — фиксированная measurement spec до изменения. Пока QA отсутствует, ожидаемый результат `INCONCLUSIVE/NOT_OBSERVABLE`, а не «успех».
