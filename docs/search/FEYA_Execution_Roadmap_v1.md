## M2 policy/domain checkpoint — 26.09.2026

- Canonical public domain confirmed by Human Owner: `https://thefeya.com`.
- Payment settlement architecture is intentionally not frozen. FEYA may receive funds through the eventual merchant/business account or an authorized payment intermediary/merchant-of-record style provider. Public UX must disclose the contracting seller and accepted payment method/arrangement where legally required, but it must not expose internal banking/settlement routing without a real requirement.
- Current store policy: no discretionary order cancellation after placement; anti-free-rental return model; genuine defect/wrong-item/wrong-agreed-size-color-configuration cases receive adjustment/repair/remake/replacement or other required remedy; voluntary sale-item remedies use store credit; made-to-measure/personalized/non-standard custom orders are final sale under store policy; event/weather/shoot changes do not create voluntary cancellation rights.
- Customer issue notice: ideally 1–3 days, no later than 7 days for the voluntary exchange/remake workflow; this does not shorten non-waivable legal rights.
- Customs/duties/clearance charges are buyer responsibility where applicable; event-date delivery is not guaranteed unless expressly accepted in writing for the specific order.
- Checkout must require explicit unticked acknowledgement of Terms + Returns + Shipping and retain policy version + timestamp + quoted tuple evidence.
- Legal-safe implementation guardrail: do not invent hygiene/intimate classifications or blanket carrier disclaimers to evade mandatory consumer rights.
- Public `/returns` and `/shipping` policy pages now exist in preview and remain `noindex` until the final M2 legal/contact/payment package is complete.
- Remaining Human Owner facts for M2 legal shell: public email and final seller/contact address. Final payment provider can remain undecided until payment integration work.

## M1 CLOSED — 26.09.2026

Commerce Truth → authoritative quote is complete for the sealed release `feya-review-207-20260924`.

- 207/207 launch products are structurally aligned.
- 856/856 governed price rows are strict-ready.
- 631 collapsed configuration bindings were repaired without changing commercial values.
- 202 products / 841 ordinary rows, 2 products / 6 manual-price rows, and 3 products / 9 exact color-price rows completed their dedicated governance lanes.
- 856 stable variant identities exist; 207 current variant revisions/heads exist.
- 207 active offers contain 856 exact active offer items.
- 856 real server quote receipts were produced through `feya_commerce_create_quote_v1` for quantity 1.
- 9 source-observed color-price rows bind only to their matching color; 0 size variants were synthesized; Cartesian expansion is false.
- Commercial-values SHA256 remained `a01854f0727a499bf406d07f422b103a7d67c7838c9a62b38bed7c7a48a02bc0` before/after authority bootstrap.
- Execution request `9f1151e3-4fb5-41b9-8922-878c85bfa81a` and its receipt are `SUCCEEDED`.
- Variant/offer/quote runtime health remains ready.
- Order creation, payment and indexing remain OFF.

**M1 DONE condition satisfied:** every launch price-bearing tuple now has a stable variant, active exact offer and authoritative server quote path; browser display prices still have no authority to create an order.

Next macro stage: **M2 — checkout / company / policies / domain**. Do not reopen M1 audits unless the no-repeat policy recheck triggers fire.

> Operating rule from 26.09.2026: use `Verification_Budget_And_No_Repeat_Policy_20260926.md`. Persisted evidence is reused until a defined recheck trigger fires; unchanged facts are not re-audited just because a new chat/session started.

## M1 correction checkpoint — 26.09.2026

A full production binding audit supersedes the earlier two-product structural assumption.

**Authoritative release partition:**
- 207 launch products / 856 price rows total.
- 202 products / 841 rows = ordinary configuration-price lane after structural repair.
- 2 products / 6 rows = manual-price lane; two owner price decisions stay unchanged.
- 3 products / 9 rows = source-observed color-price exception lane; Black/Green/Brown genuinely have different source prices and must not be normalized into the default price-neutral color rule.
- 202 + 2 + 3 = 207 products; 841 + 6 + 9 = 856 price rows.

**Catalog-wide structural defect:**
- 846 price rows use the source configuration axis.
- 215 were already bound to the matching sellable configuration identity.
- 631 rows across 203 products require deterministic rebinding and 631 missing sellable identities.
- No downstream variant/offer/quote identities existed when this was discovered, so repair remains upstream and reversible.
- Commercial amounts, currency and manual overrides are frozen throughout repair.

