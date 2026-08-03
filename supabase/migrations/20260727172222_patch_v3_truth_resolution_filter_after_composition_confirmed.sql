-- Apply the v4 resolution semantics directly in v3 (Listing Master reads v3):
-- once listing composition assertions exist, component-level facts that the
-- confirmation already answers (option-mapping facts + the three known codes)
-- stop appearing as unresolved/blockers. v4 keeps working (its filter becomes
-- idempotent). Rollback: passport feya-v3-truth-view-def-backup-20260727.
do $$
declare
  d text := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v3'::regclass, true);
  n text;
  pat text := 'v1.unresolved_component_facts,
            v1.component_review_blockers_json,';
  rep text := 'COALESCE(( SELECT jsonb_agg(f.fact ORDER BY (f.fact::text)) FROM jsonb_array_elements(COALESCE(v1.unresolved_component_facts, ''[]''::jsonb)) f(fact) WHERE NOT (jsonb_array_length(COALESCE(laa.listing_composition_assertions, ''[]''::jsonb)) > 0 AND ((f.fact ->> ''option_mapping_id'') IS NOT NULL OR (f.fact ->> ''fact_type'') = ANY (ARRAY[''component_not_unconditional_across_configurations'', ''source_description_indicates_component'', ''source_description_component_evidence_unconfirmed''])))), ''[]''::jsonb) AS unresolved_component_facts,
            COALESCE(( SELECT jsonb_agg(bl.blocker ORDER BY (bl.blocker::text)) FROM jsonb_array_elements(COALESCE(v1.component_review_blockers_json, ''[]''::jsonb)) bl(blocker) WHERE NOT (jsonb_array_length(COALESCE(laa.listing_composition_assertions, ''[]''::jsonb)) > 0 AND ((bl.blocker ->> ''option_mapping_id'') IS NOT NULL OR (bl.blocker ->> ''reason'') = ANY (ARRAY[''component_not_unconditional_across_configurations'', ''source_description_indicates_component'', ''source_description_component_evidence_unconfirmed''])))), ''[]''::jsonb) AS component_review_blockers_json,';
begin
  n := replace(d, pat, rep);
  if n = d then
    raise exception 'patch pattern not found in v3 definition; view left unchanged';
  end if;
  execute 'create or replace view public.feya_commerce_v_seo_product_truth_v3 as ' || n;
  comment on view public.feya_commerce_v_seo_product_truth_v3 is
    'SEO Product Truth v3. Patch 2026-07-27 (Claude): component facts already answered by owner-confirmed listing composition assertions are filtered from unresolved facts and review blockers (same semantics as v4). Rollback: passport feya-v3-truth-view-def-backup-20260727.';
end $$;
