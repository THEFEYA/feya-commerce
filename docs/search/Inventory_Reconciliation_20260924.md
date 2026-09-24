# FEYA — сверка состава товаров и очередь проверки моделей

24 сентября 2026. Продолжение I1 после inventory/page pilot `883d0f1`; изменения подготовлены в draft PR #26. Production Supabase проверена только SELECT-запросами. Все восемь подготовленных миграций остаются неприменёнными. Этот отчёт не разрешает публикацию или индексацию.

## Результат

Из 27 предметных случаев у шести восстановлена подтверждённая семантика конфигураций: пять ранее неразрешённых составов и один набор номерных вариантов без типа. Теперь resolver разрешает состав у **222 из 243** карточек; **21** остаётся на проверке. Это техническая согласованность состава, а не количество доступных к заказу товаров или утверждённых SEO-текстов.

Standalone selection: **65** product IDs для shoulder armor и **13** для harness; объединение — **75**, пересечение — три. Количество разных физических моделей и текущая возможность заказа остаются неизвестными. Event selection по-прежнему имеет 243 unknown: названия и общие фотографии не подтверждают пригодность к Burning Man.

Сохранены все product/configuration/page IDs, исходные цены и валюты. У остальных **237** товаров статус и SHA256 прежней offer signature совпадают с resolver из `883d0f1`. Формулы цен, JSX, CSS, шрифты, цвета, маршруты и паспорта агентов не меняются. У шести затронутых товаров состав/signature меняются намеренно: старое одобрение текста не переносится автоматически на изменённый состав.

## Что восстановлено и почему

Полные UUID конфигураций и source-price joins находятся в [машинном отчёте](inventory-reconciliation-report-20260924.json) и [снимке доказательств](inventory-reconciliation-capture-20260924.json). Ни один набор ниже не восстановлен только по названию товара.

| Товар / canonical_product_id | Основание | Исправление | Ограничение |
|---|---|---|---|
| Silver warrior — `4b0c8180-774d-4d5c-a12c-0864f305d1cb` | Approved draft `ab0bc6b6-0cc9-4a45-a4fd-45df32d87c42`, source listing 4487639486, точные price/configuration joins | Bracelet; Skirt; сгруппированный Top + Shoulders; Full Set | Top и Shoulders внутри группы не считаются отдельными покупками |
| Plague doctor — `98600aa8-307b-4165-a8ae-38e347c114bd` | Approved draft `83ed5c0f-e191-45d2-b13a-424f50952a80`, listing 1882682017 | Mask; Collar; Skirt Only; Collar + Skirt; Full Set | Устранено смешение одиночного Collar и Collar + Skirt по точным IDs |
| Red devil — `9d6047ad-406d-4279-a10b-2918e111d587` | Approved draft `557634fa-e0c4-4895-b999-bc9f038334d5`, listing 1779245327 | Forearm Covers; Tail; Bodysuit; Full Set | Прежний анонимный Option не превращается в новый товар |
| Silver cyborg — `e39f9164-4001-4f63-9407-a1ddd3d962dd` | Approved draft `843e2b31-62fd-4a02-b17b-4424bd768027`, listing 1792447742 | Single Leg Cover; Pair of Leg Covers; Bodysuit; два соответствующих Full Set | Один/два leg covers — количество в конфигурации, не разные DNA-оси |
| Green harness — `ce0a2c0a-5a95-4876-a198-70be635ca053` | Предметное owner identity note в draft `4de86fde-81af-4ccf-9ca1-258b967adb25`, listing 1871319427 | Все три цветовые конфигурации — Harness; Green первый; Black/Green/Brown сохраняют свои IDs и цены | Draft всё ещё `not_reviewed`; убрать сравнение цветов из текста не означает удалить цветовые опции. Natural leather из предметной правды не заменяется общим vegan-default |
| Gold numbered outfit — `437a20cd-27a3-4aaf-b154-3353899e0ebd` | Owner variant guide в draft `ecf6d94b-4d66-4472-98a5-da577a22a45a`, listing 1902238173 | Четыре grouped choices; точные количества плеч/браслетов; четыре DNA-оси | Draft всё ещё `not_reviewed`; никакой отдельной продажи частей из этих комплектов не выводится |

Номерный вариант выводится одной строкой, например `Variant #1 — 1 Shoulder + Harness + Garters + 2 Bracelets`. Это одна единица покупки с понятным составом. Обычная группа `Top + Shoulders` сохраняет прежнее отображение. Full Set с одним/двумя leg covers разрешается по configuration_id и сохраняет соответствующее количество.

Manifest допускает только точный полный набор уникальных configuration IDs. Дополнительная, исчезнувшая или повторная конфигурация не позволяет применить это восстановление. Тип patch не содержит полей цены, идентификаторов или approval. Новые quantity-specific bundles добавляют member details в signature; у остальных товаров формат signature не меняется. Это продолжение существующего механизма owner-reviewed corrections, а не новая база Product Truth.

## Явно разрешённые противоречия

- **Approved SEO draft и неготовый состав:** для gold bra/skirt историческое одобрение текста сопровождалось ограничением не утверждать состав до ремонта Product Truth. Поэтому этот товар остаётся hold; статус текста не служит разрешением состава.
- **Исторический source и более поздняя предметная правда:** у horned helmet сохранено owner-указание headpiece-only; старые bodysuit/corset/boots/set rows — остатки. Их нельзя снова сделать активным ассортиментом лишь потому, что они есть в импорте.
- **Повтор Variant #3:** старое описание gold outfit повторяло номер третьего варианта. Owner guide и точная последовательность конфигураций с source-price joins подтверждают Variant #4. ID и цена четвёртого выбора сохраняются.
- **Семантический поиск по прошлым обсуждениям:** первоначальная найденная фраза о mask/corset/leg covers относилась к Mirror Bunny / Batch 38, а не к Plague Doctor. После предметной сверки эта ссылка исключена. Для doctor используются его собственные draft, listing и configuration IDs.
- **Пустой admin_review_events:** запрос вернул ноль строк; это не отсутствие owner decisions вообще. Найдены 13 draft records и 32 draft events для соответствующих товаров. Отсутствие в одной таблице не отменяет подтверждения из другого действующего канонического источника.

