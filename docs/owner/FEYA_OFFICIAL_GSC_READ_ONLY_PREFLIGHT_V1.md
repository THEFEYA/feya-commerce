# TheFEYA — GDAE official Search Console read-only preflight v1

Status: SHADOW / not yet connected. Subordinate to MASTER Phase 13, Growth OS Core, GMEL canonical passport and AI cost discipline.

## Business reason
Search Release v12 (18 indexable URL owners) and Google Search Console domain property sc-domain:thefeya.com were verified on 2026-10-01. The original sitemap submission is historical evidence, NOT fresh search performance. Current HYPD GSC integration returns no sites; the GSC Wizard connector requires its own paid subscription. Neither proves Google's domain property is unverified. Do not re-create the property or purchase a connector by default.

## Code boundary
- New GET /api/internal/gsc-source-readiness is protected by the existing FEYA_INTERNAL_API_TOKEN; no browser/public access.
- Disabled by default: FEYA_GSC_READ_ENABLED=false. Without three GSC OAuth variables, there are zero upstream API requests.
- Fixed property: sc-domain:thefeya.com; URL-prefix site and any other property are not acceptable substitutes.
- OAuth scope needed: https://www.googleapis.com/auth/webmasters.readonly. Never reuse Google Ads refresh tokens as an unproven GSC grant.
- On explicit authorized request, refresh GSC-only OAuth, read sites.list, require matching domain property + Google permission, then one date-only searchAnalytics.query over the last 14 finalized UTC days ending 3 days ago.
- Result returns only window + aggregate clicks/impressions from explicitly returned date rows. Empty/missing days do not mean measured zero. It never claims current indexed URL count, organic growth or revenue.
- Every step is read-only, no storage, no Cron, no GA4 activation, no GMEL model send, no provider billing or Search/Product/V13/checkout mutation.
- Source health is NOT marked HEALTHY by a probe. Separate approved GDAE data ingestion with provenance, source identity, data watermark and row validation is required.

## Owner/operator gate later
1. Reuse the existing reviewed Google Cloud project where possible; enable the official Search Console API and authorize a Google account with access to sc-domain:thefeya.com using read-only GSC OAuth. Do not infer scope from older Google Ads OAuth.
2. Set GSC-specific Client ID, Client Secret and Refresh Token as Vercel Production secrets directly in Vercel, not in messages or repository. Then enable the GSC read switch with explicit owner consent.
3. Make one authenticated internal read request and examine status, property and bounded period. This validates an API path only, NOT a warehouse connection or source-health approval.
4. GDAE then implements immutable ingestion/evidence and GMEL proceeds only after source freshness, owner-approved policy and validated provider spend gate.

Vercel environment-variable metadata previously returned 403 to the connected inspection tool; do not infer configuration state from that error. GA4 for thefeya.com remains unverified and existing measurement stays consent-gated/off. AI budget policies remain empty.

Official Google docs:
https://developers.google.com/webmaster-tools/v1/sites/list
https://developers.google.com/webmaster-tools/v1/searchanalytics/query
https://developers.google.com/webmaster-tools/v1/how-tos/authorizing

Control: https://github.com/THEFEYA/feya-commerce/issues/145
