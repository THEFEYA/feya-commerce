# Phase 13 P0A — matched catalog gateway and source timing
Date: 2026-10-17. Subordinate to MASTER and [Performance #119](https://github.com/THEFEYA/feya-commerce/issues/119).

The existing `feya_catalog_source_read_v1` records only slow (>=1500ms) / failure source reads. Fast-v3 cumulative SQL timings (mean ~165ms) and Supabase gateway one-day timings (median ~303ms, p95 ~1843ms) were NOT the same per-request population; no valid SQL-versus-network subtraction had been possible.

## Scoped stage attribution
The same existing PostgREST call uses an optional per-client fetch wrapper:
- `fetch_headers_ms`: wall-clock wait for fetch response headers (includes network and upstream).
- `gateway_upstream_ms`: `x-envoy-upstream-service-time` if numeric and available, otherwise null.
- `post_headers_ms`: bounded remainder of the original source read (body transfer/JSON/client).
If more than one fetch occurs, values are null to prevent mismatched attribution.

**No new requests, response buffering, retries, extended timeouts, new high-volume logs, cache behavior or money.** Log only bounded timings on the existing slow/error event; no raw response, product, buyer or authentication fields. Existing 207-row identity/SHA/price/facet and frozen V13/SEO v12 checks unchanged. The optional fetch argument does not change callers that omit it.

## Next decision gate
After CI/Preview and an approved code-only release, compare matched slow events across real traffic. If gateway wait dominates, investigate Supabase PostgREST gateway/pooling (not automatically SQL). If post-header dominates, study response transport or decode. Remote Vercel Runtime Cache is a **separate usage-priced option**, HOLD until evidence of avoidable misses, invalidation parity and spending approval. No claims about browser LCP or conversion from server timings.
