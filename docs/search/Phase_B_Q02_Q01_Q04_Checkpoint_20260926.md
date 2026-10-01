# FEYA Search Architecture — Phase B Q02/Q01/Q04 checkpoint

Date: 2026-09-26
Status: fresh demand + formal SERP triage complete; Phase C business cases ready.

## Fresh keyword evidence

HYPD research was run for United States / English / Google Search. The exact returned metrics were also ingested into the existing `feya_commerce_seo_keyword_metric_snapshots_v1` store as fresh snapshots with source request provenance.

Important demand examples:
- rave outfits — 60,500 AMS;
- festival outfits — 18,100;
- shoulder armor — 2,900;
- burning man outfits — 2,900;
- body harness — 2,400 but broad/safety-contaminated and not used as fashion landing proof;
- costume masks — 2,900;
- costume wings — 1,600;
- costume bodysuit — 720;
- festival skirt — 720;
- fashion harness — 590;
- festival masks — 390;
- festival bodysuit — 320;
- costume belt — 210;
- stage costumes — 170;
- performance costumes — 140.

Ads competition and bids are retained only as advertising context and never used as organic SEO difficulty.

## Search-intent corrections

The fresh SERPs materially changed several assumptions:

- **Harness:** demand exists, but `fashion harness` and `festival harness` do not pass the FEYA collection SERP hard gate. Harness remains a useful shopping/filter axis, not an indexable landing in Wave 1.
- **Shoulder Armor:** broad `shoulder armor` passes the collection gate, but costume/cosplay refinements do not. The future page must explicitly be decorative costume/stage armor and exclude protective/tactical intent.
- **Festival vs Rave:** both have strong collection SERPs and distinct current URL sets. They deserve separate business cases.
- **Burning Man:** both `burning man outfits` and `burning man costumes` have commercial collection SERPs. Keep them as separate query clusters initially; a single Burning Man landing may own both clusters.
- **Stage / Performance:** the earlier idea that all stage/performance phrases form one cluster is wrong. `performance costumes` is strongly commercial; `stage outfits`, `stage costumes` and `performance outfits` have materially different/mixed SERPs. The business case is a Performance Costumes landing, not an indiscriminate keyword bundle.
- **Dance costumes:** extremely high demand but a broad recital/dancewear market. It is not automatically FEYA's Stage page keyword.
- **Bodysuits:** both costume and festival bodysuit SERPs are strongly collection-driven, but Festival Bodysuits has only six current parent products and must wait for design-family/differentiation proof before a separate URL.
- **Masks / Headpieces:** commercial intent is real. Costume Masks and Costume Headpieces have enough inventory for business cases. Festival variants are narrower and remain Phase D holds.
- **Skirts:** `festival skirt` is collection-driven; `costume skirt` is PDP-dominant. Therefore the SEO candidate is Festival Skirts, not a generic Costume Skirts page.
- **Wings:** demand is high but current `costume wings` SERP is PDP-dominant and inventory is minimal; no collection business case now.
- **Costume sets:** PDP/social dominated; do not use it to justify a generic Outfits landing.

## Phase C landing business cases

Proceed with internal noindex Page Portfolio business cases for:
1. Shoulder Armor
2. Festival Outfits
3. Rave Outfits
4. Burning Man Outfits
5. Performance Costumes
6. Costume Bodysuits
7. Costume Masks
8. Costume Headpieces
9. Festival Skirts
10. Costume Belts

Keep as hold/filter/PDP vocabulary:
- Harness / Festival Harness / Vegan Leather Harness
- Festival Bodysuits
- Festival Masks
- Festival Headpieces
- Costume Skirts
- Costume Wings
- Costume Sets
- Festival Costumes
- Stage Outfits / Stage Costumes / Performance Outfits until a distinct owner is proven

No item above is authorized for indexing yet. Phase C creates review-state page/ownership business cases only. Phase D must prove membership snapshots, design-family depth, unique modules and internal-link support.
