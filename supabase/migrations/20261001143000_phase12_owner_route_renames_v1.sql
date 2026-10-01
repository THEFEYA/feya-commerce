-- Phase 12: Human Owner-approved pre-index route renames.
-- This migration changes canonical route identity before first indexing while preserving immutable history.
begin;

create temp table phase12_owner_route_rename_map(
  candidate_code text primary key,
  old_path text not null unique,
  new_path text not null unique
) on commit drop;

insert into phase12_owner_route_rename_map(candidate_code,old_path,new_path) values
  ('BURNING_MAN_OUTFITS','/collections/burning-man-looks','/collections/burning-man-outfits'),
  ('PERFORMANCE_COSTUMES','/collections/stage-outfits','/collections/performance-costumes');

do $$
declare
  matched_count integer;
  active_count integer;
begin
  select count(*) into active_count
  from public.feya_search_releases_v1
  where release_status='ACTIVE';
  if active_count<>0 then
    raise exception 'phase12_owner_route_rename_requires_zero_active_search_releases:%',active_count;
  end if;

  select count(*) into matched_count
  from public.feya_commerce_seo_pages_v1 p
  join phase12_owner_route_rename_map m
    on p.url_path=m.old_path
   and p.market_code='US'
   and p.locale='en-US'
   and p.page_type='landing'
   and p.metadata_json->>'candidate_code'=m.candidate_code;
  if matched_count<>2 then
    raise exception 'phase12_owner_route_rename_source_mismatch:%',matched_count;
  end if;

  if exists(
    select 1
    from public.feya_commerce_seo_pages_v1 p
    join phase12_owner_route_rename_map m on p.url_path=m.new_path
    where p.market_code='US' and p.locale='en-US'
  ) then
    raise exception 'phase12_owner_route_rename_target_conflict';
  end if;
end $$;

-- Close any pre-existing active URL-history row first. The current database has none,
-- but this keeps the migration safe if a history backfill lands before execution.
update public.feya_commerce_seo_page_url_history_v1 h
set valid_to=now(),
    change_reason=coalesce(h.change_reason,'OWNER_APPROVED_PREINDEX_ROUTE_RENAME')
where h.valid_to is null
  and h.seo_page_id in (
    select p.seo_page_id
    from public.feya_commerce_seo_pages_v1 p
    join phase12_owner_route_rename_map m on p.url_path=m.old_path
    where p.market_code='US' and p.locale='en-US'
  );

-- Preserve the old route as a closed historical identity.
insert into public.feya_commerce_seo_page_url_history_v1(
  seo_page_id,url_path,canonical_url,valid_from,valid_to,change_reason,source_type
)
select
  p.seo_page_id,
  p.url_path,
  p.canonical_url,
  p.created_at,
  now(),
  'OWNER_APPROVED_PREINDEX_ROUTE_RENAME',
  'human_owner'
from public.feya_commerce_seo_pages_v1 p
join phase12_owner_route_rename_map m on p.url_path=m.old_path
where p.market_code='US' and p.locale='en-US'
  and not exists(
    select 1
    from public.feya_commerce_seo_page_url_history_v1 h
    where h.seo_page_id=p.seo_page_id and h.url_path=p.url_path
  );

-- Move canonical page identity to the owner-approved preferred routes.
update public.feya_commerce_seo_pages_v1 p
set url_path=m.new_path,
    canonical_url='https://thefeya.com'||m.new_path,
    updated_at=now()
from phase12_owner_route_rename_map m
where p.url_path=m.old_path
  and p.market_code='US'
  and p.locale='en-US'
  and p.page_type='landing'
  and p.metadata_json->>'candidate_code'=m.candidate_code;

-- Record the new current route identity.
insert into public.feya_commerce_seo_page_url_history_v1(
  seo_page_id,url_path,canonical_url,valid_from,valid_to,change_reason,source_type
)
select
  p.seo_page_id,
  p.url_path,
  p.canonical_url,
  now(),
  null,
  'OWNER_APPROVED_PREINDEX_ROUTE_RENAME',
  'human_owner'
from public.feya_commerce_seo_pages_v1 p
join phase12_owner_route_rename_map m on p.url_path=m.new_path
where p.market_code='US' and p.locale='en-US'
  and not exists(
    select 1
    from public.feya_commerce_seo_page_url_history_v1 h
    where h.seo_page_id=p.seo_page_id and h.valid_to is null
  );