## Оставшиеся 21 случая

| Число | Класс | Требуемый результат в существующем Product OS |
|---:|---|---|
| 17 | Acrylic breastplates: size/color rows превратились в анонимные конфигурации | Подтверждённый физический предмет + привязка каждой цены к размеру/цвету. Не создавать DNA-компонент на каждый размер; не угадывать доступность комбинаций |
| 2 | Mirror jacket / leggings: смешение piece и size axes | Разделить состав покупки и размер; проверить grouped/standalone choices по исходным строкам. Не создавать декартово произведение с выдуманными ценами |
| 1 | Gold bra/skirt: copy approved, truth unresolved | Установить конкретный продаваемый состав, сохраняя область прежнего одобрения текста |
| 1 | Horned helmet: устаревшие дополнительные choices | Согласовать current headpiece truth с конфигурациями/ценами; сохранить историю исключённых вариантов |

Все 21 UUID, PDP path, blockers, historical draft statuses и конкретные next_action перечислены в JSON. Сейчас достаточно этой адресной инженерной очереди; новый общий SEO research и повторное подтверждение всех товаров владельцем не требуются. Если после source/owner-history сверки останется неизвестный физический факт, нужен будет один предметный вопрос с показом конкретной карточки и вариантов решения.

## Очередь проверки разных моделей

Проверены source IDs и media references полного каталога из 243 товаров. На этой выборке source listing / Etsy listing IDs уникальны, поэтому одинаковых listing IDs для автоматического объединения нет. Совпадение фотографии также не доказывает одинаковый продаваемый дизайн.

Для 75 кандидатов двух type hubs подготовлено **девять пар из 15 товаров**. Исключены 25 URL изображений, встречающихся более чем у трёх товаров. Оставшаяся эвристика: минимум две общие фотографии и пересечение не менее половины меньшей галереи. Это параметры поиска кандидатов для проверки, **не требования Google, не утверждённый критерий достаточного ассортимента и не оценка уникальности дизайна**. Пиксели фотографий в этом проходе не оценивались.

Каждая пара содержит стабильный proposal_key, полные product IDs/PDP paths, общие media URLs, фактические standalone/grouped choices и hash доказательств. CPIM должен определить: одна физическая модель, разные части одной фотосессии или недостаточно данных; приложить предметное основание и текущую ревизию. Транзитивное объединение A–B и B–C в одну модель запрещено без отдельного подтверждения. Все design_family_key и confirmed_distinct_design_count остаются null; все 75 товаров пока не имеют утверждённой привязки. Пара сама по себе не разрешает merge PDP, публикацию или индексацию.

## Воспроизведение и проверка

```bash
node --experimental-strip-types scripts/audit-search-inventory.ts --check
node --experimental-strip-types scripts/audit-inventory-reconciliation.ts --check
npm run test:search
npm run test:seo
npm run typecheck
npm run check:admin-boundary
npm run check:product-os-freeze
npm run check:owner-ui
```

Исходный capture предыдущего этапа не переписан. Дополнительный SELECT capture — отдельный файл; запросы не составляли одну атомарную транзакцию. Сокращённые проекции сохраняют предметную правду, review notes/status, exact joins, descriptions и media; удалённые дублирующие payloads имеют hash. Отчёты воспроизводятся offline без подключений к production. Search regression проверяет цены/IDs, точность quantity labels, grouped scope, 237 неизменённых signatures, защиту от неполного набора IDs и отсутствие автоматических design families. Результаты CI для точного commit сохраняются в PR; старый runtime artifact предыдущего commit не считается проверкой новых изменений.

## Следующий этап по зависимости

| Task / owner | Input → output | Validation / definition of done | Blocker / rollback |
|---|---|---|---|
| I1b, CPIM + Engineering | 17 size/color и 2 jacket cases, существующие mappings → предложение привязки piece/size/color/price | Каждый существующий ID и цена сохраняются; неизвестные combinations остаются unknown; нет новых компонент из размеров | Нет доказательства availability/physical identity → адресный вопрос; откат code diff, без удаления истории |
| I1c, CPIM | Две предметные truth-конфликтные карточки → current offer proposal | Старое source не отменяет более позднее owner truth; copy approval отделён от состава | Недостающий физический факт; оставить hold |
| I2, CPIM + Portfolio owner | Девять пар + ассортимент 75 товаров → evidence-backed family proposals | Review каждой пары, product-scoped basis, актуальная ревизия; неподтверждённые family keys остаются null | Media не позволяет установить модель → запрос предметной проверки; отозвать proposal, не product ID |
| P2, Search/TSEO + Editorial | Подтверждённые family/orderability данные + пять прежних briefs → проверка достаточности двух type hubs и utility draft | Явное query ownership, отдельная польза/intent; никаких новых indexable pages только из DNA | Demand decision требует Q02 → использовать подготовленные девять seeds; rollback brief/version |

Production release остаётся отдельным незавершённым gate: advisor/security, миграции, реальные orderability/checkout/policy решения, domain/measurement и page approvals не заменены этой сверкой. Откат текущего этапа — revert кода/отчётов в draft branch; production DB/environment не изменялись. От владельца **сейчас действий не требуется**.
