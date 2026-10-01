-- Phase F editorial eligibility set 1.
-- Creates semantic planning state only; no editorial route is published or indexed.
begin;

-- Planned Burning Man guide page record; no live internal link is created yet.
insert into public.feya_commerce_seo_pages_v1(
  seo_page_id,page_type,canonical_product_id,url_path,canonical_url,market_code,locale,
  lifecycle_state,indexation_intent,portfolio_status,protected_winner_flag,source_type,metadata_json
)
values(
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:seo-page:US:en-US:/guides/what-to-wear-to-burning-man'
  ),
  'editorial',null,'/guides/what-to-wear-to-burning-man',
  'https://thefeya.com/guides/what-to-wear-to-burning-man',
  'US','en-US','planned','noindex','hold',false,'phase_f_editorial_eligibility',
  '{"phase":"F","role":"burning_man_practical_guide","index_authorized":false,"content_status":"NOT_DRAFTED"}'::jsonb
)
on conflict (market_code,locale,url_path) do update set
  page_type='editorial',
  lifecycle_state='planned',
  indexation_intent='noindex',
  portfolio_status='hold',
  metadata_json=public.feya_commerce_seo_pages_v1.metadata_json||excluded.metadata_json,
  updated_at=now();

insert into public.feya_search_page_specs_v1(
  seo_page_id,family,primary_parent_page_id,accountable_owner,review_state,user_intent,primary_intent,
  unique_value_brief,intent_evidence_status,truth_status,utility_rationale,selection_rule_json,
  inventory_policy_json,excluded_queries_json,evidence_refs_json
)
select
  guide.seo_page_id,'guide',bm.seo_page_id,'OSPM','hold',
  'Understand what to consider when choosing clothing for Burning Man before shopping a look.',
  'informational Burning Man clothing guidance',
  'Practical preparation/editorial job separated from the commercial Burning Man collection. Requires current official event guidance before drafting.',
  'confirmed','unknown',
  'Distinct informational SERP and seasonal demand; primary commerce destination is the Burning Man collection.',
  '{"version":"editorial_eligibility_v1","all":[],"unknown_policy":"exclude_and_queue_review"}'::jsonb,
  null,
  '["burning man outfits","burning man costumes"]'::jsonb,
  '[{"type":"keyword_metrics","source_request_id":"df1bf7a8-9534-4302-a1c6-44b3f0551200"},{"type":"serp","result_id":"5f9f8c01-f7ad-4fdc-9380-6eddfa01bfc4"},{"type":"blocker","code":"OFFICIAL_EVENT_GUIDANCE_REQUIRED"}]'::jsonb
from public.feya_commerce_seo_pages_v1 guide
join public.feya_commerce_seo_pages_v1 bm
  on bm.market_code='US' and bm.locale='en-US' and bm.url_path='/collections/burning-man-looks'
where guide.market_code='US' and guide.locale='en-US'
  and guide.url_path='/guides/what-to-wear-to-burning-man'
on conflict (seo_page_id) do update set
  family=excluded.family,
  primary_parent_page_id=excluded.primary_parent_page_id,
  accountable_owner=excluded.accountable_owner,
  review_state=excluded.review_state,
  user_intent=excluded.user_intent,
  primary_intent=excluded.primary_intent,
  unique_value_brief=excluded.unique_value_brief,
  intent_evidence_status=excluded.intent_evidence_status,
  truth_status=excluded.truth_status,
  utility_rationale=excluded.utility_rationale,
  selection_rule_json=excluded.selection_rule_json,
  inventory_policy_json=excluded.inventory_policy_json,
  excluded_queries_json=excluded.excluded_queries_json,
  evidence_refs_json=excluded.evidence_refs_json,
  updated_at=now();

