-- Phase F: register a noindex collections hub and crawlable owner links.
-- This is navigation architecture only; no collection is authorized for indexing.
begin;

insert into public.feya_commerce_seo_pages_v1(
  seo_page_id,page_type,canonical_product_id,url_path,canonical_url,market_code,locale,
  lifecycle_state,indexation_intent,portfolio_status,protected_winner_flag,source_type,metadata_json
)
values(
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:seo-page:US:en-US:/collections'
  ),
  'landing',null,'/collections','https://thefeya.com/collections','US','en-US',
  'planned','noindex','hold',false,'phase_f_collections_hub',
  '{"phase":"F","role":"collections_discovery_hub","index_authorized":false}'::jsonb
)
on conflict (market_code,locale,url_path) do update set
  canonical_url=excluded.canonical_url,
  metadata_json=public.feya_commerce_seo_pages_v1.metadata_json||excluded.metadata_json,
  updated_at=now();

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

with edges(from_path,to_path) as (
  values
    ('/'::text,'/collections'::text),
    ('/collections','/collections/shoulder-armor'),
    ('/collections','/collections/festival-outfits'),
    ('/collections','/collections/rave-outfits'),
    ('/collections','/collections/burning-man-looks'),
    ('/collections','/collections/stage-outfits'),
    ('/collections','/collections/bodysuits'),
    ('/collections','/collections/costume-masks'),
    ('/collections','/collections/costume-headpieces'),
    ('/collections','/collections/festival-skirts'),
    ('/collections','/collections/costume-belts')
)
insert into public.feya_search_link_edges_v1(
  link_edge_id,from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:phase-f-collections-link:'||e.from_path||'>'||e.to_path
  ),
  fp.seo_page_id,tp.seo_page_id,'navigation','deterministic','proposed',
  jsonb_build_array(jsonb_build_object(
    'phase','F','placement',case when e.from_path='/' then 'homepage_cta' else 'collections_hub_card' end,
    'index_authorized',false
  )),
  'phase-f-20260926'
from edges e
join public.feya_commerce_seo_pages_v1 fp
  on fp.market_code='US' and fp.locale='en-US' and fp.url_path=e.from_path
join public.feya_commerce_seo_pages_v1 tp
  on tp.market_code='US' and tp.locale='en-US' and tp.url_path=e.to_path
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

commit;
