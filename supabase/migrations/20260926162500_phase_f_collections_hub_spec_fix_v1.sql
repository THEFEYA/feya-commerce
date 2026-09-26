-- Production follow-up for the Phase F collections hub spec.
-- The original migration created the page and links, but its sibling DML CTE kept the newly inserted page
-- invisible to the spec INSERT in the same statement snapshot.
begin;

insert into public.feya_search_page_specs_v1(
  seo_page_id,family,primary_parent_page_id,accountable_owner,review_state,user_intent,primary_intent,
  unique_value_brief,intent_evidence_status,truth_status,utility_rationale,selection_rule_json,
  inventory_policy_json,excluded_queries_json,evidence_refs_json
)
select
  p.seo_page_id,'subhub',r.seo_page_id,'OSPM','review',
  'Browse evidence-backed TheFEYA collection owners by product type, event and performance use.',
  'collection discovery hub',
  'Crawlable navigation hub that exposes only current Phase C/D business-case collections; it does not own their query clusters.',
  'confirmed','confirmed',
  'Provides one stable crawlable parent between Home and approved collection business cases.',
  '{"version":"selection_v1","all":[],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
  null,'[]'::jsonb,
  '[{"type":"phase_f","ref":"FEYA_PreIndex_Search_Architecture_Master_Prompt_v2_20260926.md"},{"type":"graph","source_version":"phase-f-20260926"}]'::jsonb
from public.feya_commerce_seo_pages_v1 p
join public.feya_commerce_seo_pages_v1 r
  on r.market_code='US' and r.locale='en-US' and r.url_path='/'
where p.market_code='US' and p.locale='en-US' and p.url_path='/collections'
on conflict (seo_page_id) do update set
  primary_parent_page_id=excluded.primary_parent_page_id,
  review_state=excluded.review_state,
  user_intent=excluded.user_intent,
  primary_intent=excluded.primary_intent,
  unique_value_brief=excluded.unique_value_brief,
  intent_evidence_status=excluded.intent_evidence_status,
  truth_status=excluded.truth_status,
  utility_rationale=excluded.utility_rationale,
  selection_rule_json=excluded.selection_rule_json,
  evidence_refs_json=excluded.evidence_refs_json,
  updated_at=now();

commit;
