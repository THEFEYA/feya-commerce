# FEYA — C1/C2/C5: предметная проверка и распределение запросов

**Исторический checkpoint до ответа владельца.** Продолжение и актуальные числа — [Owner_Decisions_And_Variant_Lifecycle_20260924.md](Owner_Decisions_And_Variant_Lifecycle_20260924.md): 208 source records / 207 visible candidates, 43/8/12/1 metadata states; material hold a83b1b51 разрешён, variant/gallery/price mapping ещё требуется. Исходные Primary сохранены.

24 сентября 2026. Draft PR №26. Этот пакет продолжает проверенный renderer на `e2eb870224c4702da5b7686d59879c8581b530ec`: его CI run `36017919964` прошёл 9/9 jobs, 36/36 runtime сценариев, включая server HTML всех 208 PDP. Статус CI нового пакета фиксируется по его точному head в PR, а не переносится с предшественника.

## Результат и границы

**Цель остаётся 208 одобренных товаров.** Состав каталога, product/page/draft/option IDs, цены, прежние approvals, основные описания, преимущества, meta descriptions и выбранные ключи сохранены. Новые title/H1 здесь только proposals; renderer продолжает получать исходный approved payload. Production DB — только SELECT; миграции, платежи и индексация не включались.

| Работа | Проверяемый результат |
| --- | --- |
| C1: 20 прежних metadata holds | 20 обложек сверены; 9 пар и 2 отдельных расхождения записаны с URL, SHA256 и source IDs |
| Вся очередь metadata: 64 карточки | 42 адресных предложения, 6 сохранений, 16 оставшихся holds; было 39/5/20 |
| Сохранность содержимого | 0 изменённых approved drafts, descriptions, meta descriptions, keywords и source prices |
| C2: Primary scope | 203 из 208 имеют Primary в capture; 5 не имеют его ни в draft, ни в captured latest decision |
| Primary overlap | 112 разных формулировок; 23 повторяются у нескольких PDP. Это сохранённые selections, не измеренная каннибализация |
| Подготовленное распределение | 50 cluster proposals: 14 для существующих кандидатов разделов, 31 для конкретных существующих PDP, 5 с открытым выбором model owner |
| Registered ownership | 0 созданных записей; proposals не подменяют назначения в БД |
| C5 | Общие сроки в коде приведены к трём текущим ACTIVE business-truth записям; storefront, preview и writer используют один текст |

## C1: что удалось разрешить

1. `657bd6d8…`, серебряный топ с юбкой: прежний audit ошибочно прочитал raw Shoulders. В `correctCosmicTopSkirtSet` уже есть **подтверждение владельца от 15 сентября**: точный option `2a41b72b-4ce0-468f-b709-824d03b385e9` — полноценный Top с интегрированными плечевыми деталями. Approved snapshot также содержит Top. Нового вопроса владельцу нет. Предложен различимый заголовок с Cross-Strap на основании утверждённого About и фото. Повторять ошибку мешает проверка exact resolved offer signature в audit script.
2. `256c75b4…` / `4033e707…`: два голографических комплекта имеют визуально разные верха. Для второго видна передняя шнуровка; предложен `Holographic Rave Skirt and Top Set with Lace-Up Top`. Первый сохраняет название. Это узкое наблюдение конструкции, не подтверждение материала или окончательное назначение design family.
3. `a83b1b51…`: прежние approved notes и фото описывают серебряную руку и золотую ногу; предложения metadata теперь используют `Warrior Armor Costume with Arm and Leg Pieces`. Состав Arm/Leg подтверждён selector. Прежние material/color/gallery publication holds **сохраняются**: исправление заголовка не разрешает их автоматически.

Оставшиеся 16 карточек — 8 пар. Разный человек, фон, поза, crop, source listing ID и текст не доказывают разные изделия. Не создаём вымышленные model names или заменяем одинаковые названия синонимами. Первая порция предметных вопросов по пяти карточкам: [Owner_Product_Questions_20260924.md](Owner_Product_Questions_20260924.md). Остальные пары сохранены в JSON и не исчезнут при следующем продолжении.

## C2: кому предлагается владение

`approved-catalog-query-plan-20260924.json` — явно рассмотренный список формулировок, а не regex по DNA. `approved-catalog-query-audit-20260924.json` сохраняет все 208 product/page/draft IDs, исторические Primary objects без изменения, источники/hash, scope, candidate owner и blockers. `query_cluster_id` новых кластеров и `seo_page_id` новых разделов остаются null до существующего registry workflow.

| Предлагаемый owner | Query scope | Условие до назначения |
| --- | --- | --- |
| TYPE-HARNESS `/collections/harness` | Fashion/body/chest harness и подходящие цветовые уточнения | Реальный standalone harness; отделить от страховочного/альпинистского/зоотоварного intent |
| TYPE-ARMOR `/collections/shoulder-armor` | Декоративная shoulder armor | Не protective armor; модель/конфигурация не из одной фотографии |
| TYPE-BODYSUIT `/collections/bodysuits` | Costume/festival bodysuit | Реально продаваемый bodysuit, не базовая одежда для съёмки |
| TYPE-OUTFIT `/collections/outfits` | Top/skirt sets, costume armor, paired outfits и отдельные qualified shopping clusters | Проверить цельное задание страницы и выдачу: proposed owner не доказывает, что один широкий hub достаточно отвечает каждому cluster |
| EVENT-FESTIVAL `/collections/festival-outfits` | Festival и provisional rave scope | Проверить разделение rave/festival и TYPE-OUTFIT; нет автоматической страницы на каждое сочетание |
| EVENT-BM `/collections/burning-man-looks` | Burning Man shopping scope | Event suitability, уникальная помощь выбора; никаких защитных/погодных обещаний |
| OCCASION-STAGE `/collections/stage-outfits` | Stage/performance shopping | Подтверждённое применение и отдельная ценность от общего outfit hub |
| 31 существующий PDP | Единственная текущая карточка для конкретной qualified формулировки | Фактическое соответствие, aliases/secondary review и проверка intent; один FEYA кандидат не означает product-only Google SERP |

