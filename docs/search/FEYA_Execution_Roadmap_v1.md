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
| 1. Truth и покупки | 222 состава resolved; из 21 hold 19 owner-deferred для расширения; 2 точечных случая вне первой пятёрки; tuple price требует проверки для выбранного выпуска | CPIM + GDAE; выбранный release inventory → точные composition/design/binding; остальные случаи — отдельный backlog | Точная server-side quote для каждой продаваемой комбинации; нет auto Cartesian, label dedupe и цены по умолчанию; иначе соответствующий товар остаётся недоступным для заказа |
| 2. Company/API review | Нет доказанного публичного release на утверждённом домене | Owner + TSEO; identity/contact/policy/application description → правдивые страницы для проверки компании и назначения внутренней аналитики | HTTPS, реальные сведения, недоступность private admin, точный scope заявки; Google API permission проверяется независимо от сайта |
| 3. Товарный и поисковый портфель | 243 сохранённых page IDs, пять briefs; 0 confirmed query owners; хабы — candidates | OSPM + CPIM + SCO; inventory families, existing demand, Q02 decision seeds → page specs, intent owners, unique-value briefs | Нет конфликта primary query ownership; достаточный доказанный ассортимент; несостоявшиеся хабы остаются фильтрами/holds |
| 4. Content и release manifest | Выбраны 5 кандидатов из 28 предварительно совместимых; публикация не разрешена | CQA + TSEO + Engineering; approved Product Truth и briefs → EN home/shop, подтверждённые PDP, полезные service pages, обоснованные hubs и только eligible editorial | Факты/состав/материал/размер/FAQ/schema согласованы; server HTML, canonical, sitemap, robots, pagination и internal links соответствуют одной release версии |
| 5. Commerce и платежи | Checkout decision, provider, политики returns — открыты | Owner + Commerce + Engineering; реальные условия и approved bindings → provider sandbox → оплата/подтверждение/возврат | Полная успешная и ошибочная покупка, consistency сервера и UI, order persistence; при сбое checkout feature flag OFF |
| 6. Измерение и аналитика | Atomic import подготовлен, восемь миграций не применены; live Ads capability неизвестна | GDAE + GMEL; staged DB/app contract, GA4/GSC/Ads credentials → проверенные events, snapshots, diagnostics и decision loop | Hosted staging + advisors + Auth + rollback; actual GA4/GSC/Ads permissions, real paid order для purchase; CSV fallback пока API закрыт |
| 7. Выборочная индексация | FAIL; ничего не открывать по умолчанию | TSEO + Core + Owner; exact release и утверждённые страницы → K01–K18, browser crawl, URL inspection после релиза | PASS каждого blocker на конкретном release, canonical domain, policy и ownership; откат release/manifest и selective noindex, историю сохранить |
| 8. После запуска | План, не измеренный результат | GMEL + OSPM + CQA; GSC/GA4/order data/change history → наблюдение, content refresh, keep/merge/retire proposals | Thresholds предварительно заданы; достаточная выборка, задержка данных и сезонность; никакой причинности из простого before/after |

Этапы 1 и 2 готовятся параллельно; 6 можно готовить независимо от 3–5. Публичный company release не ждёт всех product holds или Keyword Planner; фактический checkout требует доказанной цены выбранной комбинации. Полное снятие `noindex` ждёт этапы 1, 3, 4, 5 и нужные технические/security части 6–7 для конкретных коммерческих URL. Если решён каталог без оплаты, это отдельное явное решение с корректной семантикой страниц, не скрытый обход commerce gate.

## Следующий bounded work package

Текущий checkpoint: [Deployment_Source_Map_20260924.md](Deployment_Source_Map_20260924.md). Прежний локальный пакет полностью опубликован в `c2b5cd4`, 12 Git blobs и полное дерево проверены; CI 9/9, runtime log 30 PASS, preview READY. Установлены обе screenshot branch/deployment связи. Supabase ref и 243-record contracts проверены SELECT; привязка Vercel environment к БД ещё неизвестна. На проверенном preview действует Vercel SSO; public release нуждается в отдельном анонимном тесте. 15 cover images просмотрены; результаты записаны в Design Review.

Новый приоритет владельца и исполнимый следующий спринт: [Initial_Launch_Pilot_20260924.md](Initial_Launch_Pilot_20260924.md), decision `owner-launch-scope-20260924-02`. 17 формованных корсетов/топов и 2 зеркальных комплекта перенесены в расширение. Это не исключение всех пластиковых изделий, всех корсетов или товаров со словом dress. Вопросы о креплениях/размерах отложенных семейств больше не входят в критический путь запуска.

1. P1: проверить факты и существующий текст пяти выбранных draft IDs, подготовить привязку точной reviewed версии к storefront renderer. Не генерировать заново каталог и не отзывать прежние подтверждения.
2. P2: разрешить primary ownership для выбранных товаров с учётом существующих peer drafts и планируемых hubs. 23 exact-primary overlap groups — диагностические совпадения, не измеренная каннибализация.
3. P3: проверить цены/варианты пяти товаров, собрать reviewable release manifest; независимо управлять catalog visibility, purchase и index eligibility. Offline candidate report не используется как runtime allowlist.
4. P4 / продолжение LT1: подтвердить public domain, безопасные deployment→DB связи, company/contact/policy данные. Подготовить конкретный пакет недостающих фактов, если источников не хватит. Company/API review не ждёт Keyword Planner и расширения ассортимента.
5. P5: платежный sandbox и selective search gate для конкретного выпуска, затем проверяемый cutover/rollback. Все production flags пока OFF.
6. После первого выпуска: мониторинг; возвращение к отложенным семействам при решении владельца и релевантных данных. Dress/Jacket добавить согласованно в UI, server contracts и keyword matching, сохранив старые решения.

Точный source/draft/decision/page ID набор и исходные fingerprints сохранены в `launch-cohort-report-20260924.json`. Проверено 224 последних draft records (208 approved); 28 прошли строгие offline prerequisites. Для первой проверки выбраны 5. От владельца сейчас дополнительных данных не требуется.

## Формат ответа владельцу после каждого этапа

Коротко: **что готово → что остаётся заблокированным → следующий шаг → что требуется от вас сейчас**. Указывать отдельно локальный результат, remote PR, production DB и индексацию. Если действий владельца пока нет, говорить об этом явно. Если требуется факт, показывать конкретный товар/решение и почему источники его не содержат.
