-- FEYA Search v13: NON-ACTIVE full 207-product index candidate.
-- Do not activate here. v12 remains sole ACTIVE release and all 207 PDPs
-- remain live noindex until customer checkout and Human Owner v13 approval.
begin;

create temp table feya_v13_source on commit drop as
select
  i.*,v.page_version_id as approved_version_id,
  v.content_hash as approved_version_hash,
  v.content_json as approved_content_json,
  b.content_sha256 as approved_owner_hash
from public.feya_search_release_items_v1 i
left join public.feya_search_page_versions_v1 v
  on v.seo_page_id=i.seo_page_id and v.version_number=1
left join public.feya_storefront_approved_product_bindings_v1 b
  on b.seo_page_id=i.seo_page_id
where i.release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid;

do $guard$
declare n integer;
begin
  if (select count(*) from public.feya_search_releases_v1
    where release_status='ACTIVE')<>1
    or not exists(select 1 from public.feya_search_releases_v1
      where release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
        and release_version=12 and release_status='ACTIVE')
    then raise exception 'feya_v13_expected_active_v12'; end if;

  if exists(select 1 from public.feya_search_releases_v1
    where release_code='organic-wave-a-20260926' and release_version=13)
    then raise exception 'feya_v13_already_exists'; end if;

  select count(*) into n from feya_v13_source;
  if n<>228 then raise exception 'feya_v13_expected_228_source_pages:%',n; end if;
  if (select count(*) from feya_v13_source
      where page_type_snapshot='landing' and intended_index_state='index')<>18
    or (select count(*) from feya_v13_source
      where page_type_snapshot='landing' and intended_index_state='noindex')<>3
    or (select count(*) from feya_v13_source
      where page_type_snapshot='product' and intended_index_state='noindex')<>207
    then raise exception 'feya_v13_source_portfolio_inconsistent'; end if;

  if exists(select 1 from feya_v13_source
    where page_type_snapshot='product'
      and (
        approved_version_id is null
        or approved_version_hash !~ '^[0-9a-f]{64}$'
        or approved_owner_hash !~ '^[0-9a-f]{64}$'
        or approved_content_json->>'approved_content_sha256' is distinct from approved_owner_hash
        or approved_content_json->>'index_authorized' is distinct from 'false'
        or approved_content_json->>'release_status' is distinct from 'HOLD'
        or approved_content_json->>'path' is distinct from url_path_snapshot
        or jsonb_array_length(approved_content_json->'draft'->'pdp_blocks')<>4
      )
  ) then raise exception 'feya_v13_unbound_or_mutated_product_copy'; end if;
  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid)<>20
    then raise exception 'feya_v13_source_gate_count_invalid'; end if;
end $guard$;

insert into public.feya_search_releases_v1(
  release_id,release_code,release_version,release_status,target_origin,
  source_commerce_release_ref,source_db_ref,git_sha,release_hash,
  gate_policy_version,scope_json,gate_summary_json
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:search-release:organic-wave-a:2026-09-26:v13'
  ),
  r.release_code,13,'GATE_FAILED',r.target_origin,
  r.source_commerce_release_ref,r.source_db_ref,
  null,null,
  r.gate_policy_version,
  (r.scope_json - 'noindex_dependencies' - 'payment_scope') ||
    jsonb_build_object(
      'release_kind','organic_207_product_commerce_candidate',
      'payment_scope','BUYER_PAYMENT_REQUIRED_BEFORE_INDEX',
      'candidate_from_release_version',12,
      'owner_approved_pdp_count',207,
      'total_index_candidates',225,
      'noindex_dependencies',jsonb_build_object('shop',true,'cart',true,'account',true),
      'indexation_approved',false,
      'commercial_release_verified',false,
      'search_release_status','GATE_FAILED_REVIEW_REQUIRED'
    ),
  jsonb_build_object(
    'overall','FAIL',
    'reason','207 approved PDPs are prepared but real buyer payment and Search v13 K01-K20 revalidation are not yet authorized',
    'pass_count',0,'fail_count',20,'excluded_approved_count',0,
    'buyer_payment_verified',false,'owner_search_release_approved',false
  )
from public.feya_search_releases_v1 r
where r.release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
  and r.release_status='ACTIVE';

