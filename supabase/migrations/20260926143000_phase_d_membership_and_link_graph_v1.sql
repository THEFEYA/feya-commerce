-- Phase D: immutable membership evidence + intended ownership + proposed internal graph.
-- Provisional design-family signatures are deliberately NOT index-release authority.
begin;

create or replace function public.feya_search_normalize_text_values_v1(p_value jsonb)
returns jsonb
language sql immutable set search_path='' as $$
  select case
    when p_value is null then '[]'::jsonb
    when jsonb_typeof(p_value)='array' then coalesce((
      select jsonb_agg(v order by v)
      from (
        select distinct lower(btrim(x)) v
        from jsonb_array_elements_text(p_value) x
        where length(btrim(x))>0
      ) q
    ),'[]'::jsonb)
    when jsonb_typeof(p_value)='string' and length(btrim(p_value#>>'{}'))>0
      then jsonb_build_array(lower(btrim(p_value#>>'{}')))
    else '[]'::jsonb
  end
$$;

revoke all on function public.feya_search_normalize_text_values_v1(jsonb) from public,anon,authenticated,service_role;

create or replace view public.feya_search_v_candidate_membership_current_v1
with (security_invoker=false) as
with release_ids as (
  select distinct (x#>>'{}')::uuid canonical_product_id
  from public.feya_growth_execution_requests_v1 r,
       jsonb_array_elements(r.request_payload_json->'canonical_product_ids') x
  where r.execution_request_id='9f1151e3-4fb5-41b9-8922-878c85bfa81a'::uuid
    and r.request_status='SUCCEEDED'
),
latest as (
  select distinct on (p.canonical_product_id)
    p.canonical_product_id,p.id as draft_id,p.product_slug,p.manual_focus_snapshot,p.product_truth_snapshot,
    coalesce(p.reviewed_at,p.created_at) truth_time
  from public.feya_commerce_seo_pack_drafts_v1 p
  join release_ids r using(canonical_product_id)
  where p.review_status='approved' and p.archived_at is null
  order by p.canonical_product_id,coalesce(p.reviewed_at,p.created_at) desc,p.id desc
),
norm as (
  select
    l.*,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'event') event_values,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'style') style_values,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'persona') persona_values,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'sellable_component_axes') sellable_values,
    exists(
      select 1 from public.feya_commerce_offer_heads_v1 oh
      where oh.canonical_product_id=l.canonical_product_id
    ) offer_ready
  from latest l
),
candidate_rows as (
  select 'SHOULDER_ARMOR'::text candidate_code,'/collections/shoulder-armor'::text url_path,n.*
  from norm n where n.sellable_values ? 'shoulders'
  union all
  select 'FESTIVAL_OUTFITS','/collections/festival-outfits',n.*
  from norm n where n.event_values ? 'festival'
  union all
  select 'RAVE_OUTFITS','/collections/rave-outfits',n.*
  from norm n where n.event_values ? 'rave'
  union all
  select 'BURNING_MAN_OUTFITS','/collections/burning-man-looks',n.*
  from norm n where n.event_values ? 'burning man'
  union all
  select 'PERFORMANCE_COSTUMES','/collections/stage-outfits',n.*
  from norm n where n.event_values ? 'stage'
  union all
  select 'COSTUME_BODYSUITS','/collections/bodysuits',n.*
  from norm n where n.sellable_values ? 'bodysuit'
  union all
  select 'COSTUME_MASKS','/collections/costume-masks',n.*
  from norm n where n.sellable_values ? 'mask'
  union all
  select 'COSTUME_HEADPIECES','/collections/costume-headpieces',n.*
  from norm n where n.sellable_values ? 'headpiece'
  union all
  select 'FESTIVAL_SKIRTS','/collections/festival-skirts',n.*
  from norm n where n.sellable_values ? 'skirt' and n.event_values ? 'festival'
  union all
  select 'COSTUME_BELTS','/collections/costume-belts',n.*
  from norm n where n.sellable_values ? 'belt'
)
select
  c.candidate_code,c.url_path,c.canonical_product_id,c.draft_id,c.product_slug,
  'approved-seo-pack:'||c.draft_id::text as truth_version,
  case when c.offer_ready then 'confirmed'::text else 'unknown'::text end orderability_status,
  case when c.offer_ready then 'eligible'::text else 'unknown'::text end eligibility_status,
  'provisional:v1:'||encode(extensions.digest(convert_to(
    jsonb_build_object(
      'sellable_components',c.sellable_values,
      'style',c.style_values,
      'persona',c.persona_values
    )::text,'UTF8'
  ),'sha256'),'hex') as provisional_design_family_key,
  jsonb_build_object(
    'source','latest_approved_seo_pack_manual_focus',
    'draft_id',c.draft_id,
    'release_ref','feya-review-207-20260924',
    'design_family_status','provisional_not_release_authority',
    'sellable_components',c.sellable_values,
    'events',c.event_values,
    'styles',c.style_values,
    'personas',c.persona_values,
    'offer_ready',c.offer_ready
  ) evidence_json
from candidate_rows c;

revoke all on table public.feya_search_v_candidate_membership_current_v1 from public,anon,authenticated,service_role;
grant select on table public.feya_search_v_candidate_membership_current_v1 to service_role;

-- Close Phase C by recording intended ownership only. Intended != active/indexed.
with mapping(cluster_code,url_path) as (
  values
  ('QC_US_EN_SHOULDER_ARMOR','/collections/shoulder-armor'),
  ('QC_US_EN_FESTIVAL_OUTFITS','/collections/festival-outfits'),
  ('QC_US_EN_RAVE_OUTFITS','/collections/rave-outfits'),
  ('QC_US_EN_RAVE_COSTUMES','/collections/rave-outfits'),
  ('QC_US_EN_BURNING_MAN_OUTFITS','/collections/burning-man-looks'),
  ('QC_US_EN_BURNING_MAN_COSTUMES','/collections/burning-man-looks'),
  ('QC_US_EN_PERFORMANCE_COSTUMES','/collections/stage-outfits'),
  ('QC_US_EN_COSTUME_BODYSUIT','/collections/bodysuits'),
  ('QC_US_EN_COSTUME_MASKS','/collections/costume-masks'),
  ('QC_US_EN_COSTUME_HEADPIECE','/collections/costume-headpieces'),
  ('QC_US_EN_FESTIVAL_SKIRT','/collections/festival-skirts'),
  ('QC_US_EN_COSTUME_BELT','/collections/costume-belts')
),
inserted as (
  insert into public.feya_commerce_seo_page_query_ownership_v1(
    page_query_ownership_id,seo_page_id,query_cluster_id,ownership_role,ownership_status,
    market_code,locale,evidence_json,effective_from,effective_to
  )
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:intended-ownership:US:en-US:'||m.cluster_code||':'||m.url_path
    ),
    p.seo_page_id,c.query_cluster_id,'primary','intended','US','en-US',
    jsonb_build_object(
      'phase','D',
      'search_business_case','approved_for_preindex_build',
      'source','Phase_B_Q02_Q01_Q04_Checkpoint_20260926.md',
      'index_authorized',false
    ),
    now(),null
  from mapping m
  join public.feya_commerce_seo_query_clusters_v1 c on c.cluster_code=m.cluster_code and c.cluster_status='approved'
  join public.feya_commerce_seo_pages_v1 p on p.market_code='US' and p.locale='en-US' and p.url_path=m.url_path
  on conflict (seo_page_id,query_cluster_id,market_code,locale) do update set
    ownership_role='primary',
    ownership_status='intended',
    evidence_json=excluded.evidence_json,
    effective_to=null,
    updated_at=now()
  returning page_query_ownership_id,seo_page_id,query_cluster_id
)
select count(*) from inserted;

update public.feya_commerce_seo_page_ownership_proposals_v1 p
set proposal_status='APPLIED',
    applied_page_query_ownership_id=o.page_query_ownership_id,
    applied_at=now(),
    updated_at=now()
from public.feya_commerce_seo_page_query_ownership_v1 o
where p.query_cluster_id=o.query_cluster_id
  and p.seo_page_id=o.seo_page_id
  and p.market_code=o.market_code
  and p.locale=o.locale
  and p.proposal_status='REVIEW'
  and o.ownership_status='intended';

-- Immutable snapshot headers.
with pages as (
  select p.seo_page_id,p.url_path,count(m.canonical_product_id)::integer item_count
  from public.feya_commerce_seo_pages_v1 p
  join public.feya_search_v_candidate_membership_current_v1 m on m.url_path=p.url_path
  where p.market_code='US' and p.locale='en-US'
  group by p.seo_page_id,p.url_path
)
insert into public.feya_search_membership_snapshots_v1(
  membership_snapshot_id,seo_page_id,rule_version,source_revision,expected_item_count,captured_at
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:membership-snapshot:phase-d-20260926:'||seo_page_id::text
  ),
  seo_page_id,
  'selection_v1',
  'feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926',
  item_count,
  now()
from pages
on conflict (membership_snapshot_id) do nothing;

-- Immutable snapshot items.
insert into public.feya_search_membership_items_v1(
  membership_snapshot_id,canonical_product_id,design_family_key,eligibility_status,orderability_status,
  truth_version,evidence_refs_json,reason_codes_json
)
select
  s.membership_snapshot_id,
  m.canonical_product_id,
  m.provisional_design_family_key,
  m.eligibility_status,
  m.orderability_status,
  m.truth_version,
  jsonb_build_array(
    m.evidence_json,
    jsonb_build_object('page_path',m.url_path,'candidate_code',m.candidate_code)
  ),
  jsonb_build_array(
    case when m.eligibility_status='eligible' then 'DNA_RULE_MATCH' else 'ORDERABILITY_UNKNOWN' end,
    'PROVISIONAL_DESIGN_FAMILY_KEY_NOT_RELEASE_AUTHORITY'
  )
from public.feya_search_v_candidate_membership_current_v1 m
join public.feya_commerce_seo_pages_v1 p
  on p.market_code='US' and p.locale='en-US' and p.url_path=m.url_path
join public.feya_search_membership_snapshots_v1 s
  on s.seo_page_id=p.seo_page_id
 and s.source_revision='feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926'
on conflict (membership_snapshot_id,canonical_product_id) do nothing;

-- Membership truth is now evidenced, but review remains open because family/differentiation/content are not release-approved.
update public.feya_search_page_specs_v1 s
set truth_status='confirmed',
    evidence_refs_json=s.evidence_refs_json||jsonb_build_array(
      jsonb_build_object(
        'type','membership_snapshot',
        'source_revision','feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926',
        'design_family_status','provisional_not_release_authority'
      )
    ),
    updated_at=now()
from public.feya_commerce_seo_pages_v1 p
where p.seo_page_id=s.seo_page_id
  and p.url_path like '/collections/%';

-- Planned crawl graph: root/shop -> candidate hubs; festival -> festival skirts.
with edge_rows(from_path,to_path,link_kind,generation_mode) as (
  values
    ('/','/shop','navigation','deterministic'),
    ('/','/collections/shoulder-armor','navigation','deterministic'),
    ('/','/collections/festival-outfits','navigation','deterministic'),
    ('/','/collections/rave-outfits','navigation','deterministic'),
    ('/','/collections/burning-man-looks','navigation','deterministic'),
    ('/','/collections/stage-outfits','navigation','deterministic'),
    ('/','/collections/bodysuits','navigation','deterministic'),
    ('/shop','/collections/shoulder-armor','navigation','deterministic'),
    ('/shop','/collections/festival-outfits','navigation','deterministic'),
    ('/shop','/collections/rave-outfits','navigation','deterministic'),
    ('/shop','/collections/burning-man-looks','navigation','deterministic'),
    ('/shop','/collections/stage-outfits','navigation','deterministic'),
    ('/shop','/collections/bodysuits','navigation','deterministic'),
    ('/shop','/collections/costume-masks','navigation','deterministic'),
    ('/shop','/collections/costume-headpieces','navigation','deterministic'),
    ('/shop','/collections/costume-belts','navigation','deterministic'),
    ('/collections/festival-outfits','/collections/festival-skirts','navigation','deterministic'),
    ('/collections/festival-outfits','/collections/rave-outfits','navigation','deterministic'),
    ('/collections/festival-outfits','/collections/burning-man-looks','navigation','deterministic'),
    ('/collections/rave-outfits','/collections/festival-outfits','navigation','deterministic'),
    ('/collections/burning-man-looks','/collections/festival-outfits','navigation','deterministic'),
    ('/collections/stage-outfits','/collections/festival-outfits','navigation','deterministic')
)
insert into public.feya_search_link_edges_v1(
  link_edge_id,from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:link-edge:phase-d-20260926:'||e.from_path||'>'||e.to_path||':'||e.link_kind
  ),
  fp.seo_page_id,tp.seo_page_id,e.link_kind,e.generation_mode,'proposed',
  jsonb_build_array(jsonb_build_object('phase','D','index_authorized',false)),
  'phase-d-20260926'
from edge_rows e
join public.feya_commerce_seo_pages_v1 fp on fp.market_code='US' and fp.locale='en-US' and fp.url_path=e.from_path
join public.feya_commerce_seo_pages_v1 tp on tp.market_code='US' and tp.locale='en-US' and tp.url_path=e.to_path
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

-- Landing -> product deterministic edges from the immutable membership snapshot.
insert into public.feya_search_link_edges_v1(
  link_edge_id,from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:product-membership-edge:phase-d-20260926:'||p.seo_page_id::text||':'||pp.seo_page_id::text
  ),
  p.seo_page_id,pp.seo_page_id,'product_membership','deterministic','proposed',
  jsonb_build_array(jsonb_build_object(
    'membership_snapshot_id',mi.membership_snapshot_id,
    'canonical_product_id',mi.canonical_product_id,
    'phase','D'
  )),
  'phase-d-20260926'
from public.feya_search_membership_items_v1 mi
join public.feya_search_membership_snapshots_v1 ms
  on ms.membership_snapshot_id=mi.membership_snapshot_id
join public.feya_commerce_seo_pages_v1 p on p.seo_page_id=ms.seo_page_id
join public.feya_commerce_seo_pages_v1 pp on pp.canonical_product_id=mi.canonical_product_id and pp.page_type='product'
where ms.source_revision='feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926'
  and mi.eligibility_status='eligible'
  and mi.orderability_status='confirmed'
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

commit;
