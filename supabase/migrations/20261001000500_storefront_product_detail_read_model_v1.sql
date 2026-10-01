-- TheFEYA exact approved product-detail read model v1.
-- Additive only. No PDP runtime reader is switched by this migration.

create or replace view public.feya_storefront_product_details_v1
with (security_invoker=true) as
select
  b.canonical_product_id,
  b.seo_page_id,
  b.draft_id as source_draft_id,
  b.content_sha256 as approved_content_sha256,
  b.source_release_ref,
  b.url_path_snapshot,
  b.product_slug_snapshot as product_slug,
  (
    to_jsonb(live)
    || jsonb_build_object(
      'primary_image_url', coalesce(media.primary_image_url, live.primary_image_url),
      'primary_image_alt', coalesce(media.primary_image_alt, live.primary_image_alt),
      'secondary_image_url', coalesce(media.secondary_image_url, live.secondary_image_url),
      'hover_image_url', coalesce(media.hover_image_url, live.hover_image_url),
      'video_url', coalesce(media.video_url, live.video_url),
      'has_video', coalesce(media.has_video, live.has_video),
      'media_count', coalesce(media.media_count, live.media_count),
      'media_gallery', coalesce(media.media_gallery, live.media_gallery)
    )
  ) as product_json
from public.feya_storefront_approved_product_bindings_v1 b
join public.feya_commerce_seo_pack_drafts_v1 d
  on d.id=b.draft_id
 and d.canonical_product_id=b.canonical_product_id
 and d.status='approved_draft'
 and d.review_status='approved'
 and d.archived_at is null
 and d.updated_at=b.draft_updated_at_snapshot
join public.feya_commerce_seo_pages_v1 sp
  on sp.seo_page_id=b.seo_page_id
 and sp.canonical_product_id=b.canonical_product_id
 and sp.page_type='product'
 and sp.portfolio_status='active'
 and sp.lifecycle_state not in ('retired','archived','deleted')
 and sp.url_path=b.url_path_snapshot
join public.feya_commerce_product_drafts pd
  on pd.canonical_product_id=b.canonical_product_id
 and coalesce(pd.do_not_publish_flag,false)=false
join public.feya_commerce_v_step7_storefront_products_api_v4 live
  on live.canonical_product_id=b.canonical_product_id
 and live.product_slug=b.product_slug_snapshot
left join public.feya_commerce_v_step7_product_media_gallery_fast_v1 media
  on media.product_slug=b.product_slug_snapshot
where b.source_release_ref='feya-review-207-20260924';

comment on view public.feya_storefront_product_details_v1 is
  'Server-only exact-corpus PDP read model for the 207 owner-approved products. Includes merged public media/configuration payload, no admin history.';

revoke all on public.feya_storefront_product_details_v1 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_details_v1 to service_role;

do $$
declare
  v_count integer;
  v_distinct integer;
  v_missing_gallery integer;
  v_missing_configs integer;
begin
  select
    count(*),
    count(distinct canonical_product_id),
    count(*) filter (
      where coalesce(jsonb_array_length(coalesce(product_json->'media_gallery','[]'::jsonb)),0)=0
    ),
    count(*) filter (
      where coalesce(jsonb_array_length(coalesce(product_json->'configurations','[]'::jsonb)),0)=0
    )
  into v_count,v_distinct,v_missing_gallery,v_missing_configs
  from public.feya_storefront_product_details_v1;

  if v_count<>207 or v_distinct<>207 then
    raise exception 'FEYA_DETAIL_READ_MODEL_COUNT_MISMATCH:%/%',v_count,v_distinct;
  end if;
  if v_missing_gallery<>0 then
    raise exception 'FEYA_DETAIL_READ_MODEL_MISSING_GALLERY:%',v_missing_gallery;
  end if;
  if v_missing_configs<>0 then
    raise exception 'FEYA_DETAIL_READ_MODEL_MISSING_CONFIGURATIONS:%',v_missing_configs;
  end if;
end $$;
