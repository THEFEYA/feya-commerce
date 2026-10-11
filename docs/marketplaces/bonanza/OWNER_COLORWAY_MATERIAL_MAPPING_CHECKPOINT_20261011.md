# TheFEYA → Bonanza: owner materials and linked colorways — 2026-10-11

## Status
Owner review COMPLETE: 207/207 colors, materials, audience; 1 owner HOLD: Gold Festival Fringe Outfit.
Read-only original source: 207 approved products, 856 active offer variants. New private preflight Supabase table: `public.feya_bonanza_preflight_mapping_v1` in project `ysnizcgzhdwdfdkjkhud`. Each row is `HOLD`; original TheFEYA product/price records and Bonanza inventory unchanged.

### Definitions

- Buyer colorway: **single indivisible** option for Black + Gold, White + Silver, Holographic + Black, Black + Red, etc. Owner has selected exact options per product. Colorway changes do not change configuration price in normal TheFEYA assortment.
- Search color parts: Black + Gold maps to Black and Gold *only where* Bonanza category supports a suitable **multi-valued** item trait; otherwise do not claim a multi-value trait. Holographic is a finish, not automatically a constituent hue.
- Material fact: `vegan_leather`, `mirror_vegan_leather`, `patent` are **vegan leather** for material taxonomy; mirror/patent describe surface finish. `fabric`, `plastic`, `mirror_acrylic`, `genuine_leather` describe actual extra material. Plastic and acrylic treated together for this manufacturer's product. Chain is decorative trim unless material trait specifically supports it.
- Material is NOT buyer-selectable unless original exact source option had Material axis. **One** black chest harness genuinely has Vegan Leather $86.90 vs Genuine Leather $125.52. Protect that original price difference.
- **Three** Brown Leather harness products have original priced Color options (not equal prices). Keep originals as source truth; owner says color should not affect prices in general, so those three are flagged for explicit price-policy reconciliation. Do not invent a price for newly added White.
- Size options only when the actual category supports an axis; do not invent size supplements. Two-axis variation limit forces category/size tradeoffs. Made-to-order measurements require supported information-collection workflow (Bonanza Gold level customization requires verification).

## Audit receipts from live Supabase (not inferred)

- 207 owner review rows, 207 color confirmed, 207 material confirmed, 207 audience confirmed; 1 hold.
- Audience 178 women, 24 men, 5 couples.
- 198 products include vegan leather after finish consolidation, 3 genuine leather, 10 fabric, 7 plastic/acrylic. Overlapping categories.
- Saved staging rows 207/207 `HOLD`, 856 source variants; all 207 buyer colorway lists exactly match owner's selected count, 3 contain the Black + Red linked colorway.
- Candidate categories in staging: 97 costume women, 1 costume men, 6 couple costume, 17 shoulder armor accessory, 13 harness accessory, 6 arm accessory, 2 headpiece accessory, 1 mask, 33 upper stage garment, 26 skirt/lower piece, 1 standalone bodysuit, 4 composition review.
- **Do not interpret these candidates as final category IDs.** Full taxonomy CSV and category trait contract remain unverified.
- 20 products with missing explicit sellable component assertions (raw options are still present).
- Source text material tag contains 'Latex' in 118 legacy products; this is not proof of real latex. 10 approved PDP texts use "latex-like" comparisons and should be phrased neutrally in Bonanza copy; approved TheFEYA site text remains frozen.
- Active SEARCH v12 unaffected.

## Variation decision tree

1. If compatible Bonanza category has two axes `Configuration` and `Color` and all required pairings are supported, maintain same listing, each exact configuration price copied to all owner's colorways.
2. If category permits only one option axis, prioritize Configuration for multi-component costumes if possible and only allow all colorways via a documented supported mechanism. Do NOT silently make arbitrary color requests a required free-text checkout step.
3. If category does not permit Configuration, use a safe fallback: a full costume only at the **actual Full Set price** when a single unambiguous Full Set exists and owner-approved composition confirms it. Otherwise HOLD and consider splitting verified components into accurate accessory categories.
4. Color-price historical exception: do not multiply or normalize old color-priced rows until resolved.
5. Material source exception: preserve original real/faux leather choice and its own price.
6. Do not create new color/size combinations absent from owner-confirmed colorways or source price contract; all Bonanza variants have explicit price, quantity, unique SKU. Do not rely on minimum displayed product price.

## Category classification

The primary criterion is what buyer actually obtains and the product's physical essence; keyword traffic does not rewrite product truth.

- Full costume: top + skirt, or complete one-piece stage suit, or approved full outfit with fitted core garments.
- Accessory: shoulder armor plus bracelet, arm covers, headpiece, mask, harness that is not a complete outfit, etc.
- If a 'Full Set' means two shoulders, single armor pair, or accessories only, it does not become Costumes > Women/Men.
- Several owner-selected couples products and some misleading source `Full Set` flags require review.
- Bonanza official category leaf IDs and live item traits remain blocked without complete category taxonomy / `getCategoryTraits` evidence. Candidate codes in staging are hypotheses only.

## Official material investigated
- Bonanza API addFixedPriceItem: https://api.bonanza.com/docs/reference/add_fixed_price_item
- Bonanza category traits getCategoryTraits: https://api.bonanza.com/docs/reference/get_category_traits
- CSV update/import: https://www.bonanza.com/blog/selling/Using_CSV_file_to_Import___Update_Listings
- Full categories: https://www.bonanza.com/categories/full_list

## Bonanza support questions
Draft prepared **not sent** in linked `eportupeya@gmail.com` mailbox, subject `DariaL20 / She_Knows booth — safe CSV/API variant import and category trait questions`, Gmail draft ID `r2951496641247811613`. Asks six specific questions about configuration + color, full CSV specification, getCategoryTraits, search colors, unpublished batches, replacing 202 old items.

## Next release gates
1. Official full taxonomy CSV and selected category traits / exact variation compatibility.
2. Validate current booth permission, developer API auth or exact CSV format, quantity, shipping destinations, origin, returns and contact.
3. Pilot three different product types as unpublished drafts, verify price at selected option and no duplicate IDs.
4. Owner approves final move / archive of 202 old records. No deletion or publishing until then.
