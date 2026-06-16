# SEO Queue Replace Flow Deploy Marker — 2026-06-15

This marker commit forces a fresh Vercel preview deployment for the active branch after the SEO replace-flow client and API changes.

Expected admin behavior:

- `/admin/seo-apply` uses the replacement flow for SEO drafts.
- The button label is `Заменить старые черновики`.
- The client posts to `/api/admin/seo-change-sets-replace`.
- Existing pending rows for the same product and target fields are rejected before new review drafts are created.

Safety state:

- No public storefront SEO publishing is enabled by this marker.
- No product/source/import rows are mutated.
- SEO rows remain review-only until explicit admin approval.
