# FEYA Search + Commerce: маршрут до запуска

Актуализировано 24 сентября 2026; постоянный checkpoint для следующих сессий. Основа: `FEYA_Search_Architecture_v1.md` (A–K), `FEYA_Page_Portfolio_Schema_v1.md`, `FEYA_Keyword_Research_Queue_v1.json`, `Launch_Track_Decision_20260924.md`, Product/Growth contracts, предметные audits. Статус из этого документа проверяется по фактическому commit, БД и deployment, а не по памяти разговора. Owner отвечает за стратегические бизнес решения; Core проверяет роли/версии и исполняет только разрешённый changeset.

## Неподвижные ограничения

- Публичный язык EN, admin RU. Шрифты, цвета, компоненты storefront и Product OS защищены; визуальный редизайн — отдельная задача.
- Product Truth конкретного изделия выше SEO draft/названия/фотографий. Никакой генератор текста не создаёт состав, цену, наличие или право продажи.
- Стабильные `canonical_product_id`, `configuration_price_id`, `seo_page_id`, `query_cluster_id`; все изменения через versioned evidence, owner/agent authority, change history и rollback.
- Исследования Google и конкурентов — доказательства и гипотезы, не FEYA продажа/частотность и не лицензия создавать страницы на каждую ось DNA.
- Не менять production DB, платежи, домен, опубликованные политики и index flags без конкретного проверенного release и соответствующего решения владельца.

## Карта этапов и зависимостей

| Этап | Статус на 24.09 | Owner; вход → результат | Условие готовности / при сбое |
| --- | --- | --- | --- |
| 0. Базовая интеграция | Код синхронизирован: draft PR №26, `c2b5cd4`; CI 9/9 и preview READY; hosted env/DB mapping открыт | Engineering + Core; сверка Product/Growth/старого канона → versioned repo/deployment/data map и опубликованный проверенный PR | Точный head CI, защищённые UI contracts, source DB identity; откат commit/feature flag, без слепого merge |
| 1. Truth и покупки | 222 состава resolved; 21 hold; 142 price rows разобраны, tuple price unknown | CPIM + GDAE; 21 адресный case и девять model pairs → approved composition/design/binding, неизвестные факты изолированы | Точная server-side quote для каждой продаваемой комбинации; нет auto Cartesian, label dedupe и цены по умолчанию; иначе соответствующий товар остаётся недоступным для заказа |
| 2. Company/API review | Нет доказанного публичного release на утверждённом домене | Owner + TSEO; identity/contact/policy/application description → правдивые страницы для проверки компании и назначения внутренней аналитики | HTTPS, реальные сведения, недоступность private admin, точный scope заявки; Google API permission проверяется независимо от сайта |
| 3. Товарный и поисковый портфель | 243 сохранённых page IDs, пять briefs; 0 confirmed query owners; хабы — candidates | OSPM + CPIM + SCO; inventory families, existing demand, Q02 decision seeds → page specs, intent owners, unique-value briefs | Нет конфликта primary query ownership; достаточный доказанный ассортимент; несостоявшиеся хабы остаются фильтрами/holds |
| 4. Content и release manifest | Спецификация есть; публикация не разрешена | CQA + TSEO + Engineering; approved Product Truth и briefs → EN home/shop, подтверждённые PDP, полезные service pages, обоснованные hubs и только eligible editorial | Факты/состав/материал/размер/FAQ/schema согласованы; server HTML, canonical, sitemap, robots, pagination и internal links соответствуют одной release версии |
| 5. Commerce и платежи | Checkout decision, provider, политики returns — открыты | Owner + Commerce + Engineering; реальные условия и approved bindings → provider sandbox → оплата/подтверждение/возврат | Полная успешная и ошибочная покупка, consistency сервера и UI, order persistence; при сбое checkout feature flag OFF |
| 6. Измерение и аналитика | Atomic import подготовлен, восемь миграций не применены; live Ads capability неизвестна | GDAE + GMEL; staged DB/app contract, GA4/GSC/Ads credentials → проверенные events, snapshots, diagnostics и decision loop | Hosted staging + advisors + Auth + rollback; actual GA4/GSC/Ads permissions, real paid order для purchase; CSV fallback пока API закрыт |
| 7. Выборочная индексация | FAIL; ничего не открывать по умолчанию | TSEO + Core + Owner; exact release и утверждённые страницы → K01–K18, browser crawl, URL inspection после релиза | PASS каждого blocker на конкретном release, canonical domain, policy и ownership; откат release/manifest и selective noindex, историю сохранить |
| 8. После запуска | План, не измеренный результат | GMEL + OSPM + CQA; GSC/GA4/order data/change history → наблюдение, content refresh, keep/merge/retire proposals | Thresholds предварительно заданы; достаточная выборка, задержка данных и сезонность; никакой причинности из простого before/after |

Этапы 1 и 2 готовятся параллельно; 6 можно готовить независимо от 3–5. Публичный company release не ждёт всех product holds или Keyword Planner; фактический checkout требует доказанной цены выбранной комбинации. Полное снятие `noindex` ждёт этапы 1, 3, 4, 5 и нужные технические/security части 6–7 для конкретных коммерческих URL. Если решён каталог без оплаты, это отдельное явное решение с корректной семантикой страниц, не скрытый обход commerce gate.

## Следующий bounded work package

Текущий checkpoint: [Deployment_Source_Map_20260924.md](Deployment_Source_Map_20260924.md). Прежний локальный пакет полностью опубликован в `c2b5cd4`, 12 Git blobs и полное дерево проверены; CI 9/9, runtime log 30 PASS, preview READY. Установлены обе screenshot branch/deployment связи. Supabase ref и 243-record contracts проверены SELECT; привязка Vercel environment к БД ещё неизвестна. На проверенном preview действует Vercel SSO; public release нуждается в отдельном анонимном тесте. 15 cover images просмотрены; результаты записаны в Design Review.

1. Закончить LT1: сопоставить PR head, deployments, DB refs и домен; зафиксировать расхождения. Не использовать READY preview как доказательство production readiness.
2. Продолжить LT2 после завершённого просмотра 15 cover images: сопоставить девять visual-supported proposals с предметным составом и источниками вариантов; family assignments пока не применены.
3. Для 21 held item: владелец разрешил адресные вопросы по две–пять карточек и уточнил, что DNA axes служат keywords. Подготовлен первый batch из пяти товаров. Состав устанавливать по вариациям/опциям, тексту и прямому ответу; цены и размерные tuples проверять отдельно.
4. Составить release inventory для company/trust и первого ограниченного product pilot. Одновременно проверить какие из Q02 seed запросов действительно меняют page decision; без Ads API пользоваться имеющимся CSV workflow.
5. Перед каждым внешним изменением обновлять checkpoint: входные SHA/revision, доказательства, diff, тесты, rollback, фактический remote/deployment/DB статус и что требуется от Owner. Никакого утверждения CI успеха для локального commit без exact-head CI.

## Формат ответа владельцу после каждого этапа

Коротко: **что готово → что остаётся заблокированным → следующий шаг → что требуется от вас сейчас**. Указывать отдельно локальный результат, remote PR, production DB и индексацию. Если действий владельца пока нет, говорить об этом явно. Если требуется факт, показывать конкретный товар/решение и почему источники его не содержат.
