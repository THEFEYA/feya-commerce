# TheFEYA → Bonanza: путь к живой публикации (12.10.2026)

Status: **READY_FOR_SELLER_EVIDENCE / NO_UPLOAD_YET**.
Source: `public.feya_bonanza_preflight_mapping_v1` in Supabase project `ysnizcgzhdwdfdkjkhud`, owner-reviewed, and existing GitHub staging. Source and storefront products are immutable for this migration; read-only queries only. No Bonanza live write and no email operations.

## Подтверждённые данные (не собирать заново)

- 207/207 товаров с owner mapping для colorways, materials, audience, 1 `owner_hold=true` product (Gold Festival Fringe Outfit).
- 856 исходных реальных ценовых конфигураций из M1 Offer; 2161 планируемых вариантных комбинаций в `package-20261012/05_THEFEYA_EXPANDED_VARIATION_PLAN_NOT_FOR_IMPORT.csv`. Варианты созданы только из подтверждённых цветовых сочетаний и исходных цен; not a guarantee of future Bonanza validation.
- В source owner catalog записано 822 picture HTTPS URL: у всех 207 есть изображения, 205 имеют по 4 URL. Изображения как внешние URL не проверены Bonanza, не заявлять успешную загрузку изображений.
- Распределение `variation_axis_plan`: 199 `CONFIGURATION_PLUS_COLOR_CHECK_CATEGORY_TRAITS`, 4 `CONFIGURATION_CHECK_CATEGORY_TRAITS`, 3 `SOURCE_COLOR_PRICE_CONFLICT_HOLD`, 1 `MATERIAL_PLUS_COLOR_CHECK_CATEGORY_TRAITS`.
- Все 207 `publish_gate=HOLD`, 0 записей с подтверждёнными live Bonanza `category_traits_verified=true`, 151 запись содержит хотя бы один `risk_codes`. Пересечения кодов допускаются.
- Риски: `UNCONFIRMED_LEGACY_LATEX` 118; `CATEGORY_SEMANTIC_REVIEW` 70; `MISSING_SELLABLE_COMPOSITION` 20; `SOURCE_COLOR_PRICE_CONFLICT` 3; `OWNER_HOLD` 1; `PRESERVE_MATERIAL_PRICE_OPTIONS` 1; `LEGACY_COUPLE_AUDIENCE_MISMATCH` 1.
- `UNCONFIRMED_LEGACY_LATEX` **не означает фактический латекс**; расхождение между старой записью и owner-confirmed material base следует отразить корректным описанием и не выдавать старый тег за правду.
- Один мужской chest harness: Vegan Leather $86.90 / Genuine Leather $125.52, не усреднять. Три harness продукта с разными исходными Color prices; никакого самовольного правила равенства цен и новых цен на White.
- Нельзя делать `Color=Top`, `Size=Full Set`. Двойные цвета Black + Gold / White + Silver — цельные цветовые опции. Finish (mirror, patent) — не отдельная ось выбора материала, кроме документированного исключения.
- В текущем source shop code `thefeya`, seller booth known as `DariaL20 / She_Knows`. **Нужно явное подтверждение владельца**, что перенос выполняется именно из TheFEYA в этот конкретный Bonanza booth, а не в новый брендовый booth.

## Варианты реализации

**1. Предпочтительно: официальный Bonanza API**

При подтверждённом developer account + seller OAuth/token использовать `getCategories` и `getCategoryTraits` для реального category ID и конкретных traits с `variationsEnabled=true`. Затем `addFixedPriceItem` с `item.variations`, explicit `price,quantity,sku,imageIndex,nameValueList` (максимум две оси). `allowForSale=false` на создание unpublished items и верификация через `getUnlistedItem`. После pilot — небольшие контролируемые партии (официально `addMultipleFixedPriceItems` до 5 items/request).

**API developer enrolment**: https://api.bonanza.com/accounts/new . Requires Bonanza's approval. Do not request passwords/tokens in chat or store any secret in Github. User should authorize directly in Bonanza or secure server configuration.

**2. CSV native importer — только если есть подтверждённые заголовки для двумерных SKU+price**

Official simple CSV headers `id,title,price,category,description` and optional `quantity,image` are known. Public blog **does not** define working two-axes variant CSV header schema. Test `01_BONANZA_PILOT_1_FULLSET_DRAFT_TEST.csv` can validate only a single Full Set with one image, not multiple variants, and remains blocked by booth review. Do **NOT** claim `quantity=0` guarantees draft mode in importer.

