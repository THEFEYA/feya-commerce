-- FEYA Commerce / TheFEYA
-- Read-only candidate bridge before promoting old keyword universe / Google Ads metric snapshots
-- into canonical seo_keyword_bank_v1 used by Listing Master.
-- Safe mode: creates/replaces VIEW only. No inserts/updates/deletes.

CREATE OR REPLACE VIEW public.feya_commerce_v_seo_keyword_master_to_bank_insert_dry_run_v1 AS
WITH master_candidates AS (
  SELECT 'seo_keyword_master_v1'::text AS candidate_source, to_jsonb(m) AS raw_json
  FROM public.feya_commerce_seo_keyword_master_v1 m
),
metric_candidates AS (
  SELECT 'metric_snapshots_v1'::text AS candidate_source, to_jsonb(s) AS raw_json
  FROM public.feya_commerce_seo_keyword_metric_snapshots_v1 s
),
raw_candidates AS (
  SELECT * FROM master_candidates
  UNION ALL
  SELECT * FROM metric_candidates
),
normalized AS (
  SELECT
    candidate_source,
    raw_json,
    NULLIF(trim(COALESCE(raw_json ->> 'keyword', raw_json ->> 'keyword_norm', raw_json ->> 'phrase', raw_json ->> 'search_term', raw_json ->> 'query')), '') AS candidate_keyword,
    lower(regexp_replace(trim(COALESCE(raw_json ->> 'keyword_norm', raw_json ->> 'keyword', raw_json ->> 'phrase', raw_json ->> 'search_term', raw_json ->> 'query', '')), '\s+', ' ', 'g')) AS candidate_keyword_norm,
    NULLIF(raw_json ->> 'review_status', '') AS source_review_status,
    NULLIF(raw_json ->> 'validation_status', '') AS source_validation_status,
    NULLIF(raw_json ->> 'cleanup_pipeline_status', '') AS cleanup_pipeline_status,
    NULLIF(raw_json ->> 'bank_bucket', '') AS source_bank_bucket,
    NULLIF(raw_json ->> 'page_type', '') AS source_page_type,
    NULLIF(raw_json ->> 'role', '') AS source_role,
    NULLIF(raw_json ->> 'role_label', '') AS source_role_label,
    NULLIF(raw_json ->> 'source_clusters', '') AS source_clusters,
    NULLIF(raw_json ->> 'source_files', '') AS source_files,
    NULLIF(raw_json ->> 'reason', '') AS source_reason,
    NULLIF(raw_json ->> 'notes', '') AS source_notes,
    NULLIF(raw_json ->> 'metric_source', '') AS metric_source,
    COALESCE(NULLIF(raw_json ->> 'avg_monthly_searches', '')::numeric, NULLIF(raw_json ->> 'search_volume', '')::numeric) AS avg_monthly_searches,
    NULLIF(upper(COALESCE(raw_json ->> 'competition', raw_json ->> 'competition_level')), '') AS competition,
    COALESCE(NULLIF(raw_json ->> 'competition_index', '')::numeric, NULLIF(raw_json ->> 'competition_value', '')::numeric) AS competition_index,
    COALESCE(NULLIF(raw_json ->> 'low_bid', '')::numeric, NULLIF(raw_json ->> 'low_top_of_page_bid', '')::numeric, NULLIF(raw_json ->> 'low_top_of_page_bid_micros', '')::numeric) AS low_bid,
    COALESCE(NULLIF(raw_json ->> 'high_bid', '')::numeric, NULLIF(raw_json ->> 'high_top_of_page_bid', '')::numeric, NULLIF(raw_json ->> 'high_top_of_page_bid_micros', '')::numeric) AS high_bid,
    NULLIF(COALESCE(raw_json ->> 'last_checked', raw_json ->> 'observed_month', raw_json ->> 'created_at'), '') AS metric_date
  FROM raw_candidates
),
existing_bank AS (
  SELECT
    lower(regexp_replace(trim(COALESCE(to_jsonb(b) ->> 'keyword_norm', to_jsonb(b) ->> 'keyword', '')), '\s+', ' ', 'g')) AS keyword_norm,
    to_jsonb(b) ->> 'review_status' AS review_status,
    to_jsonb(b) ->> 'bank_bucket' AS bank_bucket
  FROM public.seo_keyword_bank_v1 b
),
classified AS (
  SELECT
    n.*,
    EXISTS (SELECT 1 FROM existing_bank b WHERE b.keyword_norm = n.candidate_keyword_norm) AS exists_in_bank,
    EXISTS (
      SELECT 1 FROM existing_bank b
      WHERE b.keyword_norm = n.candidate_keyword_norm
        AND b.review_status = 'approved_draft'
        AND b.bank_bucket IN ('product','product_or_alt','collection','commercial_collection','visual_collection','faq')
    ) AS exists_in_listing_master,
    (n.avg_monthly_searches IS NOT NULL OR n.competition IS NOT NULL OR n.competition_index IS NOT NULL OR n.low_bid IS NOT NULL OR n.high_bid IS NOT NULL OR n.metric_source IS NOT NULL) AS has_metric,
    CASE
      WHEN n.candidate_keyword_norm ~ '\m(price|cost|shipping|delivery|size|sizing|how to|what to wear)\M' THEN 'faq'
      WHEN n.candidate_keyword_norm ~ '\m(buy|shop|order|custom|handmade|for sale|online|website|websites|store|stores)\M' THEN 'commercial_collection'
      WHEN n.candidate_keyword_norm ~ '\m(armor|armour|shoulder|shoulders|bracer|arm cuff|choker|collar|harness|bodysuit|mask|headpiece|horn|corset|skirt|dress|belt|chain|wings)\M'
        AND n.candidate_keyword_norm ~ '\m(gold|silver|mirror|metallic|reflective|holographic|chrome|leather|acrylic|black|white|iridescent|shiny)\M' THEN 'product_or_alt'
      WHEN n.candidate_keyword_norm ~ '\m(armor|armour|shoulder|shoulders|bracer|arm cuff|choker|collar|harness|bodysuit|mask|headpiece|horn|corset|skirt|dress|belt|chain|wings)\M' THEN 'product'
      WHEN n.candidate_keyword_norm ~ '\m(gold|silver|mirror|metallic|reflective|holographic|chrome|leather|acrylic|black|white|iridescent|shiny)\M'
        AND n.candidate_keyword_norm ~ '\m(outfit|outfits|clothes|clothing|wear|costume|dress|set)\M' THEN 'visual_collection'
      WHEN n.candidate_keyword_norm ~ '\m(rave|edm|festival|burning man|coachella|stage|performance|drag|clubwear|dancer|dance|futuristic|cyberpunk|apocalyptic|desert|cosmic)\M' THEN 'collection'
      ELSE 'hold'
    END AS proposed_bank_bucket,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN n.candidate_keyword IS NULL THEN 'missing_keyword' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(lego|pokemon|pokémon|barbie|disney|wonder woman|batman|harry potter|star wars|mandalorian|spongebob|shrek|my little pony)\M' THEN 'brand_or_franchise' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(kids|kid|child|children|baby|toddler|girls costume|boys costume|dog costume|pet costume)\M' THEN 'kids_or_pet' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(diy|pattern|template|sewing pattern|make your own)\M' THEN 'diy_or_pattern' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(bridal|bride|wedding|bridesmaid|prom|homecoming|flapper|gatsby|renaissance|medieval)\M' THEN 'not_our_occasion' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(n95|kn95|surgical mask|medical mask|respirator|dust mask|gas mask|protective face mask)\M' THEN 'medical_or_safety' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(fall protection|safety harness|climbing harness|wire harness|wiring harness|osha|ansi|lanyard)\M' THEN 'industrial_harness' END,
      CASE WHEN n.candidate_keyword_norm ~ '\m(necklace|earrings|diamond|pearl jewelry)\M' THEN 'jewelry_only' END
    ], NULL) AS block_flags
  FROM normalized n
),
ranked AS (
  SELECT c.*, ROW_NUMBER() OVER (
    PARTITION BY candidate_keyword_norm
    ORDER BY exists_in_listing_master DESC, exists_in_bank DESC, has_metric DESC, COALESCE(avg_monthly_searches, 0) DESC, candidate_source
  ) AS candidate_rank
  FROM classified c
  WHERE candidate_keyword_norm <> ''
)
SELECT
  candidate_keyword,
  candidate_keyword_norm,
  candidate_source,
  exists_in_bank,
  exists_in_listing_master,
  has_metric,
  avg_monthly_searches,
  competition,
  competition_index,
  low_bid,
  high_bid,
  metric_source,
  metric_date,
  source_review_status,
  source_validation_status,
  cleanup_pipeline_status,
  source_bank_bucket,
  source_page_type,
  source_role,
  source_role_label,
  proposed_bank_bucket,
  CASE
    WHEN array_length(block_flags, 1) IS NOT NULL THEN 'reject'
    WHEN exists_in_bank THEN source_review_status
    WHEN NOT has_metric THEN 'hold'
    WHEN proposed_bank_bucket = 'hold' THEN 'hold'
    WHEN COALESCE(avg_monthly_searches, 0) = 0 AND competition IS NULL THEN 'hold'
    ELSE 'approved_draft'
  END AS proposed_review_status,
  block_flags,
  CASE
    WHEN exists_in_bank THEN 'excluded_duplicate'
    WHEN array_length(block_flags, 1) IS NOT NULL THEN 'excluded_noise'
    WHEN NOT has_metric THEN 'needs_manual_review_no_metric'
    WHEN proposed_bank_bucket = 'hold' THEN 'needs_manual_review_bucket'
    WHEN COALESCE(avg_monthly_searches, 0) = 0 AND competition IS NULL THEN 'needs_manual_review_zero_metric'
    ELSE 'would_insert'
  END AS dry_run_action,
  CONCAT_WS(' · ', 'source=' || candidate_source, 'bucket=' || proposed_bank_bucket, CASE WHEN has_metric THEN 'metric=yes' ELSE 'metric=no' END, CASE WHEN exists_in_bank THEN 'duplicate=yes' ELSE 'duplicate=no' END, CASE WHEN array_length(block_flags, 1) IS NOT NULL THEN 'blocked=' || array_to_string(block_flags, ',') ELSE NULL END) AS reason,
  source_clusters,
  source_files,
  source_reason,
  source_notes,
  raw_json
FROM ranked
WHERE candidate_rank = 1;

-- Checks after creating the view:
-- SELECT dry_run_action, proposed_bank_bucket, count(*)
-- FROM public.feya_commerce_v_seo_keyword_master_to_bank_insert_dry_run_v1
-- GROUP BY 1,2
-- ORDER BY 1,2;
--
-- SELECT candidate_keyword, dry_run_action, proposed_bank_bucket, avg_monthly_searches, competition, reason
-- FROM public.feya_commerce_v_seo_keyword_master_to_bank_insert_dry_run_v1
-- WHERE candidate_keyword_norm ~ '(cyberpunk|futuristic|shoulder|armor|dress|buy|shop|order|price|shipping|delivery)'
-- ORDER BY dry_run_action, avg_monthly_searches DESC NULLS LAST
-- LIMIT 200;