Production now has `price_baseline_structural_guard_v1` and `release_configuration_binding_repair_v1`. Exact production request
`bba281fa-c767-4392-bf24-de14634b47d0` is `APPROVAL_REQUIRED`; it covers 207 products / 856 rows / 631 rebinds and has no approval hash or execution receipt. Old 205/850 baseline and two-product repair requests are preserved only as audit history and are no longer actionable.

**M1 remaining finite path:**
1. Human Owner approves the exact catalog-wide structural repair; execute and verify 846/846 configuration-axis rows are aligned.
2. Governance lanes:
   - 202 / 841 unchanged-source baseline;
   - 2 / 6 manual-price lane;
   - 3 / 9 exact color-price exception lane.
3. Bootstrap one stable draft variant per exact price-bearing tuple. Do not invent size variants: release source mappings contain no size-axis rows. Size remains non-price fulfillment/personalization data until a separate authoritative size-option contract exists.
4. For ordinary configuration rows, variant tuple uses the exact `configuration_price_id` with color/size null unless source evidence provides a real selectable dimension.
5. For the three color-price products, each exact price row is bound only to its matching color attribute; Cartesian expansion is forbidden.
6. Promote exact active offers from governed rows and verify server quote for every orderable tuple.
7. Order creation/payment/indexing remain OFF until their later macro gates.

**Current Human Owner gate:** only the catalog-wide structural repair above. Color-price governance has been implemented as a separate exact lane but cannot prepare/execute until the structural repair is `SUCCEEDED`.

## Macro execution checkpoint — 25.09.2026

From this point, FEYA work is reported by **macro milestone**, not by every internal E-step. Internal E9–E18 files remain audit history, not the operating roadmap.

### M1 — Commerce Truth → authoritative quote
**Engineering foundation installed. Human authority gate is now the blocker.**

Done:
- 205 clean-source products / 850 price rows isolated and rehearsed;
- exact production baseline request prepared and waiting for Human Owner approval;
- two manual-price products structurally diagnosed;
- exact structural-repair request prepared and waiting for Human Owner approval;
- post-repair manual price-governance schema installed;
- variant, quote and offer-promotion schemas installed and healthy;
- no schema apply changed a commercial amount or made an offer/order/payment/index state active.

Still required to close M1:
1. Human Owner approves clean 205-product baseline request.
2. Execute it and confirm 850/850 strict price readiness.
3. Human Owner approves two-product configuration repair.
4. Execute repair, then prepare/approve/execute two-product price governance.
5. Persist governed current variant revisions for the sellable launch set.
6. Promote exact offers from those revisions.
7. Verify authoritative server quote on every orderable tuple.

**M1 DONE condition:** every launch tuple intended for sale resolves to one stable variant + active offer + exact server quote; no browser price can authorize an order.

### M2 — Checkout / company / policy / domain
Runs in parallel where facts are available.

Still blocked by owner/business facts:
- canonical returns wording;
- final public domain;
- payment provider/account;
- final company/contact/legal/privacy data.

**M2 DONE condition:** provider sandbox purchase + persisted order + policy/domain/company pages + exact shipping/returns truth pass.

### M3 — Search portfolio and content release
Architecture/content work is largely prepared; indexing intentionally remains closed.

**M3 DONE condition:** final page ownership + release content + technical crawl tests pass for the exact commercial release.

### M4 — Launch gate
Requires M1 + M2 + M3 for the URLs being opened.

**M4 DONE condition:** selective pre-index gate PASS, canonical domain live, checkout truth consistent, then controlled index cutover.

### M5 — Measurement / learning
Prepared architecture; activation follows launch instrumentation and real traffic/orders.

**M5 DONE condition:** GA4/GSC/Commerce/Ads observations join through stable IDs and post-change measurement is running.

**Original plan check:** the broad sequence Product Truth → prices/variants → authoritative quote → checkout → selective indexing was the original critical path. The E1–E18 granularity was introduced later because production audits exposed missing schemas, collapsed configuration identities and an unexercised owner-auth boundary. Those micro-steps were safety implementation details, not a new business strategy.


