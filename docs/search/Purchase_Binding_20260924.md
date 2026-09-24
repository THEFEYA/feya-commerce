# FEYA — товар, размер, цвет и цена: проверка исходных привязок

24 сентября 2026. Продолжение I1b после `8ba94cc`; проект для существующего Product OS в draft PR #26. Production — только SELECT. Ни одной цены, существующего ID, approval, страницы, SQL schema или элемента утверждённого интерфейса не изменено. Восемь ранее подготовленных миграций остаются неприменёнными.

## Результат и граница

Подготовлен исполняемый offline compiler `purchaseBindingEvidence.ts`, который восстанавливает смысл **142 существующих ценовых строк для 21 карточки**. Он различает size и configuration, сохраняет исходные суммы/ID и распознаёт диапазоны в оригинальном тексте. Это доказательная основа для исправления привязок, **не подключённый к витрине механизм расчёта цены**. Все 21 composition hold остаются; общий каталог по-прежнему 222 ready / 21 hold.

Исходный файл импорта найден и проверен целиком. Его 142 строки для этих товаров совпадают с raw_payload базы; дополнительной таблицы полных комбинаций в нём нет. Потерю диапазонов можно исправить в интерпретации уже имеющихся данных. Точную цену отсутствующей комбинации нельзя получить из этих данных без дополнительного предметного основания.

## Подтверждённые находки

| Проверка | Фактический результат | Следствие |
|---|---:|---|
| Product scope | 21 canonical_product_id | Scope предыдущей предметной очереди, без расширения на весь каталог |
| Configuration price / option mapping / source price | 142 / 142 / 142 | Каждый путь ID → product → source проверен; нет нового ID или цены |
| Legacy sellable_configuration parents | 129 | Parent не равен конкретной ценовой строке |
| Size observations | 125 | 116 строк у 17 breastplate listings + девять у mixed jacket; размер не является компонентом |
| Purchase-choice observations | 17 | У двух jacket listings и двух truth-conflict listings; source choice не подтверждает текущую продажу |
| Точные значения для одной оси | 129 | Наблюдавшаяся цена одной опции, без доказательства всей комбинации или сегодняшней доступности |
| Диапазоны из оригинального текста | 13 | Все у listing 1846031742; импорт сохранил нижнюю границу в скалярное поле |
| Несколько разных mappings под одним parent | Четыре parent / 13 ссылок на другой mapping | Нельзя выбирать, объединять или восстанавливать состав по одному parent ID |
| Ценовые строки, скрытые текущим label dedupe | 113 из 142 | Offline replay `sortedOptions`: одинаковое display label оставляет строку с большей ценой |
| Объявленные размеры без отдельных price observations | 63 product-size entries | 36 у breastplates; по девять у трёх listings без size-price rows. Это отсутствие наблюдения, не доказательство недоступности |
| Новые доступные комбинации / изменённые цены | 0 / 0 | Декартово произведение и ценовая формула не выдумываются |

Storefront SQL v4 называет поле `configuration_id`, но его значение — **configuration_price_id**. Сам `sellable_configuration_id` — другой существующий ID. Это подтверждено сохранённым определением view. Adapter и корзина должны сохранять эту границу, иначе несколько разных покупок могут получить одну неверную идентичность.

В текущем PDP `size` по умолчанию M и изменяется отдельно от selected configuration. Набор кнопок фиксирован: XS/S/M/L/XL/XXL/XXXL/Custom. В источниках встречаются XXS/1X/2X/3X/4X, и эквивалентность 2X и XXL этими данными не установлена. Это статическая проверка кода и offline replay, не наблюдение оформленных заказов или ошибок покупателей. Protected JSX/CSS не изменялись; установленная проблема — зависимость перед включением реального checkout и публикацией соответствующих ценовых обещаний.

## Четыре предметных сценария

1. **Gold breastplate `0cd7c558-7344-4076-91a5-86f7f5fe0ad0`.** M имеет source observation €271.31, XL — €303.22. Одинаковые `Option` в текущем selector оставляют XL-строку. Нельзя при выборе M считать её ценой M. Simulation отмечает mismatch; сохраняет обе суммы и оба ID, `charge_amount=null`.
2. **Тот же товар, 4X.** Размер объявлен в source axis, но его price row в этом импорте отсутствует. Нельзя использовать цену XL, ставить ноль или объявлять размер снятым с продажи. Статус — missing observation.
3. **White breastplate `1ce50e76-c066-46b8-97ba-d6be92a593ff`.** 1X — €287.27, 2X — €303.22. Исходные обозначения сохраняются. `XXL` не получает цену `2X` без утверждённого соответствия размерной системы. Color White в объявленной оси не доказывает одинаковую цену всех цветов.
4. **Mirror jacket `2dddffcc-dd07-4d94-a4df-0217aac4f815`.** Оригинальная jacket option содержит €518.67–€550.59; скалярная цена импорта — €518.67. M row отдельно содержит диапазон для нескольких purchase choices. Ни нижняя граница, ни сложение различий диапазонов не дают подтверждённую цену Jacket/M. Никакой формулы надбавок из этих чисел не вводится.

## Как устроен подготовленный контракт

`proposal_key = price-binding:{canonical_product_id}:{configuration_price_id}` — адрес предложения, не новый DB UUID. Каждая строка содержит прежние product, configuration_price, sellable_configuration, option_mapping, source_price и source_listing IDs; исходную ось/значение; price observation с точным значением или диапазоном; прежние source/public/manual-override суммы и review statuses; blockers; accountable owner CPIM.

