# TheFEYA Master Execution Status — 2026-09-30

Canonical plan: **TheFEYA Storefront, Search & Performance Architecture v1.0**.

This file is a checkpoint against the canonical master so implementation does not drift, repeat completed work, or skip a migration gate.

## Frozen contracts

- Owner-approved storefront visual design: **FROZEN**
- Product DNA / shopper taxonomy / labels / relationships: **FROZEN**
- Search Release: **NOT ACTIVE**
- Checkout/payment: **NOT ACTIVATED**
- Persistent public storefront caching: **PHASE 6 PARTIALLY ACTIVATED / GOVERNED**

## Execution sequence

| Master phase | Status | Evidence / gate |
| --- | --- | --- |
| 0 — Canon & Current Snapshot | COMPLETE | Live GitHub/Vercel/Supabase reconciliation recorded; exact public corpus is 207 approved products, not the 243-row raw candidate surface. |
| 1 — Baseline Without Behavior Change | COMPLETE | Existing CI evidence persisted in `PERFORMANCE_BASELINE_PACK_20260930.md`; no production field-CWV claim. |
| 2 — Safe Framework Upgrade | COMPLETE | Next.js 16.3.7 compatibility branch passed FEYA validation and Vercel preview in `dub1`. |
| 3A — Slim Product Card Read Model | COMPLETE | Exact 207-product service-only projection; card/content/price parity passed. |
| 3B — Product Detail Read Model | COMPLETE | Exact 207-product service-only PDP projection; 207/207 rows, 0 raw product/media differences, 0 empty galleries/configurations; PR #34 CI green. |
| 4 — Swap Public Shop Data Layer | COMPLETE | `/shop` now uses the exact 207-product slim read model with legacy media/query fan-out removed; closed-review runtime, Typecheck/build, FEYA validation run `36699053147`, and Vercel preview all pass on commit `5ba38c841663f794fa2d630582d8b93cba4db8d2`. `force-dynamic` / `revalidate=0` remain intentionally unchanged. |
| 5 — Invalidation Plumbing | COMPLETE IN CODE / HOSTED ACTIVATION REQUIRED BEFORE PHASE 6 | PR #33 is rebased onto the green Phase 4 head. FEYA validation run `36700072296` and Vercel pass on commit `ccfab2a96403148853f7052954b8e341dbdad789`. The real internal Route Handler is exercised in isolated Supabase/Next runtime: dedicated-secret auth, stock invalidation scope, accepted→delivered audit logging and idempotent replay all pass. Product/media/stock/slug/unpublish/membership/content scopes are explicit. Persistent public caching remains disabled. |
| 6 — Route Caching | IN PROGRESS — FINAL `/shop` SLICE | Support/policy pages, owner collections and PDPs are green. Homepage is now PPR on the approved 207-product card source with request/review authorization outside shared cache; FEYA validation run `36784785399` and Vercel preview are green. `/shop` is the final named Phase 6 slice and remains the only storefront route gate before Phase 7. Public visual output and Search Release/indexation remain frozen. |
| 7 — Hybrid Shop Filtering | NOT STARTED | Requires stable cached catalog foundation. |
| 8 — Navigation / Hub UX | NOT STARTED | Search ownership and visual contracts remain unchanged until this phase. |
| 9 — Owner Route Alignment | NOT STARTED | Owner decision required for reserved URL renames before indexation. |
| 10 — Image / Bundle / Prefetch Optimization | NOT STARTED | Starts after data/cache architecture is stable. |
| 11 — SEO Content / Structured Data Finalization | NOT STARTED | Uses approved Page Portfolio and query ownership. |
| 12 — Search Release | BLOCKED BY DESIGN | Domain/GSC/owner release gates remain unresolved; indexing stays fail-closed. |
| 13 — Post-Launch Feedback Loop | NOT STARTED | Requires production launch and real field data. |

## Current single engineering objective

Finish **Phase 6 compatibility migration**, then activate caching in the master order without changing storefront visuals:

1. preserve the already-green support/policy → owner collections → PDP → homepage cache slices without reopening them;
2. activate `/shop` as PPR with URL/search-param runtime state outside the shared cache and the exact approved 207-product catalog behind the governed site/catalog tags;
3. keep closed-review authorization, invalid URL/page handling and redirect semantics request-scoped;
4. attach only the Phase 5 governed tags/paths to cached readers and keep mutation invalidation deterministic;
5. preserve the frozen visual output, exact 207-product approved corpus, closed-review authorization and Search Release/indexation fail-closed controls;
6. do not start Phase 7, Search Release, or new SEO-copy work until the Phase 6 route-caching gate is complete.
## Do not repeat

The following work is already closed and must not be re-researched/rebuilt unless a concrete regression invalidates its evidence:

- broad SEO doctrine research;
- Product DNA / taxonomy design;
- initial Page Portfolio ownership research;
- visual redesign;
- Next 16 selection/upgrade decision;
- 207-vs-243 corpus reconciliation;
- card read-model parity;
- product-detail read-model parity;
- pre-upgrade performance baseline capture.

Any new verification must correspond to a named gate above or diagnose a failing gate.
