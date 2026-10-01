-- Phase 12: materialize a fresh immutable Organic Wave A release after owner-approved route renames.
-- This migration MUST NOT activate indexing, submit a sitemap, or call activation RPCs.
begin;

do $$
declare
  active_count integer;
begin
  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then
    raise exception 'phase12_wave_a_v10_requires_zero_active_releases:%',active_count;
  end if;

  if exists(
    select 1 from public.feya_search_releases_v1
    where release_code='organic-wave-a-20260926' and release_version=10
  ) then
    raise exception 'phase12_wave_a_v10_already_exists';
  end if;
end $$;

with constants as (
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:search-release:organic-wave-a:2026-09-26:v10'
    ) as release_id
)
insert into public.feya_search_releases_v1(
  release_id,release_code,release_version,release_status,target_origin,
  source_commerce_release_ref,source_db_ref,git_sha,release_hash,gate_policy_version,
  scope_json,gate_summary_json
)
select
  release_id,
  'organic-wave-a-20260926',
  10,
  'GATE_FAILED',
  'https://thefeya.com',
  'feya-review-207-20260924',
  'supabase:ysnizcgzhdwdfdkjkhud',
  '51f4973a516bcd1205d123681f66dc2ff2d44bfb',
  null,
  'FEYA_Search_Architecture_v1_K01_K20',
  jsonb_build_object(
    'release_kind','organic_selective_preindex',
    'release_basis','phase12_owner_routes_plus_phase11_structured_data',
    'owner_decisions',jsonb_build_object(
      'burning_man_route','/collections/burning-man-outfits',
      'performance_route','/collections/performance-costumes',
      'costume_headpieces_in_wave_a',true,
      'maleficent_public_label_retained',true,
      'shop_indexability','noindex_wave_a_dependency'
    ),
    'index_candidate_paths',jsonb_build_array(
      '/',
      '/collections',
      '/collections/shoulder-armor',
      '/collections/festival-outfits',
      '/collections/rave-outfits',
      '/collections/burning-man-outfits',
      '/collections/performance-costumes',
      '/collections/bodysuits',
      '/collections/costume-masks',
      '/collections/costume-headpieces',
      '/collections/festival-skirts',
      '/collections/costume-belts',
      '/about',
      '/size-guide',
      '/care',
      '/shipping',
      '/returns',
      '/contact'
    ),
    'noindex_dependencies',jsonb_build_object(
      'shop',true,
      'cart',true,
      'account',true,
      'product_pdp_count',207
    ),
    'payment_scope','excluded_from_wave_a',
    'excluded_future_pages',jsonb_build_array(
      '/guides/what-to-wear-to-burning-man',
      '/terms',
      '/privacy'
    )
  ),
  jsonb_build_object(
    'overall','FAIL',
    'reason','Fresh Phase 12 release is materialized but external production/GSC and final owner approval gates remain fail-closed.',
    'ci_run_id',36868549729,
    'vercel_deployment_id','dpl_Hi5Nszioi84NjDhDBwTNE4573RQi'
  )
from constants;