-- Immutable page versions are never updated. Create a new version for every latest
-- governed page whose content path or related-links still reference either old route.
with latest as (
  select distinct on (v.seo_page_id)
    v.seo_page_id,
    v.version_number,
    v.membership_snapshot_id,
    v.spec_json,
    v.content_json,
    v.evidence_refs_json
  from public.feya_search_page_versions_v1 v
  order by v.seo_page_id,v.version_number desc
),
rewritten as (
  select
    l.*,
    replace(
      replace(
        l.content_json::text,
        '/collections/burning-man-looks',
        '/collections/burning-man-outfits'
      ),
      '/collections/stage-outfits',
      '/collections/performance-costumes'
    )::jsonb as next_content_json
  from latest l
  where l.content_json::text like '%/collections/burning-man-looks%'
     or l.content_json::text like '%/collections/stage-outfits%'
)
insert into public.feya_search_page_versions_v1(
  seo_page_id,
  version_number,
  membership_snapshot_id,
  content_hash,
  spec_json,
  content_json,
  evidence_refs_json
)
select
  r.seo_page_id,
  r.version_number+1,
  r.membership_snapshot_id,
  encode(extensions.digest(convert_to(r.next_content_json::text,'UTF8'),'sha256'),'hex'),
  r.spec_json,
  r.next_content_json,
  coalesce(r.evidence_refs_json,'[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'type','owner_approved_preindex_route_rename',
      'approved_at','2026-10-01',
      'old_paths',jsonb_build_array('/collections/burning-man-looks','/collections/stage-outfits'),
      'new_paths',jsonb_build_array('/collections/burning-man-outfits','/collections/performance-costumes')
    ))
from rewritten r
where r.next_content_json is distinct from r.content_json;

do $$
declare
  target_count integer;
  active_history_count integer;
  stale_latest_count integer;
  rename_version_count integer;
begin
  select count(*) into target_count
  from public.feya_commerce_seo_pages_v1 p
  join phase12_owner_route_rename_map m on p.url_path=m.new_path
  where p.market_code='US' and p.locale='en-US'
    and p.canonical_url='https://thefeya.com'||m.new_path;
  if target_count<>2 then
    raise exception 'phase12_owner_route_rename_target_count_invalid:%',target_count;
  end if;

  if exists(
    select 1
    from public.feya_commerce_seo_pages_v1 p
    join phase12_owner_route_rename_map m on p.url_path=m.old_path
    where p.market_code='US' and p.locale='en-US'
  ) then
    raise exception 'phase12_owner_route_rename_old_path_still_canonical';
  end if;

  select count(*) into active_history_count
  from public.feya_commerce_seo_page_url_history_v1 h
  join public.feya_commerce_seo_pages_v1 p using(seo_page_id)
  join phase12_owner_route_rename_map m on p.url_path=m.new_path
  where h.valid_to is null and h.url_path=m.new_path;
  if active_history_count<>2 then
    raise exception 'phase12_owner_route_rename_active_history_invalid:%',active_history_count;
  end if;

  with latest as (
    select distinct on (v.seo_page_id) v.seo_page_id,v.content_json
    from public.feya_search_page_versions_v1 v
    order by v.seo_page_id,v.version_number desc
  )
  select count(*) into stale_latest_count
  from latest
  where content_json::text like '%/collections/burning-man-looks%'
     or content_json::text like '%/collections/stage-outfits%';
  if stale_latest_count<>0 then
    raise exception 'phase12_owner_route_rename_stale_latest_content:%',stale_latest_count;
  end if;

  with latest as (
    select distinct on (v.seo_page_id)
      v.seo_page_id,v.version_number,v.evidence_refs_json
    from public.feya_search_page_versions_v1 v
    order by v.seo_page_id,v.version_number desc
  )
  select count(*) into rename_version_count
  from latest
  where evidence_refs_json @> '[{"type":"owner_approved_preindex_route_rename"}]'::jsonb;
  if rename_version_count<>10 then
    raise exception 'phase12_owner_route_rename_version_count_invalid:%',rename_version_count;
  end if;
end $$;

commit;
