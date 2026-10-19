# TheFEYA Growth OS — G2d Technical Measurement Preflight v1

**Статус:** DRAFT, только подготовка. **Источники правил:** Growth OS v1.0 CANONICAL/Core/8 Role Passports, [MASTER #145](https://github.com/THEFEYA/feya-commerce/issues/145), [G2 #178](https://github.com/THEFEYA/feya-commerce/issues/178), [G2d #184](https://github.com/THEFEYA/feya-commerce/issues/184). Не создавать второй Case FSM, Measurement Engine или автономного GMEL.

## 1. Существующие данные и обязательные границы

- ACTIVE Search Release v12: 18 маршрутов с намерением index; 207 товаров в утверждённом каталоге. Последний исторический Production-обход проверил все 18 index-маршрутов и **выборку** 24 из 207 noindex-товаров.
- Исторический архив 18 октября содержит только агрегат 24/24 и список путей, а не отдельные положительные HTTP-результаты. **Это не per-product baseline.** Такая точка станет возможной только после нового Production main-push выпуска G2c [PR #183](https://github.com/THEFEYA/feya-commerce/pull/183) с PER_PATH_CI_RECEIPT. Нельзя задним числом изобретать недостающие строки.
- Таблицы `feya_growth_measurement_specs_v1` / `feya_growth_measurement_outcomes_v1` и service-only функция `feya_fn_lock_measurement_spec_v1` уже существуют. Реальные Spec/Outcome = 0/0, они в этом PR не изменяются.
- В Metric Registry 14 определений, но **нет** `TSEO_HTTP_INTENT_MISMATCH_COUNT`. Это проект нового технического показателя. До отдельного утверждения GMEL (методология) и GDAE (источник/числитель/знаменатель/качество) он остаётся `METRIC_GOVERNANCE_REQUIRED`. Не подменять его `ORGANIC_CLICKS` или заказами.
- GA4/Commerce и полный измерительный конвейер остаются недоступными. HTTP canonical/noindex — не факт индексации Google и не показатель выручки.

## 2. Формула и право интерпретации

Когорта `ALL_INDEX_INTENT_URLS` содержит все URL утверждённого активного Search Release для index (сейчас 18). Когорта `PINNED_PRODUCT_NOINDEX_SAMPLE` содержит заранее зафиксированную выборку товаров с индивидуальным HTTP-наблюдением (сейчас 24; остальные 183 **не наблюдались**).

Для неизменной группы URL:

- **denominator**: точный размер зафиксированного cohort; 24 нельзя выдавать за 207.
- **confirmedMismatch**: сервер наблюдал HTTP-ответ, явно нарушающий ожидаемый status/noindex/canonical.
- **confirmedPass**: полный корректный ответ; отсутствие ошибки в логах без HTTP-наблюдения сюда не входит.
- **unknownCount**: сеть не ответила, нет обязательных HTTP-полей, недостаточна полнота массива. Это **не ноль**.
- **mismatchRate**: считать только когда вся cohort подтверждена и `unknownCount=0`. Иначе `null` и явное объяснение причин.

HTTP 404 при сохранённом достоверном ответе — наблюдаемое расхождение. Таймаут без ответа — UNKNOWN, а не 404 или удача. При расхождении за пределами проверяемого cohort (robots/sitemap/Shop guardrail) результат не должен выглядеть зелёным.

Размеры cohort не прошиты в формуле: берутся из **живого активного Release** и исходного source-bound манифеста. При расширении каталога меняется состав фиксированной группы и версия спецификации, а не архитектура.

## 3. Статусы preflight для интерфейса владельца

| Статус | Значение |
| --- | --- |
| SOURCE_BLOCKED | Источник, полные HTTP-строки, версия, SHA, freshness или идентичность не подтверждены |
| METRIC_GOVERNANCE_REQUIRED | Source-level факты доступны, но бизнес/техническая формула пока не утверждена |
| SOURCE_OBSERVABLE_REVIEW_REQUIRED | Источник есть, но требуется независимое заверение методологии/происхождения |
| SPEC_DESIGN_ELIGIBLE | Одно полное L0-наблюдение допускает **подготовку проекта** Measurement Spec |
| TWO_OBSERVATIONS_NOT_YET_COMPARABLE | «До/после» имеют другую группу URL/версию Release/даты либо не утверждено окно |
| TWO_OBSERVATIONS_COMPARABLE | Две независимые точки одних URL, того же релиза, в заранее утверждённом окне; допустимо только **описательное** сравнение |

Чистая функция **всегда** возвращает: `canLockMeasurementSpec=false`, `canWriteOutcome=false`, `independentQaPassed=false`, `googleIndexationConfirmed=false`, `revenueOrConversionMeasured=false`, `validatedWin=false`.

## 4. Data contract: что действительно проверяется

Отдельный серверный источник должен получить authenticated GitHub Workflow run/job/artifact; сверить repository, branch `main`, event `push`, job status/conclusion, SHA, artifact ID/ZIP digest. Затем GDAE сверяет **единственный** ACTIVE Search Release в Supabase: release ID/code/version/hash/origin, URL paths, количество approved Product Bindings. Checksum не является доверенной криптографической подписью сам по себе. Ни один клиентский JSON или текст LLM не может объявить сам себя проверенным артефактом.

Preflight, получающий уже подтверждённые данные, проверяет:
- G2c вердикт только Production L0 (никогда PR snapshot); не выдаёт прошлые агрегатные успехи за полный per-path источник.
- Однозначные пути без дубликатов/лишних URL; status/noindex/canonical; согласованность поля `pass` и наблюдённого ответа; проблемы guardrail; различие UNKNOWN/FAIL.
- Политика свежести утверждена явно, без выдуманного default; окно baseline/follow-up и минимальный интервал определены **до** сравнения.
- Два независимых run ID, полная та же cohort, идентичные Search Release ID/hash/URL, корректный порядок наблюдений; новая версия релиза или cohort не может автоматически сравниваться с предыдущей.
- Если site intervention уже начался, настоящий LOCKED Spec должен датироваться **до** начала вмешательства; иначе нельзя интерпретировать результат как измеренный эффект.
- Истинная независимая QA и бизнес-успех не выводятся из одного зелёного CI. Источник нужен, чтобы подготовить дальнейшую проверку и регламент Measurement Spec.

## 5. Последовательность внедрения без разрушения архитектуры

1. После отдельного owner release approval внедрить read-only G2c [PR #183](https://github.com/THEFEYA/feya-commerce/pull/183), получить настоящий **main Production** артефакт, проверить его подлинность через GitHub.
2. GMEL и GDAE утверждают versioned definition для новой технической метрики с точной формулой и источником. Не менять существующие 14 метрик «вместо» неё.
3. До любой технической правки задокументировать hypothesis, cohort path-hash, источники SHA/даты, freshness/window/sample policies, contamination/known unknowns, guardrail Search v12 + 207 PDP + V13, и потолок доказательности `L0_OBSERVATION`. Только отдельно одобренный owner action может создать реальный DRAFT и lock существующий Measurement Spec RPC.
4. После отдельно одобренного исполнения и второго достоверного наблюдения GMEL/GDAE выполняют детерминированное сравнение, проверяют факторы и могут вернуть только подтверждаемое `INCONCLUSIVE`/`NOT_OBSERVABLE`/описательную разницу. Рост выручки/конверсии и причинность здесь не выводятся.
5. UX владельца: сначала **что проверено / реальные ошибки / что осталось неизвестным / рекомендуемый следующий шаг**. Временные окна, SHA, URL и technical details — раскрываются только по запросу.

## 6. Граница этого PR и условия приёмки

Только `lib/growthG2dTechnicalMeasurementPreflight.ts`, `tests/search/growthG2dTechnicalMeasurementPreflight.test.ts` и этот паспорт. Нет новых таблиц, вызовов RPC, публикации/оплаты, API-ключей, AI-расходов, таймеров, Core-статусов или изменений публичного магазина.

**Definition of Done подготовки:** тесты подтверждают, что полное HTTP-ошибочное наблюдение не скрывается, таймаут не превращается в ноль, PR/чужой SHA запрещён, Release и cohort неизменны, обе точки имеют независимый run и утверждённое окно, отсутствующую Metric Registry нельзя подменить, а действие без LOCKED Spec не получает ложный causal verdict. **Полный G2d DONE наступит только после отдельно одобренной записи и блокировки настоящей спецификации и пригодной второй точки.**
