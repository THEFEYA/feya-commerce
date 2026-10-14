# Bonanza → TheFEYA | CSV import block diagnosis (2026-10-14)

**Scope:** Staging only. The merchant's 202 legacy Etsy imported listings are unchanged. No Bonanza items were imported, edited, removed, or published in this turn. No emails were sent.

## Evidence verified 2026-10-14

### Owner screenshots (seven supplied, 16:11–16:12)

- Seller: `DariaL20`, path `/booths/csv_item_import/DariaL20`.
- Orange banner still says: "One or more recently added items in your booth require administrative review. Booths are reviewed within 72 hours (usually much sooner). You will be able to import items once your booth has been reviewed."
- Historical green notification: **202 imported / 204 discovered / 2 skipped**, dated **March 30**, *not* new pilot.
- The local 1-row CSV `08_BONANZA_PILOT_REAL_FULLSET_1_ITEM_PENDING_REVIEW.csv` is selected. Separator `Comma` selected.
- **All three importer checkboxes selected** on these new screenshots: `Import descriptions as text only`, `Remove non imported items`, and `Revise previously imported items`. This is **unsafe** for a one-item test. Uncheck `Remove non imported items` and `Revise previously imported items` immediately; text-only may stay selected.
- `Import items` is visibly disabled/greyed out. This occurs before any recorded file processing. No CSV parse rejection/result has been shown.
- `Edit mappings` opens `Setup Custom Column Names` with standard target fields (`booth_category, category, description, force_update, images, id, sku, price, quantity, shipping_price, shipping_type, ... title`). This maps incoming CSV column *names*, not variations or permissions. No mappings are saved.
- The screenshot of the custom mapping UI confirms a **standard** column `images`, while Bonanza's official seller blog gives `image` in the simple example. This naming distinction is **not enough to infer CSV rejection** because the `Import items` button never became available; the error, if any, remains unobserved.

### Local pilot validation

An existing uploaded file was inspected *without editing*:
- Exact headers: `id,title,price,category,description,quantity,image`.
- One complete row. Product ID `TFBZ-FS-4507727106-SILVER`. Price `217.51` USD. Candidate category `53369`. Quantity `1`. Real HTTPS source photo URL. Title 54 characters.
- CSV is UTF-8, no BOM; line endings LF, supported ordinary CSV formatting.
- An `image` field is suggested by official Bonanza seller blog; category/variation acceptance has **not** been tested by Bonanza.
- **Quantity 1 means the product could be buyable if accepted;** do not treat this as a harmless dry run.

### Evidence from Bonanza docs/forums

1. The official Bonanza seller blog lists core CSV headers and states `Revise previously imported items` with matching IDs works **only for previous CSV-imported items**, not old Etsy imported items. Source: https://www.bonanza.com/blog/main/using_csv_file_to_import___update_listings
2. The screenshot's tooltip explicitly says `Remove non imported items` removes items previously imported that are missing from the new file. This would endanger the 202 legacy items when using a one-row CSV.
3. An older Bonanza forum thread documents almost identical orange "administrative review" banner persisting for **two weeks** while CSV import was refused, even though the seller said it could list items **manually**. This is precedent, **not proof of current DariaL20 status**. https://www.bonanza.com/community_help/still_awaiting_approval_for_my_booth_after_two_weeks
4. Bonanza's item editor can add real Color/Size variation price/quantity combinations; there's a documented category-switch workaround to expose other traits, but do **not** assume any arbitrary `Configuration` trait is supported or safe. https://bonanza.zendesk.com/hc/en-us/articles/360001355112-How-To-Add-Item-Variations-on-Bonanza
5. Official API supports up to **two** variation axes (category-specific `variationsEnabled=true` traits), individual USD price and SKU; requires developer authorization and seller token. https://api.bonanza.com/docs/reference/add_fixed_price_item and https://api.bonanza.com/docs/reference/get_category_traits
6. The Bonanza CSV Help Center search result contains hints about a bracketed per-variation price/quantity syntax, e.g. `[[ color :red][ quantity :3][ price :5.50]]`. **Full schema, exact column and 2D combination grammar NOT yet verified**, thus no claims that the 206-product CSV automatically handles complex configurations. https://bonanza.zendesk.com/hc/en-us/articles/360000656491-How-do-I-import-items-from-an-existing-inventory-CSV-file

### Email status

12 October message from `eportupeya@gmail.com` to `support@bonanza.com` is SENT (Gmail id `1a130aad3bc15800`). Read-only Gmail search on 14 October found **no response** from the support sender addresses yet. No follow-up sent.

### Public store status

Last seller screenshot (11–12 October) listed **0 For Sale / 1 Ready to Post / 201 Incomplete**. A public logged-out lookup of DariaL20 via the external web access failed; no current authoritative buyer-facing visibility or checkout proof. A prior March import is **not** proof of approval for sales or of October CSV rights.

## Route / decision

**No upload bypass, no blindly clearing banners, no mass deletion while CSV import remains blocked.** The original 202 items can be deleted later as user approved, but deletion is not documented to remove review restriction and is not necessary to prepare the correct catalog.

1. Seller unchecks both destructive boxes (`Remove non imported items`, `Revise previously imported items`); leave `Comma`. On any fresh page the checkboxes should remain off.
2. Distinguish account ability from importer ability by trying ONE manual **unpublished** draft with the approved pilot `Silver Metallic Top and Skirt Set` Full Set $217.51, category Women Costumes, genuine silver photo. Use **Save for later**; **do not activate** the old Ready-to-Post listing or hit global `Update Booth`. Then inspect whether draft can be saved. If manually saved and unpublished, this supports item editor availability, not active selling.
3. Check public booth in a separate private/incognito window without login. If available, ask user for screenshot of status; do not infer active sale from green March import notice.
4. Await Bonanza answer on the existing technical support request (no duplicate spam). If banner persists, a validly parsed CSV cannot be uploaded through a disabled importer regardless of the toggles.
5. Route A: once importer reopens, submit ONE simple CSV item (all destructive checkboxes OFF); verify result, images, category and actual buyer price before any batch. Then send *only* validated templates; don't assume CSV can encode dual-axis price/SKU.
6. Route B: for *full* catalog with original Configuration × Color and per-option prices, obtain authorized Bonanza developer credentials securely and verify actual `getCategoryTraits` variation traits before testing one unpublished `addFixedPriceItem`; only then batches. Never send API secrets in chat or repo.
7. Fallback: approved one-color, true Full Set listings with exact own prices and clear descriptions, but only after import access restored. Existing staging `09_...` holds 24 candidates, not a faithful 206-product multivariant catalog.

## Source catalog checkpoint

Existing full staged API data: 206 products + 2,157 unique variant-price-SKU combos in `10_BONANZA_API_CATALOG_01..04_UNPUBLISHED.jsonl`. 1 product owner-HOLD. These are planning/staging records, not Bonanza-sent or category-trait verified; risk flags not cleared. See `10_BONANZA_206_API_VARIANTS_PREFLIGHT_RECEIPT.json`.

**Operator note:** Don't tell owner to download the wrong 202 legacy products again. Don't ask for repetitive images. Single key evidence now: can an authorized account save one manual *unpublished* new item, and what does anonymous public booth show?
