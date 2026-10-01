-- Phase 12: materialize Organic Wave A v12 after the canonical production origin
-- and anonymous production crawl are proven green on the current storefront.
-- This migration MUST NOT activate indexing, submit a sitemap, or call activation RPCs.

begin;

do $$
declare
  active_count integer;
  prior_count integer;
begin
  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then
    raise exception 'phase12_wave_a_v12_requires_zero_active_releases:%',active_count;
  end if;

  select count(*) into prior_count
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=11;
  if prior_count<>1 then
    raise exception 'phase12_wave_a_v12_requires_v10:%',prior_count;
  end if;

  if exists(
    select 1 from public.feya_search_releases_v1
    where release_code='organic-wave-a-20260926' and release_version=12
  ) then
    raise exception 'phase12_wave_a_v12_already_exists';
  end if;
end $$;

with constants as (
  select extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:search-release:organic-wave-a:2026-09-26:v12'
  ) as release_id
),
prior as (
  select *
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=11
)
insert into public.feya_search_releases_v1(
  release_id,release_code,release_version,release_status,target_origin,
  source_commerce_release_ref,source_db_ref,git_sha,release_hash,gate_policy_version,
  scope_json,gate_summary_json
)
select
  c.release_id,
  p.release_code,
  12,
  'GATE_FAILED',
  p.target_origin,
  p.source_commerce_release_ref,
  p.source_db_ref,
  '7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
  null,
  p.gate_policy_version,
  p.scope_json || jsonb_build_object(
    'release_basis','phase12_production_origin_and_crawl_verified',
    'previous_release_version',11,
    'production_git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
    'production_deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
    'production_crawl_run_id',36924805355,
    'production_crawl_job_id',110579381872,
    'production_crawl_artifact_id',0
  ),
  jsonb_build_object(
    'overall','FAIL',
    'reason','Canonical production and anonymous crawl now pass; Only exact Human Owner approval remains fail-closed.',
    'ci_run_id',36924805355,
    'vercel_deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
    'production_crawl_job_id',110579381872
  )
from constants c cross join prior p;

with old_release as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=11
),
new_release as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=12
)
insert into public.feya_search_release_items_v1(
  release_id,seo_page_id,url_path_snapshot,page_type_snapshot,item_role,intended_index_state,
  canonical_product_id,page_version_id,membership_snapshot_id,content_hash,item_hash,evidence_json
)
select
  n.release_id,
  i.seo_page_id,
  i.url_path_snapshot,
  i.page_type_snapshot,
  i.item_role,
  i.intended_index_state,
  i.canonical_product_id,
  i.page_version_id,
  i.membership_snapshot_id,
  i.content_hash,
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'release_id',n.release_id,
      'seo_page_id',i.seo_page_id,
      'url_path',i.url_path_snapshot,
      'page_type',i.page_type_snapshot,
      'item_role',i.item_role,
      'intended_index_state',i.intended_index_state,
      'canonical_product_id',i.canonical_product_id,
      'page_version_id',i.page_version_id,
      'membership_snapshot_id',i.membership_snapshot_id,
      'content_hash',i.content_hash
    )::text,'UTF8'
  ),'sha256'),'hex'),
  i.evidence_json || jsonb_build_object(
    'cloned_from_release_version',11,
    'phase12_v12_git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7'
  )
from old_release o
join public.feya_search_release_items_v1 i on i.release_id=o.release_id
cross join new_release n;

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
  where release_code='organic-wave-a-20260926' and release_version=12;

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

  if total_items<>228 then raise exception 'phase12_v12_item_count:%',total_items; end if;
  if index_items<>18 then raise exception 'phase12_v12_index_count:%',index_items; end if;
  if noindex_items<>210 then raise exception 'phase12_v12_noindex_count:%',noindex_items; end if;
  if product_items<>207 then raise exception 'phase12_v12_product_count:%',product_items; end if;
  if utility_items<>3 then raise exception 'phase12_v12_utility_count:%',utility_items; end if;
  if versioned_index_items<>18 then raise exception 'phase12_v12_versioned_index_count:%',versioned_index_items; end if;
  if collection_memberships<>10 then raise exception 'phase12_v12_collection_membership_count:%',collection_memberships; end if;
  if retired_paths<>0 then raise exception 'phase12_v12_retired_path_count:%',retired_paths; end if;
end $$;

