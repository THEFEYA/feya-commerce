-- Phase13 P1: additive Home/Shop card candidate, no public source switch.
-- SQL SELECT copied from the CURRENT production approved view definition.
-- ONLY change inside SELECT: its expensive v4 live existence/slug proof is
-- replaced by the already-approved identity-checked and service-only fast view.
-- All fields, approved source bindings, facet and membership logic remain
-- verbatim. In particular pinned card_title and card_display_price_amount
-- remain the existing Home/Shop values, not current legacy collection values.

create view public.feya_storefront_product_cards_fast_v2
with (security_invoker=true) as
WITH membership_labeled AS (
         SELECT mi.canonical_product_id,
                CASE p.url_path
                    WHEN '/collections/shoulder-armor'::text THEN 'SHOULDER_ARMOR'::text
                    WHEN '/collections/festival-outfits'::text THEN 'FESTIVAL_OUTFITS'::text
                    WHEN '/collections/rave-outfits'::text THEN 'RAVE_OUTFITS'::text
                    WHEN '/collections/burning-man-looks'::text THEN 'BURNING_MAN_OUTFITS'::text
                    WHEN '/collections/stage-outfits'::text THEN 'PERFORMANCE_COSTUMES'::text
                    WHEN '/collections/bodysuits'::text THEN 'COSTUME_BODYSUITS'::text
                    WHEN '/collections/costume-masks'::text THEN 'COSTUME_MASKS'::text
                    WHEN '/collections/costume-headpieces'::text THEN 'COSTUME_HEADPIECES'::text
                    WHEN '/collections/festival-skirts'::text THEN 'FESTIVAL_SKIRTS'::text
                    WHEN '/collections/costume-belts'::text THEN 'COSTUME_BELTS'::text
                    ELSE NULL::text
                END AS membership_code
           FROM feya_search_membership_items_v1 mi
             JOIN feya_search_membership_snapshots_v1 ms ON ms.membership_snapshot_id = mi.membership_snapshot_id
             JOIN feya_commerce_seo_pages_v1 p ON p.seo_page_id = ms.seo_page_id
          WHERE ms.source_revision = 'feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926'::text AND mi.eligibility_status = 'eligible'::text AND mi.orderability_status = 'confirmed'::text
        ), membership_codes AS (
         SELECT membership_labeled.canonical_product_id,
            array_agg(DISTINCT membership_labeled.membership_code ORDER BY membership_labeled.membership_code) FILTER (WHERE membership_labeled.membership_code IS NOT NULL) AS membership_codes
           FROM membership_labeled
          GROUP BY membership_labeled.canonical_product_id
        ), facet_meta AS (
         SELECT feya_storefront_facet_snapshots_v1.facet_snapshot_id,
            feya_storefront_facet_snapshots_v1.facet_contract_version,
            feya_storefront_facet_snapshots_v1.snapshot_hash
           FROM feya_storefront_facet_snapshots_v1
          WHERE feya_storefront_facet_snapshots_v1.snapshot_code = 'feya-n7-20260928-v3'::text AND feya_storefront_facet_snapshots_v1.snapshot_status = 'PREVIEW'::text AND feya_storefront_facet_snapshots_v1.product_count = 207
        )
 SELECT s.canonical_product_id,
    s.seo_page_id,
    s.draft_id AS source_draft_id,
    s.content_sha256 AS approved_content_sha256,
    s.source_release_ref,
    s.product_slug,
    s.card_title,
    s.h1,
    s.seo_title,
    s.meta_description,
    s.product_type,
    s.material,
    s.color,
    s.currency,
    s.primary_image_url,
    s.primary_image_alt,
    s.secondary_image_url,
    s.hover_image_url,
    s.video_url,
    s.has_video,
    s.media_count,
    s.min_price,
    s.max_price,
    s.card_display_price_amount,
    s.category_label,
    s.world_label,
    s.canonical_color_label,
    s.color_options,
    fi.parent_components_json,
    fi.child_components_json,
    fi.component_groups_json,
    fi.component_values_json,
    fi.sellable_component_values_json,
    fi.event_values_json,
    fi.style_values_json,
    fi.persona_values_json,
    fi.audience_values_json,
    fi.material_values_json,
    COALESCE(mc.membership_codes, ARRAY[]::text[]) AS membership_codes,
    fm.facet_contract_version,
    fm.snapshot_hash AS facet_snapshot_hash
   FROM feya_storefront_product_card_snapshots_v1 s
     JOIN feya_storefront_approved_product_bindings_v1 b ON b.canonical_product_id = s.canonical_product_id AND b.seo_page_id = s.seo_page_id AND b.draft_id = s.draft_id AND b.content_sha256 = s.content_sha256 AND b.product_slug_snapshot = s.product_slug
     JOIN feya_commerce_seo_pack_drafts_v1 d ON d.id = s.draft_id AND d.canonical_product_id = s.canonical_product_id AND d.status = 'approved_draft'::text AND d.review_status = 'approved'::text AND d.archived_at IS NULL AND d.updated_at = b.draft_updated_at_snapshot
     JOIN feya_commerce_seo_pages_v1 sp ON sp.seo_page_id = s.seo_page_id AND sp.canonical_product_id = s.canonical_product_id AND sp.page_type = 'product'::text AND sp.portfolio_status = 'active'::text AND (sp.lifecycle_state <> ALL (ARRAY['retired'::text, 'archived'::text, 'deleted'::text])) AND sp.url_path = b.url_path_snapshot
     JOIN feya_commerce_product_drafts pd ON pd.canonical_product_id = s.canonical_product_id AND COALESCE(pd.do_not_publish_flag, false) = false
     JOIN feya_storefront_collection_cards_fast_v1 live ON live.canonical_product_id = s.canonical_product_id AND live.product_slug = s.product_slug
     CROSS JOIN facet_meta fm
     JOIN feya_storefront_facet_items_v1 fi ON fi.facet_snapshot_id = fm.facet_snapshot_id AND fi.canonical_product_id = s.canonical_product_id
     LEFT JOIN membership_codes mc ON mc.canonical_product_id = s.canonical_product_id;

comment on view public.feya_storefront_product_cards_fast_v2 is
 'Phase13 service-only exact pinned 207 product card candidate. Same projected titles, prices, media, facets and memberships as approved v1. NOT live until separately validated.';

revoke all on public.feya_storefront_product_cards_fast_v2 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_cards_fast_v2 to service_role;

do $feya_phase13_card$
declare n integer; unique_n integer; invalid_n integer;
begin
  select count(*),count(distinct canonical_product_id),
    count(*) filter (where card_title is null or primary_image_url is null or
      card_display_price_amount is null or facet_contract_version is null or
      approved_content_sha256 !~ '^[0-9a-f]{64}$')
  into n,unique_n,invalid_n
  from public.feya_storefront_product_cards_fast_v2;
  if n <> 207 or unique_n <> 207 or invalid_n <> 0 then
    raise exception 'FEYA_PHASE13_CARD_V2_PARITY_COUNT_FAILED:%/%/%',n,unique_n,invalid_n;
  end if;
end
$feya_phase13_card$;
