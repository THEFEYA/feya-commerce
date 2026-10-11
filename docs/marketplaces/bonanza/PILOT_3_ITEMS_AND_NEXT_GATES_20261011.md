# Bonanza — Three-item unpublished pilot and verification gates

**Owner action required before import:** obtain the actual Bonanza category taxonomy CSV and verify the variation form / API category-specific traits. All three pilots are UNPUBLISHED. No credentials are requested or stored.

## Pilot A — multi-piece outfit with a Full Set vs part prices

TheFEYA: **Silver Metallic Top And Skirt Set for Festivals** (Etsy source ID `4367470907`)  
Initial category candidate: **Fashion / Specialty / Costumes / Women, ID 53369** (must validate exact leaf & supported traits).  
Candidate axis: **Configuration** (must be supported by this category, not silently mapped to `Size` or `Theme`).

Expected variant USD prices (numeric parity with source EUR):

| Purchasable selection | USD amount |
| --- | ---: |
| Garters | $96.50 |
| Panties | $96.50 |
| Skirt | $115.81 |
| Top | $130.28 |
| Top + Skirt | $175.46 |
| **Full Set** | **$295.09** |

**Critical checkout test:** if Full Set is selected, cart must charge $295.09 and show "Full Set"; it must NOT charge $96.50, $130.28 or $175.46. A value displayed at top of the listing is not proof that the selected option is priced correctly.

## Pilot B — variant axis actually Color, not Configuration

TheFEYA: **Brown Leather Body Harness for Fashion Photoshoots**.  
Category candidate: **Other Costume Accessories, ID 82161**, pending narrower category review.  
Actual raw axis: `Основной цвет` — **Color**.

| Selection | USD amount |
| --- | ---: |
| Green | $140.01 |
| Brown | $159.31 |
| Black | $130.35 |

**Critical checkout test:** color changes the actual price. Do not use three variants named `Option`. Confirm that the category supports price-bearing Color variations.

## Pilot C — independent arm/shoulder/choker costume set

TheFEYA: **Gold Futuristic Armor Costume for Men** (Etsy source ID `4511817111`).  
Category candidate: **Other Costume Accessories, ID 82161**, not automatically a full Men's Costume.  
Suggested axis: **Configuration** (category trait not verified).

| Selection | USD amount |
| --- | ---: |
| Choker | $78.96 |
| Arm Guards | $105.28 |
| Shoulders | $122.82 |
| Bicep Pieces | $144.76 |
| **Full Set** | **$308.15** |

The `Bicep Pieces` label is an English source-translation proposal; owner review still required.

## The five read-only checks before publishing anything

1. Inspect exact Bonanza category **leaf** ID and its list of variation traits. The shopper-facing labels must be genuinely available and supported for that category.
2. Import **one unpublished draft** with explicit price, SKU, quantity and option value for every variant. Check editor, public-style preview, and cart/checkout only in a safe controlled state. An unpublished draft may not be testable in live checkout; do not turn it on just to experiment with buying.
3. Confirm plain descriptions, images (API maximum four URLs), source materials and women's/men's intended audience. Never invent GTIN/UPC.
4. Verify shipping zone, method, charge, handling and seller policy separately; the existing Bonanza screenshot has `I will not ship to non-US countries` selected, which needs owner direction.
5. Only after owner confirms, get permission to replace old imported items. Backup inventory first, map original Bonanza CSV IDs; importing new `THEFEYA-...` IDs without this mapping can create duplicates.

## Evidence

- Bonanza CSV and `force_update`: https://www.bonanza.com/blog/selling/Using_CSV_file_to_Import___Update_Listings
- Bonanza API individual price, two axes, draft state: https://api.bonanza.com/docs/reference/add_fixed_price_item
- Bonanza category taxonomy download: https://www.bonanza.com/categories/full_list
- Example existing costume variation: https://www.bonanza.com/listings/Roma-Costume-Women-s-3pc-Hot-Fire-Woman-Costume/1762999533