with clusters(cluster_code,cluster_label,normalized_intent,cluster_status,evidence_json) as (
  values
  (
    'QC_US_EN_COSTUME_MEASUREMENTS'::text,
    'Costume Measurements'::text,
    'how to take body measurements for costume sizing'::text,
    'approved'::text,
    '{"seed":"costume measurements","ams":90,"supporting_seed":"how to measure for a costume","supporting_ams":50,"serp_intent":"informational","decision":"EXISTING_OWNER_UPGRADE","owner_path":"/size-guide"}'::jsonb
  ),
  (
    'QC_US_EN_BURNING_MAN_WHAT_TO_WEAR',
    'What to Wear to Burning Man',
    'practical informational guidance for choosing Burning Man clothing',
    'approved',
    '{"seed":"what to wear to burning man","ams":110,"seasonality":"strong_jul_aug","serp_intent":"informational","decision":"EDITORIAL_GUIDE_BUSINESS_CASE","owner_path":"/guides/what-to-wear-to-burning-man"}'::jsonb
  ),
  (
    'QC_US_EN_VEGAN_LEATHER_CARE',
    'Vegan Leather Care',
    'how to clean and care for vegan or faux leather',
    'hold',
    '{"seed":"how to clean vegan leather","ams":2400,"serp_intent":"informational","decision":"HOLD","reason":"BROAD_MATERIAL_INTENT"}'::jsonb
  ),
  (
    'QC_US_EN_COSTUME_STORAGE',
    'Costume Storage',
    'how to store costumes',
    'hold',
    '{"seed":"how to store costumes","ams":140,"decision":"HOLD","reason":"UNSTABLE_LOW_QUALITY_SERP"}'::jsonb
  )
)
insert into public.feya_commerce_seo_query_clusters_v1(
  query_cluster_id,cluster_code,cluster_label,normalized_intent,intent_type,language_code,market_scope,
  cluster_status,source_type,evidence_json
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:query-cluster:US:en:'||cluster_code
  ),
  cluster_code,cluster_label,normalized_intent,'informational','en','US',cluster_status,
  'phase_f_editorial_hypd_serp_20260926',
  evidence_json||jsonb_build_object(
    'keyword_source_request_id','df1bf7a8-9534-4302-a1c6-44b3f0551200',
    'editorial_eligibility_ref','docs/search/Phase_F_Editorial_Eligibility_Set_1_20260926.md'
  )
from clusters
on conflict (cluster_code) do update set
  cluster_label=excluded.cluster_label,
  normalized_intent=excluded.normalized_intent,
  intent_type=excluded.intent_type,
  language_code=excluded.language_code,
  market_scope=excluded.market_scope,
  cluster_status=excluded.cluster_status,
  source_type=excluded.source_type,
  evidence_json=excluded.evidence_json,
  updated_at=now();

with members(cluster_code,keyword_norm,member_role) as (
  values
    ('QC_US_EN_COSTUME_MEASUREMENTS','costume measurements','seed'),
    ('QC_US_EN_COSTUME_MEASUREMENTS','how to measure for a costume','member'),
    ('QC_US_EN_COSTUME_MEASUREMENTS','costume size guide','member'),
    ('QC_US_EN_BURNING_MAN_WHAT_TO_WEAR','what to wear to burning man','seed'),
    ('QC_US_EN_BURNING_MAN_WHAT_TO_WEAR','burning man clothing guide','member'),
    ('QC_US_EN_VEGAN_LEATHER_CARE','how to clean vegan leather','seed'),
    ('QC_US_EN_VEGAN_LEATHER_CARE','how to clean faux leather','member'),
    ('QC_US_EN_COSTUME_STORAGE','how to store costumes','seed'),
    ('QC_US_EN_COSTUME_STORAGE','costume care','member')
)
insert into public.feya_commerce_seo_query_cluster_members_v1(
  query_cluster_id,keyword_id,keyword_norm,member_role,source_type,evidence_json
)
select
  c.query_cluster_id,
  km.keyword_id,
  m.keyword_norm,
  m.member_role,
  'phase_f_editorial_registry',
  jsonb_build_object(
    'keyword_metric_snapshot_id',ms.snapshot_id,
    'avg_monthly_searches',ms.avg_monthly_searches,
    'source_request_id',ms.source_request_id,
    'freshness',ms.data_freshness_status
  )