**3. True fallback when neither 1 nor 2 supports configuration**: truthful Full Set by actual Full Set price + separate valid component listings with their own prices, categories, photos; no misleading multipurpose option. Fallback multiplies listings and needs duplicate-control plus owner's approval. Do not create blindly; many items are stand-alone accessories and Full Set can mean matching shoulder pairs.

## Что нужно от владельца — в порядке, который разблокирует работу

1. **Destination confirmation:** переносим выбранные TheFEYA products в существующий `DariaL20 / She_Knows`? (Source name and booth name differ.) No destructive operations before confirmation.
2. **Current booth status screenshot:** `Selling → Import from inventory file` entire `Inventory File Import Settings`; show warning or its absence. Do not click import/update. Earlier screenshot showed `administrative review`; no authoritative clearance confirmed on 12 Oct.
3. **Old items backup:** `Selling → Batch edit items → Inventory Details → Export filtered items` for ALL 202 old items. Download CSV or ZIP, upload here. Existing third-party Etsy imports must not be assumed to match CSV external IDs or `force_update`. Do not remove old items before verified backup and successful new pilot.
4. **API possibility:** if developer credentials already approved, only report status `approved/not requested/pending` (NO keys). If absent, seller can choose developer approval route or provide actual Bonanza CSV variant header template from their importer.
5. **Non-sensitive booth settings screenshots:** `Selling → Booth settings → Shipping & returns` (origin country, handling days, destination/rates, mask addresses) and `Payments & purchases` (only confirmation that seller payment methods are connected, hide personal finance fields). Need non-US international fixed-rate profile and truthful shipping origin.
6. **After pilot** owner selects whether to retire old Etsy imports (and which IDs); explicit destructive authorization only after all live new variants are checked.

Prior screenshots of Color and `Add more details` are already understood; **no need to resend** unless the interface changes.

## Publication gates

- Confirm Bonanza identity/category group per item, not only candidate leaf. Currently **0** actual category variation schemas verified.
- Clean shopper-facing title ≤80 chars, actual seller product components, 1-4 authentic photos (API limit), and properly formatted description, no internal HOLD disclaimers or stale latex; not all materials are vegan leather.
- Each chosen **Configuration × Color** or **Material × Color** combination has explicit numeric USD price and distinct SKU. Numeric parity of source e.g. €159.23 → $159.23 is the owner's price convention (not an FX claim). 3 source Color-price exceptions are held.
- Shipping origin/rates (US and international as offered), production handling, personalization/measurements, seller payment acceptance, returns and customs policies verified.
- Pilot item **not for sale** before verification of result in admin. Test actual buyer selection and displayed total. No automated `Update Booth` while old ready-to-post listing exists.
- Once owner approves pilot, deploy in batches, reconcile live Bonanza IDs, confirm buyer purchase price, and only then consider explicit old inventory retire/delete.

## Important safety/account history correction

The Bonanza support inquiry drafted on 11 October in `eportupeya@gmail.com` is **unsent**. Gmail's `DRAFT` label and draft listing confirm this. It was *not* sent; no mail actions or support requests are authorized in this migration.

## Official primary references

- Simple CSV: https://www.bonanza.com/blog/selling/using_csv_file_to_import___update_listings
- Category metadata: https://api.bonanza.com/docs/reference/get_categories
- Allowed category traits: https://api.bonanza.com/docs/reference/get_category_traits
- Exact variations/API: https://api.bonanza.com/docs/reference/add_fixed_price_item
- 5 items/ API batch: https://api.bonanza.com/docs/reference/add_multiple_fixed_price_items
- Item statuses, danger of Update Booth: https://bonanza.zendesk.com/hc/en-us/articles/360001371451-Saving-Items-and-Item-Status
- Export existing inventory: https://www.bonanza.com/community_help/can_i_export_a_list_of_bonanza_items_as_csv_file_
- Non-US intl shipping: https://bonanza.zendesk.com/hc/en-us/articles/360000628391-Setting-International-Shipping-with-the-Batch-Editor
- Photo limit & shipping: https://api.bonanza.com/docs/reference/add_fixed_price_item
- Personalization membership constraint: https://bonanza.zendesk.com/hc/en-us/articles/360001371531-How-To-Set-Up-Item-Personalization

**Final status 2026-10-12: Prepared source and metadata; live import=NOT DONE, pilot API/category trait verification=NOT DONE, old 202 inventory=UNCHANGED.**