## Latest commerce authority checkpoint — 25.09.2026

- Production baseline-adoption schema is installed; clean 205-product request remains APPROVAL_REQUIRED and unexecuted.
- Production manual-configuration-repair schema is installed; exact two-product request `3181a279-3f98-4faf-874f-788d20d8731a` remains APPROVAL_REQUIRED and unexecuted.
- No price amount, offer, order, payment or indexing activation occurred from either preparation step.
- Protected step-up endpoints and Price Review controls exist, but human execution remains blocked until an allowlisted Supabase Auth owner session and action-specific environment switches are deliberately enabled.

# FEYA Search + Commerce: маршрут до запуска

## Current C4.3 checkpoint — production baseline schema + step-up owner boundary, 25.09.2026

Production project `ysnizcgzhdwdfdkjkhud` now has only the narrowly scoped `price_baseline_adoption_v1` schema installed. Supabase recorded the remote migration as `20260925153503`; repository source remains `supabase/migrations/20260925170000_price_baseline_adoption_v1.sql`. Immediate postflight preserved the exact **205 clean products / 850 price rows / 0 hold** evidence and SHA `500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f`. Anon/authenticated cannot execute the new executor; service_role can.

No 205-product Execution Request, human approval or executor run has occurred in production. Offer/quote/variant migrations remain unapplied; payment and indexing remain OFF.

To preserve the owner-approved direct read-only Product OS preview, protected mutations no longer require turning the whole Admin into a login wall. A dedicated step-up auth boundary now exists for only the baseline prepare/execute endpoint and its baseline-specific approval endpoint. The generic execution-approval route is deliberately excluded. Real isolated browser runtime proof is part of the exact-head CI before any application-side action window is enabled.

**Next gate:** exact-head runtime PASS for the step-up boundary, then hosted environment configuration/verification for owner login + allowlist + the three owner-action switches. Only after that can a production batch be prepared; prepare still performs no price-governance mutation.
Agent-prepared production request `EXE-20260925-154756-AA5DE6` now exists in `APPROVAL_REQUIRED` with no approval/receipt and no price mutation. The two excluded manual-price products were inspected separately: both also contain collapsed sellable-configuration identities, so they must not be pushed through the 205-product baseline gate. Exact six-row structural repair plan: `manual-override-configuration-repair-plan-20260925.json`; commercial amounts remain frozen.


Актуализировано 24 сентября 2026; постоянный checkpoint для следующих сессий. Основа: `FEYA_Search_Architecture_v1.md` (A–K), `FEYA_Page_Portfolio_Schema_v1.md`, `FEYA_Keyword_Research_Queue_v1.json`, `Launch_Track_Decision_20260924.md`, Product/Growth contracts, предметные audits. Статус из этого документа проверяется по фактическому commit, БД и deployment, а не по памяти разговора. Owner отвечает за стратегические бизнес решения; Core проверяет роли/версии и исполняет только разрешённый changeset.

## C4.3-A — quote readiness audit, 25.09.2026

Read-only production audit completed before wiring checkout. Current price/configuration data cannot safely support a 207-product server quote yet: 1,170 configuration-price rows / 460 sellable configurations exist, but the strict approved/non-fallback/public gate yields only **5 configuration-price rows across 2 products**. One additional owner-reviewed price is held because its configuration is still not reviewed. Production C4.1 variant tables/RPCs remain intentionally unapplied.

Added `lib/commerceQuoteReadiness.ts` + SEO regression tests. The gate refuses draft/unreviewed/fallback/sampler/non-public/missing-price evidence and does not activate variants or checkout. Full audit and exact next dependency are in `docs/search/C4_3_Quote_Readiness_20260925.md`.

**C4.3-B implemented as a pure contract:** exact active tuple + offer/product revision CAS + server-derived amount/currency + quantity/overflow guard. Browser amount/currency/orderability fields are rejected. **C4.3-C implemented as unapplied/private infrastructure:** immutable offer projection, idempotent quote receipts and a feature-flagged same-origin server quote API; quote service cannot promote offers and keeps order/payment disabled. **C4.3-D implemented as unapplied controlled mutation:** exact reviewed source price/configuration evidence → immutable offer revision through Execution Gateway + human approval hash; service role still has no direct offer-table DML. Admin route is feature-flagged and restricted to the sealed 207-product release. **Next C4.3-E:** connect readiness review/promotion in admin, then wire PDP/cart to server quotes. No production writes, payment, index activation or visual storefront changes.

