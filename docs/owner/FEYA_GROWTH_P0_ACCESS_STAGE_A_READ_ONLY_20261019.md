# TheFEYA Growth OS — Stage A: read-only access inventory

**Date:** 2026-10-19. **Status:** REVIEW / DRAFT, no Production modification. **Owner screenshot later confirmed a physical Scheduled Backup dated 2026-10-19 03:08:17 UTC, but no restore was tested and Storage objects are outside that backup.**
**Tracker:** MASTER #145 and security gate #166.
**Business boundary:** one existing Supabase project hosts active TheFEYA Commerce and paused historical FEYA Sales, relocation and warehouse datasets. Do not mistake a shared database for permission to cross-share records.

## 1. Separate evidence layers

| Independent layer | Meaning | Observed |
| --- | --- | --- |
| PostgreSQL metadata | SQL grants, RLS, view mode and routine execute rights | Inspected read-only |
| Supabase Data API | Which public/custom schemas are actually exposed | UNKNOWN from current connector |
| Consumers | Next and legacy Apps, Edge handler authorization, outside clients | INCOMPLETE |
| Restoration | Actual dated recoverable backup and a tested non-destructive restore path | UNVERIFIED |

SQL grants alone **do not prove externally reachable HTTP endpoints or unauthorized data access**. RLS enabled with no policies can intentionally deny all non-service readers. An existing definer view may be an intentionally reviewed public projection. Do not blanket-switch views, revoke whole schemas, or activate paused jobs.

## 2. New optional read-only utility

`scripts/growth-p0-access-inventory.mjs` is opt-in: it requires an explicit flag and a separately provided private database URL. It creates a `BEGIN READ ONLY` transaction with a query timeout, performs only two aggregated `pg_catalog` metadata SELECTs on the mixed-public and legacy-sales cohorts, and rolls back.

Run only from a trusted machine with existing credentials; do not put them in this chat, tickets, or CI:

`FEYA_ACCESS_AUDIT_DATABASE_URL=<private URL> node scripts/growth-p0-access-inventory.mjs --read-only-catalog`

If the flag or environment variable is missing, it does not connect. The emitted JSON never contains table, function, column or secret names. It says `REVIEW_REQUIRED` even when all catalog queries succeed. `api_exposed_schemas=UNKNOWN`, `dated_restore_point=UNVERIFIED` and `safe_to_apply_permission_changes=false` cannot be replaced with guessed approvals. Do not schedule this script automatically or attach a production secret to public runners.

## 3. Audit findings and limits

The 19 October read-only database catalog and Supabase security advisor results support a P0 least-privilege review of historical and mixed cohorts. They do not establish a confirmed external breach, exfiltration, or effective anonymous HTTP access. Edge Function deployment state and JWT flag alone cannot prove or disprove handler-level authentication. Avoid probing paused endpoints by calling them. Business row contents, contact records and token values were not read.

Exact unpatched object/handler names, private risk assessment, consumer identities, and migration-ready permission targets must be kept in the **Owner's private audit**, not in public GitHub, source comments or CI logs.

## 4. Next ordered gates

1. **Recoverability:** Owner inspects a dated Supabase Scheduled Backup, its retention/scope, and a separate Storage-objects backup need. Do NOT click Restore in Production. Pro subscription entitlement is not a proven restored copy.
2. **Consumers:** map each candidate to active Next app, old FEYA Sales/CRM code, existing Edge Function and external integration. No code-search match is **not** proof no consumer exists. Protect approved storefront Product/Shipping/Search read projections and service-only Growth RPCs.
3. **Smallest safe target:** record current table/column/sequence/function rights, Data API schema exposure, RLS/definer behavior and dependent views. Assign a legitimate role matrix with named business owner privately.
4. **Separate proposed migration:** exact positive service-read and negative anon/auth tests on isolated native PostgreSQL 17, fail-closed drift gate, tested reverse/rollback and owner approval of the specific SQL. No bulk RLS toggles, GRANT expansion or mass REVOKE.
5. **Postflight only after explicit authorization:** public Shop/SEO/Product Truth/207 PDP Search v12/V13, Owner Auth, Admin, carrier quote, approved Growth views and GSC checks remain sound; re-run advisor and compare catalog cohorts.

## 5. Additive guarded-caller proposal (NOT DEPLOYED)

The static code review of some legacy paused Edge deployments identified a cohort where a privileged service client is used after a request is received. Some deployments have platform `verify_jwt=false`. This calls for private per-handler review of **request authentication before the first read/write**, not a public claim of exposed handlers, safe deactivation or a complete breach assessment.

A small **opt-in pure policy primitive** now exists at `lib/security/legacyEdgeInboundGuard.ts`. It is deliberately *not wired into any deployed Edge Function*. A future reviewed migration may import or embed the equivalent guard **ahead of body parsing and ahead of creating a privileged database client**. It requires a separately provisioned high-entropy caller secret (never the Supabase service-role/anon key), validates strict POST/Bearer syntax and bounded length, compares SHA256 digests without early-exit byte checks, and fails closed (401/405/503) with generic responses. All code paths are covered by Node offline tests. The primitive cannot identify callers, revoke leaked secrets, replace complete JWT/HMAC/source authorization or verify which public HTTP routes are actually reachable. Do not treat its existence as remediation.

**Mandatory release checklist per handler, before deployment:**
- Owner-private exact handler identity, hash/version and full call-site inventory (including external automations and old clients), explicit legitimate owner and business purpose;
- Trust contract: authenticated non-browser caller, key rotation and secret storage, replay/rate controls as needed. Never pass the dedicated token to a public storefront browser;
- Test unauthorized request rejection **without invoking a production handler** (isolated Deno/PG17 environment), valid authorized functional behavior, no service writes before guard, and conservative fallback when secret missing;
- Approval of exactly one deployed handler change, rollback plan and post-deploy verification that paused jobs stay paused. A handler's `verify_jwt=false` may be legitimate for signed webhooks; do NOT blanket-switch all 28 functions or revoke service grants.

**Stage A still blocked:** Data API exposed-schema settings not yet independently verified; consumers and effective external reachability require separate private assessment. No deployed handler was contacted or modified in this PR.

## 6. Non-changes / checkpoints

The new code, unit tests and this runbook are read-only and create **no** DB migration, credential change, Edge deployment, cron, model/API spend, source health promotion, payment enablement or storefront change.

Mission Control PR #188 stays separate from security. HTTP evidence archive PR #186 has its own dated backup/SQL/import owner approval gates. The first real Growth Case / QA / Measurement cycle cannot claim a commercial improvement without independently verified measurement.

**Stage A audit is not complete** until actual Data API exposure, private named consumer dependencies and backup restoration evidence are verified. A green CI does not authorize permission changes.
