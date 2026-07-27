# FEYA Human Copy v2 — diagnosis and implementation plan

Author: Claude (claude.ai session with the owner), 2026-07-27.
Evidence base: Supabase (saved draft `agent_input_snapshot`, `feya_commerce_source_listings`), branch `fix/sellable-offer-truth-20260727` code (`lib/seoAgentDraftPrompt.ts`), Project Bible v2.0, FEYA Human Copy Research dossier.

## Diagnosis: why generated copy sounds robotic (confirmed in data and code)

1. **Fact starvation.** The saved `agent_input_snapshot` contains category, material, color, keyword roles and exclusion lists — and zero buyer-facing facts. Meanwhile the seller's own Etsy `raw_description` for the same product contains: adjustable straps, lightweight, custom sizing, One Shoulder / Full Shoulders options, engraving, rush orders. None of it reaches generation. The model fills the vacuum with filler ("cohesive from top to bottom").
2. **~200 bans, ~0 positive examples.** `lib/seoAgentDraftPrompt.ts` plus the 33KB doctrine is almost entirely Never/Do not/Ban lines with a single positive example in the whole prompt. Model attention dilutes; closing one ban surfaces a paraphrase ("structured shape" instead of the banned "structural silhouettes"). A ban list cannot produce good text — it can only delete bad text.
3. **Catalog-wide template benefits.** The prompt itself prescribes the same benefits for every product ("quick to put on, straps flexible fit, keeps its shape between wears, reusable for future events"). Result: near-twin product cards and future cannibalization risk.
4. **Rules paid for twice.** The same bans are repeated in system prompt, user prompt, guardrails and doctrine, while `seoCommercialCopyValidator` (57KB) already enforces most of them deterministically. Wasted tokens on every call plus diluted model attention.
5. **Dirty input (older draft).** Raw Etsy keyword-stuffed title was passed as title/ALT — the model echoed it into H1/meta/intro; `known_components` carried keyword variants instead of components. Partially fixed by the `sellable_offer` work in the current branch; the fact layer is still missing.

## Done on 2026-07-27

- Read-only Supabase view `public.feya_v_product_fact_sheet_v1` (v1.1): card_title, materials, variation options, kit section parsed from `raw_description` (242/334 products), deterministic fact flags (adjustable_straps, lightweight, custom_sizing, engraving, pieces_sold_separately, …; 138 products carry at least one extra fact), component assertions. Rollback: `drop view`.
- Plan and staged code persisted in Supabase `feya_project_passports` (slugs `feya-human-copy-v2-plan-20260727`, `feya-human-copy-v2-code-staging-20260727`).
- Security note: RLS is disabled on 92 legacy tables in the shared database (`leads`, `dashboard_tokens`, … — not `feya_commerce_*`). Needs a deliberate fix with policies; do not blanket-enable.

## v2 plan (new files on a separate branch; the existing route stays untouched)

1. Extend the agent input with `product_fact_sheet` sourced from `feya_v_product_fact_sheet_v1` (`confirmed_facts[]` with provenance, kit section, variation labels). Facts still pass the existing guardrail rules.
2. Two-stage generation: (a) **claim plan** — a small call that maps 3–4 facts to buyer outcomes and target blocks as strict JSON; (b) **writer** — prose strictly from the approved plan; the writer may not add claims.
3. Shrink the writer prompt ~4×: keep only rules the validator cannot check in code (tone, rhythm, first-person close). All mechanical bans live in `seoCommercialCopyValidator`; add the missing patterns there ("from top to bottom" family, "structured shape" family, …).
4. Few-shot: 3 owner-approved reference blocks (About / Why / Ideal for) inside the writer prompt instead of a hundred bans. Reference blocks are produced during a 5-product pilot.
5. Pilot: 20 products, blind old-vs-v2 comparison in the existing admin; gates from the Research dossier (0 truth blockers, ≥70% first-candidate approval, median edit < 3 min).
6. Do **not** buy external copy services (Jasper/Copy.ai/Writesonic/Surfer); Describely at most as a later blind benchmark.

## Files added in this branch

- `lib/seoProductFactSheet.ts` — pure mapping layer over the fact-sheet view (dependency-free, not wired in yet).
- `lib/seoClaimPlanV2.ts` — two-stage contracts and compact prompt builders (not wired in yet).

Rollback for everything in this branch: delete the branch.