## C3.2 continuation — shared closed review and HTML pagination, 24.09.2026

Implemented in the next PR #26 commit; exact-head CI must be attached after completion. This supersedes the earlier statement that shared release integration is still absent.

- One request-scoped, authenticated resolver connects Home, Shop, PDP, head/schema, product links and the closed sitemap policy to `feya-review-207-20260924`.
- 208 raw source identities remain; 207 visible entries. Exact approved copy + pinned images/configuration source amounts + existing owner corrections. Current glossy vegan leather correction applied to a83b1b51. No new approvals or source writes.
- Exact draft IDs are read from the base table; new unrelated drafts do not replace the release. Revocation/archive/content/timestamp drift, missing/moved source, product hold, auth or query failure blocks the entire review. No fallback catalog on a closed-review failure.
- Shop pagination uses real server-rendered links: 11 disjoint pages at 20 per page, last page 7. Filters survive navigation. Existing classes, styles and literal visual copy are frozen separately; ProductCard/ProductDetail/Header/CSS are unchanged.
- **Next after exact-head runtime verification:** C4.3 authoritative variant/quote/orderability projection and UI selection integration; then C5 domain/company/returns/privacy/payment and C6 selective indexing gate. Do not enable indexing or checkout from this review manifest.
- Detailed scope, rollback and validation: `Shared_Review_Release_20260924.md`. Hosted flags and production DB unchanged; no repeated owner product questions required.

## Текущий checkpoint: C4.2 подключён; следующий пакет C3.2, 24.09.2026

Продолжать с `Owner_Decisions_And_Variant_Lifecycle_20260924.md` и `owner-product-decisions-20260924.json`. Ответы по текущим пяти карточкам получены; **не спрашивать повторно**. Владелец разрешил оставить одну золотую карточку; выбрана `453ffb2e…`, `d42dd678…` исключена только из будущего видимого выпуска. Все **208 исходных записей сохраняются, 207 — кандидаты витрины**. Обе witch listings сохранить; costume/headpiece — предложение разделения задач, не подтверждение разных моделей. У `a83b1b51…` текущий материал — глянцевая веганская кожа, Arm/Leg/Full Set и цвет — отдельные измерения. Отложенные 19 изделий не возвращать на критический путь.

C1: 64 metadata reviews теперь **43 proposals / 8 retain / 12 held / 1 suppressed_in_launch**. Approved body/meta/Primary не менялись. Exact-ID material override обновлён для общего PDP panel/writer. Search launch selector проверяет IDs и content hashes, сохраняет источники и запрещает циклы/цепочки suppressed targets. Redirect только candidate, production activation отсутствует.

C2: 50 прежних query proposals по 112 историческим Primary остаются предложениями; исторические selections всех 208 сохранены. Inventory evidence теперь учитывает 207 видимых кандидатов. Headpiece page требует полезного отдельного содержания и ownership review перед индексацией; источник поддерживает её рога и optional costume pieces. Оставшиеся 12 metadata holds сначала разбирать по сохранённым источникам.

C4: новое owner pricing rule `owner-configuration-base-price-20260924-04`: цвет/материал нейтральны по умолчанию; одна базовая цена на комплектацию, отдельный явный override для исключений. Цена не копируется на каждый цвет, product и price revisions независимы; одинаковая цена не создаёт наличие. Schema/read-only audit и реализованный pure variant contract в `commerceVariantContract.ts`: stable tuple IDs, no Cartesian/fallback pricing, revision conflict, подтверждённая exact цена, запрет переназначения/удаления истории. **C4.1 реализован в draft PR: additive schema, private atomic RPC, защищённый Next read/write route, source fingerprints, CAS/idempotency, канонический execution/change event и pending outbox.** См. `Variant_Draft_Writer_20260924.md`. Save сохраняет только draft/retired варианты и unverified/range цены; не подтверждает сумму и не меняет исходные price rows. Новая feature flag по умолчанию OFF. C4.2: редактор в существующей карточке и read-only summary в Growth подключены к одному API/revision. Exact request хранится до POST для восстановления после reload, успех требует receipt + readback, stale form не перезаписывает другую вкладку. В Growth исправлены выявленные браузером перекрытие первой кнопки и clipping drawer (portal/top offset; прежние шрифты/цвета/классы сохранены). См. `Variant_Editor_Integration_20260924.md`; новый head проверять отдельно. Следующий C3.2: единый immutable release/Shop cohort → C4.3 quote/checkout и crawl → C6 pre-index. C5 company/domain/returns продолжать независимо. Draft outbox не потребляется и не обновляет sitemap до release.

