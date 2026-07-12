-- FEYA Commerce / proposed Product Truth v1 / SQL revision v3
-- OPERATIONAL REVIEW AND ALIGNMENT FIXES INCLUDED.
-- DO NOT EXECUTE UNTIL THE USER SENDS A SEPARATE APPLY COMMAND.
-- No CREATE/GRANT/REVOKE statement in this file has been executed.

CREATE VIEW public.feya_commerce_v_seo_product_truth_v1
WITH (security_invoker = true)
AS
WITH
product_focus AS (
    SELECT
        pf.canonical_product_id::uuid AS canonical_product_id,
        pf.matched_etsy_listing_id,
        pf.product_slug,
        pf.card_title,
        pf.h1,
        pf.seo_title,
        pf.meta_description,
        pf.product_type,
        pf.material,
        pf.color,
        pf.canonical_color_label,
        pf.category_label,
        pf.source_category_label,
        pf.operator_section_label,
        pf.world_label,
        pf.primary_image_url,
        pf.primary_image_alt,
        COALESCE(pf.parent_components_json, '[]'::jsonb) AS parent_components_json,
        COALESCE(pf.child_components_json, '[]'::jsonb) AS child_components_json,
        COALESCE(pf.component_groups_json, '[]'::jsonb) AS component_groups_json,
        COALESCE(pf.needs_component_review_count, 0) AS needs_component_review_count,
        COALESCE(pf.has_component_review_risk, false) AS has_component_review_risk,
        pf.focus_text
    FROM public.feya_commerce_v_listing_master_product_focus_v1 pf
),
review_status_contract AS (
    SELECT
        -- Operational approval contract. Existing rows are currently only
        -- not_reviewed/needs_review, so this does not auto-approve any data.
        ARRAY['approved']::text[] AS resolved_review_statuses,
        COALESCE((
            SELECT array_agg(s.review_status ORDER BY s.review_status)
            FROM (
                SELECT DISTINCT review_status
                FROM public.feya_commerce_option_mappings
                WHERE review_status IS NOT NULL
            ) s
        ), ARRAY[]::text[]) AS observed_option_mapping_statuses,
        COALESCE((
            SELECT array_agg(s.review_status ORDER BY s.review_status)
            FROM (
                SELECT DISTINCT review_status
                FROM public.feya_commerce_sellable_configurations
                WHERE review_status IS NOT NULL
            ) s
        ), ARRAY[]::text[]) AS observed_configuration_statuses,
        COALESCE((
            SELECT array_agg(s.review_status ORDER BY s.review_status)
            FROM (
                SELECT DISTINCT review_status
                FROM public.feya_commerce_configuration_prices
                WHERE review_status IS NOT NULL
            ) s
        ), ARRAY[]::text[]) AS observed_configuration_price_statuses,
        COALESCE((
            SELECT array_agg(s.review_status ORDER BY s.review_status)
            FROM (
                SELECT DISTINCT review_status
                FROM public.feya_commerce_source_price_rows
                WHERE review_status IS NOT NULL
            ) s
        ), ARRAY[]::text[]) AS observed_source_price_statuses,
        true AS has_formally_confirmed_resolved_status
),
builder_source AS (
    SELECT
        b.canonical_product_id,
        (array_agg(b.primary_source_listing_id ORDER BY b.primary_source_listing_id)
            FILTER (WHERE b.primary_source_listing_id IS NOT NULL))[1] AS primary_source_listing_id
    FROM public.feya_commerce_v_step6_product_builder_detail b
    GROUP BY b.canonical_product_id
),
source_listing AS (
    SELECT
        pf.canonical_product_id,
        sl.source_listing_id,
        sl.import_batch_id,
        sl.shop_code,
        sl.source_row_number,
        sl.etsy_listing_id,
        sl.raw_title,
        sl.raw_description,
        sl.raw_variation_1_name,
        sl.raw_variation_1_values,
        sl.raw_variation_2_name,
        sl.raw_variation_2_values,
        sl.created_at,
        sl.updated_at
    FROM product_focus pf
    LEFT JOIN builder_source bs
        ON bs.canonical_product_id = pf.canonical_product_id
    LEFT JOIN public.feya_commerce_source_listings sl
        ON sl.source_listing_id = bs.primary_source_listing_id
),
description_prepared AS (
    SELECT
        sl.*,
        replace(replace(sl.raw_description, E'\r\n', E'\n'), E'\r', E'\n') AS normalized_description
    FROM source_listing sl
),
source_description AS (
    SELECT
        d.canonical_product_id,
        CASE
            WHEN marker.marker_position IS NULL THEN NULL::text
            ELSE NULLIF(
                btrim(
                    split_part(
                        substring(d.normalized_description FROM marker.marker_position),
                        E'\n\n',
                        1
                    )
                ),
                ''
            )
        END AS source_description_fragment
    FROM description_prepared d
    LEFT JOIN LATERAL (
        SELECT min(NULLIF(position(v.marker IN lower(d.normalized_description)), 0)) AS marker_position
        FROM (VALUES
            ('kit includes'),
            ('what''s included'),
            ('what’s included'),
            ('choose your set'),
            ('состав комплекта')
        ) AS v(marker)
    ) marker ON true
),
source_variation_rows AS (
    SELECT
        sl.canonical_product_id,
        sl.source_listing_id,
        sl.etsy_listing_id,
        v.variation_ordinal,
        v.raw_variation_name,
        v.raw_variation_values
    FROM source_listing sl
    CROSS JOIN LATERAL (VALUES
        (1, sl.raw_variation_1_name, sl.raw_variation_1_values),
        (2, sl.raw_variation_2_name, sl.raw_variation_2_values)
    ) AS v(variation_ordinal, raw_variation_name, raw_variation_values)
    WHERE NULLIF(btrim(v.raw_variation_name), '') IS NOT NULL
       OR NULLIF(btrim(v.raw_variation_values), '') IS NOT NULL
),
source_variation_agg AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(
            x.variation_json
            ORDER BY x.variation_ordinal, x.variation_json::text
        ) AS source_variations_json
    FROM (
        SELECT DISTINCT
            svr.canonical_product_id,
            svr.variation_ordinal,
            jsonb_build_object(
                'source_listing_id', svr.source_listing_id,
                'etsy_listing_id', svr.etsy_listing_id,
                'variation_ordinal', svr.variation_ordinal,
                'raw_variation_name', svr.raw_variation_name,
                'raw_variation_values', svr.raw_variation_values,
                'raw_language', NULL,
                'stored_public_or_translated_value', NULL,
                'values', to_jsonb(regexp_split_to_array(COALESCE(svr.raw_variation_values, ''), '\s*,\s*')),
                'mapping_status', 'raw_source_evidence',
                'component_mapping_evidence', '[]'::jsonb
            ) AS variation_json
        FROM source_variation_rows svr
    ) x
    GROUP BY x.canonical_product_id
),
source_variation_summary AS (
    SELECT
        svr.canonical_product_id,
        count(*)::integer AS source_variation_axis_count,
        count(*) FILTER (
            WHERE NULLIF(btrim(svr.raw_variation_values), '') IS NOT NULL
        )::integer AS source_variation_axis_with_values_count,
        bool_and(
            NULLIF(btrim(svr.raw_variation_name), '') IS NOT NULL
            AND NULLIF(btrim(svr.raw_variation_values), '') IS NOT NULL
        ) AS has_deterministic_raw_axis_order
    FROM source_variation_rows svr
    GROUP BY svr.canonical_product_id
),
mapping_detail AS (
    SELECT
        m.canonical_product_id,
        m.option_mapping_id,
        m.raw_option_value,
        m.raw_phrase_norm,
        m.parent_component,
        m.child_component,
        m.modifier,
        m.component_group,
        m.is_component,
        m.is_bundle_option,
        m.is_composite,
        m.confidence_score,
        m.needs_review,
        m.review_reason,
        m.active_flag,
        m.source_note,
        CASE
            WHEN m.active_flag IS TRUE
             AND m.is_component IS TRUE
             AND COALESCE(m.needs_review, true) IS FALSE
             AND NULLIF(btrim(m.parent_component), '') IS NOT NULL
                THEN 'approved_component'
            WHEN m.active_flag IS TRUE
             AND m.is_component IS FALSE
             AND COALESCE(m.needs_review, true) IS FALSE
                THEN 'approved_non_component'
            WHEN m.review_reason = 'unmapped_raw_phrase'
              OR COALESCE(m.active_flag, false) IS FALSE
                THEN 'unmapped_raw_phrase'
            ELSE 'mapping_requires_review'
        END AS mapping_status
    FROM public.feya_commerce_v_seo_product_component_mapping_v1 m
    JOIN product_focus pf
        ON pf.canonical_product_id = m.canonical_product_id
),
mapping_by_option AS (
    SELECT
        md.canonical_product_id,
        md.option_mapping_id,
        jsonb_agg(
            jsonb_build_object(
                'raw_option_value', md.raw_option_value,
                'raw_phrase_norm', md.raw_phrase_norm,
                'parent_component', md.parent_component,
                'child_component', md.child_component,
                'modifier', md.modifier,
                'component_group', md.component_group,
                'is_component', md.is_component,
                'is_bundle_option', md.is_bundle_option,
                'is_composite', md.is_composite,
                'confidence_score', md.confidence_score,
                'needs_review', md.needs_review,
                'review_reason', md.review_reason,
                'active_flag', md.active_flag,
                'source_note', md.source_note,
                'mapping_status', md.mapping_status
            )
            ORDER BY md.raw_phrase_norm, md.parent_component, md.child_component, md.modifier
        ) AS mapping_rows_json,
        COALESCE(
            jsonb_agg(DISTINCT md.parent_component ORDER BY md.parent_component)
                FILTER (WHERE md.mapping_status = 'approved_component'),
            '[]'::jsonb
        ) AS approved_component_families_json,
        COALESCE(
            jsonb_agg(DISTINCT md.modifier ORDER BY md.modifier)
                FILTER (WHERE md.modifier IS NOT NULL),
            '[]'::jsonb
        ) AS modifiers_json,
        bool_or(md.mapping_status = 'approved_component') AS has_approved_component,
        bool_or(md.mapping_status = 'approved_non_component') AS has_approved_non_component,
        bool_or(md.mapping_status = 'unmapped_raw_phrase') AS has_unmapped_raw_phrase,
        bool_or(md.mapping_status = 'mapping_requires_review') AS has_mapping_requires_review,
        bool_or(COALESCE(md.is_bundle_option, false)) AS is_bundle_option,
        CASE
            WHEN bool_or(md.mapping_status = 'unmapped_raw_phrase') THEN 'unmapped_raw_phrase'
            WHEN bool_or(md.mapping_status = 'mapping_requires_review') THEN 'mapping_requires_review'
            WHEN bool_or(md.mapping_status = 'approved_component') THEN 'approved_component'
            WHEN bool_or(md.mapping_status = 'approved_non_component') THEN 'approved_non_component'
            ELSE 'mapping_requires_review'
        END AS mapping_status
    FROM mapping_detail md
    GROUP BY md.canonical_product_id, md.option_mapping_id
),
semantic_component_candidates AS (
    SELECT DISTINCT
        md.canonical_product_id,
        md.option_mapping_id,
        md.parent_component AS component_family
    FROM mapping_detail md
    WHERE md.mapping_status = 'approved_component'
),
phrase_mapping_evidence AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(
            x.phrase_mapping_json
            ORDER BY x.raw_phrase_norm, x.option_mapping_id, x.phrase_mapping_json::text
        ) AS phrase_mappings_json
    FROM (
        SELECT DISTINCT
            md.canonical_product_id,
            md.option_mapping_id,
            md.raw_phrase_norm,
            jsonb_build_object(
                'option_mapping_id', md.option_mapping_id,
                'raw_option_value', md.raw_option_value,
                'raw_phrase_norm', md.raw_phrase_norm,
                'mapping_record_found', (pm.raw_phrase_norm IS NOT NULL),
                'phrase_map_raw_phrase', pm.raw_phrase,
                'parent_component', pm.parent_component,
                'child_component', pm.child_component,
                'modifier', pm.modifier,
                'component_group', pm.component_group,
                'is_component', pm.is_component,
                'is_bundle_option', pm.is_bundle_option,
                'is_composite', pm.is_composite,
                'confidence_score', pm.confidence_score,
                'needs_review', COALESCE(pm.needs_review, md.needs_review),
                'review_reason', COALESCE(pm.review_reason, md.review_reason),
                'active_flag', COALESCE(pm.active_flag, md.active_flag),
                'source_note', COALESCE(pm.source_note, md.source_note),
                'created_at', pm.created_at,
                'updated_at', pm.updated_at,
                'mapping_status', md.mapping_status
            ) AS phrase_mapping_json
        FROM mapping_detail md
        LEFT JOIN public.feya_commerce_seo_component_phrase_map_v1 pm
            ON pm.raw_phrase_norm = md.raw_phrase_norm
    ) x
    GROUP BY x.canonical_product_id
),
mapping_review_agg AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(
            x.review_json
            ORDER BY x.issue_type, x.raw_option_value, x.review_reason, x.review_json::text
        ) AS mapping_review_rows_json
    FROM (
        SELECT DISTINCT
            r.canonical_product_id,
            r.issue_type,
            r.raw_option_value,
            r.review_reason,
            jsonb_build_object(
                'issue_type', r.issue_type,
                'raw_option_value', r.raw_option_value,
                'raw_phrase_norm', r.raw_phrase_norm,
                'parent_component', r.parent_component,
                'child_component', r.child_component,
                'modifier', r.modifier,
                'component_group', r.component_group,
                'is_component', r.is_component,
                'is_bundle_option', r.is_bundle_option,
                'is_composite', r.is_composite,
                'confidence_score', r.confidence_score,
                'needs_review', r.needs_review,
                'review_reason', r.review_reason,
                'source_note', r.source_note
            ) AS review_json
        FROM public.feya_commerce_v_seo_component_mapping_review_v1 r
        JOIN product_focus pf
            ON pf.canonical_product_id = r.canonical_product_id
    ) x
    GROUP BY x.canonical_product_id
),
option_base AS (
    SELECT
        om.canonical_product_id,
        om.option_mapping_id,
        om.source_listing_id,
        om.source_price_row_id,
        om.raw_option_name,
        om.raw_option_value,
        om.raw_option_text,
        om.detected_canonical_axis,
        om.canonical_option_value,
        om.component_family_id AS option_component_family_id,
        ocf.canonical_name AS option_component_family_name,
        ocf.normalized_name AS option_component_family_normalized_name,
        om.confidence AS option_mapping_confidence,
        om.review_status AS option_mapping_review_status,
        om.sampler_flag,
        om.non_catalog_flag,
        om.mapping_source,
        om.created_at AS option_mapping_created_at,
        om.updated_at AS option_mapping_updated_at,
        spr.source_row_number AS source_price_row_number,
        spr.etsy_listing_id,
        spr.price_text,
        spr.parsed_price_amount,
        spr.currency,
        spr.row_kind,
        spr.price_source,
        spr.confidence AS source_price_confidence,
        spr.fallback_flag,
        spr.sampler_non_catalog_flag,
        spr.review_status AS source_price_review_status,
        COALESCE(
            om.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS option_mapping_review_resolved,
        NOT COALESCE(
            om.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS option_mapping_needs_review,
        COALESCE(
            spr.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS source_price_review_resolved,
        NOT COALESCE(
            spr.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS source_price_needs_review,
        row_number() OVER (
            PARTITION BY om.canonical_product_id
            ORDER BY spr.source_row_number NULLS LAST, om.raw_option_value, om.option_mapping_id
        ) AS option_evidence_ordinal
    FROM public.feya_commerce_option_mappings om
    JOIN product_focus pf
        ON pf.canonical_product_id = om.canonical_product_id
    CROSS JOIN review_status_contract rc
    LEFT JOIN public.feya_commerce_component_families ocf
        ON ocf.component_family_id = om.component_family_id
    LEFT JOIN public.feya_commerce_source_price_rows spr
        ON spr.source_price_row_id = om.source_price_row_id
),
option_configuration_links AS (
    SELECT
        ob.canonical_product_id,
        ob.option_mapping_id,
        cp.configuration_price_id,
        cp.sellable_configuration_id,
        cp.source_price_row_id,
        cp.source_amount,
        cp.source_currency,
        cp.public_price_amount,
        cp.manual_override_amount,
        cp.confidence AS configuration_price_confidence,
        cp.fallback_flag AS configuration_price_fallback_flag,
        cp.sampler_excluded_flag,
        cp.review_status AS configuration_price_review_status,
        cp.price_status,
        sc.option_mapping_id AS configuration_owner_option_mapping_id,
        sc.component_family_id AS configuration_component_family_id,
        ccf.canonical_name AS configuration_component_family_name,
        ccf.normalized_name AS configuration_component_family_normalized_name,
        sc.configuration_name,
        sc.normalized_key,
        sc.is_default_whole_product,
        sc.is_sampler,
        sc.is_public_candidate,
        sc.sort_order,
        sc.review_status AS configuration_review_status,
        COALESCE(
            sc.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS configuration_review_resolved,
        NOT COALESCE(
            sc.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS configuration_needs_review,
        COALESCE(
            cp.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS configuration_price_review_resolved,
        NOT COALESCE(
            cp.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS configuration_price_needs_review
    FROM option_base ob
    CROSS JOIN review_status_contract rc
    LEFT JOIN public.feya_commerce_configuration_prices cp
        ON cp.option_mapping_id = ob.option_mapping_id
    LEFT JOIN public.feya_commerce_sellable_configurations sc
        ON sc.sellable_configuration_id = cp.sellable_configuration_id
    LEFT JOIN public.feya_commerce_component_families ccf
        ON ccf.component_family_id = sc.component_family_id
),
option_configuration_price_agg AS (
    SELECT
        ocl.canonical_product_id,
        ocl.option_mapping_id,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'configuration_price_id', ocl.configuration_price_id,
                    'sellable_configuration_id', ocl.sellable_configuration_id,
                    'source_price_row_id', ocl.source_price_row_id,
                    'source_amount', ocl.source_amount,
                    'source_currency', ocl.source_currency,
                    'public_price_amount', ocl.public_price_amount,
                    'manual_override_amount', ocl.manual_override_amount,
                    'confidence', ocl.configuration_price_confidence,
                    'fallback_flag', ocl.configuration_price_fallback_flag,
                    'sampler_excluded_flag', ocl.sampler_excluded_flag,
                    'review_status', ocl.configuration_price_review_status,
                    'price_status', ocl.price_status
                )
                ORDER BY ocl.source_amount, ocl.configuration_price_id
            ) FILTER (WHERE ocl.configuration_price_id IS NOT NULL),
            '[]'::jsonb
        ) AS configuration_prices_json
    FROM option_configuration_links ocl
    GROUP BY ocl.canonical_product_id, ocl.option_mapping_id
),
option_configuration_distinct_rows AS (
    SELECT DISTINCT
        ocl.canonical_product_id,
        ocl.option_mapping_id,
        ocl.sellable_configuration_id,
        ocl.sort_order,
        ocl.configuration_name,
        jsonb_build_object(
            'sellable_configuration_id', ocl.sellable_configuration_id,
            'configuration_owner_option_mapping_id', ocl.configuration_owner_option_mapping_id,
            'configuration_name', ocl.configuration_name,
            'normalized_key', ocl.normalized_key,
            'component_family_id', ocl.configuration_component_family_id,
            'component_family_name', ocl.configuration_component_family_name,
            'component_family_normalized_name', ocl.configuration_component_family_normalized_name,
            'is_default_whole_product', ocl.is_default_whole_product,
            'is_sampler', ocl.is_sampler,
            'is_public_candidate', ocl.is_public_candidate,
            'sort_order', ocl.sort_order,
            'review_status', ocl.configuration_review_status,
            'review_resolved', ocl.configuration_review_resolved,
            'needs_review', ocl.configuration_needs_review
        ) AS configuration_json
    FROM option_configuration_links ocl
    WHERE ocl.sellable_configuration_id IS NOT NULL
),
option_configuration_object_agg AS (
    SELECT
        x.canonical_product_id,
        x.option_mapping_id,
        jsonb_agg(
            x.configuration_json
            ORDER BY x.sort_order NULLS LAST,
                     x.configuration_name,
                     x.sellable_configuration_id
        ) AS sellable_configurations_json
    FROM option_configuration_distinct_rows x
    GROUP BY x.canonical_product_id, x.option_mapping_id
),
option_configuration_flags AS (
    SELECT
        ocl.canonical_product_id,
        ocl.option_mapping_id,
        bool_or(ocl.configuration_price_id IS NOT NULL) AS has_configuration_price,
        bool_or(ocl.sellable_configuration_id IS NOT NULL) AS has_sellable_configuration,
        bool_or(COALESCE(ocl.is_default_whole_product, false)) AS is_full_set,
        bool_or(
            ocl.sellable_configuration_id IS NOT NULL
            AND ocl.configuration_owner_option_mapping_id IS DISTINCT FROM ocl.option_mapping_id
        ) AS has_configuration_owner_mismatch,
        bool_or(
            ocl.sellable_configuration_id IS NOT NULL
            AND ocl.configuration_component_family_id IS NULL
        ) AS has_configuration_component_family_null,
        COALESCE(
            bool_and(ocl.configuration_review_resolved)
                FILTER (WHERE ocl.sellable_configuration_id IS NOT NULL),
            false
        ) AS all_configuration_reviews_resolved,
        COALESCE(
            bool_and(ocl.configuration_price_review_resolved)
                FILTER (WHERE ocl.configuration_price_id IS NOT NULL),
            false
        ) AS all_configuration_price_reviews_resolved
    FROM option_configuration_links ocl
    GROUP BY ocl.canonical_product_id, ocl.option_mapping_id
),
option_configuration_agg AS (
    SELECT
        f.canonical_product_id,
        f.option_mapping_id,
        COALESCE(p.configuration_prices_json, '[]'::jsonb) AS configuration_prices_json,
        COALESCE(o.sellable_configurations_json, '[]'::jsonb) AS sellable_configurations_json,
        f.has_configuration_price,
        f.has_sellable_configuration,
        f.is_full_set,
        f.has_configuration_owner_mismatch,
        f.has_configuration_component_family_null,
        f.all_configuration_reviews_resolved,
        f.all_configuration_price_reviews_resolved
    FROM option_configuration_flags f
    LEFT JOIN option_configuration_price_agg p
        ON p.canonical_product_id = f.canonical_product_id
       AND p.option_mapping_id = f.option_mapping_id
    LEFT JOIN option_configuration_object_agg o
        ON o.canonical_product_id = f.canonical_product_id
       AND o.option_mapping_id = f.option_mapping_id
),
configuration_price_review_summary AS (
    SELECT
        cp.sellable_configuration_id,
        count(*)::integer AS configuration_price_count,
        bool_and(COALESCE(
            cp.review_status = ANY (rc.resolved_review_statuses),
            false
        )) AS all_price_reviews_resolved
    FROM public.feya_commerce_configuration_prices cp
    CROSS JOIN review_status_contract rc
    WHERE cp.sellable_configuration_id IS NOT NULL
    GROUP BY cp.sellable_configuration_id
),
eligible_configuration_rows AS (
    SELECT
        sc.canonical_product_id,
        sc.sellable_configuration_id,
        sc.option_mapping_id,
        sc.configuration_name,
        sc.sort_order,
        sc.review_status,
        COALESCE(
            sc.review_status = ANY (rc.resolved_review_statuses),
            false
        ) AS configuration_review_resolved,
        COALESCE(cprs.configuration_price_count, 0) AS configuration_price_count,
        COALESCE(cprs.all_price_reviews_resolved, false) AS all_price_reviews_resolved
    FROM public.feya_commerce_sellable_configurations sc
    JOIN product_focus pf
        ON pf.canonical_product_id = sc.canonical_product_id
    CROSS JOIN review_status_contract rc
    LEFT JOIN configuration_price_review_summary cprs
        ON cprs.sellable_configuration_id = sc.sellable_configuration_id
    WHERE sc.is_public_candidate IS TRUE
      AND sc.is_sampler IS FALSE
),
eligible_configuration_summary AS (
    SELECT
        ecr.canonical_product_id,
        count(*)::integer AS eligible_configuration_count,
        bool_and(ecr.configuration_review_resolved) AS all_configuration_reviews_resolved,
        bool_and(
            ecr.configuration_price_count > 0
            AND ecr.all_price_reviews_resolved
        ) AS all_configuration_price_reviews_resolved
    FROM eligible_configuration_rows ecr
    GROUP BY ecr.canonical_product_id
),
component_candidate_set AS (
    SELECT DISTINCT
        scc.canonical_product_id,
        scc.component_family
    FROM semantic_component_candidates scc
),
component_configuration_presence AS (
    SELECT DISTINCT
        scc.canonical_product_id,
        scc.component_family,
        ecr.sellable_configuration_id,
        ob.option_mapping_review_resolved,
        ecr.configuration_review_resolved,
        ecr.all_price_reviews_resolved,
        (
            ob.option_mapping_review_resolved
            AND ecr.configuration_review_resolved
            AND ecr.configuration_price_count > 0
            AND ecr.all_price_reviews_resolved
        ) AS presence_evidence_review_resolved
    FROM semantic_component_candidates scc
    JOIN option_base ob
        ON ob.option_mapping_id = scc.option_mapping_id
    JOIN eligible_configuration_rows ecr
        ON ecr.canonical_product_id = scc.canonical_product_id
       AND ecr.option_mapping_id = scc.option_mapping_id
),
component_configuration_coverage AS (
    SELECT
        ccs.canonical_product_id,
        ccs.component_family,
        COALESCE(ecs.eligible_configuration_count, 0) AS eligible_configuration_count,
        count(DISTINCT ccp.sellable_configuration_id)::integer AS present_in_configuration_count,
        COALESCE(
            bool_and(ccp.presence_evidence_review_resolved)
                FILTER (WHERE ccp.sellable_configuration_id IS NOT NULL),
            false
        ) AS all_presence_reviews_resolved,
        false AS has_fixed_base_evidence,
        (
            COALESCE(ecs.eligible_configuration_count, 0) > 0
            AND count(DISTINCT ccp.sellable_configuration_id) = ecs.eligible_configuration_count
            AND COALESCE(
                bool_and(ccp.presence_evidence_review_resolved)
                    FILTER (WHERE ccp.sellable_configuration_id IS NOT NULL),
                false
            )
            AND COALESCE(ecs.all_configuration_reviews_resolved, false)
            AND COALESCE(ecs.all_configuration_price_reviews_resolved, false)
        ) AS is_unconditional_component
    FROM component_candidate_set ccs
    LEFT JOIN eligible_configuration_summary ecs
        ON ecs.canonical_product_id = ccs.canonical_product_id
    LEFT JOIN component_configuration_presence ccp
        ON ccp.canonical_product_id = ccs.canonical_product_id
       AND ccp.component_family = ccs.component_family
    GROUP BY
        ccs.canonical_product_id,
        ccs.component_family,
        ecs.eligible_configuration_count,
        ecs.all_configuration_reviews_resolved,
        ecs.all_configuration_price_reviews_resolved
),
included_component_rows AS (
    SELECT
        ccc.canonical_product_id,
        ccc.component_family
    FROM component_configuration_coverage ccc
    WHERE ccc.is_unconditional_component IS TRUE
       OR ccc.has_fixed_base_evidence IS TRUE
),
included_component_agg AS (
    SELECT
        icr.canonical_product_id,
        jsonb_agg(icr.component_family ORDER BY icr.component_family) AS included_components
    FROM included_component_rows icr
    GROUP BY icr.canonical_product_id
),
component_coverage_evidence_agg AS (
    SELECT
        ccc.canonical_product_id,
        jsonb_agg(
            jsonb_build_object(
                'component_family', ccc.component_family,
                'eligible_configuration_count', ccc.eligible_configuration_count,
                'present_in_configuration_count', ccc.present_in_configuration_count,
                'all_presence_reviews_resolved', ccc.all_presence_reviews_resolved,
                'has_fixed_base_evidence', ccc.has_fixed_base_evidence,
                'is_unconditional_component', ccc.is_unconditional_component,
                'included_component_basis',
                    CASE
                        WHEN ccc.is_unconditional_component
                            THEN 'all_eligible_public_non_sampler_configurations'
                        WHEN ccc.has_fixed_base_evidence
                            THEN 'explicit_fixed_base_evidence'
                        ELSE 'not_unconditional'
                    END
            )
            ORDER BY ccc.component_family
        ) AS component_configuration_coverage_json
    FROM component_configuration_coverage ccc
    GROUP BY ccc.canonical_product_id
),
variation_price_alignment AS (
    SELECT
        pf.canonical_product_id,
        COALESCE(svs.source_variation_axis_count, 0) AS source_variation_axis_count,
        count(ob.option_mapping_id) FILTER (
            WHERE ob.detected_canonical_axis = 'configuration'
        )::integer AS configuration_option_value_count,
        COALESCE(svs.has_deterministic_raw_axis_order, false) AS source_order_deterministic,
        COALESCE(
            bool_and(ob.source_price_row_number IS NOT NULL)
                FILTER (WHERE ob.detected_canonical_axis = 'configuration'),
            false
        ) AS price_order_deterministic,
        count(ob.option_mapping_id) FILTER (
            WHERE ob.detected_canonical_axis = 'configuration'
              AND ob.source_price_row_id IS NOT NULL
              AND COALESCE(oca.has_configuration_price, false)
              AND COALESCE(oca.has_sellable_configuration, false)
        )::integer AS direct_relational_link_count,
        false AS alignment_required,
        true AS alignment_resolved,
        false AS derivation_axis_alignment_confirmed,
        (
            count(ob.option_mapping_id) FILTER (
                WHERE ob.detected_canonical_axis = 'configuration'
                  AND ob.source_price_row_id IS NOT NULL
                  AND COALESCE(oca.has_configuration_price, false)
                  AND COALESCE(oca.has_sellable_configuration, false)
            ) = count(ob.option_mapping_id) FILTER (
                WHERE ob.detected_canonical_axis = 'configuration'
            )
        ) AS value_count_alignment_confirmed,
        true AS alignment_unambiguous,
        false AS pairing_allowed,
        CASE
            WHEN count(ob.option_mapping_id) FILTER (
                WHERE ob.detected_canonical_axis = 'configuration'
            ) = 0
                THEN 'not_required_no_configuration_axis'
            WHEN count(ob.option_mapping_id) FILTER (
                WHERE ob.detected_canonical_axis = 'configuration'
                  AND ob.source_price_row_id IS NOT NULL
                  AND COALESCE(oca.has_configuration_price, false)
                  AND COALESCE(oca.has_sellable_configuration, false)
            ) = count(ob.option_mapping_id) FILTER (
                WHERE ob.detected_canonical_axis = 'configuration'
            )
                THEN 'not_required_direct_relational_links'
            ELSE 'not_required_preserved_as_separate_evidence'
        END::text AS alignment_status
    FROM product_focus pf
    LEFT JOIN source_variation_summary svs
        ON svs.canonical_product_id = pf.canonical_product_id
    LEFT JOIN option_base ob
        ON ob.canonical_product_id = pf.canonical_product_id
    LEFT JOIN option_configuration_agg oca
        ON oca.option_mapping_id = ob.option_mapping_id
    GROUP BY
        pf.canonical_product_id,
        svs.source_variation_axis_count,
        svs.has_deterministic_raw_axis_order
),
optional_configuration_agg AS (
    SELECT
        ob.canonical_product_id,
        jsonb_agg(
            jsonb_build_object(
                'option_mapping_id', ob.option_mapping_id,
                'source_listing_id', ob.source_listing_id,
                'source_price_row_id', ob.source_price_row_id,
                'source_price_row_number', ob.source_price_row_number,
                'etsy_listing_id', ob.etsy_listing_id,
                'raw_label', ob.raw_option_name,
                'raw_value', ob.raw_option_value,
                'raw_option_text', ob.raw_option_text,
                'source_language', NULL,
                'stored_public_or_normalized_label', ob.canonical_option_value,
                'parallel_source_raw_value', NULL,
                'parallel_source_pairing_basis', NULL,
                'variation_price_pairing_allowed', vpa.pairing_allowed,
                'variation_price_alignment_status', vpa.alignment_status,
                'variation_price_alignment_evidence', jsonb_build_object(
                    'source_variation_axis_count', vpa.source_variation_axis_count,
                    'configuration_option_value_count', vpa.configuration_option_value_count,
                    'direct_relational_link_count', vpa.direct_relational_link_count,
                    'alignment_required', vpa.alignment_required,
                    'alignment_resolved', vpa.alignment_resolved,
                    'source_order_deterministic', vpa.source_order_deterministic,
                    'price_order_deterministic', vpa.price_order_deterministic,
                    'derivation_axis_alignment_confirmed', vpa.derivation_axis_alignment_confirmed,
                    'value_count_alignment_confirmed', vpa.value_count_alignment_confirmed,
                    'alignment_unambiguous', vpa.alignment_unambiguous
                ),
                'detected_canonical_axis', ob.detected_canonical_axis,
                'option_component_family_id', ob.option_component_family_id,
                'option_component_family_name', ob.option_component_family_name,
                'option_component_family_normalized_name', ob.option_component_family_normalized_name,
                'approved_mapped_component_families', COALESCE(mbo.approved_component_families_json, '[]'::jsonb),
                'modifiers', COALESCE(mbo.modifiers_json, '[]'::jsonb),
                'is_bundle', COALESCE(mbo.is_bundle_option, false),
                'is_full_set', COALESCE(oca.is_full_set, false),
                'mapping_status', COALESCE(mbo.mapping_status, 'mapping_requires_review'),
                'needs_review',
                    COALESCE(mbo.mapping_status, 'mapping_requires_review') NOT IN ('approved_component', 'approved_non_component')
                    OR ob.option_mapping_needs_review
                    OR ob.source_price_needs_review
                    OR (
                        ob.option_component_family_id IS NULL
                        AND ob.detected_canonical_axis = 'configuration'
                        AND NOT COALESCE(mbo.has_approved_non_component, false)
                        AND NOT COALESCE(mbo.is_bundle_option, false)
                    )
                    OR (vpa.alignment_required AND NOT vpa.alignment_resolved),
                'option_mapping_review_status', ob.option_mapping_review_status,
                'option_mapping_review_resolved', ob.option_mapping_review_resolved,
                'source_price_review_resolved', ob.source_price_review_resolved,
                'mapping_source', ob.mapping_source,
                'stored_confidence', ob.option_mapping_confidence,
                'mapping_rows', COALESCE(mbo.mapping_rows_json, '[]'::jsonb),
                'source_price', jsonb_build_object(
                    'price_text', ob.price_text,
                    'parsed_price_amount', ob.parsed_price_amount,
                    'currency', ob.currency,
                    'row_kind', ob.row_kind,
                    'price_source', ob.price_source,
                    'stored_confidence', ob.source_price_confidence,
                    'fallback_flag', ob.fallback_flag,
                    'sampler_non_catalog_flag', ob.sampler_non_catalog_flag,
                    'review_status', ob.source_price_review_status
                ),
                'configuration_prices', COALESCE(oca.configuration_prices_json, '[]'::jsonb),
                'sellable_configurations', COALESCE(oca.sellable_configurations_json, '[]'::jsonb),
                'source_variation_evidence', COALESCE(sva.source_variations_json, '[]'::jsonb)
            )
            ORDER BY ob.source_price_row_number NULLS LAST, ob.raw_option_value, ob.option_mapping_id
        ) AS optional_configurations
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo
        ON mbo.option_mapping_id = ob.option_mapping_id
    LEFT JOIN option_configuration_agg oca
        ON oca.option_mapping_id = ob.option_mapping_id
    JOIN variation_price_alignment vpa
        ON vpa.canonical_product_id = ob.canonical_product_id
    LEFT JOIN source_variation_agg sva
        ON sva.canonical_product_id = ob.canonical_product_id
    WHERE ob.detected_canonical_axis = 'configuration'
    GROUP BY ob.canonical_product_id
),
known_non_component_agg AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(x.known_non_component_json ORDER BY x.raw_phrase_norm, x.option_mapping_id) AS known_non_components
    FROM (
        SELECT DISTINCT
            md.canonical_product_id,
            md.raw_phrase_norm,
            md.option_mapping_id,
            jsonb_build_object(
                'option_mapping_id', md.option_mapping_id,
                'raw_option_value', md.raw_option_value,
                'raw_phrase_norm', md.raw_phrase_norm,
                'is_bundle_option', md.is_bundle_option,
                'is_component', md.is_component,
                'mapping_status', md.mapping_status,
                'review_reason', md.review_reason,
                'source_note', md.source_note
            ) AS known_non_component_json
        FROM mapping_detail md
        WHERE md.mapping_status = 'approved_non_component'
           OR (
                md.active_flag IS TRUE
                AND md.needs_review IS FALSE
                AND md.is_bundle_option IS TRUE
              )
    ) x
    GROUP BY x.canonical_product_id
),
option_price_row_agg AS (
    SELECT
        ob.canonical_product_id,
        jsonb_agg(
            jsonb_build_object(
                'source_price_row_id', ob.source_price_row_id,
                'source_listing_id', ob.source_listing_id,
                'etsy_listing_id', ob.etsy_listing_id,
                'raw_option_name', ob.raw_option_name,
                'raw_option_value', ob.raw_option_value,
                'raw_option_text', ob.raw_option_text,
                'stored_public_or_normalized_label', ob.canonical_option_value,
                'price_amount', ob.parsed_price_amount,
                'currency', ob.currency,
                'component_code', ob.option_component_family_normalized_name,
                'component_family', ob.option_component_family_name,
                'approved_mapped_component_families', COALESCE(mbo.approved_component_families_json, '[]'::jsonb),
                'is_full_set', COALESCE(oca.is_full_set, false),
                'is_bundle', COALESCE(mbo.is_bundle_option, false),
                'sellable_configurations', COALESCE(oca.sellable_configurations_json, '[]'::jsonb),
                'option_mapping_id', ob.option_mapping_id,
                'mapping_status', COALESCE(mbo.mapping_status, 'mapping_requires_review'),
                'review_flags', jsonb_build_object(
                    'option_mapping_review_status', ob.option_mapping_review_status,
                    'option_mapping_review_resolved', ob.option_mapping_review_resolved,
                    'source_price_review_status', ob.source_price_review_status,
                    'source_price_review_resolved', ob.source_price_review_resolved,
                    'option_component_family_null', (
                        ob.option_component_family_id IS NULL
                        AND ob.detected_canonical_axis = 'configuration'
                        AND NOT COALESCE(mbo.has_approved_non_component, false)
                        AND NOT COALESCE(mbo.is_bundle_option, false)
                    ),
                    'configuration_owner_mismatch', COALESCE(oca.has_configuration_owner_mismatch, false),
                    'configuration_component_family_null', (
                        COALESCE(oca.has_configuration_component_family_null, false)
                        AND ob.detected_canonical_axis = 'configuration'
                        AND NOT COALESCE(mbo.has_approved_non_component, false)
                        AND NOT COALESCE(mbo.is_bundle_option, false)
                    )
                ),
                'source_evidence', jsonb_build_object(
                    'source_row_number', ob.source_price_row_number,
                    'row_kind', ob.row_kind,
                    'price_source', ob.price_source,
                    'stored_confidence', ob.source_price_confidence,
                    'fallback_flag', ob.fallback_flag,
                    'sampler_non_catalog_flag', ob.sampler_non_catalog_flag,
                    'mapping_source', ob.mapping_source
                )
            )
            ORDER BY ob.source_price_row_number NULLS LAST, ob.raw_option_value, ob.source_price_row_id
        ) AS option_price_rows_json
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo
        ON mbo.option_mapping_id = ob.option_mapping_id
    LEFT JOIN option_configuration_agg oca
        ON oca.option_mapping_id = ob.option_mapping_id
    GROUP BY ob.canonical_product_id
),
configuration_evidence_agg AS (
    SELECT
        sc.canonical_product_id,
        jsonb_agg(
            jsonb_build_object(
                'sellable_configuration_id', sc.sellable_configuration_id,
                'option_mapping_id', sc.option_mapping_id,
                'component_family_id', sc.component_family_id,
                'component_family_name', cf.canonical_name,
                'component_family_normalized_name', cf.normalized_name,
                'configuration_name', sc.configuration_name,
                'normalized_key', sc.normalized_key,
                'is_default_whole_product', sc.is_default_whole_product,
                'is_sampler', sc.is_sampler,
                'is_public_candidate', sc.is_public_candidate,
                'sort_order', sc.sort_order,
                'review_status', sc.review_status,
                'review_resolved', COALESCE(
                    sc.review_status = ANY (rc.resolved_review_statuses),
                    false
                ),
                'needs_review', NOT COALESCE(
                    sc.review_status = ANY (rc.resolved_review_statuses),
                    false
                ),
                'prices', COALESCE(prices.prices_json, '[]'::jsonb)
            )
            ORDER BY sc.sort_order, sc.configuration_name, sc.sellable_configuration_id
        ) AS configurations_json
    FROM public.feya_commerce_sellable_configurations sc
    JOIN product_focus pf
        ON pf.canonical_product_id = sc.canonical_product_id
    CROSS JOIN review_status_contract rc
    LEFT JOIN public.feya_commerce_component_families cf
        ON cf.component_family_id = sc.component_family_id
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'configuration_price_id', cp.configuration_price_id,
                'option_mapping_id', cp.option_mapping_id,
                'source_price_row_id', cp.source_price_row_id,
                'source_amount', cp.source_amount,
                'source_currency', cp.source_currency,
                'public_price_amount', cp.public_price_amount,
                'manual_override_amount', cp.manual_override_amount,
                'stored_confidence', cp.confidence,
                'fallback_flag', cp.fallback_flag,
                'sampler_excluded_flag', cp.sampler_excluded_flag,
                'review_status', cp.review_status,
                'review_resolved', COALESCE(
                    cp.review_status = ANY (rc.resolved_review_statuses),
                    false
                ),
                'needs_review', NOT COALESCE(
                    cp.review_status = ANY (rc.resolved_review_statuses),
                    false
                ),
                'price_status', cp.price_status
            )
            ORDER BY cp.source_amount, cp.configuration_price_id
        ) AS prices_json
        FROM public.feya_commerce_configuration_prices cp
        WHERE cp.sellable_configuration_id = sc.sellable_configuration_id
    ) prices ON true
    GROUP BY sc.canonical_product_id
),
derivation_evidence AS (
    SELECT
        pf.canonical_product_id,
        to_jsonb(otd) AS option_text_derivation_json,
        to_jsonb(ccd) AS component_configuration_derivation_json
    FROM product_focus pf
    LEFT JOIN public.feya_commerce_v_product_option_text_derivation_v1 otd
        ON otd.canonical_product_id = pf.canonical_product_id
    LEFT JOIN public.feya_commerce_v_product_component_configuration_derivation_v1 ccd
        ON ccd.canonical_product_id = pf.canonical_product_id
),
unresolved_fact_rows AS (
    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'missing_component_phrase_mapping',
            'raw_phrase', ob.raw_option_value,
            'raw_phrase_norm', lower(btrim(ob.raw_option_value)),
            'option_mapping_id', ob.option_mapping_id,
            'mapping_status', COALESCE(mbo.mapping_status, 'mapping_requires_review')
        ) AS fact_json
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE COALESCE(mbo.mapping_status, 'mapping_requires_review') = 'unmapped_raw_phrase'

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'option_component_family_null',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id
        )
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE ob.option_component_family_id IS NULL
      AND ob.detected_canonical_axis = 'configuration'
      AND NOT COALESCE(mbo.has_approved_non_component, false)
      AND NOT COALESCE(mbo.is_bundle_option, false)

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'mapping_requires_review',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id,
            'mapping_status', COALESCE(mbo.mapping_status, 'mapping_requires_review'),
            'option_mapping_review_status', ob.option_mapping_review_status,
            'option_mapping_review_resolved', ob.option_mapping_review_resolved,
            'source_price_review_status', ob.source_price_review_status,
            'source_price_review_resolved', ob.source_price_review_resolved
        )
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE COALESCE(mbo.mapping_status, 'mapping_requires_review') NOT IN ('approved_component', 'approved_non_component')
       OR ob.option_mapping_needs_review
       OR ob.source_price_needs_review

    UNION ALL

    SELECT
        oca.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'source_configuration_mismatch',
            'option_mapping_id', oca.option_mapping_id,
            'detail', 'configuration owner option_mapping_id differs from configuration price option_mapping_id'
        )
    FROM option_configuration_agg oca
    WHERE oca.has_configuration_owner_mismatch

    UNION ALL

    SELECT
        oca.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'configuration_component_family_null',
            'option_mapping_id', oca.option_mapping_id
        )
    FROM option_configuration_agg oca
    JOIN option_base ob ON ob.option_mapping_id = oca.option_mapping_id
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = oca.option_mapping_id
    WHERE oca.has_configuration_component_family_null
      AND ob.detected_canonical_axis = 'configuration'
      AND NOT COALESCE(mbo.has_approved_non_component, false)
      AND NOT COALESCE(mbo.is_bundle_option, false)

    UNION ALL

    SELECT
        vpa.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'unresolved_variation_price_alignment',
            'source_variation_axis_count', vpa.source_variation_axis_count,
            'configuration_option_value_count', vpa.configuration_option_value_count,
            'derivation_axis_alignment_confirmed', vpa.derivation_axis_alignment_confirmed,
            'value_count_alignment_confirmed', vpa.value_count_alignment_confirmed,
            'alignment_unambiguous', vpa.alignment_unambiguous
        )
    FROM variation_price_alignment vpa
    WHERE vpa.alignment_required IS TRUE
      AND vpa.alignment_resolved IS FALSE

    UNION ALL

    SELECT
        ccc.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'component_not_unconditional_across_configurations',
            'component_family', ccc.component_family,
            'eligible_configuration_count', ccc.eligible_configuration_count,
            'present_in_configuration_count', ccc.present_in_configuration_count,
            'all_presence_reviews_resolved', ccc.all_presence_reviews_resolved
        )
    FROM component_configuration_coverage ccc
    WHERE ccc.is_unconditional_component IS FALSE
      AND ccc.has_fixed_base_evidence IS FALSE

    UNION ALL

    SELECT
        pf.canonical_product_id,
        jsonb_build_object(
            'fact_type', 'source_description_component_evidence_unconfirmed',
            'source_description_fragment', sd.source_description_fragment
        )
    FROM product_focus pf
    JOIN source_description sd ON sd.canonical_product_id = pf.canonical_product_id
    LEFT JOIN included_component_agg ica ON ica.canonical_product_id = pf.canonical_product_id
    WHERE sd.source_description_fragment IS NOT NULL
      AND jsonb_array_length(COALESCE(ica.included_components, '[]'::jsonb)) = 0
),
unresolved_fact_agg AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(x.fact_json ORDER BY x.fact_json::text) AS unresolved_component_facts
    FROM (
        SELECT DISTINCT canonical_product_id, fact_json
        FROM unresolved_fact_rows
    ) x
    GROUP BY x.canonical_product_id
),
blocker_rows AS (
    SELECT
        pf.canonical_product_id,
        jsonb_build_object('reason', 'product_focus_components_empty') AS blocker_json
    FROM product_focus pf
    WHERE jsonb_array_length(pf.parent_components_json) = 0
      AND jsonb_array_length(pf.child_components_json) = 0
      AND jsonb_array_length(pf.component_groups_json) = 0

    UNION ALL

    SELECT
        pf.canonical_product_id,
        jsonb_build_object(
            'reason', 'source_description_indicates_component',
            'source_description_fragment', sd.source_description_fragment
        )
    FROM product_focus pf
    JOIN source_description sd ON sd.canonical_product_id = pf.canonical_product_id
    LEFT JOIN included_component_agg ica ON ica.canonical_product_id = pf.canonical_product_id
    WHERE sd.source_description_fragment IS NOT NULL
      AND jsonb_array_length(COALESCE(ica.included_components, '[]'::jsonb)) = 0

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'reason', 'missing_component_phrase_mapping',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id
        )
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE COALESCE(mbo.mapping_status, 'mapping_requires_review') = 'unmapped_raw_phrase'

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'reason', 'option_component_family_null',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id
        )
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE ob.option_component_family_id IS NULL
      AND ob.detected_canonical_axis = 'configuration'
      AND NOT COALESCE(mbo.has_approved_non_component, false)
      AND NOT COALESCE(mbo.is_bundle_option, false)

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'reason', 'mapping_requires_review',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id,
            'mapping_status', COALESCE(mbo.mapping_status, 'mapping_requires_review'),
            'option_mapping_review_status', ob.option_mapping_review_status,
            'option_mapping_review_resolved', ob.option_mapping_review_resolved,
            'source_price_review_status', ob.source_price_review_status,
            'source_price_review_resolved', ob.source_price_review_resolved
        )
    FROM option_base ob
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE COALESCE(mbo.mapping_status, 'mapping_requires_review') NOT IN ('approved_component', 'approved_non_component')
       OR ob.option_mapping_needs_review
       OR ob.source_price_needs_review

    UNION ALL

    SELECT
        oca.canonical_product_id,
        jsonb_build_object(
            'reason', 'source_configuration_mismatch',
            'option_mapping_id', oca.option_mapping_id
        )
    FROM option_configuration_agg oca
    WHERE oca.has_configuration_owner_mismatch

    UNION ALL

    SELECT
        oca.canonical_product_id,
        jsonb_build_object(
            'reason', 'configuration_component_family_null',
            'option_mapping_id', oca.option_mapping_id
        )
    FROM option_configuration_agg oca
    JOIN option_base ob ON ob.option_mapping_id = oca.option_mapping_id
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = oca.option_mapping_id
    WHERE oca.has_configuration_component_family_null
      AND ob.detected_canonical_axis = 'configuration'
      AND NOT COALESCE(mbo.has_approved_non_component, false)
      AND NOT COALESCE(mbo.is_bundle_option, false)

    UNION ALL

    SELECT
        ob.canonical_product_id,
        jsonb_build_object(
            'reason', 'missing_sellable_configuration',
            'raw_phrase', ob.raw_option_value,
            'option_mapping_id', ob.option_mapping_id
        )
    FROM option_base ob
    LEFT JOIN option_configuration_agg oca ON oca.option_mapping_id = ob.option_mapping_id
    LEFT JOIN mapping_by_option mbo ON mbo.option_mapping_id = ob.option_mapping_id
    WHERE COALESCE(oca.has_sellable_configuration, false) IS FALSE
      AND ob.detected_canonical_axis = 'configuration'
      AND ob.sampler_flag IS FALSE
      AND ob.non_catalog_flag IS FALSE
      AND NOT COALESCE(mbo.has_approved_non_component, false)
      AND NOT COALESCE(mbo.is_bundle_option, false)

    UNION ALL

    SELECT
        vpa.canonical_product_id,
        jsonb_build_object(
            'reason', 'unresolved_variation_price_alignment',
            'source_variation_axis_count', vpa.source_variation_axis_count,
            'configuration_option_value_count', vpa.configuration_option_value_count
        )
    FROM variation_price_alignment vpa
    WHERE vpa.alignment_required IS TRUE
      AND vpa.alignment_resolved IS FALSE

    UNION ALL

    SELECT
        ccc.canonical_product_id,
        jsonb_build_object(
            'reason', 'component_not_unconditional_across_configurations',
            'component_family', ccc.component_family,
            'eligible_configuration_count', ccc.eligible_configuration_count,
            'present_in_configuration_count', ccc.present_in_configuration_count
        )
    FROM component_configuration_coverage ccc
    WHERE ccc.is_unconditional_component IS FALSE
      AND ccc.has_fixed_base_evidence IS FALSE
),
blocker_agg AS (
    SELECT
        x.canonical_product_id,
        jsonb_agg(x.blocker_json ORDER BY x.blocker_json::text) AS component_review_blockers_json
    FROM (
        SELECT DISTINCT canonical_product_id, blocker_json
        FROM blocker_rows
    ) x
    GROUP BY x.canonical_product_id
)
SELECT
    pf.canonical_product_id,
    pf.matched_etsy_listing_id,
    pf.product_slug,
    pf.card_title,
    pf.h1,
    pf.seo_title,
    pf.meta_description,
    pf.product_type,
    pf.material,
    pf.color,
    pf.canonical_color_label,
    pf.category_label,
    pf.source_category_label,
    pf.operator_section_label,
    pf.world_label,
    pf.primary_image_url,
    pf.primary_image_alt,
    pf.parent_components_json,
    pf.child_components_json,
    pf.component_groups_json,
    pf.needs_component_review_count,
    pf.has_component_review_risk,
    pf.focus_text,
    COALESCE(ica.included_components, '[]'::jsonb) AS included_components,
    COALESCE(oca.optional_configurations, '[]'::jsonb) AS optional_configurations,
    COALESCE(sva.source_variations_json, '[]'::jsonb) AS available_variants,
    COALESCE(knca.known_non_components, '[]'::jsonb) AS known_non_components,
    COALESCE(ufa.unresolved_component_facts, '[]'::jsonb) AS unresolved_component_facts,
    COALESCE(ba.component_review_blockers_json, '[]'::jsonb) AS component_review_blockers_json,
    jsonb_build_object(
        'direct_sources', jsonb_build_array(
            'public.feya_commerce_v_listing_master_product_focus_v1',
            'public.feya_commerce_v_step6_product_builder_detail',
            'public.feya_commerce_source_listings',
            'public.feya_commerce_source_price_rows',
            'public.feya_commerce_option_mappings',
            'public.feya_commerce_sellable_configurations',
            'public.feya_commerce_configuration_prices',
            'public.feya_commerce_seo_component_phrase_map_v1',
            'public.feya_commerce_v_seo_product_component_mapping_v1',
            'public.feya_commerce_v_seo_component_mapping_review_v1',
            'public.feya_commerce_v_product_option_text_derivation_v1',
            'public.feya_commerce_v_product_component_configuration_derivation_v1',
            'public.feya_commerce_component_families'
        ),
        'upstream_declared_sources', jsonb_build_array(
            jsonb_build_object(
                'source', 'public.feya_commerce_seo_component_phrase_components_v1',
                'via', 'public.feya_commerce_v_seo_product_component_mapping_v1'
            )
        ),
        'review_status_contract', jsonb_build_object(
            'resolved_review_statuses', to_jsonb(rc.resolved_review_statuses),
            'observed_option_mapping_statuses', to_jsonb(rc.observed_option_mapping_statuses),
            'observed_configuration_statuses', to_jsonb(rc.observed_configuration_statuses),
            'observed_configuration_price_statuses', to_jsonb(rc.observed_configuration_price_statuses),
            'observed_source_price_statuses', to_jsonb(rc.observed_source_price_statuses),
            'has_formally_confirmed_resolved_status', rc.has_formally_confirmed_resolved_status,
            'null_or_unknown_status_policy', 'unresolved'
        ),
        'source_listing', jsonb_build_object(
            'source_listing_id', sl.source_listing_id,
            'import_batch_id', sl.import_batch_id,
            'shop_code', sl.shop_code,
            'source_row_number', sl.source_row_number,
            'etsy_listing_id', sl.etsy_listing_id,
            'raw_title', sl.raw_title,
            'created_at', sl.created_at,
            'updated_at', sl.updated_at
        ),
        'phrase_mappings', COALESCE(pme.phrase_mappings_json, '[]'::jsonb),
        'mapping_review_rows', COALESCE(mra.mapping_review_rows_json, '[]'::jsonb),
        'parent_components', pf.parent_components_json,
        'child_components', pf.child_components_json,
        'component_groups', pf.component_groups_json,
        'component_configuration_coverage', COALESCE(
            ccea.component_configuration_coverage_json,
            '[]'::jsonb
        ),
        'fixed_base_evidence_available', false,
        'variation_price_alignment', jsonb_build_object(
            'source_variation_axis_count', vpa.source_variation_axis_count,
            'configuration_option_value_count', vpa.configuration_option_value_count,
            'direct_relational_link_count', vpa.direct_relational_link_count,
            'alignment_required', vpa.alignment_required,
            'alignment_resolved', vpa.alignment_resolved,
            'source_order_deterministic', vpa.source_order_deterministic,
            'price_order_deterministic', vpa.price_order_deterministic,
            'derivation_axis_alignment_confirmed', vpa.derivation_axis_alignment_confirmed,
            'value_count_alignment_confirmed', vpa.value_count_alignment_confirmed,
            'alignment_unambiguous', vpa.alignment_unambiguous,
            'pairing_allowed', vpa.pairing_allowed,
            'alignment_status', vpa.alignment_status
        ),
        'option_text_derivation', COALESCE(de.option_text_derivation_json, '{}'::jsonb),
        'component_configuration_derivation', COALESCE(de.component_configuration_derivation_json, '{}'::jsonb),
        'sellable_configurations', COALESCE(cea.configurations_json, '[]'::jsonb)
    ) AS component_evidence,
    sd.source_description_fragment,
    COALESCE(sva.source_variations_json, '[]'::jsonb) AS source_variations_json,
    COALESCE(opra.option_price_rows_json, '[]'::jsonb) AS option_price_rows_json