with release_row as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10
),
index_paths(url_path) as (
  values
    ('/'::text),
    ('/collections'),
    ('/collections/shoulder-armor'),
    ('/collections/festival-outfits'),
    ('/collections/rave-outfits'),
    ('/collections/burning-man-outfits'),
    ('/collections/performance-costumes'),
    ('/collections/bodysuits'),
    ('/collections/costume-masks'),
    ('/collections/costume-headpieces'),
    ('/collections/festival-skirts'),
    ('/collections/costume-belts'),
    ('/about'),
    ('/size-guide'),
    ('/care'),
    ('/shipping'),
    ('/returns'),
    ('/contact')
),
latest_versions as (
  select distinct on (v.seo_page_id)
    v.seo_page_id,v.page_version_id,v.membership_snapshot_id,v.content_hash,v.version_number
  from public.feya_search_page_versions_v1 v
  order by v.seo_page_id,v.version_number desc
),
index_items as (
  select
    r.release_id,
    p.seo_page_id,
    p.url_path,
    p.page_type,
    p.canonical_product_id,
    v.page_version_id,
    v.membership_snapshot_id,
    v.content_hash,
    jsonb_build_object(
      'source','current_page_portfolio_latest_version',
      'current_indexation_intent',p.indexation_intent,
      'portfolio_status',p.portfolio_status,
      'page_version',v.version_number,
      'index_authorized',false,
      'phase12_git_sha','51f4973a516bcd1205d123681f66dc2ff2d44bfb'
    ) as evidence
  from release_row r
  cross join index_paths x
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=x.url_path
  left join latest_versions v on v.seo_page_id=p.seo_page_id
),
product_dependencies as (
  select
    r.release_id,
    p.seo_page_id,
    p.url_path,
    p.page_type,
    p.canonical_product_id,
    null::uuid as page_version_id,
    null::uuid as membership_snapshot_id,
    b.content_sha256 as content_hash,
    jsonb_build_object(
      'source','feya_storefront_approved_product_bindings_v1',
      'source_release_ref',b.source_release_ref,
      'draft_id',b.draft_id,
      'product_slug_snapshot',b.product_slug_snapshot,
      'index_authorized',false
    ) as evidence
  from release_row r
  cross join public.feya_storefront_approved_product_bindings_v1 b
  join public.feya_commerce_seo_pages_v1 p
    on p.seo_page_id=b.seo_page_id
   and p.canonical_product_id=b.canonical_product_id
   and p.url_path=b.url_path_snapshot
   and p.page_type='product'
  where b.source_release_ref='feya-review-207-20260924'
    and p.market_code='US'
    and p.locale='en-US'
),
utility_dependencies as (
  select
    r.release_id,
    p.seo_page_id,
    p.url_path,
    p.page_type,
    p.canonical_product_id,
    null::uuid as page_version_id,
    null::uuid as membership_snapshot_id,
    null::text as content_hash,
    jsonb_build_object(
      'source','wave_a_utility_noindex_dependency',
      'current_indexation_intent',p.indexation_intent,
      'portfolio_status',p.portfolio_status,
      'index_authorized',false
    ) as evidence
  from release_row r
  cross join public.feya_commerce_seo_pages_v1 p
  where p.market_code='US'
    and p.locale='en-US'
    and p.url_path in ('/shop','/cart','/account')
),
all_items as (
  select
    release_id,seo_page_id,url_path,page_type,canonical_product_id,
    page_version_id,membership_snapshot_id,content_hash,
    'INDEX_CANDIDATE'::text as item_role,
    'index'::text as intended_index_state,
    evidence
  from index_items
  union all
  select
    release_id,seo_page_id,url_path,page_type,canonical_product_id,
    page_version_id,membership_snapshot_id,content_hash,
    'NOINDEX_DEPENDENCY','noindex',evidence
  from product_dependencies
  union all
  select
    release_id,seo_page_id,url_path,page_type,canonical_product_id,
    page_version_id,membership_snapshot_id,content_hash,
    'NOINDEX_DEPENDENCY','noindex',evidence
  from utility_dependencies
)
insert into public.feya_search_release_items_v1(
  release_id,seo_page_id,url_path_snapshot,page_type_snapshot,item_role,intended_index_state,
  canonical_product_id,page_version_id,membership_snapshot_id,content_hash,item_hash,evidence_json
)
select
  release_id,
  seo_page_id,
  url_path,
  page_type,
  item_role,
  intended_index_state,
  canonical_product_id,
  page_version_id,
  membership_snapshot_id,
  case when content_hash~'^[0-9a-f]{64}$' then content_hash else null end,
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'release_id',release_id,
      'seo_page_id',seo_page_id,
      'url_path',url_path,
      'page_type',page_type,
      'item_role',item_role,
      'intended_index_state',intended_index_state,
      'canonical_product_id',canonical_product_id,
      'page_version_id',page_version_id,
      'membership_snapshot_id',membership_snapshot_id,
      'content_hash',case when content_hash~'^[0-9a-f]{64}$' then content_hash else null end
    )::text,'UTF8'
  ),'sha256'),'hex'),
  evidence
from all_items;

do $$
declare
  release_uuid uuid;
  total_items integer;
  index_items integer;
  noindex_items integer;
  product_items integer;
  utility_items integer;
  versioned_index_items integer;
  collection_memberships integer;
  retired_paths integer;
