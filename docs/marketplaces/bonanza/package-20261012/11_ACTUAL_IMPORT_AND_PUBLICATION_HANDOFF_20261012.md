# THEFEYA → Bonanza — IMPORT PACKAGE / release checkpoint
Date: 2026-10-12
Seller booth: `DariaL20` / `She_Knows`
Source catalog: approved TheFEYA product/price assets. No changes to original TheFEYA products or prices.

## Current reality

**Bonanza booth is still blocked for new inventory CSV import** per the latest owner screenshot: "One or more recently added items in your booth require administrative review. ... You will be able to import items once your booth has been reviewed." Deleting imported inventory does not provide a documented way to bypass this restriction. The March status "Your import is complete" relates to 202 imported out of 204 legacy listings, not the files here.

Nothing in this package has been uploaded to Bonanza or published in the live store. Nothing here is an administrative review bypass. Nobody is authorized to contact Bonanza support by email.

## Actual ordinary Bonanza CSV files — 7 documented columns

**08_BONANZA_PILOT_REAL_FULLSET_1_ITEM_PENDING_REVIEW.csv**

One real full set: `TFBZ-FS-4507727106-SILVER`, Silver Metallic Top and Skirt Set for Women, **$217.51**, category candidate **53369**, one real primary photo from the TheFEYA approved source, buyer-ready text and source-confirmed vegan leather, `quantity=1`. This is an actual structurally valid 7-column CSV with:
`id,title,price,category,description,quantity,image`.

**09_BONANZA_FIXED_PRICE_FULLSET_QUALIFIED_PENDING_PILOT.csv**

24 single-color full-set candidates including the same first pilot, selected conservatively out of the prior 40 Full Set candidates without legacy material blockers. Rejected 16 where the photographed/base color could not be matched **exactly** to an owner-approved purchasable colorway (combinations `Black + Gold` are not silently flattened to `Gold`; missing color attribution is not guessed). All 24 have a source-matched material, category candidate, title <=80, exact Full Set price, HTTPS photograph, unique fixed-price import ID, quantity=1, and clear descriptions that only the named whole set in the stated color is being offered. Distinct Silver sets with different prices were distinguished in titles.

**Both CSVs have a potential purchasing quantity of 1 and could become sellable upon import, so they are NOT "harmless drafts"**. Their real acceptance by Bonanza's importer and shipping/payment state have not been tested. Do not import them while the review warning persists. Don't mistake the 24-candidate CSV for the full 207-product multivariant release. It does not include separate Top/Skirt components or multiple colors within a single listing.

The previous zero-quantity first test `01_BONANZA_PILOT_1_FULLSET_DRAFT_TEST.csv` is retained as historical input only. CSV `quantity=0` behavior remains unverified.

## Full multivariant source-to-API package — correct prices preserved

Bonanza's public CSV documentation lists basic headers but **does not provide a confirmed machine-readable two-axis CSV layout for Config/Color plus each combination's price/SKU**. Pretending those headers are known would repeat the exact historic Etsy-import failure.

Instead, the following FOUR JSONL files were generated from the owner-reviewed source/catalog:

- `10_BONANZA_API_CATALOG_01_OF_04_UNPUBLISHED.jsonl`
- `10_BONANZA_API_CATALOG_02_OF_04_UNPUBLISHED.jsonl`
- `10_BONANZA_API_CATALOG_03_OF_04_UNPUBLISHED.jsonl`
- `10_BONANZA_API_CATALOG_04_OF_04_UNPUBLISHED.jsonl`

**Verified:**
- 207 source products; 206 staged; 1 `Gold Festival Fringe Outfit` owner-HOLD explicitly omitted.
- Original 856 source pricing records preserved through their ID/price mapping; 2,157 calculated purchasable combinations included in the new staged 206.
- 198 Configuration × Color; 4 Configuration only; 3 price-varying Color; 1 Material × Color.
- All 2,157 SKU codes unique, every combination price >0, original price parity verified, no 80+ character titles, picture lists nonempty and <=4.
- All 206 generated API `item.allowForSale=false`.
- Silver pilot Etsy `4367470907`: 12 combinations; Full Set $295.09, Top+Skirt $175.46, Top $130.28, Skirt $115.81, Panties $96.50, Garters $96.50, each for Gold and Silver.
- 3 older leather harnesses retain their actual variable Color prices. New White colors without a source price are **not** fabricated.
- One leather harness has separate genuine/vegan material pricing: vegan $86.90, genuine $125.52, each across Black and White.
- Extra risks/holds for ambiguous component labels, exact final category trait names, category ID and shipping origin preserved.
- API payloads contain item objects in Bonanza's documented `addFixedPriceItem` shape but **NOT** credentials, real category trait verification, or seller shipping. They are *not* uploadable as CSV, and must not be sent as-is. They are staging for authenticated API after schema verification and booth review.