Предшествующий `c96e88e49b51a1fd9b99a885e0c518aa5929b143` проверен: CI run `36041097838`, 10/10 jobs, 44/44 runtime, 208/208 approved server HTML. C4.2 локально: 124 Search / 457 SEO PASS, TypeScript и UI contracts PASS; добавлены восемь сценариев настоящего редактора, включая reload после потери ответа. Новый пакет проверять по точному head PR; результат CI фиксировать в PR checkpoint, не переносить статус старого commit. **От владельца сейчас ничего не требуется: ни повторных ответов, ни новых исследований, файлов или подключений.**

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
| 1. Truth и покупки | 223 состава resolved / 20 hold во всём каталоге; 208/208 resolved в целевой группе после correction; tuple price требует отдельной проверки | CPIM + GDAE; выбранный release inventory → точные composition/design/binding; остальные случаи — отдельный backlog | C4.1 variant writer → C4.2 save/reload → точная server-side quote для каждой продаваемой комбинации; нет auto Cartesian, label dedupe и цены по умолчанию; иначе соответствующий товар остаётся недоступным для заказа |
| 2. Company/API review | Нет доказанного публичного release на утверждённом домене | Owner + TSEO; identity/contact/policy/application description → правдивые страницы для проверки компании и назначения внутренней аналитики | HTTPS, реальные сведения, недоступность private admin, точный scope заявки; Google API permission проверяется независимо от сайта |
| 3. Товарный и поисковый портфель | 243 сохранённых page IDs, пять briefs; 0 confirmed query owners; хабы — candidates | OSPM + CPIM + SCO; inventory families, existing demand, Q02 decision seeds → page specs, intent owners, unique-value briefs | Нет конфликта primary query ownership; достаточный доказанный ассортимент; несостоявшиеся хабы остаются фильтрами/holds |
| 4. Content и release manifest | 208 approved источников, 207 visible candidates после решения владельца; 208 bindings сохранены; публикация не разрешена | CQA + TSEO + Engineering; approved Product Truth и briefs → EN home/shop, подтверждённые PDP, полезные service pages, обоснованные hubs и только eligible editorial | Факты/состав/материал/размер/FAQ/schema согласованы; server HTML, canonical, sitemap, robots, pagination и internal links соответствуют одной release версии |
| 5. Commerce и платежи | Checkout decision, provider, политики returns — открыты | Owner + Commerce + Engineering; реальные условия и approved bindings → provider sandbox → оплата/подтверждение/возврат | Полная успешная и ошибочная покупка, consistency сервера и UI, order persistence; при сбое checkout feature flag OFF |
| 6. Измерение и аналитика | Atomic import подготовлен, восемь миграций не применены; live Ads capability неизвестна | GDAE + GMEL; staged DB/app contract, GA4/GSC/Ads credentials → проверенные events, snapshots, diagnostics и decision loop | Hosted staging + advisors + Auth + rollback; actual GA4/GSC/Ads permissions, real paid order для purchase; CSV fallback пока API закрыт |
| 7. Выборочная индексация | FAIL; ничего не открывать по умолчанию | TSEO + Core + Owner; exact release и утверждённые страницы → K01–K18, browser crawl, URL inspection после релиза | PASS каждого blocker на конкретном release, canonical domain, policy и ownership; откат release/manifest и selective noindex, историю сохранить |
| 8. После запуска | План, не измеренный результат | GMEL + OSPM + CQA; GSC/GA4/order data/change history → наблюдение, content refresh, keep/merge/retire proposals | Thresholds предварительно заданы; достаточная выборка, задержка данных и сезонность; никакой причинности из простого before/after |