В целевых 208 selector даёт **60 shoulder**, **12 harness**, **33 bodysuit** configuration matches. Это не число разных моделей, не готовность к заказу и не утверждённый membership. Для event/stage/outfit eligibility остаётся unknown, а не 0. Ранее 65/13 относились к полным 243 и другой стадии сверки; наборы и время нельзя смешивать.

Пять unresolved owner scopes: `dark witch costume`, `mirror bunny costume`, `silver futuristic top and belt set`, `silver spine costume`, `witch bodysuit costume`. Не назначаем победителя по произвольному ID или цене и не создаём новую посадочную из двух похожих карточек.

Primary — редакционный выбор конкретного draft; global accountable owner — отдельное назначение. PDP может сохранять broad term в естественном тексте и supporting relevance, пока будущий hub отвечает за общий выбор. Отсутствие свежих метрик не требует регенерации 208 описаний. Даты и null в historical metrics сохраняются. Текущая работа покрывает Primary; secondary/supporting и семантические aliases нужно проверить перед регистрацией. Нулевое число конфликтов proposals не означает отсутствие всех будущих поисковых конфликтов.

## C5: исправление сроков

SELECT из `feya_commerce_v_business_truth_status_safe_v1`, проект `ysnizcgzhdwdfdkjkhud`, 24.09.2026; записи ACTIVE v1, updated 18.09.2026. Capture содержит точные public_copy и SQL.

| Поле | Исправленный публичный текст |
| --- | --- |
| Production | Production usually takes 3–5 days. |
| Standard | Standard international shipping usually takes 10–14 business days. |
| Express | Express shipping usually takes 7–10 business days. |

У production day_type в каноне `unspecified`: слова business/calendar не добавляем. Срок изготовления не равен доставке; guaranteed delivery date не появляется. `THEFEYA_APPROVED_FULFILLMENT_COPY` используется общим PDP panel и buyer facts writer prompt, исключая две расходящиеся копии. Стили и JSX не меняются. Returns остаётся REVIEW_REQUIRED; это исправление не публикует политику и не закрывает Footer placeholders, company identity, домен или checkout.

## Дальнейший пакет по зависимости

| Задача; owner | Вход → выход | Проверка / blockers | Откат / done |
| --- | --- | --- | --- |
| C1.3 CPIM | Ответы по пяти карточкам + exact evidence → product-scoped design/material proposals | Только названные IDs; без массового family merge и догадки по фото | Отзыв нового proposal, исходные IDs/approval неизменны; done: факт или явный unknown по каждой строке |
| C2.2 OSPM/CPIM | 50 proposals, 5 missing Primary, secondary refs → reviewed query/page assignment changeset | Existing registry, scope/aliases, physical families, eligible inventory/unique value; не требуется массовый новый CSV | Versioned proposal; done: по каждому запускаемому cluster owner либо явный hold, без двух owners |
| C3.2 Engineering/Core | Проверенный closed renderer и 208 exact bindings → immutable public-safe release/Shop cohort | Публичный путь не читает private draft table; stale/revoked версии fail closed; существующие UI и IDs | Feature flag OFF/previous manifest; done: reviewable закрытый release и anonymous leakage tests, production не активировать |
| C4 Commerce/TSEO | Current configurations + price lineage → точные tuple quotes и crawl manifest | Размер/цвет/конфигурация меняют правильную цену; unknown combination нельзя заказать | Checkout OFF; done: каждая доступная к заказу комбинация доказана, технические gates на том же release |
| C5 Owner/Engineering | Canonical company/domain/policies + эти сроки → reviewable trust/checkout packet | Не придумывать Berlin/контакты/returns; домен и deployment→DB identity неизвестны | Draft only; done: данные восстановлены или точечные вопросы подготовлены, sandbox payment отдельно |
| C6 TSEO/Core/Owner | Всё выше → binary pre-index gate и конкретный cutover | Gate текущего release, отдельное разрешение; API review не гарантирует индексирование или Ads approval | Предыдущий deployment/manifest; индексация остаётся OFF до PASS |

## Воспроизведение

`node --experimental-strip-types scripts/audit-metadata-review.ts --check` и `scripts/audit-approved-query-plan.ts --check` запускаются также в CI. Первый сохраняет approved body/meta/intro и проверяет revised resolved offers; второй проверяет полный target, source hashes/IDs, покрытие всех наблюдённых Primary, единственного proposed owner и отсутствие незаметного выбора между несколькими PDP. Captures не являются единым транзакционным snapshot; перед apply обязательна свежая проверка версий.

Дополнительно: `npm run test:search`, `npm run test:seo`, TypeScript, UI freeze и admin boundary. Runtime CI остаётся тем же реальным Supabase/Auth/PostgREST/Next/Chromium flow. Он не сертифицирует production credentials, реальные товарные цены или provider checkout.

Локальный результат перед публикацией пакета: 108/108 Search, 442/442 Product/SEO, оба воспроизводимых audit scripts, TypeScript, Product OS freeze (41 файл), Owner UI contract и admin boundary — PASS. Remote CI относится только к конкретному commit и фиксируется в PR отдельно.
