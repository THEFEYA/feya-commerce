# C4.2 — редактор вариантов и единое чтение Product/Growth

24 сентября 2026. Пакет для draft PR №26, поверх проверенного `c96e88e4` (10/10 CI, 44/44 runtime, 208 review PDPs). Проверки нового head фиксируются отдельно в верхнем checkpoint PR. Production DB/flags — без изменений.

## Что реализовано

Существующая Product OS карточка `/admin/products/{slug-or-id}` получила дополнительный блок «Варианты товара». Он включается только серверным `FEYA_PRODUCT_VARIANT_DRAFT_ENABLED=true` при обязательном Auth. Оформление окружающей карточки, storefront, шрифты, цвета, CSS и прежние поля не изменены. Карточка фактов в Growth `/admin/product-facts-review` показывает сохранённую revision того же товара через тот же API, с переходом в Product OS для редактирования. Второго хранилища или отдельного writer в Growth нет. Включение draft UI в production не разрешено этим пакетом.

Пользователь выбирает существующую комплектацию, добавляет цвета/размеры и явно задаёт каждое сочетание. Новые атрибуты по умолчанию — `proposed`; варианты — `draft`. Можно менять названия/статусы и отправлять значения в архив. Архивирование цвета/размера архивирует связанные сочетания; возврат атрибута из архива не активирует их автоматически. Старые IDs, base quotes, исключения и история остаются. Нельзя заменить стабильный ID другого сочетания или создать дублирующий tuple.

**Цена не назначается цвету.** Обычный вариант использует ссылку на базовую цену выбранной комплектации. Новая комплектация начинает с неподтверждённой цены без суммы (`amount_minor=null`) и ссылки на исходный price ID/fingerprint. Значения источника показаны отдельно: редактор не выбирает сам между source/public/manual override и не превращает нижнюю границу диапазона в точную цену. Уже сохранённые base quotes и explicit exceptions перечитываются без перезаписи. Ценовые поля здесь не редактируются; подтверждение цены/доступности — C4.3. Материальные Product Truth/SEO поля и факты очереди Growth не переписываются variant draft save.

## Сохранение и восстановление

1. Аутентифицированный GET возвращает snapshot, source bindings, revision и `editor_actor_id`, взятый сервером из свежего Auth lookup. Shared parser проверяет product ID, структуру/версию, привязку context к каждому source price row и закрытые publish/index/checkout flags.
2. UI присваивает новые UUID при явном добавлении записи, не во время рендера. На Save формируется один request ID с expected revision и неизменяемым payload.
3. **До POST** точный запрос сохраняется в `sessionStorage` под отдельным ключом actor + product. Это временный запрос восстановления, не product master. Если браузер не может его сохранить, POST не отправляется. Несохранённые локальные правки до Save не гарантируются после ухода со страницы; beforeunload предупреждает о них.
4. POST идёт только в существующий защищённый Next API. Cookie Auth и allowlist задают actor; JSON actor/approval всё ещё запрещены. UI отправляет `X-Feya-Editor-Actor` как дополнительное условие совпадения с текущим Auth, а не как источник полномочий. Смена аккаунта между чтением и записью получает 409 до RPC. Для обычного API caller без этого заголовка полномочия по-прежнему определяет Auth.
5. Успех показывается зелёным **после POST receipt и свежего GET**, с проверкой revision/hash. Если уже появилась более новая revision, это сообщается явно. Unknown/неполный ответ не называется «сохранено» или «записей нет».
6. При потере ответа exact request остаётся. После reload пользователь нажимает «Проверить результат»: повторяются прежний request ID и payload, даже если сервер успел записать revision. Редактирование до разрешения результата заблокировано. Запросы имеют timeout 20 секунд; timeout не означает отмены DB commit.
7. Доказанный `not_written` при stale revision/source закрывает старое сохранение. Проигравшая вкладка сохраняет введённые значения на экране и требует явного «Загрузить актуальную версию». Нет скрытого merge или перезаписи победившей версии.
8. Read-only Growth drawer читает текущую сохранённую revision/hash, не pending edits другой вкладки. Открытие/«Обновить варианты» перечитывает БД. Realtime/background polling не добавлены.

SessionStorage не содержит токенов/ключей и не служит авторизацией. Схема envelope версионирована, product/actor сверяются после Auth GET. Изменение local cache не обходит серверные проверки. При недоступной/повреждённой записи восстановление останавливается; новый request ID автоматически не создаётся.

## Визуальный контракт и проверка

Продолжение согласованного этапа редактирования цветов/вариантов даёт разрешение на этот функциональный блок. Оно не означает разрешения на редизайн. Обновлены только два hash entry существующей Product OS интеграции — parent page и detail component. Дополнительный `product-os-variant-jsx-baseline.json` фиксирует исходный JSX четырёх поверхностей на `c96e88e4`. Тест исключает только новый условный mount и его enable prop и доказывает сохранность всех остальных классов, текстов и расположения блоков. Проверка 41 frozen файла и Owner UI остаётся обязательной.