begin
  select release_id into release_uuid
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10;

  select
    count(*),
    count(*) filter(where item_role='INDEX_CANDIDATE' and intended_index_state='index'),
    count(*) filter(where item_role='NOINDEX_DEPENDENCY' and intended_index_state='noindex'),
    count(*) filter(where item_role='NOINDEX_DEPENDENCY' and page_type_snapshot='product'),
    count(*) filter(where item_role='NOINDEX_DEPENDENCY' and url_path_snapshot in ('/shop','/cart','/account')),
    count(*) filter(where item_role='INDEX_CANDIDATE' and page_version_id is not null and content_hash~'^[0-9a-f]{64}$'),
    count(*) filter(where item_role='INDEX_CANDIDATE' and url_path_snapshot like '/collections/%' and url_path_snapshot<>'/collections' and membership_snapshot_id is not null),
    count(*) filter(where url_path_snapshot in ('/collections/burning-man-looks','/collections/stage-outfits'))
  into total_items,index_items,noindex_items,product_items,utility_items,versioned_index_items,collection_memberships,retired_paths
  from public.feya_search_release_items_v1
  where release_id=release_uuid;

  if total_items<>228 then raise exception 'phase12_v10_item_count:%',total_items; end if;
  if index_items<>18 then raise exception 'phase12_v10_index_count:%',index_items; end if;
  if noindex_items<>210 then raise exception 'phase12_v10_noindex_count:%',noindex_items; end if;
  if product_items<>207 then raise exception 'phase12_v10_product_count:%',product_items; end if;
  if utility_items<>3 then raise exception 'phase12_v10_utility_count:%',utility_items; end if;
  if versioned_index_items<>18 then raise exception 'phase12_v10_versioned_index_count:%',versioned_index_items; end if;
  if collection_memberships<>10 then raise exception 'phase12_v10_collection_membership_count:%',collection_memberships; end if;
  if retired_paths<>0 then raise exception 'phase12_v10_retired_path_count:%',retired_paths; end if;
end $$;

