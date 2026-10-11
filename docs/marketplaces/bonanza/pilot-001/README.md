
# TheFEYA → Bonanza — Pilot #001 / DO NOT PUBLISH

**Checkpoint:** 2026-10-11
**Source:** Approved TheFEYA content, active M1 Offer prices, verified owner colorways.
**Target booth:** DariaL20 / She_Knows. Existing 202 imported items unchanged.
**Status:** PASS_OFFLINE_PAYLOAD_HOLD_API. The test item has **not** been created in Bonanza.

## Test product

**Silver Metallic Top And Skirt Set for Festivals**
Original Etsy ID: **4367470907**. Approved TheFEYA product ID: 0403df9f-3ff9-498d-b3d9-69ad64b3dd4c.
Candidate category: Fashion → Specialty → Costumes, Reenactment, Theater → Costumes → Women (candidate 53369, **not yet verified via getCategoryTraits**).

![Silver Metallic Top and Skirt Set](https://i.etsystatic.com/54033853/r/il/c27048/7236051841/il_fullxfull.7236051841_f214.jpg)

Additional original photographs:
- https://i.etsystatic.com/54033853/r/il/409c40/7188072088/il_fullxfull.7188072088_bkxl.jpg
- https://i.etsystatic.com/54033853/r/il/709895/7236051845/il_fullxfull.7236051845_5wgg.jpg
- https://i.etsystatic.com/54033853/r/il/d2dfd8/7236052379/il_fullxfull.7236052379_fbyx.jpg

## Exact purchase configurations — prices in USD, numeric parity (NOT FX conversion)

| Purchase configuration | Gold | Silver |
| --- | ---: | ---: |
| Garters | $96.50 | $96.50 |
| Panties | $96.50 | $96.50 |
| Skirt | $115.81 | $115.81 |
| Top | $130.28 | $130.28 |
| Top + Skirt | $175.46 | $175.46 |
| **Full Set** | **$295.09** | **$295.09** |

**Twelve unique SKU combinations.** The default displayed/list price in both templates is **$295.09** (the actual Full Set price), rather than the $96.50 minimum accessory price. All variant prices are explicit. Material is vegan leather with metallic reflective finish; no customer material selector.

## Two offline-only request templates

- [12 priced combinations — two axes](api-draft-two-axes-DO_NOT_SEND.json) — Configuration + Color, pending verification of actual supported category variation traits.
- [Fallback — only the full set](api-draft-fullset-fallback-DO_NOT_SEND.json) — complete set at $295.09. Use only if Bonanza does not support a truthful Configuration selector and the user approves.
- [Validator receipt](OFFLINE_PAYLOAD_VALIDATION.json) — 12/12 correct prices, 12 distinct SKUs, 4 photos, all quantities zero, no sale flag.

Neither is a credentialed Bonanza API request or import-ready CSV. Both deliberately specify allowForSale=false, quantity=0, zero quantity for every variation, no shipping, and no sensitive keys. Their use is blocked until category/traits, store permissions, shipping and sizes are confirmed.

## Preferred independent API route — not Bonanza customer support

1. Owner opens https://api.bonanza.com/accounts/new and chooses **I'm already a Bonanza user**; authenticates the actual owner of the She_Knows booth.
2. Enter actual private account information directly in Bonanza, never in chat.
3. Suggested app/business name: **TheFEYA Catalog Sync**. Website: https://thefeya.com
4. Suggested application description: "Private, owner-operated synchronization of our handmade stage/festival costume catalog, exact variant prices, SKUs, product photos and product attributes with our Bonanza seller booth. Used exclusively for our own store."
5. Bonanza requires developer account approval. After approval, owner reports **«Bonanza API одобрен»**. No need to paste developer certification tokens or seller authentication tokens into ChatGPT or GitHub.
6. Once API access is approved, wire a secure, server-side integration and generate an authorization URL for the owner to approve in Bonanza. Then inspect getCategories and getCategoryTraits and import **one unpublished draft**; use getUnlistedItem to verify it.

## If API access is delayed — one manual pilot

- Selling → Add a new item.
- Select the actual Women costume category and inspect the Variations section. If Configuration + Color are both available, build the 12 combinations above with their respective *total* prices and SKU.
- If "Configuration" isn't actually supported, do not mislabel components as Size, Style or Color. Stop and report the available fields.
- Keep the item unpublished. **Do not click Update Booth**. It can activate all Ready for Sale listings, not only the pilot.

## Migration and release gates

- Keep the existing 202 old Bonanza listings until their inventory/IDs are backed up and a new test draft passes.
- Approved API bulk import supports at most 5 items per request; use small, checked batches.
- Source exceptions remain held: 3 men's leather harnesses have historic color-dependent prices, 1 harness has vegan/genuine leather choice with different prices, and 1 owner-held item must not publish.
- Do not enable a sale before actual shipping/duties/returns/handling, sizing-collection method, legal seller disclosures and final owner confirmation are verified.

## Official references

- https://api.bonanza.com/accounts/new
- https://api.bonanza.com/docs/reference/add_fixed_price_item
- https://api.bonanza.com/docs/reference/add_multiple_fixed_price_items
- https://api.bonanza.com/docs/reference/get_category_traits
- https://api.bonanza.com/docs/reference/get_unlisted_item
- https://api.bonanza.com/docs/reference/update_booth
- https://api.bonanza.com/docs/basics/user_tokens
