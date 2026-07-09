# FEYA Commerce — SEO Draft Storage Handoff v1

Status: SQL applied; app route is implemented behind a guarded Preview/Production environment flag.

Related SQL:

```text
/docs/SEO_DRAFT_STORAGE_CONTRACT_V1.sql
```

## Why this exists

The SEO engine now has a guarded pipeline:

```text
Listing Master decision
→ SEO Brief contract bundle
→ SeoAgentInputContract
→ SeoAgentOutputContract baseline/mock
→ validator
→ Draft Review UI
→ guarded draft-save route
→ SEO draft storage tables
```

The storage layer is for reviewable SEO-pack drafts. It is not a publish layer and does not change storefront product truth.

## Design decision

Do not create another screen for storage.

Use existing screens:

```text
/admin/seo-engine/briefs
/admin/seo-engine/draft-preview
/admin/seo-engine/metric-import
```

Storage should serve these screens through one server-side route/RPC, not become a parallel product.

## Tables

### `public.feya_commerce_seo_pack_drafts_v1`

Stores reviewable SEO-pack drafts for a canonical product.

Important columns:

- `canonical_product_id`
- `matched_etsy_listing_id`
- `product_slug`
- `status`
- `review_status`
- `source_mode`
- visible draft fields: `seo_title`, `h1`, `meta_description`, `intro`, `bullet_highlights`, `faq`, `image_alt_candidates`, `internal_linking_hints`
- snapshots: product truth, manual focus, keyword roles, metrics status, QA, similarity, agent input/output, validation result
- human review fields

### `public.feya_commerce_seo_pack_draft_events_v1`

Audit/event log for draft lifecycle.

## Views

### `public.feya_commerce_v_seo_pack_drafts_latest_v1`

Latest non-archived draft per product.

### `public.feya_commerce_v_seo_pack_review_queue_v1`

Queue view for drafts needing human review, similarity check, image ALT check, or approval.

## Safety gates

The SQL contract blocks `ready_for_publish` unless:

```text
review_status = approved
reviewed_at is not null
similarity_check_snapshot.status = pass
qa_self_report.image_alt_truth = pass
```

This keeps storage separate from publishing.

## Current app write status

The app now has a server-only guarded route:

```text
POST /api/admin/seo-engine/draft-save
```

Rules for that route:

1. Server-side only.
2. Requires Supabase service role.
3. Accepts only validated `SeoAgentOutputContract` + `SeoPackDraftContract` snapshots.
4. Calls validator before insert.
5. Inserts draft + event in one controlled server flow.
6. Does not publish.
7. Does not mark ready_for_publish.
8. Returns saved draft id and status.

The route only writes when all of these are true:

```text
FEYA_SEO_DRAFT_STORAGE_ENABLED=true
dry_run=false
SQL storage contract is visible to the service-role client
validator passes
service-role Supabase client exists
```

The default UI check button still sends `dry_run=true` and performs no write.

## Future UI behavior

On `/admin/seo-engine/draft-preview`:

- `Проверить сохранение черновика` runs dry-run preflight.
- `Сохранить черновик для проверки` sends guarded `dry_run=false`.
- `Одобрить к публикации` remains disabled until similarity/image/human gates are real.
- Real publish remains unavailable.

## Current focus

The goal is not to generate text for one product. The goal is to build a safe SEO Content Intelligence Engine for first indexation:

```text
Product DNA
→ keyword metrics
→ role allocation
→ draft contract
→ QA
→ human review
→ storage
→ similarity/cannibalization
→ publish readiness
```