with r as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10
),
gates(gate_code,gate_status,scope_label,evidence_json) as (
  values
    ('K01','PASS','Global',jsonb_build_object(
      'reason','Exact Phase 12 application SHA passed FEYA validation and has a READY Vercel deployment.',
      'git_sha','51f4973a516bcd1205d123681f66dc2ff2d44bfb',
      'ci_run_id',36868549729,
      'ci_conclusion','success',
      'deployment_id','dpl_Hi5Nszioi84NjDhDBwTNE4573RQi',
      'deployment_state','READY'
    )),
    ('K02','FAIL','Global',jsonb_build_object(
      'reason','Canonical production origin still returns HTTP 502 and is not serving the validated storefront.',
      'canonical_origin','https://thefeya.com',
      'canonical_fetch_status',502,
      'production_origin_ready',false,
      'checked_on','2026-10-01'
    )),
    ('K03','PASS','Release',jsonb_build_object(
      'reason','Fresh immutable scope is materialized with 228 unique paths: 18 index candidates and 210 noindex dependencies.',
      'index_candidates',18,
      'noindex_dependencies',210,
      'product_dependencies',207,
      'utility_dependencies',3
    )),
    ('K04','PASS','URL',jsonb_build_object(
      'reason','All 207 product dependencies bind to immutable storefront-approved content hashes from the closed review release.',
      'source_release_ref','feya-review-207-20260924',
      'approved_binding_count',207,
      'valid_content_hash_count',207
    )),
    ('K05','EXCLUDED_APPROVED','Commerce URL',jsonb_build_object(
      'reason','Wave A indexes no PDPs. All 207 product URLs remain explicit noindex dependencies; merchant checkout is outside this organic release.',
      'indexed_pdp_count',0,
      'noindex_pdp_count',207
    )),
    ('K06','EXCLUDED_APPROVED','Commerce',jsonb_build_object(
      'reason','Checkout, order creation and payment activation remain outside Organic Wave A.',
      'order_creation_enabled',false,
      'payment_enabled',false
    )),
    ('K07','EXCLUDED_APPROVED','Global/Commerce',jsonb_build_object(
      'reason','Payment-provider and contracting-seller activation disclosures remain deferred with checkout/payment disabled.',
      'payment_enabled',false,
      'order_creation_enabled',false
    )),
    ('K08','PASS','Page portfolio',jsonb_build_object(
      'reason','Ten commercial collection owners retain governed primary ownership, immutable membership snapshots and zero primary-owner conflicts.',
      'commercial_owner_count',10,
      'costume_headpieces_retained',true,
      'maleficent_public_label_retained',true
    )),
    ('K09','PASS','URL',jsonb_build_object(
      'reason','Global navigation, discovery hubs, home/footer links and owner routes now point directly to the owner-approved canonical collection URLs.',
      'burning_man_path','/collections/burning-man-outfits',
      'performance_path','/collections/performance-costumes',
      'retired_routes_redirect','308'
    )),
    ('K10','PASS','Graph',jsonb_build_object(
      'reason','Phase 12 exact browser/runtime suite passes the closed 207-product catalog, navigation, pagination and owner-route contracts.',
      'ci_run_id',36868549729,
      'ci_conclusion','success'
    )),
    ('K11','PASS','URL',jsonb_build_object(
      'reason','All 18 index candidates bind exact current immutable page versions/content hashes; renamed owners bind updated memberships and URL history.',
      'index_candidate_count',18,
      'owner_membership_count',10,
      'retired_latest_content_refs',0
    )),
    ('K12','PASS','Global/URL',jsonb_build_object(
      'reason','Indexability remains fail-closed and requires an ACTIVE exact-path Search Release; no active release exists.',
      'active_release_count',0,
      'shop_wave_a_state','noindex_dependency'
    )),
    ('K13','PASS','Release',jsonb_build_object(
      'reason','Sitemap reads only ACTIVE release INDEX_CANDIDATE/index items; robots advertises the sitemap only when an active release exists.'
    )),
    ('K14','FAIL','Graph',jsonb_build_object(
      'reason','Anonymous production-origin crawl cannot complete while https://thefeya.com returns HTTP 502.',
      'canonical_origin','https://thefeya.com',
      'canonical_fetch_status',502,
      'anonymous_production_crawl_completed',false
    )),
    ('K15','PASS','Schema',jsonb_build_object(
      'reason','Phase 11 structured data is truthful: collections use BreadcrumbList/CollectionPage/ItemList; PDPs use Product plus BreadcrumbList without premature Offer/ProductGroup merchant markup.',
      'phase11_ci_run_id',36863072968
    )),
    ('K16','PASS','Global',jsonb_build_object(
      'reason','Exact Phase 12 head completed full FEYA validation successfully.',
      'git_sha','51f4973a516bcd1205d123681f66dc2ff2d44bfb',
      'ci_run_id',36868549729,
      'ci_conclusion','success'
    )),
    ('K17','PASS','Release',jsonb_build_object(
      'reason','Visual freeze, responsive media/performance, mobile and keyboard runtime contracts remain green through Phase 12.',
      'phase10_ci_run_id',36859612150,
      'phase12_ci_run_id',36868549729,
      'field_cwv_claimed',false
    )),
    ('K18','PASS','Measurement',jsonb_build_object(
      'reason','First-party measurement IDs, consent gating, environment separation and preview fail-closed behavior remain implemented; production collection stays default-off until launch configuration.',
      'measurement_contract_version','feya_measurement_event_v1',
      'production_collection_default','off',
      'consent_required',true
    )),
    ('K19','FAIL','Measurement/API',jsonb_build_object(
      'reason','GSC Wizard still exposes only the URL-prefix property. Required Domain property sc-domain:thefeya.com is not connected/verified.',
      'connected_property','https://thefeya.com/',
      'required_property','sc-domain:thefeya.com',
      'domain_property_verified',false,
      'checked_on','2026-10-01'
    )),
    ('K20','FAIL','Release',jsonb_build_object(
      'reason','The Human Owner has approved the route/taxonomy decisions, but has not yet approved the exact newly materialized v10 release hash.',
      'exact_release_hash_approved',false,
      'activated',false
    ))
)
insert into public.feya_search_release_gate_results_v1(
  release_id,gate_code,gate_status,scope_label,evidence_json
)
select r.release_id,g.gate_code,g.gate_status,g.scope_label,g.evidence_json
from r cross join gates g;

