# FEYA Search Architecture — Phase A checkpoint

Date: 2026-09-26
Scope: research synthesis + Candidate Intent Registry bootstrap + Q02/Q01/Q04 inventory evidence.

## 1. Authority resolution

Current execution uses this priority:
1. Human Owner-confirmed Business/Product Truth.
2. Current production Supabase + current GitHub release state.
3. FEYA canonical Growth OS / role boundaries.
4. Newer FEYA research (Product DNA → intent, Page Portfolio, technical SEO, editorial, measurement).
5. Earlier SEO Content Engine only where not superseded.
6. Competitor observations only as pattern evidence.

Resolved contradictions:
- Product DNA values are candidate-intent inputs, not automatic pages.
- Earlier Content Engine output fields remain useful, but Ads Competition is not organic SEO difficulty and cannot be a landing-page eligibility gate.
- Existing /collections title/keyword matching is preview scaffolding only, not final membership authority.
- Seller-Online is a parallel payments lane, not the Search Architecture critical path.
- Inventory overlap is allowed; primary query-cluster ownership overlap is not.
- Landing copy is generated only after ownership + membership + unique-value + link plan are approved.

## 2. Current live Search state — persisted baseline

One production check on 2026-09-26:
- SEO pages: 243.
- Query clusters: 0.
- Primary ownership rows: 0.
- Keyword metric snapshots: 168.
- Latest historical keyword metric fetch: 2026-07-08.
- Existing metric snapshots are US/en, but the exact current Q02/Q01/Q04 seed phrases are mostly absent.
- Some adjacent July metrics exist (for example gold shoulder armor and several futuristic/cyberpunk terms), but they must not be substituted for the missing broad seed demand.

This baseline must not be re-audited unless a no-repeat recheck trigger fires.

## 3. Product/DNA authority used for candidate inventory

For Phase A membership evidence, the strongest current human-reviewed semantic source is the latest APPROVED SEO pack for each of the 207 release products:
- manual_focus_snapshot contains component/event/style/persona/material/audience choices;
- sellable_component_axes distinguishes a genuinely sellable component from a search-only descriptor;
- search_only_component_axes must not inflate commercial collection depth.

This is substantially safer than title/meta string matching.

Important example:
- harness appears in manual focus on 35 products;
- only 11 have harness as a sellable component axis;
- 29 use harness as search-only semantics.
Therefore a Harness commercial landing must start from the 11 sellable products, not all 35 keyword-matching products.

## 4. Candidate inventory — priority batches

### Q02 Armor and Harness

| Candidate | Eligible sellable parent products | Current conclusion |
|---|---:|---|
| Shoulder Armor / Shoulders | 80 | Inventory gate clearly plausible; demand/SERP still required |
| Festival Shoulder Armor | 61 | Strong catalog support; two-axis page still requires observed search intent |
| Body/Fashion Harness | 11 | Real commercial subset exists; must exclude search-only harness semantics |
| Festival Harness | 4 | Borderline product depth; design-family count and demand are decisive |
| Vegan Leather Harness | 2 | Too thin for collection under current v1 gate; likely PDP/secondary/filter unless catalog expands |

### Q01 Event / Commercial Roots

Approved manual-focus event coverage:
- Festival: 111 products
- Stage: 96
- Burning Man: 45
- Rave: 40

Product-set Jaccard:
- Burning Man ↔ Festival: 0.357
- Burning Man ↔ Rave: 0.214
- Burning Man ↔ Stage: 0.037
- Festival ↔ Rave: 0.258
- Festival ↔ Stage: 0.183
- Rave ↔ Stage: 0.054

Interpretation:
- the catalog itself does NOT force these nodes to be duplicates;
- Stage is especially distinct from Festival/Rave/Burning Man in product membership;
- Festival and Burning Man overlap materially but not enough to assume one owner;
- formal query/SERP overlap is still required before assigning separate primary owners.

### Q04 Other Shop Types

| Candidate | Eligible sellable parent products | Festival intersection |
|---|---:|---:|
| Skirt | 89 | 56 |
| Headpiece | 34 | 11 |
| Bodysuit | 30 | 6 |
| Belt | 13 | n/a in queue |
| Mask | 11 | 6 |
| Wings | 4 | n/a in queue |

These counts prove commercial inventory exists. They do NOT yet prove an indexable SEO landing.

## 5. Current public search evidence — preliminary only

A public web sample on 2026-09-26 indicates:
- Body/fashion harness queries are mixed between editorial guides and dedicated commercial collections.
- Shoulder-armor costume results include marketplace/category commerce.
- Burning Man outfit results contain both dedicated commercial collections and practical/editorial guides.
- Festival/rave outfit results are mixed commercial + editorial.
- Stage/performance has a real commercial market surface (dedicated stagewear/performance stores) and remains a strong FEYA differentiation hypothesis.

This is directional evidence only. It is NOT recorded as the formal Google Top-10 C/P/E/O gate because the current search tool is not a controlled US/en Google SERP capture.