from members m
join public.feya_commerce_seo_query_clusters_v1 c on c.cluster_code=m.cluster_code
left join lateral (
  select keyword_id
  from public.feya_commerce_seo_keyword_master_v1 k
  where lower(k.keyword_norm)=lower(m.keyword_norm)
  order by keyword_id
  limit 1
) km on true
left join lateral (
  select snapshot_id,avg_monthly_searches,source_request_id,data_freshness_status
  from public.feya_commerce_seo_keyword_metric_snapshots_v1 s
  where lower(s.keyword_norm)=lower(m.keyword_norm)
  order by fetched_at desc nulls last,snapshot_id desc
  limit 1
) ms on true
on conflict (query_cluster_id,keyword_norm) do update set
  keyword_id=excluded.keyword_id,
  member_role=excluded.member_role,
  source_type=excluded.source_type,
  evidence_json=excluded.evidence_json;

-- Existing-owner upgrade: the current size guide owns the informational measurement cluster.
insert into public.feya_commerce_seo_page_query_ownership_v1(
  page_query_ownership_id,seo_page_id,query_cluster_id,ownership_role,ownership_status,
  market_code,locale,evidence_json,effective_from,effective_to
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:intended-ownership:US:en-US:QC_US_EN_COSTUME_MEASUREMENTS:/size-guide'
  ),
  p.seo_page_id,c.query_cluster_id,'primary','intended','US','en-US',
  '{"phase":"F","decision":"EXISTING_OWNER_UPGRADE","index_authorized":false,"prevents_duplicate_measurement_article":true}'::jsonb,
  now(),null
from public.feya_commerce_seo_pages_v1 p
join public.feya_commerce_seo_query_clusters_v1 c on c.cluster_code='QC_US_EN_COSTUME_MEASUREMENTS'
where p.market_code='US' and p.locale='en-US' and p.url_path='/size-guide'
on conflict (seo_page_id,query_cluster_id,market_code,locale) do update set
  ownership_role='primary',
  ownership_status='intended',
  evidence_json=excluded.evidence_json,
  effective_to=null,
  updated_at=now();

-- Planned Burning Man guide remains a REVIEW proposal until official source review is completed.
insert into public.feya_commerce_seo_page_ownership_proposals_v1(
  proposal_id,query_cluster_id,seo_page_id,ownership_role,market_code,locale,rationale,evidence_json,
  proposal_status,model_name,prompt_version,run_id,proposal_hash
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:ownership-proposal:QC_US_EN_BURNING_MAN_WHAT_TO_WEAR:/guides/what-to-wear-to-burning-man'
  ),
  c.query_cluster_id,p.seo_page_id,'primary','US','en-US',
  'Informational Burning Man clothing query has a distinct guide SERP and should not cannibalize the commercial Burning Man collection.',
  '{"phase":"F","official_event_guidance_required":true,"primary_commercial_destination":"/collections/burning-man-looks","index_authorized":false}'::jsonb,
  'REVIEW','GPT-5.6 Sol','FEYA_PreIndex_Search_Architecture_Master_Prompt_v2',
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:phase-f-editorial-set-1:2026-09-26'
  ),
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'cluster','QC_US_EN_BURNING_MAN_WHAT_TO_WEAR',
      'page','/guides/what-to-wear-to-burning-man',
      'status','REVIEW',
      'official_source_gate',true
    )::text,'UTF8'
  ),'sha256'),'hex')
from public.feya_commerce_seo_query_clusters_v1 c
join public.feya_commerce_seo_pages_v1 p
  on p.market_code='US' and p.locale='en-US' and p.url_path='/guides/what-to-wear-to-burning-man'
where c.cluster_code='QC_US_EN_BURNING_MAN_WHAT_TO_WEAR'
on conflict (proposal_id) do update set
  rationale=excluded.rationale,
  evidence_json=excluded.evidence_json,
  proposal_status='REVIEW',
  proposal_hash=excluded.proposal_hash,
  updated_at=now();

commit;
