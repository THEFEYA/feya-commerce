-- Persist CQA-passed Burning Man editorial content as an immutable page version.
-- No indexation/ownership activation is performed.
begin;

with target as (
  select
    p.seo_page_id,
    s.family,
    s.accountable_owner,
    s.review_state,
    s.user_intent,
    s.primary_intent,
    s.unique_value_brief,
    s.truth_status,
    s.excluded_queries_json
  from public.feya_commerce_seo_pages_v1 p
  join public.feya_search_page_specs_v1 s on s.seo_page_id=p.seo_page_id
  where p.market_code='US'
    and p.locale='en-US'
    and p.url_path='/guides/what-to-wear-to-burning-man'
    and p.page_type='editorial'
    and p.indexation_intent='noindex'
    and s.truth_status='confirmed'
),
content as (
  select '{
    "contract_version":"editorial_content_pack_v1",
    "path":"/guides/what-to-wear-to-burning-man",
    "content_status":"CQA_PASS",
    "release_status":"HOLD",
    "title":"What to Wear to Burning Man: Practical Costume Guide | TheFEYA",
    "h1":"What to Wear to Burning Man",
    "meta_description":"Plan a Burning Man costume around official desert, dust, visibility and Leave No Trace guidance, then build the visual look with TheFEYA.",
    "primary_query_cluster":"QC_US_EN_BURNING_MAN_WHAT_TO_WEAR",
    "primary_commercial_destination":"/collections/burning-man-looks",
    "source_brief":"docs/search/Burning_Man_Editorial_Source_Brief_2026.md",
    "cqa_ref":"docs/search/burning-man-guide-cqa-20260926.json"
  }'::jsonb body
)
insert into public.feya_search_page_versions_v1(
  page_version_id,seo_page_id,version_number,membership_snapshot_id,content_hash,
  spec_json,content_json,evidence_refs_json,execution_request_id,change_event_id
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:search-page-version:burning-man-guide:2026-09-26:v1'
  ),
  t.seo_page_id,1,null,
  encode(extensions.digest(convert_to(c.body::text,'UTF8'),'sha256'),'hex'),
  jsonb_build_object(
    'family',t.family,
    'accountable_owner',t.accountable_owner,
    'review_state',t.review_state,
    'user_intent',t.user_intent,
    'primary_intent',t.primary_intent,
    'unique_value_brief',t.unique_value_brief,
    'truth_status',t.truth_status,
    'excluded_queries_json',t.excluded_queries_json
  ),
  c.body,
  jsonb_build_array(
    jsonb_build_object('type','official_source_brief','ref','docs/search/Burning_Man_Editorial_Source_Brief_2026.md'),
    jsonb_build_object('type','content_pack','ref','docs/search/burning-man-guide-content-pack-20260926.json'),
    jsonb_build_object('type','cqa','ref','docs/search/burning-man-guide-cqa-20260926.json','status','PASS'),
    jsonb_build_object('type','keyword_metrics','source_request_id','df1bf7a8-9534-4302-a1c6-44b3f0551200')
  ),
  null,null
from target t cross join content c
on conflict (seo_page_id,version_number) do nothing;

update public.feya_search_page_specs_v1 s
set review_state='review',
    evidence_refs_json=s.evidence_refs_json||jsonb_build_array(
      jsonb_build_object('type','cqa','status','PASS','ref','docs/search/burning-man-guide-cqa-20260926.json')
    ),
    updated_at=now()
from public.feya_commerce_seo_pages_v1 p
where p.seo_page_id=s.seo_page_id
  and p.url_path='/guides/what-to-wear-to-burning-man'
  and s.truth_status='confirmed';

commit;
