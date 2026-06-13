# FEYA Commerce — Frontend v4 Build QA Status v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
PR: #5  
Head commit checked: `8c0119e9e25b3d3c3aa873e962c8cb3c65e012ff`

## Purpose

This document records the build/deployment QA status after the frontend was prepared for the future v4 storefront data contract.

It follows:

- `docs/CONTROL_TOWER_ROADMAP_V1.md`;
- `docs/FRONTEND_V4_SWITCH_PLAN_V1.md`;
- `docs/FRONTEND_V4_SWITCH_IMPLEMENTATION_LOG_V1.md`.

---

## 1. GitHub CI status

GitHub workflow checked for the head commit:

```text
8c0119e9e25b3d3c3aa873e962c8cb3c65e012ff
```

Result:

```text
Phase A CI — completed / success
```

Conclusion:

The current code passed the available repository CI after the v4-ready frontend changes.

---

## 2. Vercel preview status

Vercel direct API listing was blocked by tooling during this session.

However, the Vercel GitHub bot comment on PR #5 reported the preview deployment as:

```text
Ready
```

Updated:

```text
Jun 13, 2026 5:22pm UTC
```

Preview alias:

```text
feya-commerce-git-rebuild-emerge-e78489-alexs-projects-5419f9ec.vercel.app
```

Conclusion:

The PR preview appears deployed successfully according to the Vercel GitHub integration.

---

## 3. Direct route fetch status

A direct protected Vercel page fetch for:

```text
/shop
```

was blocked by tooling in this ChatGPT session.

Therefore, page-level visual/browser QA was not completed here.

Manual/browser QA still required:

```text
/
/shop
one real /shop/[slug]
/cart
/checkout
```

---

## 4. Code-level checks performed

Reviewed and/or updated:

```text
lib/types.ts
lib/storefront.ts
app/shop/page.tsx
app/shop/[slug]/page.tsx
components/SalePrice.tsx
components/ProductCard.tsx
components/ProductDetailClient.tsx
```

Important confirmed behavior:

- v4 fields are optional, so v1/v2/v3 remain compatible;
- `/shop` query order is now `v4 -> v3 -> v2 -> v1`;
- PDP query order is now `v4 -> v3 -> v2 -> v1`;
- v4 absence should fall back to v3/v2/v1;
- no visual redesign was performed;
- fake global sale remains disabled;
- cart snapshot now carries future v4 metadata when available;
- payment remains inactive.

---

## 5. Remaining QA required

When route access is available, verify:

1. `/shop` loads products.
2. PDP opens from a product card.
3. Images still load.
4. Configuration dropdown still works.
5. No Cyrillic/internal labels are visible publicly.
6. Price displays as single price unless compare-at is valid.
7. Add to bag still works.
8. Cart still shows selected item.
9. Checkout draft still saves locally/API where available.
10. Payment remains disabled.

---

## 6. Current decision

The frontend v4-ready work is acceptable to keep in PR #5 because:

- CI passed;
- Vercel bot reports preview Ready;
- changes are backward-compatible;
- no payment activation was introduced;
- no raw source tables were exposed;
- no visual redesign was introduced.

Do not merge or mark PR ready solely from this document.

Before merge, manual browser QA and Supabase v4 diagnostics are still required.

---

## 7. Next block

Next productive block remains:

```text
Supabase v4 diagnostics in Supabase-connected chat/context
```

Use:

```text
docs/SUPABASE_V4_DIAGNOSTIC_PROMPT_V1.md
```

If Supabase is not available, continue with non-Supabase blocks only:

- docs sync;
- PR description update;
- admin/readiness architecture docs;
- SEO/product graph planning;
- no payment activation.