## 6. Missing evidence that can actually change decisions

### Fresh Keyword Planner / authorized export
Need the exact Q02/Q01/Q04 seed families from FEYA_Keyword_Research_Queue_v1:
- Q02 Armor/Harness
- Q01 Event/Commercial Roots
- Q04 Other Shop Types

The July snapshot store does not contain the exact majority of those seeds.

Required return:
- returned keyword / close variants
- US/en/Google Search targeting
- actual returned period
- avg monthly searches or range/null
- monthly history
- fetched_at
- source request/hash
- advertising competition/bids retained only as secondary commercial context

### Formal SERP samples
Need controlled US/en Top-10 captures for cluster separation:
- shoulder armor vs shoulder armor costume
- fashion/body harness vs festival harness
- festival outfits vs rave outfits
- Burning Man outfits vs Burning Man costumes
- stage costumes vs performance costumes
- festival/costume variants for masks, headpieces, bodysuits and skirts

### Design-family key
Current canonical_product_id is a stable product entity, but a durable design_family_key is not yet materialized in the Search Portfolio layer.
Do not assume every canonical product is a different design family for the final >=3-family gate.
This matters most for borderline nodes such as Festival Harness and Wings.

## 7. Existing seven collection previews

Current preview routes are retained as rendering scaffolding only:
- harness
- shoulder-armor
- bodysuits
- outfits
- festival-outfits
- burning-man-looks
- stage-outfits

Status for all: HYPOTHESIS / NOINDEX.

Do not promote them merely because code exists.

Specific corrections:
- Harness membership must use sellable harness axes, not keyword/title matching.
- Shoulder Armor should use confirmed sellable shoulders/armor mapping.
- Festival/Burning Man/Stage membership should use approved event focus + Product Truth/orderability.
- “Outfits” is too broad to approve before its exact query owner and relationship to Shop/Event hubs are defined.
- Bodysuits has sufficient raw inventory, but still requires demand/SERP/ownership evidence.

## 8. Preliminary Eligibility Cards

### Shoulder Armor
- inventory: 80 sellable parent products
- product-depth: strong
- demand: exact broad seed missing
- formal SERP gate: pending
- ownership: none materialized
- current outcome: HOLD_FOR_DEMAND_AND_SERP
- reason codes: MISSING_GKP_EXACT, SERP_GATE_UNRESOLVED

### Fashion / Body Harness
- inventory: 11 sellable products; 29 additional search-only harness uses excluded from depth
- product-depth: plausible
- demand: exact broad seed missing
- formal SERP: mixed editorial/commercial directional evidence
- current outcome: HOLD_FOR_CLUSTER_SPLIT
- reason codes: MISSING_GKP_EXACT, MIXED_SERP_NEEDS_FORMAL_SAMPLE, SEARCH_ONLY_AXIS_EXCLUDED

### Festival
- inventory: 111 event-matched products
- differentiation: catalog overlap with Rave/Burning Man is moderate, not duplicate by inventory alone
- demand: exact seed missing
- formal SERP: mixed directional evidence
- current outcome: HOLD_FOR_COMMERCIAL_CLUSTER_PROOF

### Burning Man
- inventory: 45
- catalog differentiation: strong vs Stage/Rave, moderate vs Festival
- competitor research: flagship opportunity
- public search: collections + guides both visible
- current outcome: SPLIT_CANDIDATE_COLLECTION_AND_GUIDE_PENDING_SERP_OVERLAP
- do not create both owners until commercial vs informational clusters satisfy separation rule

### Stage / Performance
- Stage event inventory: 96
- catalog differentiation: very strong vs Festival/Rave/Burning Man
- competitor research: major FEYA white-space hypothesis
- public search: commercial stagewear surface exists
- exact query language/demand: unresolved
- current outcome: HIGH_PRIORITY_HOLD_FOR_GKP_AND_SERP

### Q04 product types
- Skirt 89, Headpiece 34, Bodysuit 30, Belt 13, Mask 11: inventory gate plausible/strong.
- Wings 4: minimum-depth boundary; design-family proof required.
- Current outcome for all: HOLD_FOR_QUERY_CLUSTER_AND_SERP, not automatic collection.

## 9. Next finite execution package

1. Materialize Candidate Intent Registry schema/data for the approved semantic source.
2. Build durable design_family_key policy before final product-depth decisions.
3. Reuse July metrics only where the exact returned keyword/targeting matches; never substitute adjacent terms.
4. Prepare exact GKP request/export package for missing Q02/Q01/Q04 seeds.
5. Run controlled SERP capture/normalization and cluster-overlap computation.
6. Produce final Eligibility Cards for Q02/Q01/Q04.
7. Only after that create/assign query clusters, primary owners and page specs.
8. Membership snapshots and internal-link graph follow ownership; copy generation follows those.

No landing copy is authorized by this checkpoint.
