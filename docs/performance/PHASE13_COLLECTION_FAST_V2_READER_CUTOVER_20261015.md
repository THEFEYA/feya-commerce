# Phase13 P1 — exact Collection V2 server reader cutover, 2026-10-15

Prerequisite: additive PR #139 merged, real production view feya_storefront_collection_cards_fast_v2 installed and independently checked at 207/207 rows, 31/31 same columns, 0 bidirectional to_jsonb differences, service_role SELECT allowed, anon/authenticated denied. The original Collection Fast V1 remains installed and is the one-line rollback target.

One live server-only collection source name changes from Fast V1 to Fast V2; all public cards, prices, media, legacy collection SEO labels, current Full Set arithmetic, immutable membership snapshots and frozen V13 CSS/React remain the SAME. Exact Search Release v12 remains 18 index owners and 210 noindex (including 207 PDPs). All 207 approved SEO originals for PDPs remain in separate Draft PR #127, payments OFF.

The isolated local Auth/PostgREST fixture lacks the real product/price business tables for applying actual V2 migration. It adds a service-only V2 alias over its already canonical V1 fixture for transport testing. Actual V2 SQL and all-field equality are verified independently in the real database and candidate SQL tests. No fake values are used in Production.

Add permanent full-stream collection origin smoke for the existing approved 80-piece Shoulder Armor, 111-piece Festival Outfits, and 11-piece Costume Masks snapshots. Validate real SSR product cards and original membership counts, not just HTTP 200/metadata. In Pull Request checks this uses the current previous Production and is advisory; on main it is strict AFTER the exact deployed SHA gate. Existing Shop full-stream 4 URLs and Search v12 18 index/24 sampled noindex origin checks remain intact.

Release gate: exact-head 19/19 CI + Vercel Preview READY; merge only after evidence. In Production, gate exact SHA and run the full origin tests; check Vercel errors for Search Landing and fast_v2 PostgREST latency. Do not claim measured p75 LCP/INP/CLS until real field data is available. If prices/selected components/approved SEO regress, rollback the one server view constant to original V1 with a new bounded PR; leave installed V2 additive view for audit.

Do NOT change Seller Online payment gate, GA4/GSC consent, Return Policy, Shipping, dynamic PDP content, search-index release states or approved V13 visual style.
