-- Phase E reconciliation: immutable landing-page related_links must exist in the Phase E navigation graph.
-- Idempotent. It does not create new editorial decisions; it materializes links already frozen in page versions.
with pages as (
  select p.seo_page_id,p.url_path
  from public.feya_commerce_seo_pages_v1 p
  where p.market_code='US'
    and p.locale='en-US'
    and p.url_path in (
      '/collections/bodysuits',
      '/collections/burning-man-looks',
      '/collections/costume-belts',
      '/collections/costume-headpieces',
      '/collections/costume-masks',
      '/collections/festival-outfits',
      '/collections/festival-skirts',
      '/collections/rave-outfits',
      '/collections/shoulder-armor',
      '/collections/stage-outfits'
    )
),
latest as (
  select distinct on (v.seo_page_id)
    v.seo_page_id,v.page_version_id,v.content_hash,v.content_json
  from public.feya_search_page_versions_v1 v
  join pages p on p.seo_page_id=v.seo_page_id
  order by v.seo_page_id,v.version_number desc
),
requested as (
  select
    p.seo_page_id from_page_id,
    p.url_path from_path,
    l.page_version_id,
    l.content_hash,
    x.href to_path,
    x.anchor
  from pages p
  join latest l using(seo_page_id)
  cross join lateral jsonb_to_recordset(coalesce(l.content_json->'related_links','[]'::jsonb))
    as x(href text,anchor text)
),
resolved as (
  select r.*,tp.seo_page_id to_page_id
  from requested r
  join public.feya_commerce_seo_pages_v1 tp
    on tp.market_code='US'
   and tp.locale='en-US'
   and tp.url_path=r.to_path
)
insert into public.feya_search_link_edges_v1(
  from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  from_page_id,
  to_page_id,
  'navigation',
  'deterministic',
  'proposed',
  jsonb_build_array(jsonb_build_object(
    'phase','E',
    'reconciliation','immutable_page_version_related_links',
    'page_version_id',page_version_id,
    'content_hash',content_hash,
    'from_path',from_path,
    'to_path',to_path,
    'anchor',anchor,
    'placement','related_collection_module',
    'index_authorized',false
  )),
  'phase-e-20260926'
from resolved
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

do $$
declare missing_count int;
begin
  with pages as (
    select p.seo_page_id,p.url_path
    from public.feya_commerce_seo_pages_v1 p
    where p.market_code='US'
      and p.locale='en-US'
      and p.url_path in (
        '/collections/bodysuits',
        '/collections/burning-man-looks',
        '/collections/costume-belts',
        '/collections/costume-headpieces',
        '/collections/costume-masks',
        '/collections/festival-outfits',
        '/collections/festival-skirts',
        '/collections/rave-outfits',
        '/collections/shoulder-armor',
        '/collections/stage-outfits'
      )
  ),
  latest as (
    select distinct on (v.seo_page_id)
      v.seo_page_id,v.content_json
    from public.feya_search_page_versions_v1 v
    join pages p on p.seo_page_id=v.seo_page_id
    order by v.seo_page_id,v.version_number desc
  ),
  requested as (
    select p.seo_page_id from_page_id,x.href to_path
    from pages p
    join latest l using(seo_page_id)
    cross join lateral jsonb_to_recordset(coalesce(l.content_json->'related_links','[]'::jsonb))
      as x(href text,anchor text)
  ),
  resolved as (
    select r.from_page_id,tp.seo_page_id to_page_id
    from requested r
    join public.feya_commerce_seo_pages_v1 tp
      on tp.market_code='US' and tp.locale='en-US' and tp.url_path=r.to_path
  )
  select count(*) into missing_count
  from resolved r
  left join public.feya_search_link_edges_v1 e
    on e.from_page_id=r.from_page_id
   and e.to_page_id=r.to_page_id
   and e.link_kind='navigation'
   and e.source_version='phase-e-20260926'
   and e.status='proposed'
  where e.link_edge_id is null;

  if missing_count<>0 then
    raise exception 'phase_e_related_link_graph_reconciliation_incomplete:%',missing_count;
  end if;
end $$;