with old_release as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=11
),
new_release as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=12
),
old_gates as (
  select g.*
  from old_release o
  join public.feya_search_release_gate_results_v1 g on g.release_id=o.release_id
)
insert into public.feya_search_release_gate_results_v1(
  release_id,gate_code,gate_status,scope_label,evidence_json
)
select
  n.release_id,
  g.gate_code,
  case
    when g.gate_code in ('K02','K14','K19') then 'PASS'
    else g.gate_status
  end,
  g.scope_label,
  case g.gate_code
    when 'K01' then jsonb_build_object(
      'reason','Exact current storefront SHA completed FEYA validation and has a READY production Vercel deployment.',
      'git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
      'ci_run_id',36924805355,
      'ci_conclusion','success',
      'deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
      'deployment_state','READY'
    )
    when 'K02' then jsonb_build_object(
      'reason','Canonical production origin serves the validated storefront on the exact current production deployment.',
      'canonical_origin','https://thefeya.com',
      'production_origin_ready',true,
      'git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
      'deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
      'deployment_state','READY',
      'www_alias_attached',true,
      'checked_on','2026-10-01'
    )
    when 'K14' then jsonb_build_object(
      'reason','Strict anonymous production crawl completed successfully on the canonical origin after the governed PDP snapshot hardening.',
      'canonical_origin','https://thefeya.com',
      'anonymous_production_crawl_completed',true,
      'ci_run_id',36924805355,
      'crawler_job_id',110579381872,
      'crawler_artifact_id',0,
      'index_candidates_checked',18,
      'index_candidates_passed',18,
      'product_noindex_manifest_count',207,
      'product_noindex_http_sample_checked',24,
      'product_noindex_http_sample_passed',24,
      'retired_redirects_passed',2,
      'utility_noindex_passed',3,
      'filter_noindex_passed',1
    )
    when 'K16' then jsonb_build_object(
      'reason','Exact current storefront SHA completed the full FEYA validation workflow successfully.',
      'git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
      'ci_run_id',36924805355,
      'ci_conclusion','success'
    )
    when 'K17' then g.evidence_json || jsonb_build_object(
      'current_phase12_git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
      'current_phase12_ci_run_id',36924805355,
      'visual_freeze_preserved',true
    )
    when 'K19' then jsonb_build_object(
      'reason','The Search Console Domain property sc-domain:thefeya.com is verified and readable by the connected owner account.',
      'required_property','sc-domain:thefeya.com',
      'domain_property_verified',true,
      'permission_level','siteOwner',
      'gsc_wizard_connected',true,
      'checked_on','2026-10-01'
    )
    when 'K20' then jsonb_build_object(
      'reason','The exact v12 immutable release hash has not yet been explicitly approved by the Human Owner.',
      'exact_release_hash_approved',false,
      'activated',false
    )
    else g.evidence_json
  end
from old_gates g
cross join new_release n;

with r as (
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=12
),
material as (
  select jsonb_build_object(
    'release_code','organic-wave-a-20260926',
    'release_version',12,
    'target_origin','https://thefeya.com',
    'source_commerce_release_ref','feya-review-207-20260924',
    'source_db_ref','supabase:ysnizcgzhdwdfdkjkhud',
    'git_sha','7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
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
      'ci_run_id',36924805355,
      'vercel_deployment_id','dpl_D3KccMszK6sVmsuib4GT5F3mR9fS',
      'production_crawl_job_id',110579381872,
      'production_crawl_artifact_id',0
    ),
    updated_at=now()
from material
where x.release_id=(
  select release_id
  from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=12
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
  and r.release_version=12
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
  where release_code='organic-wave-a-20260926' and release_version=12;

  if not found then raise exception 'phase12_v12_release_missing'; end if;
  if rel.release_status<>'GATE_FAILED' then raise exception 'phase12_v12_status:%',rel.release_status; end if;
  if rel.release_hash is null or rel.release_hash!~'^[0-9a-f]{64}$'
    then raise exception 'phase12_v12_release_hash_invalid'; end if;
  if rel.git_sha<>'7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7'
    then raise exception 'phase12_v12_git_sha_conflict:%',rel.git_sha; end if;

  select
    count(*),
    count(*) filter(where gate_status='FAIL'),
    count(*) filter(where gate_status='PASS'),
    count(*) filter(where gate_status='EXCLUDED_APPROVED')
  into gate_count,fail_count,pass_count,excluded_count
  from public.feya_search_release_gate_results_v1
  where release_id=rel.release_id;

  if gate_count<>20 then raise exception 'phase12_v12_gate_count:%',gate_count; end if;
  if fail_count<>1 then raise exception 'phase12_v12_fail_count:%',fail_count; end if;
  if pass_count<>16 then raise exception 'phase12_v12_pass_count:%',pass_count; end if;
  if excluded_count<>3 then raise exception 'phase12_v12_excluded_count:%',excluded_count; end if;

  if exists(
    select 1 from public.feya_search_release_gate_results_v1
    where release_id=rel.release_id
      and gate_status='FAIL'
      and gate_code not in ('K20')
  ) then
    raise exception 'phase12_v12_unexpected_failed_gate';
  end if;

  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then raise exception 'phase12_v12_unexpected_active_release:%',active_count; end if;
end $$;

commit;