Локально: 124/124 Search (семь domain/recovery сценариев редактора + визуальная regression), 457/457 Product/SEO, TypeScript, admin boundary, UI freeze и Owner UI PASS. Полный DB/build/runtime остаётся обязательным в exact-head CI; результаты предшественника не переносятся.

В прежний isolated runtime добавлены восемь проверок:

- существующая Product page с восстановленной captured builder view и отдельной synthetic private Growth queue projection, без замены наблюдаемого reader;
- реальные поля/кнопки редактора → Auth → Next → PostgREST → DB → reload для первого draft;
- второе цветовое сочетание с одной базовой ценой; Growth показывает тот же hash/revision;
- конфликт двух открытых форм и явное перечитывание;
- потеря ответа **после реального DB commit**, reload браузера и идентичный replay без новой revision;
- отказ sessionStorage до отправки POST и несовпадение expected actor;
- архивирование с сохранением IDs/quote/source amounts;
- desktop/mobile, console/page errors, default-off скрытие блока в обеих админках.

UI, cookies/Auth, API и DB реальные, пользователи/товары/цены синтетические. Для этого synthetic товара старая Product page использует штатный catalog fallback; captured builder view сохранена, но полный Product Truth/media/review-event контур не seeded и показывает прежние диагностические сообщения. Fact queue — fixture для подключения существующего drawer, не доказательство всех production CPIM readers. В этом workspace нет Docker/browser CLI; полный браузерный прогон выполняется существующим CI с Chromium, а screenshots скачиваются для визуальной проверки. Production deployment, реальные media и orderability не сертифицируются этим тестом.

Первый runtime на `9db5d49b` обнаружил неоднозначную доступную подпись вложенного `<select>`: поиск точного имени включал option text. Исправлены доступные имена шести select controls в новом редакторе; видимые подписи и классы сохранены. Повторный exact-head runtime обязателен. Второй прогон `faaeb65e` подтвердил первое UI save/reload и выявил перекрытие кнопки «Разобрать» закреплённым `<th>` старой Growth table. Тест сравнивает hit area при флаге ON/OFF и открывает drawer штатной клавиатурой (focus + Enter), без force-click и изменения CSS. Mouse-flow для этой строки остаётся отдельным открытым legacy UI issue; тест не объявляет его исправленным. Восстановление потерянного ответа ожидает сообщение об unknown outcome после завершившегося POST, а не раннее появление disabled кнопки повтора.

## Rollback и следующий пакет

Rollback: `FEYA_PRODUCT_VARIANT_DRAFT_ENABLED=false` скрывает дополнительный блок и закрывает API; прежние страницы продолжают работать. Сохранённые draft revisions/IDs/receipts не удалять. При rollback до API без actor/read contract новые клиенты должны отказать, а не записывать по fallback. Операционная остановка DB writer описана в C4.1; новую миграцию C4.2 не добавляет.

| Следующая задача / owner | Вход → результат | Проверка и blocker | Rollback / done |
| --- | --- | --- | --- |
| C3.2 Engineering + TSEO + CQA | 208 approved bindings, 207 visible candidates, owner decisions и versioned variants → immutable release manifest и общий public-safe read contract | Shop/PDP/metadata/schema/links/sitemap читают одну release; исключённая карточка сохраняет source history; draft outbox не публикует самостоятельно | Предыдущий manifest. Done: cohort и derivations доказаны, default indexing OFF |
| C4.3 CPIM + Commerce | Source price/size/range evidence + configuration IDs → подтверждённые server quotes | Отдельное основание цены, реальные tuple/size exceptions, stale cart, unknown override без fallback; неудобные source labels требуют проверенной подписи по прошлой lineage, не угадывания | Checkout OFF. Done: выбранные состав/размер/цвет и цена совпадают в UI/server/order |
| C5 Owner + Engineering | Канон компании, domain/deployment/DB map, policies/provider → конкретный review пакет | Неизвестный бизнес-факт сначала искать в каноне; спрашивать только остаток | Предыдущий release. Done: достоверные company/trust страницы и provider sandbox |
| C6 Core + TSEO | Exact release + security/commerce/ownership gates → выборочный cutover | Все blocker gates бинарно PASS на разрешённых URL | Предыдущий release/selective noindex. Done: разрешённый запуск и мониторинг |

**От владельца сейчас ничего не требуется.** Новые CSV, подключения, повторные ответы и массовая генерация текстов не нужны. Следующий исполняемый пакет — C3.2; C5 идёт независимо. Source records 208 / visible candidates 207 и 19 отложенных изделий остаются без пересмотра.