FROM product_focus pf
LEFT JOIN source_listing sl ON sl.canonical_product_id = pf.canonical_product_id
LEFT JOIN source_description sd ON sd.canonical_product_id = pf.canonical_product_id
LEFT JOIN included_component_agg ica ON ica.canonical_product_id = pf.canonical_product_id
LEFT JOIN optional_configuration_agg oca ON oca.canonical_product_id = pf.canonical_product_id
LEFT JOIN source_variation_agg sva ON sva.canonical_product_id = pf.canonical_product_id
LEFT JOIN known_non_component_agg knca ON knca.canonical_product_id = pf.canonical_product_id
LEFT JOIN unresolved_fact_agg ufa ON ufa.canonical_product_id = pf.canonical_product_id
LEFT JOIN blocker_agg ba ON ba.canonical_product_id = pf.canonical_product_id
LEFT JOIN phrase_mapping_evidence pme ON pme.canonical_product_id = pf.canonical_product_id
LEFT JOIN mapping_review_agg mra ON mra.canonical_product_id = pf.canonical_product_id
LEFT JOIN option_price_row_agg opra ON opra.canonical_product_id = pf.canonical_product_id
LEFT JOIN configuration_evidence_agg cea ON cea.canonical_product_id = pf.canonical_product_id
LEFT JOIN derivation_evidence de ON de.canonical_product_id = pf.canonical_product_id
LEFT JOIN component_coverage_evidence_agg ccea ON ccea.canonical_product_id = pf.canonical_product_id
JOIN variation_price_alignment vpa ON vpa.canonical_product_id = pf.canonical_product_id
CROSS JOIN review_status_contract rc;

-- Proposed permissions, also NOT executed:
-- REVOKE ALL ON public.feya_commerce_v_seo_product_truth_v1 FROM PUBLIC;
-- REVOKE ALL ON public.feya_commerce_v_seo_product_truth_v1 FROM anon;
-- REVOKE ALL ON public.feya_commerce_v_seo_product_truth_v1 FROM authenticated;
-- GRANT SELECT ON public.feya_commerce_v_seo_product_truth_v1 TO service_role;
