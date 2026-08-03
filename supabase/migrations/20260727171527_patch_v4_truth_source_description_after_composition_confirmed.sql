-- Fix: once listing composition is owner-confirmed (listing_composition_assertions > 0),
-- source_description component hints must stop blocking generation and move to the
-- variant audit list, exactly like option-level facts already do.
-- False positive observed: "What's included." inside a photo-lighting disclaimer
-- kept product a94b5c1b (Gold Warrior Armor Set) in blocked_product_truth
-- despite 4 approved component assertions and seo_listing_composition_confirmed=true.
-- Rollback: passport slug feya-v4-truth-view-def-backup-20260727 (original definition).
do $$
declare
  d text := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v4'::regclass, true);
  n text;
begin
  n := replace(d,
    '(facts.fact ->> ''fact_type''::text) = ''component_not_unconditional_across_configurations''::text',
    '(facts.fact ->> ''fact_type''::text) = ANY (ARRAY[''component_not_unconditional_across_configurations''::text, ''source_description_indicates_component''::text, ''source_description_component_evidence_unconfirmed''::text])');
  n := replace(n,
    '(blockers.blocker ->> ''reason''::text) = ''component_not_unconditional_across_configurations''::text',
    '(blockers.blocker ->> ''reason''::text) = ANY (ARRAY[''component_not_unconditional_across_configurations''::text, ''source_description_indicates_component''::text, ''source_description_component_evidence_unconfirmed''::text])');
  if n = d then
    raise exception 'patch patterns not found; view left unchanged';
  end if;
  execute 'create or replace view public.feya_commerce_v_seo_product_truth_v4 as ' || n;
  comment on view public.feya_commerce_v_seo_product_truth_v4 is
    'SEO Product Truth v4. Patch 2026-07-27 (Claude): source_description component hints are excluded from unresolved facts/review blockers and moved to listing_composition_variant_audit once listing composition assertions exist (owner already answered the question the hint raises). Rollback: passport feya-v4-truth-view-def-backup-20260727.';
end $$;
