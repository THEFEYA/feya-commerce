# FEYA Controlled Editing & Version Ledger v1

Status: database foundation implemented; no edit UI/route enabled
Architecture: FEYA Growth OS v1.0 CANONICAL

## 1. Purpose

Create the minimum safe mutation foundation for future FEYA Product Builder editing.

Current rule:

No browser write access.
No direct client mutation.
No autonomous agent publishing.

Controlled edits must be:

authenticate -> authorize -> validate -> mutate atomically -> audit -> version -> review.

## 2. Reused existing objects

### feya_commerce_admin_review_events

Existing server-only audit/review event table.

It already had:
- event_type
- event_status
- subject_type
- canonical_product_id
- admin_note
- source_route
- payload_json
- created_by
- timestamps

Growth OS migration extended it with:
- actor_user_id
- actor_type
- change_group_id
- action_scope
- reason
- before_state_json
- after_state_json
- source_version_ref
- resulting_version_ref
- idempotency_key
- applied_at

This avoids creating a second overlapping event journal.

Browser roles remain unable to read/write this table.

## 3. New generic Version Ledger

Table:

feya_commerce_entity_versions_v1

Purpose:

Store immutable version snapshots for material entity surfaces.

Current surface types:
- product_truth
- content
- seo
- media
- price
- offer
- technical
- template

Identity:

canonical_product_id + surface_type + surface_key + version_no

surface_key examples:
- content/en
- content/es
- media/default
- offer/default

The table is RLS-enabled and browser roles have no access.

## 4. First controlled mutation primitive

Function:

feya_fn_update_content_draft_v1

Scope:

feya_commerce_content_drafts only.

Allowed patch fields:
- site_title
- card_title
- h1
- seo_title
- meta_description
- short_description
- full_description
- what_is_included
- notes

Not allowed:
- Product Truth
- Product DNA
- price
- media
- configuration
- publish state
- production/shipping truth
- arbitrary columns

## 5. Atomic behavior

The function performs one database transaction:

1. Validate actor type.
2. Require a non-empty reason.
3. Validate patch object and field allowlist.
4. Resolve idempotency key.
5. Lock the product-language content draft row.
6. Snapshot before-state.
7. Bootstrap version 1 if no content version exists yet.
8. Apply allowed patch.
9. Force review_status = needs_review.
10. Snapshot after-state.
11. Reject no-op changes.
12. Record immutable audit event.
13. Create next content version.
14. Link event to source/result version.
15. Return event/version/change fields.

If any step fails, the full transaction rolls back.

## 6. Idempotency

Optional idempotency_key is supported.

A repeated request with the same key returns the existing event/version instead of creating another mutation.

A rollback-only test confirmed:
- first and second call returned the same event ID;
- first and second call returned the same version ID;
- second call returned changed_fields = [];
- no test data remained after rollback.

## 7. Rollback-only validation performed

Test product:

0395cb11-424f-407f-a849-7ee3b617ab57

Temporary patch:

meta_description = __FEYA_GROWTH_OS_RPC_ROLLBACK_TEST__

Observed inside transaction:
- event created;
- content version 2 created;
- changed_fields = [meta_description].

After ROLLBACK:
- meta_description returned to NULL;
- review_status returned to not_started;
- test events = 0;
- test versions = 0.

No production content was changed by the test.

## 8. Admin Auth prerequisite

An edit route/UI must not call this function until:

ADMIN_AUTH_ACTIVATION = PASS

Required:
- FEYA_ADMIN_AUTH_REQUIRED=true
- approved user/email allowlist
- successful preview login
- unauthorized account blocked
- logout verified

The current branch installs auth scaffolding but leaves enforcement disabled by default.

## 9. Service boundary

The RPC is executable only by service_role.

anon/authenticated browser roles cannot execute it directly.

Future flow:

authenticated admin browser
-> server action / route
-> admin authorization re-check
-> server-only service role
-> feya_fn_update_content_draft_v1
-> audit/version result

The service-role key must never enter browser code.

## 10. Relationship to legacy SEO history

Keep existing:
- feya_commerce_seo_change_sets
- feya_commerce_seo_pack_drafts_v1
- feya_commerce_seo_pack_draft_events_v1

These remain valid historical/domain-specific data.

Do not stretch feya_commerce_seo_change_sets into a universal Growth OS ledger: its field/status constraints are intentionally SEO-specific.

## 11. SCO/CQA reuse

feya_commerce_seo_pack_drafts_v1 already contains strong proposal/review foundations:
- Product Truth snapshot
- keyword role snapshot
- agent input/output snapshot
- validation result
- similarity snapshot
- human review
- publish guard

Therefore future SCO/CQA shadow mode should extend this existing pipeline rather than create another content proposal store.

## 12. Applied Supabase migrations

Remote Supabase migration history is currently canonical.

Applied for this implementation wave:

- 20260917233243 — feya_keyword_metric_snapshot_api_provenance_v1
- 20260917233323 — feya_keyword_metric_snapshot_idempotency_index_v2
- 20260917233712 — feya_keyword_metric_snapshot_bid_currency_v1
- 20260917235021 — feya_commerce_version_ledger_foundation_v1
- 20260917235128 — feya_commerce_entity_versions_surface_key_v2
- 20260917235152 — feya_content_draft_atomic_update_rpc_v1
- 20260917235235 — fix_content_draft_rpc_ambiguous_version_id_v1

Do not create a partial local supabase/migrations history until a full repository database baseline strategy is approved.

## 13. Next gate

Next implementation task for controlled editing:

1. activate/test admin authentication with an explicitly approved account;
2. add server-side authorization helper;
3. expose one narrow content-draft edit form in Product Builder;
4. call only feya_fn_update_content_draft_v1;
5. display returned event/version;
6. do not publish storefront changes automatically.


## 14. SEO Portfolio migrations following this foundation

The next Growth OS implementation wave added:

- 20260917235543 — feya_seo_portfolio_foundation_v1
- 20260917235623 — feya_seo_page_portfolio_safe_view_v1

These are separate from controlled editing but share the same implementation branch and remote Supabase migration history.