Этапы 1 и 2 готовятся параллельно; 6 можно готовить независимо от 3–5. Публичный company release не ждёт всех product holds или Keyword Planner; фактический checkout требует доказанной цены выбранной комбинации. Полное снятие `noindex` ждёт этапы 1, 3, 4, 5 и нужные технические/security части 6–7 для конкретных коммерческих URL. Если решён каталог без оплаты, это отдельное явное решение с корректной семантикой страниц, не скрытый обход commerce gate.

## Исторический checkpoint до C1/C2/C5 (не следующий work package)

Текущий checkpoint: [Deployment_Source_Map_20260924.md](Deployment_Source_Map_20260924.md). Прежний локальный пакет полностью опубликован в `c2b5cd4`, 12 Git blobs и полное дерево проверены; CI 9/9, runtime log 30 PASS, preview READY. Установлены обе screenshot branch/deployment связи. Supabase ref и 243-record contracts проверены SELECT; привязка Vercel environment к БД ещё неизвестна. На проверенном preview действует Vercel SSO; public release нуждается в отдельном анонимном тесте. 15 cover images просмотрены; результаты записаны в Design Review.

Актуальный приоритет: [Approved_Catalog_Launch_20260924.md](Approved_Catalog_Launch_20260924.md), decision `owner-full-approved-catalog-20260924-03`. **Все 208 approved товаров — целевой каталог. Пятёрка — только техническая выборка, не лимит выпуска.** Предыдущие 28 — результат узкого traceability preflight, не сокращение ассортимента и не отзыв остальных approval.

1. C1: закончить предметный разбор 64 карточек с точными повторными title/H1. Четыре field-level proposals готовы; сохранить основные тексты, преимущества, meta descriptions, keywords и IDs. Точных дублей полных описаний и meta descriptions среди 208 нет.
2. C2: назначить accountable query ownership в пределах 208 PDP и обоснованных hubs. Повторный широкий Primary не означает автоматический конфликт или необходимость переписать страницу. Старые metric dates сохраняются; live Ads API не требуется для повторения уже выполненной работы.
3. C3: подключить подготовленные 208 projections к разрешённой серверной release версии и существующему PDP renderer. Metadata/PDP должны использовать один immutable payload/hash. Сейчас public route ещё читает storefront view с отличающимися полями.
4. C4: проверить реальные tuple quotes/variants, canonical/schema/links/sitemap/pagination по всему целевому списку. Исправление Bra/Skirt подготовлено, состав разрешается у всех 208; orderability из этого не следует.
5. C5 / LT1: независимо подтвердить public domain, deployment→DB связь и company/contact/policy данные, затем платёжный sandbox. Если отсутствует бизнес-факт, сначала подготовить конкретный reviewable пакет, затем запросить владельца.
6. C6: exact release и pre-index checks, затем разрешённый cutover/rollback и мониторинг. Отложенные 19 изделий и весь дополнительный ассортимент не стоят на критическом пути. Поддержку Dress/Jacket и расширение вернуть после релевантного решения/данных.

Текущие source fingerprints, 208 exact IDs/bindings и все различия: `approved-catalog-audit-20260924.json`, `approved-catalog-content-bindings-20260924.json`, `metadata-distinction-queue-20260924.json`. Production DB SELECT only, indexing OFF; новых подтверждений или файлов от владельца сейчас не требуется.

## Формат ответа владельцу после каждого этапа

Коротко: **что готово → что остаётся заблокированным → следующий шаг → что требуется от вас сейчас**. Указывать отдельно локальный результат, remote PR, production DB и индексацию. Если действий владельца пока нет, говорить об этом явно. Если требуется факт, показывать конкретный товар/решение и почему источники его не содержат.

### Исторический runtime checkpoint C3 и обнаружение C5

Основной renderer `bd0a0718` прошёл 9/9 CI, 36/36 runtime сценариев, 208/208 серверных PDP. Подробности и artifact SHA — в `Approved_Content_Integration_20260924.md`. Последний canonical-origin follow-up и актуальный branch head проверять по верхнему checkpoint PR; не переносить автоматически CI статус между коммитами.

C5 исходно выявил production day type и express 6–9 против канонических 7–10. Сроки исправлены в новом пакете после актуального SELECT; Footer placeholder links и неподтверждённый Berlin/материалы остаются открыты. Основной SEO draft не подтверждает sidebar policy copy.

