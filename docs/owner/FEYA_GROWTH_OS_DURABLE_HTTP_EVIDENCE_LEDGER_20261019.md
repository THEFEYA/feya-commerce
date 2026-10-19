# TheFEYA Growth OS — Durable G2c HTTP Evidence Ledger v1 (DRAFT)

**Operating authority:** FEYA Growth OS original CANONICAL Core/8 passports; [MASTER #145](https://github.com/THEFEYA/feya-commerce/issues/145), [G2 #178](https://github.com/THEFEYA/feya-commerce/issues/178), [G2d #184](https://github.com/THEFEYA/feya-commerce/issues/184). GDAE owns source identity/quality and durable ingestion, TSEO owns intended-versus-live HTTP, GMEL owns evidence ceiling/outcomes. Human Owner authorizes schema changes and any production data staging.

## Existing reality — verified 19 Oct 2026

- First honest production source [G2c PR #183](https://github.com/THEFEYA/feya-commerce/pull/183) released: main sha `533bc8e40f2fd1a9464495134459afde9308bd7d`, GitHub Actions *push* run `39180879535` SUCCESS, Vercel exact SHA READY.
- Github artifact `phase12-production-origin-crawl` ID `12155269341` created 19 Oct 00:28 UTC, **expires 18 Nov 2026 00:28:50 UTC**. SHA256 of original ZIP: `198ba252a30b36471795aceefa5eecedf1364fd7fa440e628e9fbae5557d9ae7`. Checksums confirmed from downloaded original archive. Its six raw JSON files together contain ~34KB, with 18 fully checked index-intended HTTP routes and 24 **individually** checked product noindex pages from 207 manifest products. 183 product HTTP routes were not inspected. Shop 4/4, collections 3/3, PDP smoke 5/5.
- CURRENT Supabase has one Storage bucket, `keyword_master_v3_3.csv`, **PUBLIC**, unrelated to Growth OS. Do not reuse it for private evidence. Existing GSC-specific immutable receipts are a separate factual source and must not be repurposed or overwritten.
- No private durable HTTP source receipts table exists. Do not call expiring GitHub artifact a warehouse or assume its hash is a trusted signature.
- No Measurement Spec/outcome or qualified independent GMEL QA yet. Active Search Release v12 stays authoritative; 207 approved PDP and V13 remain frozen.

## Architecture decision

Use a single **bounded immutable GDAE HTTP evidence ledger in existing shared Supabase/Postgres**, rather than a new Storage bucket, a second case FSM or an expensive new service. It is scoped to one source contract:
- `feya_growth_external_http_observation_receipts_v1` (new private append-only table for TSEO_PRODUCTION_HTTP_OBSERVATION, 0 current rows).
- `feya_fn_stage_external_http_observation_v1(jsonb)` (new existing-Core-style service_role-only staging RPC, default no UI/web write path).
- `feya_fn_reject_external_http_receipt_rewrite_v1` immutability trigger, even for service_role direct updates.
- Exact unique (`repository`, `workflow_run_id`, `artifact_id`), PostgreSQL canonical JSONB SHA256, original GitHub ZIP SHA256, release ID/code/version/hash and timestamp; immutable event identity. Never overwrite different payload for same GH artifact; exact retries return same receipt.
- Stable code-scope and original source: `THEFEYA/feya-commerce`, `push`, `refs/heads/main`, `https://thefeya.com`. Membership is checked against the **exact referenced historical Search Release and its original release items**. ACTIVE and RETIRED release versions can both have old source facts archived; storage **does not** make historical facts current or admit GMEL decisions.
- Each candidate contains explicitly checked index rows and a **selected** per-path product sample. Database membership checks forbid missing index routes, duplicate paths, non-product masquerading, forged pass/canonical/noindex and unknown network responses represented as 200. No hardcoded 18/24/207 in the validator: live release and actual per-path rows define sizes. Version 1 archives **fully observed passing L0 snapshots only**; a future versioned function can archive failed/partial evidence without adding a second table, preserving true unknown as null.
- JSON is capped at 256 KiB, with no raw HTML, DNS dumps, customer PII, authentication tokens or API keys. Small bounded evidence fits Postgres and avoids a private bucket until justified by volume.

## Trust boundary: what this ledger DOES NOT establish

The database cannot independently authenticate GitHub from a JSON string. A caller must perform **external provenance attestation** before staging, using authenticated GitHub API:
1. Get the exact run ID, repo/branch/main-push, workflow job **SUCCESS**, immutable artifact ID, and exact deployed Production SHA. If this exact release has since been RETIRED, preservation is permitted, but current active-release decisions remain blocked until independently reverified.
2. Download the original artifact securely and compute SHA256 of its ZIP bytes. Compare the independently obtained SHA with the candidate metadata. Verify file names and fail on ZIP bombs, symlinks or unexpected entries. Validate the 6 raw JSONs and G2c envelope against their source and active release.
3. Confirm no secrets or customer PII are present; use whitelisted per-path HTTP data, not full raw HTML.
4. Run `python3 scripts/verify_growth_archive_zip.py SOURCE.zip EXPECTED_ZIP_SHA256 OUT_DIR` to reject unsafe/unknown ZIP entries, and then run the offline candidate builder. **This outputs UNVERIFIED_OFFLINE_CANDIDATE** and never accesses Supabase or a provider API. Its hash is a *local candidate checksum*, not the PostgreSQL JSONB digest or a signature.
5. After independently approved operator review and ONLY after migration is explicitly approved/applied, invoke the service-role staging RPC in an authorized server context (not from the browser). Inspect created_new/id/digest, stored row, source-health state and non-mutated Growth Case/AI/metric counts. No anonymous/authenticated EXECUTE or SELECT.
6. An archived row remains `verification_state=PROVENANCE_REVIEW_REQUIRED` as a **deliberately conservative L0 factual record**. Independent reviewer trust and GMEL action require a separate scoped Core Handoff/attestation. No auto-promoted source health, QA PASS, Google indexed state, learning, revenue or case status.

A successful archive is a preservation event, not an SEO improvement. A raw GitHub run is not in itself a GH-source cryptographic signature, and the ZIP will still expire upstream after 30 days; the preserved bounded rows continue to exist in append-only ledger.

## Release gates / rollback

**All changes are a draft proposal; no SQL has been run against Production.** Before schema/record mutation:
- Independent owner approval specifying this one migration and later one-time baseline ingestion, not blanket Growth OS autonomy.
- Native PostgreSQL 17 matrix test for source identity, ACL/RLS, duplicate-intent retries and native concurrent writers, historic immutability, wrong release or URL, missing/forged status, claim flags false. PGlite test is supplemental only.
- Exact production schema preflight: Search Release v12 and product bindings, table name absent, function/signature absent, no unexpected/legacy migrations; current shared-Supabase access isolation reviewed.
- Capture authenticated SQL definition/grants and current schema migration/version; check the **actual** database restore point under Supabase Dashboard → Database → Backups, or prepare an independently verified logical export when the plan has no managed backups. The connected Supabase project metadata does NOT expose subscription/backup history. PostgreSQL `archive_mode=on` is **not sufficient evidence of an available restore point**. See https://supabase.com/docs/guides/platform/backups . Do not buy PITR or create a paid development branch without explicit approval.
- The migration is additive and wrapped in one SQL transaction. If it fails before COMMIT, no new object should persist. After a successful install **with ZERO staged rows only**, a dedicated surgical rollback is prepared at `docs/owner/rollback/FEYA_GROWTH_HTTP_ARCHIVE_EMPTY_INSTALL_ONLY_ROLLBACK.sql`: it locks the new table, asserts it is empty, drops exactly the new stage function, new archive table, and new immutable-trigger function, and leaves all existing FEYA/other-project tables untouched. This script is **not** in `supabase/migrations` and must **never** run automatically. Its real-Postgres regression also checks that a nonempty archive blocks rollback. **Do not delete historical evidence** to roll back a new UI. After even one receipt exists: freeze staging privileges and fix forward with separate owner approval.
- Stage one exact archived record only after authentication, inspect proof and readonly query counts. No provider paywall, LLM, Cron or Seller Online needed.
- Explicitly preserve 207 approved PDP SEO copy, Search Release v12, V13, shipping/cart, and 12 paused unrelated Cron jobs. No GSC/GA4/Commerce registry health promotion.

## Next after durable storage

A GDAE verifier needs a separately authorized, exact source-GitHub verification implementation (read-only first). GMEL can then prepare a **versioned, locked-before-change** Measurement Spec based on observed per-URL cohort with explicit unknowns, same membership, date/release, and protected product/SEO guardrails. Existing G2d [PR #185](https://github.com/THEFEYA/feya-commerce/pull/185) is a pure preflight and must not create an Outcome or claim a winner. Core [#182](https://github.com/THEFEYA/feya-commerce/pull/182) and human triage [#180](https://github.com/THEFEYA/feya-commerce/pull/180) are independently gated.

**Deadline for the first source artifact:** 18 Nov 2026. Re-check in GitHub before expiry; do not schedule a paid monitor or secretly move source data.
