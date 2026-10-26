-- FEYA/2026-10-26 — append-only owner-approved product SEO preparation.
-- These rows are NOT an active Search Release and DO NOT enable payment,
-- robots:index, sitemap publication, ad spend, or any new SEO copy.
-- Safe to prepare ahead of a separate owner-approved v13 search release.
begin;

create temp table feya_pdp207_approved_source on commit drop as
select
  b.canonical_product_id,b.seo_page_id,b.draft_id,b.content_sha256,
  b.draft_updated_at_snapshot,b.source_release_ref,b.url_path_snapshot,
  p.url_path,p.page_type,p.portfolio_status,p.lifecycle_state,
  d.status AS draft_status,d.review_status,d.archived_at,d.updated_at,
  d.seo_title,d.h1,d.meta_description,d.intro,
  d.agent_output_snapshot,d.manual_focus_snapshot,
  detail.product_slug,detail.approved_content_sha256
from public.feya_storefront_approved_product_bindings_v1 b
join public.feya_commerce_seo_pages_v1 p
  on p.seo_page_id=b.seo_page_id
join public.feya_commerce_seo_pack_drafts_v1 d
  on d.id=b.draft_id and d.canonical_product_id=b.canonical_product_id
join public.feya_storefront_product_details_v1 detail
  on detail.canonical_product_id=b.canonical_product_id
where b.source_release_ref='feya-review-207-20260924';

do $guard$
declare n integer;
begin
  if (select count(*) from public.feya_search_releases_v1 where release_status='ACTIVE')<>1
     or not exists(
       select 1 from public.feya_search_releases_v1
       where release_status='ACTIVE' and release_version=12
         and release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
     ) then raise exception 'feya_pdp207_expected_active_search_v12'; end if;

  select count(*) into n from feya_pdp207_approved_source;
  if n<>207 then raise exception 'feya_pdp207_count:%',n; end if;

  if exists(
    select 1 from feya_pdp207_approved_source s
    where s.page_type<>'product' or s.portfolio_status<>'active'
       or s.lifecycle_state in ('archived','retired','deleted')
       or s.draft_status<>'approved_draft' or s.review_status<>'approved'
       or s.archived_at is not null or s.updated_at<>s.draft_updated_at_snapshot
       or s.url_path<>s.url_path_snapshot
       or s.url_path<>'/shop/'||s.product_slug
       or s.approved_content_sha256<>s.content_sha256
       or s.content_sha256!~'^[0-9a-f]{64}$'
       or s.seo_title is distinct from s.agent_output_snapshot->>'seo_title'
       or s.h1 is distinct from s.agent_output_snapshot->>'h1'
       or s.meta_description is distinct from s.agent_output_snapshot->>'meta_description'
       or s.intro is distinct from s.agent_output_snapshot->>'intro'
       or jsonb_typeof(s.agent_output_snapshot->'pdp_blocks') is distinct from 'array'
       or jsonb_array_length(s.agent_output_snapshot->'pdp_blocks')<>4
       or (
         select count(distinct v.block->>'block_key')
         from jsonb_array_elements(s.agent_output_snapshot->'pdp_blocks') v(block)
       )<>4
       or exists(
         select 1 from jsonb_array_elements(s.agent_output_snapshot->'pdp_blocks') v(block)
         where (v.block->>'block_key') not in (
           'about_this_piece','why_youll_love_it','ideal_for','main_description'
         ) or v.block->>'placement'<>'left_description'
           or length(btrim(coalesce(v.block->>'heading','')))=0
           or length(btrim(coalesce(v.block->>'body','')))=0
       )
  ) then raise exception 'feya_pdp207_approved_copy_mismatch'; end if;

  if (select count(distinct canonical_product_id) from feya_pdp207_approved_source)<>207
     or (select count(distinct seo_page_id) from feya_pdp207_approved_source)<>207
     or (select count(distinct url_path) from feya_pdp207_approved_source)<>207
    then raise exception 'feya_pdp207_identity_collision'; end if;

  if (select count(*) from public.feya_commerce_seo_pages_v1
      where market_code='US' and locale='en-US' and url_path='/shop')<>1
    then raise exception 'feya_pdp207_shop_parent_missing'; end if;

  if exists(
    select 1 from feya_pdp207_approved_source s
    where exists(select 1 from public.feya_search_page_specs_v1 sp where sp.seo_page_id=s.seo_page_id)
       or exists(select 1 from public.feya_search_page_versions_v1 v where v.seo_page_id=s.seo_page_id)
  ) then raise exception 'feya_pdp207_existing_spec_or_immutable_version'; end if;
end $guard$;

