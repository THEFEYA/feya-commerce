# Phase13 P1: collection source V2 exact card data parity, 2026-10-15

Status: ADDITIVE MIGRATION CANDIDATE, public reader switch NOT authorized by this PR.

WHY NOT SIMPLY USE SHOP FAST V3? The old public collection source fast_v1 has all 207 card_title/H1/seo_title/meta_description values different from pinned Shop V3. Sixteen Full Set amounts also differ from the V3 generic card amount. A direct reader switch would silently change publicly visible product labels and some prices: violates frozen V13, owner-approved product/offer truth. Historical fullset fallback/sampler rules must be kept.

The proposed exact V2 collection adapter derives old current card title/H1/metadata from existing live product_drafts; obtains identical approved images, ids, slugs, colors and other display data from the proven Fast V3 reader; and recomputes live Full Set price using the existing exact three-table regex and fallback/sampler exclusions. It does not regenerate SEO text or change Search v12 18 index-owner URLs / 207 noindex PDPs.

READ-ONLY production comparison before any DDL: 207 old rows / 207 proposed rows / 207 distinct IDs, 0 bidirectional to_jsonb row-field differences across all 31 original public columns, 0 missing required fields. 23 common non-copy fields matched; the previous 207 title/H1/metadata mismatches and 16 Full Set mismatches are explicitly preserved. The old collection fast_v1 single SQL EXPLAIN ANALYZE recorded 277.322ms (one run, NOT visitor field LCP); PostgREST historical group 515 successful calls mean 802.3ms and maximum 4915.2ms. Needs bounded comparable repeated post-install evidence, not a claimed conversion lift.

STAGED RELEASE: exact PR CI 19/19 and protected Vercel Preview READY; independently apply new service-only security_invoker=true view. Atomic migration aborts unless 207 counts, 31-field to_jsonb bidirectional equality and privileges match. Original view continues serving Production. After migration read-only compare row values, column types, service-role ACL and SQL costs.

Only then consider a separate single-string collection reader cutover with real PostgREST parity and full-stream, exact-commit Production QA of relevant collection paths and original 18/24 Search v12 and 4 Shop. Rollback is switching reader back to V1. No changes to checkout/payment, source authority, approved 207 SEO text, fonts, CSS or visuals.
