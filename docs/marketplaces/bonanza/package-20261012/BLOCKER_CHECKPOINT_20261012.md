# Bonanza Migration — Review Blocker & API Decision Checkpoint
Date: 2026-10-12
Scope: **Only** `work/bonanza-migration-staging-20261011`. No uploads, publish operations, storefront edits, or Supabase writes were performed.

## Decision — HOLD all imports

The last owner-provided screenshot from the seller account `DariaL20` displayed:

> One or more recently added items in your booth require administrative review. ... You will be able to import items once your booth has been reviewed.

As of this checkpoint, **the current review status has not been rechecked in an authenticated Bonanza session**. Do not claim the review is cleared. The previous "Your import is complete" result pertains to the March batch (204 discovered / 202 imported / 2 skipped), not to the new pilot. Do **not** use `Import items`, `Update Booth`, `Apply changes`, `force_update`, or `Revise previously imported items`.

Bonanza support said in the 2026-03-31 ticket #1330141 that the items were approved **then**. That message is historical; it does not override a later administrative review warning.

## Gmail evidence (verified against connected account)

- Six connected mailboxes checked; the store support correspondence is in `eportupeya@gmail.com`.
- March 31 ticket **#1330144** ("need an export template"): agent Kel linked to `https://support.bonanza.com/hc/en-us/articles/360000656491-How-do-I-import-items-from-an-existing-inventory-CSV-file`, but **did not attach an Excel/CSV template**.
- On 2026-10-11 a **DRAFT (UNSENT)** message titled **"DariaL20 / She_Knows booth — safe CSV/API variant import and category trait questions"** was created in `eportupeya@gmail.com`, addressed to `support@bonanza.com`. **Gmail directly confirms the message's DRAFT label and draft ID**; searches for it in Sent and Trash returned no matching message on 2026-10-12. The owner did not authorize sending. Do not send, edit, delete, or reuse the draft without explicit owner permission.
- There can be no reply to this **unsent draft**. **Do not contact Bonanza support from the owner's mail accounts without explicit authorization.**

## Revalidation of repository data (2026-10-12)

| Assertion | Result |
| --- | --- |
| Products in source audit | 207 / unique product IDs |
| Original purchase configurations | 856 / unique source variation IDs |
| Expanded staged combinations | 2,161 / unique staged SKUs |
| Full Set staged CSV candidates | 86 / unique import IDs |
| Full Set prices against source catalog | All 86 match |
| Expanded combinations against source variation price | All 2,161 match |
| Malformed CSV rows in all five previous CSV files | Zero |
| Full Set CSV candidates with nonzero quantity | Zero |
| Full Set candidates with `UNCONFIRMED_LEGACY_LATEX` blocker | **46** |
| Remaining Full Set candidates with no flagged material blocker | **40** |
| Expanded plan statuses | 2,125 SCHEMA_UNVERIFIED_HOLD; 19 NEEDS_LABEL_REVIEW; 11 SOURCE_PRICE_AXIS_EXCEPTION_HOLD; 6 OWNER_HOLD |

The new `06_BONANZA_40_FULLSET_REVIEW_QUEUE_NOT_FOR_IMPORT.csv` is **not** an importable product feed; it is a review queue without Bonanza's five mandatory headers. Even its 40 records require category/variation/schema/shipping and public-copy gates.

The 86-row CSV includes internal staging commentary in the description field and **must never be published verbatim**. A clean material flag does not mean the listing is ready for sale. The original one-item pilot has been edited to remove an unverified material claim; it is **still** not authorized for import while review and importer behavior remain unknown.

## Documented CSV capabilities and limitations

Bonanza's public CSV article names `id,title,price,category,description` as the five required fields, with `quantity,image` additionally suggested; it states that variants and traits may be added, but **does not supply a full public, unambiguous CSV schema for two independently priced variation axes**.

Source: https://www.bonanza.com/blog/selling/Using_CSV_file_to_Import___Update_Listings

Bonanza's article says **CSV `force_update` and the importer revise option update items originally imported via CSV**, using the same original `id`. The old ~202 items came from Etsy, so a new external CSV ID is **not** a verified safe way to update/replace them. Don't delete or alter those until a complete exported inventory and ID mapping are available.

## API feasibility — better than inventing CSV headers

The official Bonanza `addFixedPriceItem` API documents:
- `item.variations` for different price/quantity/SKU combinations;
- up to **two** `nameValueList` pairs per variation;
- variation attribute names from `getCategoryTraits` (not arbitrary field names);
- `item.allowForSale=false` (default); **this does not by itself guarantee there can never be activation via a later booth update**;
- `item.quantity=0` produces `Missing required fields` in the API; this **does not prove** CSV importer behavior.

Sources:
- https://api.bonanza.com/docs/reference/add_fixed_price_item
- https://api.bonanza.com/docs/reference/get_category_traits
- https://api.bonanza.com/docs/examples/python

The official Python example uses **Colour + Style**, but does **not** verify those traits are `variationsEnabled=true` for costume category **53369**. First resolve the category with `getCategories` and traits through `getCategoryTraits` using an approved Bonanza developer credential; no credential was accessed or created here.

A non-executable source-backed model for 12 combinations in product Etsy ID **4367470907** is saved as `07_BONANZA_PILOT_12_VARIATIONS_API_SCHEMA_HOLD.json`. It preserves Full Set $295.09, Top + Skirt $175.46, Top $130.28, Panties $96.50, Garters $96.50 and Skirt $115.81 across Gold and Silver with distinct staged SKUs. It is **NOT an API request** and **must not be sent** to an endpoint or CSV importer.

## Gates before any production launch

1. Seller booth review cleared in an authenticated session and communicated by Bonanza; capture relevant UI status.
2. Get a read-only export of existing Bonanza inventory (if available from the batch editor), preserving Bonanza item IDs and original Etsy linkage; do not apply bulk edits.
3. Obtain authoritative variation-capable CSV sample from Bonanza Support **or** approved API credentials and category trait definitions. If category doesn't support true Configuration/Style + Color, use explicit separate component listings rather than repurpose Size or Color.
4. Confirm category mapping, content, actual photo for color, material (especially 46 flagged cases), size instructions, shipping origin/rates, return policies, payment onboarding.
5. Perform one controlled pilot with hard post-import verification of sellingState, photos, price, options, category, shipping, and no active purchase path. Zero quantity in CSV is not a tested safety mechanism.
6. Only then plan batch size and reconciliation against old 202 Etsy imports. Do not activate unfinished/legacy listings when updating the booth.

**Next action now**: await/use the existing Bonanza Support ticket response and verify the review status when account access is available. All implementation can proceed in staging without modifying customer-visible listings.