insert into public.feya_search_page_specs_v1(
  seo_page_id,family,primary_parent_page_id,accountable_owner,review_state,
  user_intent,primary_intent,unique_value_brief,intent_evidence_status,truth_status,
  selection_rule_json,inventory_policy_json,excluded_queries_json,evidence_refs_json
)
select
  s.seo_page_id,'product',
  (select seo_page_id from public.feya_commerce_seo_pages_v1
    where market_code='US' and locale='en-US' and url_path='/shop'),
  'OSPM','review',
  s.h1,
  coalesce(nullif(btrim(s.manual_focus_snapshot->>'q'),''),s.h1),
  s.intro,
  'confirmed','confirmed',
  jsonb_build_object(
    'version','owner_approved_product_binding_v1',
    'canonical_product_id',s.canonical_product_id,
    'draft_id',s.draft_id,
    'owner_source_release',s.source_release_ref,
    'index_authorized',false,
    'checkout_required_before_index',true
  ),
  jsonb_build_object('owner_approved_catalog_count',207,
    'sellable_configuration_source','feya_storefront_product_details_v1',
    'commerce_payment_validation','required_before_search_release'),
  case when jsonb_typeof(s.manual_focus_snapshot->'exclude')='array'
    then s.manual_focus_snapshot->'exclude' else '[]'::jsonb end,
  jsonb_build_array(jsonb_build_object(
    'type','owner_approved_pdp_binding',
    'draft_id',s.draft_id,'source_release',s.source_release_ref,
    'content_sha256',s.content_sha256,'url',s.url_path
  ))
from feya_pdp207_approved_source s;

-- Preserve original approved text EXACTLY (no rewriting or regenerated keywords).
-- The owner SHA is a content provenance pin; page-version content_hash is the
-- canonical hash of the complete immutable JSON version row.
with payloads as (
  select
    s.seo_page_id,s.canonical_product_id,s.draft_id,s.content_sha256,
    s.url_path,s.source_release_ref,s.draft_updated_at_snapshot,
    jsonb_build_object(
      'contract_version','feya_product_approved_copy_version_v1',
      'content_status','OWNER_APPROVED',
      'release_status','HOLD',
      'index_authorized',false,
      'path',s.url_path,
      'canonical_product_id',s.canonical_product_id,
      'draft_id',s.draft_id,
      'approved_content_sha256',s.content_sha256,
      'source_release_ref',s.source_release_ref,
      'metadata',jsonb_build_object(
        'title',s.seo_title,'description',s.meta_description,
        'canonical_path',s.url_path
      ),
      'draft',jsonb_build_object(
        'h1',s.h1,'intro',s.intro,'meta_description',s.meta_description,
        'pdp_blocks',(
          select jsonb_agg(jsonb_build_object(
            'block_key',v.block->>'block_key',
            'placement',v.block->>'placement',
            'heading',v.block->>'heading',
            'body',v.block->>'body'
          ) order by v.ord)
          from jsonb_array_elements(s.agent_output_snapshot->'pdp_blocks')
            with ordinality v(block,ord)
        )
      )
    ) as content_json
  from feya_pdp207_approved_source s
)
insert into public.feya_search_page_versions_v1(
  page_version_id,seo_page_id,version_number,membership_snapshot_id,
  content_hash,spec_json,content_json,evidence_refs_json
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:pdp-owner-approved:v1:'||p.seo_page_id::text
  ),
  p.seo_page_id,1,null,
  encode(extensions.digest(convert_to(p.content_json::text,'UTF8'),'sha256'),'hex'),
  jsonb_build_object(
    'family',sp.family,
    'primary_parent_page_id',sp.primary_parent_page_id,
    'accountable_owner',sp.accountable_owner,
    'review_state',sp.review_state,
    'user_intent',sp.user_intent,'primary_intent',sp.primary_intent,
    'unique_value_brief',sp.unique_value_brief,
    'intent_evidence_status',sp.intent_evidence_status,
    'truth_status',sp.truth_status,
    'selection_rule_json',sp.selection_rule_json,
    'inventory_policy_json',sp.inventory_policy_json,
    'excluded_queries_json',sp.excluded_queries_json
  ),
  p.content_json,
  jsonb_build_array(
    jsonb_build_object(
      'type','owner_approved_copy_provenance',
      'source_release',p.source_release_ref,
      'draft_id',p.draft_id,
      'approved_content_sha256',p.content_sha256,
      'approved_draft_updated_at',p.draft_updated_at_snapshot,
      'canonical_url_path',p.url_path
    ),
    jsonb_build_object(
      'type','indexation_preflight',
      'status','PREPARED_NO_INDEX',
      'conditions','buyer_paid_checkout_and_human_search_release_required'
    )
  )
from payloads p
join public.feya_search_page_specs_v1 sp on sp.seo_page_id=p.seo_page_id;

do $verify$
declare n integer;
begin
  select count(*) into n
  from public.feya_search_page_versions_v1 v
  join feya_pdp207_approved_source s on s.seo_page_id=v.seo_page_id
  where v.version_number=1
    and v.membership_snapshot_id is null
    and v.content_json->>'index_authorized'='false'
    and v.content_json->>'release_status'='HOLD'
    and v.content_json->>'approved_content_sha256'=s.content_sha256
    and v.content_json->>'path'=s.url_path
    and v.content_hash=encode(extensions.digest(
      convert_to(v.content_json::text,'UTF8'),'sha256'),'hex')
    and jsonb_array_length(v.content_json->'draft'->'pdp_blocks')=4;
  if n<>207 then raise exception 'feya_pdp207_version_postflight_count:%',n; end if;
  if (select count(*) from public.feya_search_releases_v1
      where release_status='ACTIVE')<>1
    or (select count(*) from public.feya_search_release_items_v1
        where release_id='2dc86d7c-6269-5327-9154-6b5178931254'::uuid
          and page_type_snapshot='product' and intended_index_state='noindex')<>207
    then raise exception 'feya_pdp207_indexation_unchanged_invariant'; end if;
end $verify$;
commit;
