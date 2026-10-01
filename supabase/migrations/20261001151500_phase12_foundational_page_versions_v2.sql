-- Phase 12: refresh immutable foundational Wave A page versions against the
-- current, Phase 11-validated storefront source blobs. No indexation state changes.
begin;

create temp table phase12_foundational_source(
  url_path text primary key,
  family text not null,
  source_file text not null,
  source_blob_sha text not null,
  title text not null,
  h1 text not null,
  content_role text not null
) on commit drop;

insert into phase12_foundational_source(
  url_path,family,source_file,source_blob_sha,title,h1,content_role
) values
  ('/','home','app/page.tsx','fab61054050db08ec9bb356a201444939feae7f5',
   'TheFEYA | Handmade Stagewear and Festival Looks','Sculpted for the spotlight.','brand_home'),
  ('/collections','subhub','app/collections/page.tsx','56ef6b8ebf4cab67168a59456f878e372b4bb5cf',
   'TheFEYA Collections','Find your way into the collection.','collections_discovery_hub'),
  ('/about','trust','app/about/page.tsx','156e2f9e28de8da906641846abaa01be75f8e1d3',
   'About TheFEYA Atelier','About TheFEYA','about_atelier'),
  ('/size-guide','trust','app/size-guide/page.tsx','3f86f3dcedda894d51c11a52cba4d1fc19f1180a',
   'Costume Measurements & Size Guide | TheFEYA','Costume Measurements & Size Guide','measurements_size_guide'),
  ('/care','trust','app/care/page.tsx','9a86d98c8a40279ede4a04605a630aaed9e08da5',
   'Costume Care & Storage | TheFEYA','Care & Storage','care_storage'),
  ('/shipping','trust','app/shipping/page.tsx','e1fa1eace5ba83c94fc82044f1636881f48f7da2',
   'Shipping & Payment','Shipping & Payment','shipping_policy'),
  ('/returns','trust','app/returns/page.tsx','3e72a84437ceed5e342584133e386e06a70b2a22',
   'Returns & Exchanges','Returns & Exchanges','returns_policy'),
  ('/contact','trust','app/contact/page.tsx','4a0972f377e5e52ec7d55b4e9b06e56535af8731',
   'Contact TheFEYA','Contact','contact_support');

do $$
declare
  page_count integer;
  active_count integer;
begin
  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then
    raise exception 'phase12_foundational_refresh_requires_zero_active_search_releases:%',active_count;
  end if;

  select count(*) into page_count
  from phase12_foundational_source s
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
  join public.feya_search_page_specs_v1 spec on spec.seo_page_id=p.seo_page_id;
  if page_count<>8 then
    raise exception 'phase12_foundational_page_count_invalid:%',page_count;
  end if;

  if exists(select 1 from phase12_foundational_source where source_blob_sha!~'^[0-9a-f]{40}$') then
    raise exception 'phase12_foundational_blob_sha_invalid';
  end if;
end $$;

with resolved as (
  select
    p.seo_page_id,
    p.url_path,
    s.family,
    s.source_file,
    s.source_blob_sha,
    s.title,
    s.h1,
    s.content_role,
    latest.version_number as prior_version_number,
    latest.spec_json as prior_spec_json,
    jsonb_build_object(
      'contract_version','foundational_page_content_manifest_v2',
      'path',s.url_path,
      'family',s.family,
      'source_file',s.source_file,
      'source_blob_sha',s.source_blob_sha,
      'title',s.title,
      'h1',s.h1,
      'content_role',s.content_role,
      'content_status','CQA_PASS',
      'release_status','HOLD',
      'index_authorized',false
    ) as next_content_json
  from phase12_foundational_source s
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
  join lateral (
    select v.version_number,v.spec_json
    from public.feya_search_page_versions_v1 v
    where v.seo_page_id=p.seo_page_id
    order by v.version_number desc
    limit 1
  ) latest on true
)
insert into public.feya_search_page_versions_v1(
  seo_page_id,version_number,membership_snapshot_id,content_hash,
  spec_json,content_json,evidence_refs_json
)
select
  r.seo_page_id,
  r.prior_version_number+1,
  null,
  encode(extensions.digest(convert_to(r.next_content_json::text,'UTF8'),'sha256'),'hex'),
  r.prior_spec_json,
  r.next_content_json,
  jsonb_build_array(
    jsonb_build_object(
      'type','phase12_foundational_exact_blob_refresh',
      'validated_phase','Phase 11',
      'validated_at','2026-10-01',
      'source_file',r.source_file,
      'source_blob_sha',r.source_blob_sha
    ),
    jsonb_build_object(
      'type','cqa',
      'status','PASS',
      'ref','docs/search/PHASE11_SEO_CONTENT_STRUCTURED_DATA_READINESS_20261001.md'
    )
  )
from resolved r
where not exists(
  select 1
  from public.feya_search_page_versions_v1 v
  where v.seo_page_id=r.seo_page_id
    and v.content_json->>'source_blob_sha'=r.source_blob_sha
    and v.content_json->>'title'=r.title
    and v.content_json->>'h1'=r.h1
);

do $$
declare
  exact_count integer;
  v2_count integer;
begin
  with latest as (
    select distinct on(v.seo_page_id)
      v.seo_page_id,v.version_number,v.content_hash,v.content_json
    from public.feya_search_page_versions_v1 v
    order by v.seo_page_id,v.version_number desc
  )
  select count(*) into exact_count
  from phase12_foundational_source s
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
  join latest v on v.seo_page_id=p.seo_page_id
  where v.content_json->>'source_blob_sha'=s.source_blob_sha
    and v.content_json->>'title'=s.title
    and v.content_json->>'h1'=s.h1
    and v.content_json->>'content_status'='CQA_PASS'
    and v.content_json->>'release_status'='HOLD'
    and v.content_hash=encode(extensions.digest(convert_to(v.content_json::text,'UTF8'),'sha256'),'hex');
  if exact_count<>8 then
    raise exception 'phase12_foundational_exact_binding_invalid:%',exact_count;
  end if;

  with latest as (
    select distinct on(v.seo_page_id) v.seo_page_id,v.version_number
    from public.feya_search_page_versions_v1 v
    order by v.seo_page_id,v.version_number desc
  )
  select count(*) into v2_count
  from phase12_foundational_source s
  join public.feya_commerce_seo_pages_v1 p
    on p.market_code='US' and p.locale='en-US' and p.url_path=s.url_path
  join latest v on v.seo_page_id=p.seo_page_id
  where v.version_number=2;
  if v2_count<>8 then
    raise exception 'phase12_foundational_version_count_invalid:%',v2_count;
  end if;
end $$;

commit;
