-- Phase13 P1: additive latency-safe pinned card candidate V3, no reader cutover.
-- The sole performance difference from existing fast_v2 is its LIVE presence/slug
-- guard: replace the expensive full legacy collection card projection with
-- an exact business-eligibility key check using indexed EXISTS predicates.
-- Maintains all 207 approved field values, exact source hashes, membership,
-- facet snapshot, SEO page ownership, media, fixed display price, and RLS.
-- Rollout: migration -> verify parity/ACL/performance -> separate Git reader PR.
create view public.feya_storefront_product_cards_fast_v3
with (security_invoker=true) as
WITH live_identity AS (
         -- Exact legacy storefront_candidate_flag and current slug, without
         -- v2's unnecessary JSON configuration/media × price aggregation.
         -- Pinned approval / source SHA / facets / search-owner gates below
         -- remain BYTE-FOR-BYTE unchanged from the approved fast_v2 view.
         SELECT DISTINCT p.canonical_product_id,
             feya_commerce_slugify(
               COALESCE(NULLIF(BTRIM(cd.card_title),''),
                        NULLIF(BTRIM(p.card_title),''),
                        NULLIF(BTRIM(p.draft_site_title),''),
                        'Untitled Product')
               || '-' ||
               COALESCE(p.matched_etsy_listing_id,p.canonical_product_id::text)
             ) AS product_slug
           FROM public.feya_commerce_product_drafts p
           LEFT JOIN public.feya_commerce_content_drafts cd
             ON cd.canonical_product_id=p.canonical_product_id
            AND cd.content_language='en'
          WHERE p.readiness_status='ready_candidate'
            AND p.publish_status='draft'
            AND p.do_not_publish_flag=false
            AND EXISTS (
              SELECT 1 FROM public.feya_commerce_media_drafts md
               WHERE md.canonical_product_id=p.canonical_product_id
                 AND md.assigned_role='product_card_primary'
                 AND md.use_publicly_flag=true
                 AND md.source_image_url IS NOT NULL)
            AND EXISTS (
              SELECT 1 FROM public.feya_commerce_sellable_configurations sc
               WHERE sc.canonical_product_id=p.canonical_product_id
                 AND sc.is_public_candidate=true AND sc.is_sampler=false)
            AND EXISTS (
              SELECT 1 FROM public.feya_commerce_configuration_prices cp
               WHERE cp.canonical_product_id=p.canonical_product_id
                 AND cp.public_price_amount IS NOT NULL
                 AND cp.sampler_excluded_flag=false)
            AND NOT EXISTS (
              SELECT 1 FROM public.feya_commerce_configuration_prices cp
               WHERE cp.canonical_product_id=p.canonical_product_id
                 AND cp.price_status='missing_price')
        ), membership_labeled AS (
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
     JOIN live_identity live ON live.canonical_product_id = s.canonical_product_id AND live.product_slug = s.product_slug
     CROSS JOIN facet_meta fm
     JOIN feya_storefront_facet_items_v1 fi ON fi.facet_snapshot_id = fm.facet_snapshot_id AND fi.canonical_product_id = s.canonical_product_id
     LEFT JOIN membership_codes mc ON mc.canonical_product_id = s.canonical_product_id;

comment on view public.feya_storefront_product_cards_fast_v3 is
 'Phase13 service-role-only pinned 207 V3, exact legacy candidate/slug via indexed EXISTS, all output fields and approvals identical to V2; no reader cutover yet.';

revoke all on public.feya_storefront_product_cards_fast_v3 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_cards_fast_v3 to service_role;

do $feya_phase13_card$
declare n integer; unique_n integer; invalid_n integer;
begin
  select count(*),count(distinct canonical_product_id),
    count(*) filter (where card_title is null or primary_image_url is null or
      card_display_price_amount is null or facet_contract_version is null or
      approved_content_sha256 !~ '^[0-9a-f]{64}$')
  into n,unique_n,invalid_n
  from public.feya_storefront_product_cards_fast_v3;
  if n <> 207 or unique_n <> 207 or invalid_n <> 0 then
    raise exception 'FEYA_PHASE13_CARD_V3_PARITY_COUNT_FAILED:%/%/%',n,unique_n,invalid_n;
  end if;
end
$feya_phase13_card$;
-- A false-positive row, source SHA drift, changed slug, wrong approved price,
-- missing membership, facet, media, content, or privilege must fail atomically.
do $feya_phase13_card_v3_parity$
declare v3_only integer; v2_only integer;
begin
  select count(*) into v3_only from (
    select to_jsonb(v3) as payload from public.feya_storefront_product_cards_fast_v3 v3
    except
    select to_jsonb(v2) from public.feya_storefront_product_cards_fast_v2 v2
  ) diff;
  select count(*) into v2_only from (
    select to_jsonb(v2) as payload from public.feya_storefront_product_cards_fast_v2 v2
    except
    select to_jsonb(v3) from public.feya_storefront_product_cards_fast_v3 v3
  ) diff;
  if v3_only <> 0 or v2_only <> 0 then
    raise exception 'FEYA_PHASE13_CARD_V3_FIELD_PARITY_FAILED:%/%',v3_only,v2_only;
  end if;
  if has_table_privilege('anon','public.feya_storefront_product_cards_fast_v3','select')
    or has_table_privilege('authenticated','public.feya_storefront_product_cards_fast_v3','select')
    or not has_table_privilege('service_role','public.feya_storefront_product_cards_fast_v3','select')
  then
    raise exception 'FEYA_PHASE13_CARD_V3_ACL_FAILED';
  end if;
end
$feya_phase13_card_v3_parity$;
