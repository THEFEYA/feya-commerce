# TheFEYA Phase 13: first direct Google Search Console evidence receipt

Status: DORMANT until owner explicitly enables FEYA_GSC_CAPTURE_ENABLED=true. Governed by MASTER, GDAE/GMEL passports and approved source health.

## Verified prerequisite
On 2026-10-17 the protected owner GSC read-only button succeeded for exact property sc-domain:thefeya.com, with 14 observed dates / 5 clicks / 92 impressions. This is a server read, not yet a GSC production receipt. One earlier HYPD manual 2026-10-01..13 receipt exists and is immutable.

## One-time owner action
1. After exact-head full green CI, merge and Vercel Production READY, set only FEYA_GSC_CAPTURE_ENABLED=true under the existing feya-commerce Vercel Production environment, Save, Redeploy. Preserve FEYA_GSC_READ_ENABLED=true and other variables; secrets are not needed in chat.
2. Open https://thefeya.com/admin/system-readiness while authenticated with an allowlisted FEYA owner. Click Проверить подключение GSC, tick explicit write confirmation, and click Сохранить снимок GSC.
3. An authenticated same-origin POST makes a fresh official GSC read, checks exact domain, FINAL date rows and Google Pacific date window; the existing private service-role RPC stages one source-provenance-bound receipt in feya_growth_gsc_observation_receipts_v1. It never trusts browser-submitted clicks, impressions, dates or property.
4. Independently re-read receipt_id, SHA-256, source_channel GOOGLE_GSC_OFFICIAL_READONLY, observed dates, clicks/impressions and source_health_promoted=false directly from Supabase. No fabricated zero for missing dates.
5. A repeated identical read is idempotent; later Google corrections append a new version rather than rewriting historical observations.

## Runtime, privacy, cost
- The owner route requires Supabase Auth, FEYA admin allowlist, exact browser Origin and one explicit confirmation. Both server read and capture switches must be true; old internal-token-only route shares the same writer.
- No Cron, no GMEL paid run, no AI budget, no merchant or order mutations, no Google Ads/GA4 changes, no product edits, no Search Release v12/207 PDP/V13 modifications.
- Source health remains UNAVAILABLE/UNKNOWN until a separately governed multi-run ingestion, watermark and freshness acceptance.
- Previously disclosed OAuth credentials should be rotated before unattended automation; check Google Auth Audience publishing status for long-lived offline grant.

Next: after one verified immutable official receipt, review low-cost daily cadence and late Google data correction without promoting source health prematurely.

Tracker: https://github.com/THEFEYA/feya-commerce/issues/145