with target as (
  select release_id from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=13
), planned as (
  select s.seo_page_id,s.url_path_snapshot,s.page_type_snapshot,s.canonical_product_id,
    case when s.page_type_snapshot='product'
      then 'INDEX_CANDIDATE' else s.item_role end as next_role,
    case when s.page_type_snapshot='product'
      then 'index' else s.intended_index_state end as next_state,
    case when s.page_type_snapshot='product'
      then s.approved_version_id else s.page_version_id end as next_version_id,
    s.membership_snapshot_id,
    case when s.page_type_snapshot='product'
      then s.approved_version_hash else s.content_hash end as next_content_hash,
    s.evidence_json,s.approved_owner_hash
  from feya_v13_source s
)
insert into public.feya_search_release_items_v1(
  release_id,seo_page_id,url_path_snapshot,page_type_snapshot,item_role,
  intended_index_state,canonical_product_id,page_version_id,
  membership_snapshot_id,content_hash,item_hash,evidence_json
)
select
  t.release_id,p.seo_page_id,p.url_path_snapshot,p.page_type_snapshot,
  p.next_role,p.next_state,p.canonical_product_id,p.next_version_id,
  p.membership_snapshot_id,p.next_content_hash,
  encode(extensions.digest(convert_to(
    jsonb_build_object(
      'release_id',t.release_id,'seo_page_id',p.seo_page_id,
      'url_path',p.url_path_snapshot,'page_type',p.page_type_snapshot,
      'item_role',p.next_role,'intended_index_state',p.next_state,
      'canonical_product_id',p.canonical_product_id,
      'page_version_id',p.next_version_id,
      'membership_snapshot_id',p.membership_snapshot_id,
      'content_hash',p.next_content_hash
    )::text,'UTF8'),'sha256'),'hex'),
  p.evidence_json ||
    jsonb_build_object(
      'derived_from_search_release_v12',true,
      'release_candidate_version',13,
      'owner_copy_sha256',p.approved_owner_hash,
      'index_authorized',false,
      'commercial_payment_required',true,
      'promotion_state','FAIL_CLOSED'
    )
from planned p cross join target t;

insert into public.feya_search_release_gate_results_v1(
  release_id,gate_code,gate_status,scope_label,evidence_json
)
select
  (
    select release_id from public.feya_search_releases_v1
    where release_code='organic-wave-a-20260926' and release_version=13
  ),
  g.gate_code,'FAIL',g.scope_label,
  jsonb_build_object(
    'status','NOT_VALIDATED_FOR_NEW_207_PRODUCT_SCOPE',
    'previous_release_version',12,
    'requires_new_gate_evidence',true,
    'human_owner_approval_required',true,
    'buyer_payment_required',true,
    'automatic_activation',false
  )
from public.feya_search_release_gate_results_v1 g
where g.release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid;

do $verify$
declare r_id uuid;n integer;
begin
  select release_id into r_id from public.feya_search_releases_v1
  where release_code='organic-wave-a-20260926' and release_version=13;
  if r_id is null then raise exception 'feya_v13_candidate_not_created'; end if;

  if (select count(*) from public.feya_search_release_items_v1
      where release_id=r_id)<>228
    or (select count(*) from public.feya_search_release_items_v1
      where release_id=r_id and intended_index_state='index')<>225
    or (select count(*) from public.feya_search_release_items_v1
      where release_id=r_id and page_type_snapshot='product'
        and item_role='INDEX_CANDIDATE' and intended_index_state='index'
        and page_version_id is not null)<>207
    or (select count(*) from public.feya_search_release_items_v1
      where release_id=r_id and intended_index_state='noindex')<>3
    then raise exception 'feya_v13_prepared_portfolio_invalid'; end if;

  if (select count(*) from public.feya_search_release_gate_results_v1
      where release_id=r_id and gate_status='FAIL')<>20
    or exists(select 1 from public.feya_search_releases_v1
      where release_id=r_id and (release_hash is not null or git_sha is not null
        or release_status<>'GATE_FAILED'))
    then raise exception 'feya_v13_activation_guard_invalid'; end if;

  if (select count(*) from public.feya_search_releases_v1
      where release_status='ACTIVE')<>1
    or (select count(*) from public.feya_search_release_items_v1
      where release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
        and page_type_snapshot='product' and intended_index_state='noindex')<>207
    then raise exception 'feya_v12_active_status_or_noindex_mutated'; end if;
end $verify$;
commit;
