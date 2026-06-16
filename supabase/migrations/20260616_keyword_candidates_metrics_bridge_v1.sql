create or replace view public.feya_commerce_v_keyword_candidates_with_metrics_v1 as
select
  c.keyword_candidate_id,
  c.canonical_product_id,
  c.product_slug,
  c.collection_slug,
  c.page_type,
  c.keyword,
  c.normalized_keyword,
  c.source_code as candidate_source_code,
  c.country_code,
  c.language_code,
  c.bucket,
  c.placement,
  c.is_excluded,
  c.dna_relevance_score,
  c.buyer_intent_score as candidate_buyer_intent_score,
  c.region_fit_score,
  c.anti_cannibalization_score,
  c.final_score as seed_final_score,
  m.source_code as metrics_source_code,
  m.avg_monthly_searches,
  m.competition_level,
  m.competition_index,
  m.trend_score,
  m.seasonality_score,
  m.buyer_intent_score as metrics_buyer_intent_score,
  m.event_fit_score,
  m.visual_fit_score,
  m.observed_month,
  case
    when c.is_excluded then 0::numeric
    when m.avg_monthly_searches is null then c.final_score
    else round((coalesce(c.final_score, 50) * 0.55 + least(100::numeric, (ln(greatest(m.avg_monthly_searches, 0) + 1) * 15)::numeric) * 0.25 + coalesce(m.trend_score, 50) * 0.10 + coalesce(m.buyer_intent_score, c.buyer_intent_score, 50) * 0.10)::numeric, 2)
  end as enriched_score,
  case
    when c.is_excluded then 'blocked'
    when m.avg_monthly_searches is null then 'seed_only'
    else 'has_metrics'
  end as metrics_status
from public.feya_keyword_candidates_v1 c
left join public.feya_commerce_v_keyword_metrics_latest_v1 m
  on m.normalized_keyword = c.normalized_keyword
 and m.country_code = c.country_code
 and m.language_code = c.language_code;