with r as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10
),
material as (
  select jsonb_build_object(
    'release_code','organic-wave-a-20260926',
    'release_version',10,
    'target_origin','https://thefeya.com',
    'source_commerce_release_ref','feya-review-207-20260924',
    'source_db_ref','supabase:ysnizcgzhdwdfdkjkhud',
    'git_sha','51f4973a516bcd1205d123681f66dc2ff2d44bfb',
    'items',(
      select jsonb_agg(jsonb_build_object(
        'seo_page_id',i.seo_page_id,
        'path',i.url_path_snapshot,
        'page_type',i.page_type_snapshot,
        'role',i.item_role,
        'index_state',i.intended_index_state,
        'page_version_id',i.page_version_id,
        'membership_snapshot_id',i.membership_snapshot_id,
        'content_hash',i.content_hash,
        'item_hash',i.item_hash
      ) order by i.url_path_snapshot)
      from public.feya_search_release_items_v1 i
      where i.release_id=r.release_id
    ),
    'gates',(
      select jsonb_agg(jsonb_build_object(
        'code',g.gate_code,
        'status',g.gate_status
      ) order by g.gate_code)
      from public.feya_search_release_gate_results_v1 g
      where g.release_id=r.release_id
    )
  ) as body
  from r
)
update public.feya_search_releases_v1 x
set release_hash=encode(extensions.digest(convert_to(material.body::text,'UTF8'),'sha256'),'hex'),
    release_status='GATE_FAILED',
    gate_summary_json=jsonb_build_object(
      'overall','FAIL',
      'pass_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='PASS'),
      'fail_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='FAIL'),
      'excluded_approved_count',(select count(*) from public.feya_search_release_gate_results_v1 g where g.release_id=x.release_id and g.gate_status='EXCLUDED_APPROVED'),
      'ci_run_id',36868549729,
      'vercel_deployment_id','dpl_Hi5Nszioi84NjDhDBwTNE4573RQi'
    ),
    updated_at=now()
from material
where x.release_id=(
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10
);

update public.feya_search_release_gate_results_v1 g
set evidence_json=g.evidence_json||jsonb_build_object(
      'release_id',r.release_id,
      'release_hash',r.release_hash,
      'git_sha',r.git_sha
    ),
    evaluated_at=now()
from public.feya_search_releases_v1 r
where g.release_id=r.release_id
  and r.release_code='organic-wave-a-20260926'
  and r.release_version=10
  and g.gate_code='K20';

do $$
declare
  rel public.feya_search_releases_v1%rowtype;
  gate_count integer;
  fail_count integer;
  pass_count integer;
  excluded_count integer;
  active_count integer;
begin
  select * into rel
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=10;

  if not found then raise exception 'phase12_v10_release_missing'; end if;
  if rel.release_status<>'GATE_FAILED' then raise exception 'phase12_v10_status:%',rel.release_status; end if;
  if rel.release_hash is null or rel.release_hash!~'^[0-9a-f]{64}$'
    then raise exception 'phase12_v10_release_hash_invalid'; end if;
  if rel.git_sha<>'51f4973a516bcd1205d123681f66dc2ff2d44bfb'
    then raise exception 'phase12_v10_git_sha_conflict:%',rel.git_sha; end if;

  select
    count(*),
    count(*) filter(where gate_status='FAIL'),
    count(*) filter(where gate_status='PASS'),
    count(*) filter(where gate_status='EXCLUDED_APPROVED')
  into gate_count,fail_count,pass_count,excluded_count
  from public.feya_search_release_gate_results_v1
  where release_id=rel.release_id;

  if gate_count<>20 then raise exception 'phase12_v10_gate_count:%',gate_count; end if;
  if fail_count<>4 then raise exception 'phase12_v10_fail_count:%',fail_count; end if;
  if pass_count<>13 then raise exception 'phase12_v10_pass_count:%',pass_count; end if;
  if excluded_count<>3 then raise exception 'phase12_v10_excluded_count:%',excluded_count; end if;

  if exists(
    select 1 from public.feya_search_release_gate_results_v1
    where release_id=rel.release_id
      and gate_status='FAIL'
      and gate_code not in ('K02','K14','K19','K20')
  ) then
    raise exception 'phase12_v10_unexpected_failed_gate';
  end if;

  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then raise exception 'phase12_v10_unexpected_active_release:%',active_count; end if;
end $$;

commit;
