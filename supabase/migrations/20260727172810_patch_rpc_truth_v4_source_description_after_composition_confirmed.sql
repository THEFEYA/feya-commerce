-- Third copy of the resolution filter lives inside RPC
-- feya_commerce_get_seo_product_truth_v4 (the exact function the Listing
-- Master save action calls). Apply the same fix as views v3/v4:
-- once listing composition assertions exist, source_description component
-- hints stop blocking and move to the variant audit.
-- Rollback: passport feya-rpc-truth-v4-def-backup-20260727.
do $$
declare
  d text;
  n text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'feya_commerce_get_seo_product_truth_v4';

  n := replace(d,
    '(facts.fact ->> ''fact_type''::text) = ''component_not_unconditional_across_configurations''::text',
    '(facts.fact ->> ''fact_type''::text) = ANY (ARRAY[''component_not_unconditional_across_configurations''::text, ''source_description_indicates_component''::text, ''source_description_component_evidence_unconfirmed''::text])');
  n := replace(n,
    '(blockers.blocker ->> ''reason''::text) = ''component_not_unconditional_across_configurations''::text',
    '(blockers.blocker ->> ''reason''::text) = ANY (ARRAY[''component_not_unconditional_across_configurations''::text, ''source_description_indicates_component''::text, ''source_description_component_evidence_unconfirmed''::text])');

  if n = d then
    raise exception 'patch patterns not found in RPC definition; function left unchanged';
  end if;
  execute n;
end $$;
