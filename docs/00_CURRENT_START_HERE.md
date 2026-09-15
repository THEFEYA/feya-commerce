# FEYA Commerce — Current Start Here

Updated: 2026-09-15. Read this entrypoint before historical handoffs.

## Current task

Complete Product Page SEO packs in batches of five. Then build landing pages,
launch, and add analytics. Extend the existing workflow.

The detailed continuation state is stored in the existing Supabase passport:

```sql
select content_markdown, updated_at
from public.feya_project_passports
where slug = 'feya-commerce-continuation-current-v1';
```

It contains the exact batch, approved-product exclusions, observed blockers,
validation results and next action. Read it once; do not reload the complete
keyword bank, old chat or research dossier on every product.

## Runtime baseline verified during recovery

- Repository: `THEFEYA/feya-commerce`.
- Last deployed working branch: `agent/rare-seo-axes-20260814`.
- Verified baseline commit: `36c639348db4e8c636336639f5505135355628a0`.
- Continuation patch branch: `work/resume-listing-batches-20260915`.
- `main` is an older baseline. Do not start implementation from it blindly.
- Exact semantic truth: `feya_commerce_get_seo_product_truth_v4`.
- Exact current offer: `feya_commerce_get_step7_storefront_products_api_v7`.
- Current doctrine: `thefeya_seo_doctrine_v22`.

Check the current branch/deployment and passport before executing. The former
August 10 pilot instructions are historical, not the current batch.

## Evidence and workflow

Use [the operating contract](PRODUCT_SEO_COMPLETION_OPERATING_PROMPT_2026-07-27.md)
and [owner editorial feedback](EDITORIAL_FEEDBACK_RULES_V1.md) for unresolved
decisions. The current owner's task authorization supersedes historical
pilot-only pauses, while Product Truth, factual QA and final approval remain
separate requirements.

1. Exclude approved products and reuse existing unreviewed drafts.
2. Give the owner five Listing Master links. Require their explicit axis review and save before generation; old verified flags alone do not prove owner confirmation. Read back the new decision IDs and exact selected axes, including intentionally empty fields. Fetch current truth and offer for those IDs.
3. Revalidate the saved shortlist, role/offer signatures and Primary ownership.
4. Hold only the affected item if its facts or primary intent are unresolved.
5. Give the writer the compact selected evidence and positive block frames.
6. Make at most one writer call per eligible item. Do not run an automatic
   retry, editor or humanizer.
7. Run structural, commercial and keyword checks, then independent editorial
   review. A model's self-report is not proof of quality or human approval.
8. Save through the guarded draft route, retaining versions. Read back the
   returned draft ID/status before recording success.
9. Update the passport after each product and the batch progress row after five.

The current offer defines what is sold. Images define visible appearance and
image-specific ALT; they do not prove contents. What's Included, purchase
options and the fixed right PDP panel remain code-owned. Preserve selected
axes and facts. No keyword-density target and no invented claims.

Do not mark owner approval, Apply or Publish from assistant-only QA. Do not
claim a complete image pack from a single primary-image ALT candidate.

See [the checkpoint protocol](CONTINUATION_PROTOCOL.md) for recovery queries.
