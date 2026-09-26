-- Phase E: proposed contextual collection links from approved briefs.
-- No live navigation is changed by this migration.
begin;

with edges(from_path,to_path) as (
  values
    ('/collections/festival-outfits','/collections/shoulder-armor'),
    ('/collections/festival-outfits','/collections/bodysuits'),
    ('/collections/festival-outfits','/collections/costume-masks'),
    ('/collections/festival-outfits','/collections/costume-headpieces'),
    ('/collections/festival-outfits','/collections/costume-belts'),
    ('/collections/rave-outfits','/collections/bodysuits'),
    ('/collections/rave-outfits','/collections/shoulder-armor'),
    ('/collections/rave-outfits','/collections/festival-skirts'),
    ('/collections/rave-outfits','/collections/costume-belts'),
    ('/collections/burning-man-looks','/collections/shoulder-armor'),
    ('/collections/burning-man-looks','/collections/costume-headpieces'),
    ('/collections/burning-man-looks','/collections/costume-masks'),
    ('/collections/burning-man-looks','/collections/festival-skirts'),
    ('/collections/burning-man-looks','/collections/costume-belts'),
    ('/collections/stage-outfits','/collections/shoulder-armor'),
    ('/collections/stage-outfits','/collections/bodysuits'),
    ('/collections/stage-outfits','/collections/costume-headpieces'),
    ('/collections/stage-outfits','/collections/costume-masks'),
    ('/collections/stage-outfits','/collections/costume-belts'),
    ('/collections/shoulder-armor','/collections/stage-outfits'),
    ('/collections/shoulder-armor','/collections/festival-outfits'),
    ('/collections/shoulder-armor','/collections/burning-man-looks'),
    ('/collections/bodysuits','/collections/stage-outfits'),
    ('/collections/bodysuits','/collections/rave-outfits'),
    ('/collections/bodysuits','/collections/festival-outfits'),
    ('/collections/costume-masks','/collections/costume-headpieces'),
    ('/collections/costume-masks','/collections/festival-outfits'),
    ('/collections/costume-masks','/collections/burning-man-looks'),
    ('/collections/costume-headpieces','/collections/costume-masks'),
    ('/collections/costume-headpieces','/collections/stage-outfits'),
    ('/collections/costume-headpieces','/collections/festival-outfits'),
    ('/collections/festival-skirts','/collections/festival-outfits'),
    ('/collections/festival-skirts','/collections/rave-outfits'),
    ('/collections/festival-skirts','/collections/burning-man-looks'),
    ('/collections/costume-belts','/collections/festival-outfits'),
    ('/collections/costume-belts','/collections/rave-outfits'),
    ('/collections/costume-belts','/collections/stage-outfits')
)
insert into public.feya_search_link_edges_v1(
  link_edge_id,from_page_id,to_page_id,link_kind,generation_mode,status,evidence_refs_json,source_version
)
select
  extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:contextual-collection-link:phase-e-20260926:'||e.from_path||'>'||e.to_path
  ),
  fp.seo_page_id,tp.seo_page_id,'navigation','deterministic','proposed',
  jsonb_build_array(jsonb_build_object(
    'placement','related_collection_module',
    'brief_ref','docs/search/phase-e-search-landing-content-briefs-20260926.json',
    'index_authorized',false
  )),
  'phase-e-20260926'
from edges e
join public.feya_commerce_seo_pages_v1 fp on fp.market_code='US' and fp.locale='en-US' and fp.url_path=e.from_path
join public.feya_commerce_seo_pages_v1 tp on tp.market_code='US' and tp.locale='en-US' and tp.url_path=e.to_path
on conflict (from_page_id,to_page_id,link_kind,source_version) do nothing;

commit;
