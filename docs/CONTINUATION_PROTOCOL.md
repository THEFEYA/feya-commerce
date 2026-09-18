# Product SEO batch checkpoints

Use the existing `feya_project_passports` and `feya_project_progress` tables.
No new workflow database is needed.

## Current pointer

`feya-commerce-continuation-current-v1` is the stable passport slug. Update its
content and `updated_at` after every completed or blocked product. Keep a dated
progress row per batch with the outcome and exact next action.

For each item record:

- listing ID and canonical product ID;
- source decision ID and its timestamp;
- current offer and keyword-selection signatures;
- source and saved draft IDs, preserving prior versions;
- factual preflight, structural/commercial/keyword QA and editorial outcome;
- image coverage and any outstanding ALT review;
- actual writer calls and returned usage (unknown is not zero);
- the exact blocker and next action when incomplete.

## Read-only recovery

Read the stable passport first. Reconcile only its batch against current rows.
Use the latest non-archived version **per product**, not historical row totals:

```sql
with latest as (
  select distinct on (canonical_product_id)
    id, canonical_product_id, matched_etsy_listing_id, status, review_status,
    created_at, updated_at
  from public.feya_commerce_seo_pack_drafts_v1
  where archived_at is null
  order by canonical_product_id, created_at desc, id desc
)
select status, review_status, count(*)
from latest
group by status, review_status;
```

Fetch latest decisions only for the recorded product IDs:

```sql
select distinct on (canonical_product_id)
  id, canonical_product_id, matched_etsy_listing_id, decision_status,
  manual_focus_json, selected_keywords_json, updated_at
from public.feya_commerce_listing_master_decisions_v1
where canonical_product_id = any ($1::text[])
order by canonical_product_id, updated_at desc, created_at desc, id desc;
```

The `$1` above is a bound array parameter, not a literal ready-to-run SQL value.

## Write and interruption discipline

A timeout is not evidence that a write failed. Before retrying a save, query
for the expected product/new draft and its event. Record a partial write if a
draft exists but the event failed. Avoid duplicate saves and duplicate paid
generation. Never modify an earlier approved artifact to make a batch pass.

Save generated copy only after current factual and storage gates pass.
Checkpoint blocked work in the passport so the next chat can resume without
repeating a paid call. Keep research documents, keyword-bank rows, credentials
and full draft snapshots out of public GitHub checkpoints.

## Recovery finding: 2026-09-15

The event normalizer was changing the modifier in `rave nights` to `raves
nights`. The continuation patch preserves singular noun modifiers, repairs the
observed saved error, remains idempotent, and keeps archived exact-copy
recoveries working. It was checked against 84 targeted SEO tests. This is a
code correction; it does not itself rewrite or approve any stored draft.