Machine-readable metrics: `10_BONANZA_206_API_VARIANTS_PREFLIGHT_RECEIPT.json`.

### API prerequisite

With owner-authorized Bonanza developer account / OAuth user token, invoke `getCategories`, then `getCategoryTraits` for actual category IDs (e.g. costume category `53369`) and confirm labels with `variationsEnabled=true`. If `Configuration` isn't valid, test an actual allowable equivalent such as `Style` without relabeling Size or Color. Convert the staged `nameValueList` names accordingly only after real confirmation. Fill valid item-specific traits and shipping/returns. Create **one** item `allowForSale=false` and read it back with `getUnlistedItem` to check SKU, variant prices, photos, descriptions, and state before small batches. An `Update Booth` operation can also activate unrelated old items tagged Ready for sale; don't call it blindly.

## Old 202 Etsy-imported listings: no export necessary for user's chosen replace-all route

User stated the legacy 202 no-variation/incorrect-price items may be retired. The owner does **not** need to export them for pricing; every new price comes from TheFEYA. If deliberately choosing complete replacement, use Bonanza's official interface:

`Selling → Batch edit items → select the 202 old items → Delete → Apply changes`.

Confirm the target is exactly the old listings; bulk deletion is destructive. The assistant cannot press it from the current chat, which does not have a logged-in Bonanza browser or a Bonanza seller connector. **Do not confuse deleting bad listings with clearing the administrative import review**. It is safer to retain the old items until the review is lifted and a replacement item imports correctly, but owner may choose removal sooner; this is a business decision, not a technical import prerequisite.

Do **not** select the CSV import checkbox `Remove non imported items` for the single-item pilot. Do **not** select `Revise previously imported items`: the original 202 were imported from Etsy, and Bonanza officially limits CSV update by ID to items originally imported through CSV.

## Direct release sequence once Bonanza accepts imports

1. Confirm the **administrative review banner is gone**. Do not click import while it is present.
2. Verify existing PayPal connection, seller shipping origin/destination/rate/handling, and selected return conditions from actual booth settings. Existing screenshot shows PayPal Business selected, credit card on file; Stripe not connected. Do **not** input credit card credentials into ChatGPT.
3. Upload **08...csv** through `Selling → Import from inventory file` with `Comma` separator and three dangerous importer checkboxes OFF. Note: quantity=1 means this one product could become buyable right away.
4. Check resulting item ID, status, title, $217.51, one pictured Silver variation, real image, category, shipping rate and payment acceptance. Stop if anything deviates.
5. Then optionally import the remaining 23 fixed-price Full Sets for a partial shop launch, or continue with true 206-product multi-variation API route. Never blindly upload 206/2157 as flat list and claim this preserves options.
6. If API succeeds, compare the replacement inventory and delete the old items in bulk in one intentional owner step. Old incorrect listings do not have to be exported.

## Primary documentation

- Bonanza CSV headers and update caveats: https://www.bonanza.com/blog/selling/using_csv_file_to_import___update_listings
- Official statement that wrongly imported variation listings may be removed before re-import: https://bonanza.zendesk.com/hc/en-us/articles/360044872711-Amazon-Variations-Incorrect
- Bulk delete: https://bonanza.zendesk.com/hc/en-us/articles/360001101071-How-do-I-delete-items-from-my-booth
- API / two-axis variant price/SKU contract: https://api.bonanza.com/docs/reference/add_fixed_price_item
- Trait identification: https://api.bonanza.com/docs/reference/get_category_traits

Last checked: **no live Bonanza import / publication**, no emails sent or altered, no deletions made.
