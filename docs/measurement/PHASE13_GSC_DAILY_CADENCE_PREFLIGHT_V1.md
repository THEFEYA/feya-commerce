# TheFEYA Phase 13 / GDAE — dormant free daily Google Search Console cadence v1

State: Cron daily registration candidate; **daily Google source execution remains OFF unless the Human Owner explicitly activates the independent secure Production feature flag**. No new paid AI or subscription. This file is subordinate to Growth Data & Analytics Engineer canonical passport and MASTER #145.

## Ground truth
Owner's first official GSC immutable receipt on 2026-10-17 is `64fc359d-9068-417e-922a-905b9f71ce93`: `sc-domain:thefeya.com`, FINAL web search, 2026-10-01..14, 14 observed dates, 5 clicks, 98 impressions, SHA-256 `848a155597827ae47c0e75cbee26c75d8d08cb71fc0eb878cbef05273d613e1c`. Remote PostgreSQL independently recomputed 14 date rows / 5 clicks / 98 impressions. Older HYPD manual 2026-10-01..13 receipt is unchanged; 13 overlapping dates agree exactly.

## Why not enable Cron immediately
- The GSC Client Secret and one Refresh Token were shown in conversation screenshots. Rotate them in Google Cloud/Google OAuth and Vercel before unattended production jobs; don't paste values in GitHub or chat.
- Google Auth Platform Audience was verified by owner screenshots on 2026-10-17 as `In production` (External, 2 users / 100). No app republishing required. Refresh tokens may still be individually revoked.
- GDAE must prove a verified baseline, continuity and exact source. One observed successful receipt does not yet justify promoting canonical `ORGANIC_SEARCH_PERFORMANCE` from UNAVAILABLE/UNKNOWN to HEALTHY/FRESH or permitting paid GMEL interpretation.

## Technical choice, budget and implementation
- Google Search Analytics API: no additional paid intermediary; read FINAL property-date rows using `webmasters.readonly`, at most 14 finalized Pacific dates, three-day lag.
- Vercel native Cron: available on all plans; Hobby minimum one invocation per day, hourly scheduling precision. **Reviewed** expression: `0 10 * * *` (one invocation in the 10:00–10:59 UTC hour on Hobby; exact time not guaranteed). The follow-up Cron registration PR adds one route to `vercel.json` while preserving the approved `regions`. By default the endpoint remains OFF, even when Vercel starts its daily delivery.
- Code-only owner-disabled `GET /api/cron/gsc-daily`: rejects missing CRON_SECRET (must be 32+ characters) and forged bearer with constant-time comparison. Requires VERCEL_ENV=production, VERCEL_GIT_COMMIT_REF=main and FEYA_GSC_DAILY_ENABLED=true AND FEYA_GSC_READ_ENABLED=true AND FEYA_GSC_CAPTURE_ENABLED=true. No special public route origin can bypass the secret.
- Before calling Google, the worker reads only the latest official source watermark in private Supabase; refuses a missing initial owner receipt, malformed/future watermark and any gap outside its rolling FINAL 14-day window. A day already covered creates no new fetch.
- One permitted run reuses the exact previously audited `captureOfficialGscOnce()` writer with a fresh Google read, bound verification and private idempotent SHA-256 RPC. Google corrections become new immutable receipts. No arbitrary user-provided URL/query/SQL, no raw OAuth tokens in responses.
- No GA4/Google Ads changes, no Google fetch or Supabase source write until owner activates the independent flag; a registered-but-disabled Cron can perform one tiny HTTP check daily. No provider AI calls or model budget policy. 207 approved products, V13 visuals, Search Release v12 and checkout untouched.

## Activation release gates (future owner action, not this PR)
1. Audience `In production` is confirmed. Rotate the disclosed dedicated GSC Client Secret and Refresh Token, replacing only FEYA_GSC_OAUTH_CLIENT_SECRET/REFRESH_TOKEN in Vercel Production; redeploy and reverify owner read-only GSC before enabling an unattended data reader.
2. Add server-only `CRON_SECRET` as an unguessable randomly generated value >=32 characters in Vercel Production. Never reuse FEYA_INTERNAL_API_TOKEN, Google OAuth credentials or publish it under NEXT_PUBLIC_.
3. Register one audited daily route in `vercel.json`: `crons: [{path:'/api/cron/gsc-daily',schedule:'0 10 * * *'}]`. It will respond without accessing Google while the independent feature flag remains OFF. Vercel Hobby's execution is within the 10:00–10:59 UTC hour, not guaranteed at an exact minute.
4. Set only FEYA_GSC_DAILY_ENABLED=true in Vercel Production **after** the scheduled code is confirmed and review exact real-run logging. If a gap is detected, do not auto-fill missing dates with zero; stop and backfill by separate approved procedure.
5. Before promotion to canonical source-health/marts, GDAE must implement a governed daily latest-value view with data provenance, watermarks, last-success, missingness, freshness SLA and audit of late Google corrections. Then GA4/commerce authority, GMEL source eligibility, independent owner-approved AI budget remain separate.

Official docs: https://vercel.com/docs/cron-jobs/usage-and-pricing and https://vercel.com/docs/cron-jobs/manage-cron-jobs
Tracker: https://github.com/THEFEYA/feya-commerce/issues/145