# Phase13 GDAE — honest Data Source Health, 2026-10-15

**Status:** candidate for controlled production release. Does not activate GA4, GSC, payments, AI-driven actions or Google Search indexing.

## Found in production
All 10 `feya_growth_data_source_health_v1` snapshots currently have exactly one `checked_at=2026-09-18 10:08:59 UTC`. Four have stored `health_state=HEALTHY`, some `freshness_state=FRESH`. They were verified **26 days** ago. The existing safe V1 view republishes them as current statuses; existing owner `/admin/data-health`, `/admin/company/system` and `/admin/company/growth` therefore surface a misleading impression of a live successful check. The original UI itself explicitly warns no automatic source scheduler is active.

## Policy and isolation
- No new collection, no mock metrics, no updating the original history or GDAE decisions. The original `feya_growth_data_source_health_v1` record and `..._latest_safe_v1` read-only historical semantics remain unchanged.
- Derived `feya_commerce_v_data_source_health_effective_safe_v2` adds a read-time effective status with the exact same 19 output columns. A HEATHY or DEGRADED source with proof older than the lesser of its documented `expected_max_age_seconds` and **seven-day check ceiling** becomes `STALE`. A source whose observed data watermark is beyond its documented data max age also becomes STALE. `UNAVAILABLE` stays UNAVAILABLE, `NOT_OBSERVABLE` stays NOT_OBSERVABLE; `UNKNOWN` and `NOT_APPLICABLE` freshness states stay unchanged. Only explicit previously `FRESH`/`AGING` flags become stale when necessary.
- New view preserves `security_invoker=true`, `security_barrier=true` and the historical safe-view SELECT audience `anon/authenticated/service_role`. No sensitive raw secrets or personal information surfaced.
- UI lookup changes only in three existing Russian admin screens. Reclassifies stale under **Нет свежей проверки** in the summary, retaining existing typography/components/design; no new dashboard.
- Real source checks recorded later in the underlying ledger automatically restore eligible `HEALTHY` (when current, not merely from code release). Nobody should backdate freshness or convert missing data to zero.

## Deploy gate
1. Exact PR SHA FEYA validation 19/19 and Vercel Preview READY (UI/auth/search).
2. Independently apply additive view migration in production Supabase; verify row parity V1/V2, same source IDs/timestamps, exactly 4 previously healthy items now stale (given current state), and unchanged role privileges.
3. Only then merge the three-source UI reader cutover; verify Production READY + same `/shop` / Search v12 18 index owners; `/admin/data-health` requires owner login.
4. Rollback UI readers to V1 only if new view fails. Do not overwrite underlying evidence or relabel as healthy during rollback; the prior V1 snapshot is already known to be dated.

**Human prerequisites unchanged:** connected GSC Wizard cannot access current data, HYPD has no GSC site and only a legacy `Feya-Portupeya.com.ua` GA4 property; actual `thefeya.com` GA4 and confirmed privacy controller must precede analytics collection. Seller Online #264386 / paid checkout separate.