Compiler отклоняет повторные IDs, потерянные joins, неоднозначную привязку source row и пересечение разных товаров. Разногласие parent → mapping фиксирует отдельно, сохраняя сами строки. Диапазон берётся из original `raw_option_text` с проверкой совпадения raw_payload; уже усечённый `price_text` не повышается до более надёжного доказательства. EUR parser ограничен фактически наблюдавшимся форматом; неоднозначная запись, иной currency, неверный label или противоречивая сумма остаются unresolved. Денежные значения проверяются десятичными строками/целыми minor units без пересчёта цен.

У всех предложений `complete_variant_coordinates=null`, `availability=unknown`, `charge_amount=null`, `can_apply=false`, `can_add_to_cart=false`, `can_publish=false`, `can_index=false`. Это обязательная граница данного review compiler. Его нельзя импортировать в публичный pricing path как готовый quote resolver.

Будущий approved binding должен отдельно связать **physical purchase option + size system/value + color + price row + evidence/revision + availability**. Равенство цены, одинаковая фотография, общий parent, высокий import confidence и статус SEO draft этого не подтверждают. Full Set — purchase choice, а не компонент; size/color — характеристики выбора, а не новые DNA-parts или новые страницы.

## Источники и воспроизведение

- [SELECT capture](purchase-binding-capture-20260924.json): 142 source rows, mappings и prices, 129 parents, 12 действующих option-axis rules. Запрос и прежние статусы сохранены.
- [Определения views](purchase-binding-view-definitions-20260924.json): подтверждают значение storefront ID и прежнюю агрегацию.
- [История импорта](purchase-binding-import-provenance-20260924.json): исходные batch IDs, имена файлов, metadata и keys source listings. CSV содержит перечни осей/значений; в проверенном payload нет tuple-level inventory.
- [Проверка оригинального файла](purchase-binding-original-file-audit-20260924.json): исходный master `feya_etsy_price_collection_master_v0_18_final(1).json`, 1,193 price rows / 330 listing entries; в scope 142 строки и все 142 payloads идентичны DB. Сохранены hash файла, Library identity и индексы строк. Полный исходный файл не дублируется в git.
- [Воспроизводимый отчёт](purchase-binding-report-20260924.json): все 142 предложения, links на существующие admin product pages, coverage, collisions и четыре simulations.

Запросы Supabase читали production, не меняя её; отдельные запросы не являются атомарным снимком. Точный поиск прежних owner decisions для acrylic/jacket listings не дал предметных подтверждений. Это не утверждение, что подтверждений никогда не было. Отсутствующие facts не заменены памятью о похожих товарах.

```bash
node --experimental-strip-types scripts/audit-purchase-bindings.ts --check
npm run test:search
npm run test:seo
npm run typecheck
npm run check:admin-boundary
npm run check:product-os-freeze
npm run check:owner-ui
```

Девять новых regression tests проверяют реальные observed amounts/ranges, несовпадающий размер, неизвестные размеры/цвета, 1X/2X labels, cross-product ID, неполные/повторные связи, общий parent и воспроизводимость отчёта. Они не отправляют покупку и не меняют производственные данные. Точный CI commit и runtime artifact фиксируются в PR.

## Внедрение по зависимости

| Task / accountable owner | Inputs → output | Validation / definition of done | Blocker / rollback |
|---|---|---|---|
| PB1 — выполнено, GDAE | SQL joins + original master → versioned binding evidence | 142 IDs/суммы сохранены; 13 ranges восстановлены; исходный файл сверён | Drift source → новый capture; revert advisory files |
| PB2, CPIM | 21 product cases, существующие owner records, evidence packet → proposed physical scope и перечень только неизвестных tuples | Headpiece-only правда сохраняется; copy approval не заменяет composition; 17 acrylic items имеют конкретный физический scope | Неизвестный физический факт/цена → точечная owner review или новый tuple-level source; оставить hold |
| PB3, Engineering + GDAE | Approved bindings → server selection/quote adapter поверх прежних price IDs | Выбор размера/цвета атомарно выбирает разрешённую комбинацию; нет label dedupe по смыслу товара; сервер сверяет цену и availability перед заказом | Полной комбинации нет → запрет quote; adapter feature flag off, прежняя версия |
| PB4, Engineering + CPIM | Adapter + действующий PDP/admin → привязка существующих controls | Mobile/desktop parity; утверждённые шрифты/цвета/layout; точные ID и price assertion в cart; 1X/XXS/custom показаны только по approved policy | Protected UI contract требует проверенного diff; revert adapter wiring, не rewrite visual manifest |
| PB5, CPIM + OSPM + TSEO | Verified orderability + design families → обновлённый inventory snapshot | K06 PASS только для фактически подтверждённых публичных offer facts; K04 требует подтверждённые модели и inventory policy | Нет данных → affected pages hold; вернуть прежнюю membership version |

Проверка девяти ранее подготовленных пар физических моделей может идти до PB3: она не требует изменения цен и поможет определить настоящий ассортимент будущих hubs. Новый SEO research сейчас не нужен. Владелец не должен повторно заполнять все цены: если дальнейшей предметной проверке понадобится информация, запрос ограничивается конкретными неизвестными комбинациями/двумя truth conflicts. Сейчас можно продолжать подготовку самостоятельно.

## Допуск к запуску

Этот checkpoint уточняет **K06**, не создаёт новый обход launch gate. Для публикации цены выбранная конфигурация, размер, цвет, amount/currency и возможность заказа должны иметь одно актуальное основание. Диапазон допустим как честно обозначенное source evidence, но не как точная цена выбранной комбинации. Preview/default button state не подтверждает заказ.

K06 для этих 21 карточки и общий production indexing gate остаются **FAIL**. Если потребуется catalog-only режим без заказа, это отдельное явное business решение из Architecture v1. Общие security/measurement/policy gates тоже остаются в силе. Никакая новая production миграция или permission escalation для выполненного этапа не требовалась.
