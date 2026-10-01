-- Isolated rehearsal / reviewed emergency only. Restores legacy exposure; keep application writes and indexing OFF.

-- Retains access manifest/health: access health becomes NULL, so the new write gate stays closed.

begin;

set local search_path=public;

do $g$ begin if public.feya_commerce_metric_reader_boundary_health_v1() is distinct from 'metric_reader_boundary_v1' then raise exception 'Reader contract unhealthy'; end if; end $g$;

do $g$ begin if public.feya_commerce_metric_access_boundary_health_v1() is distinct from 'metric_access_boundary_v1' then raise exception 'Rollback preflight drift'; end if; end $g$;

revoke all on public.feya_commerce_seo_keyword_metric_import_staging_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_seo_keyword_metric_import_staging_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_seo_keyword_metric_snapshots_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_seo_keyword_metric_snapshots_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_case_admission_preview_safe_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_case_admission_preview_safe_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_case_admission_preview_safe_v2 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_case_admission_preview_safe_v2 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_growth_operational_metrics_safe_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_growth_operational_metrics_safe_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_growth_signal_candidates_safe_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_growth_signal_candidates_safe_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_growth_signal_candidates_safe_v2 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_growth_signal_candidates_safe_v2 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_query_cluster_proposal_candidates_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_query_cluster_proposal_candidates_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_query_cluster_proposal_queue_safe_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_query_cluster_proposal_queue_safe_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_query_cluster_review_queue_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_query_cluster_review_queue_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_api_validation_pilot_report_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_api_validation_pilot_report_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_brief_system_status_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_brief_system_status_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_brief_pool_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_brief_pool_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_candidate_promotion_dry_run_v2 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_candidate_promotion_dry_run_v2 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_master_metric_export_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_master_metric_export_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_master_to_bank_insert_dry_run_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_master_to_bank_insert_dry_run_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_export_google_ads_keywords_o from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_export_google_ads_keywords_o to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_export_google_ads_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_export_google_ads_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_import_ready_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_import_ready_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_import_template_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_import_template_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_import_validation_report_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_import_validation_report_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_metric_validation_queue_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_metric_validation_queue_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_p1_guarded_promotion_dry_run_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_p1_guarded_promotion_dry_run_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_p1_insert_payload_preview_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_p1_insert_payload_preview_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_recommendation_summary_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_recommendation_summary_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_recommendation_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_recommendation_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_score_preview_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_score_preview_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_metric_system_status_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_metric_system_status_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_next_action_queue_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_next_action_queue_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_candidate_v2 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_candidate_v2 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_candidate_v2_safe from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_candidate_v2_safe to anon,authenticated,service_role;

revoke all on public.feya_v_kw_plan_candidates_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_plan_candidates_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_plan_pipeline_status_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_plan_pipeline_status_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fact_expansion_candidates_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fact_expansion_candidates_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fact_expansion_summary_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fact_expansion_summary_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_candidate_summary_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_candidate_summary_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_candidate_summary_v2 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_candidate_summary_v2 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_candidates_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_candidates_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_candidates_v2 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_candidates_v2 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_candidates_v3 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_candidates_v3 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_insert_preview_summary_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_insert_preview_summary_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_insert_preview_summary_v2 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_insert_preview_summary_v2 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_insert_preview_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_insert_preview_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_kw_product_fit_insert_preview_v2 from public,anon,authenticated,service_role;

grant all on public.feya_v_kw_product_fit_insert_preview_v2 to anon,authenticated,service_role;

revoke all on public.feya_v_manual_keyword_metric_match_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_manual_keyword_metric_match_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_metric_export_center_keywords_only_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_metric_export_center_keywords_only_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_metric_export_center_sum_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_metric_export_center_sum_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_metric_export_center_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_metric_export_center_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_metric_import_center_status_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_metric_import_center_status_v1 to anon,authenticated,service_role;

revoke all on public.feya_v_metric_next_action_v1 from public,anon,authenticated,service_role;

grant all on public.feya_v_metric_next_action_v1 to anon,authenticated,service_role;

do $g$ declare changed integer; begin
update public.feya_commerce_seo_metric_reader_contracts_v1 m set metadata_json=jsonb_build_object('owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'options',c.reloptions)
from pg_class c where m.object_kind='view' and c.oid=to_regclass(m.object_identity);
get diagnostics changed=row_count;
if changed<>14 then raise exception 'Unexpected reader manifest size'; end if;
end $g$;

do $g$ begin if public.feya_commerce_metric_reader_boundary_health_v1() is distinct from 'metric_reader_boundary_v1' then raise exception 'Reader contract unhealthy'; end if; end $g$;

do $g$ begin if public.feya_commerce_metric_access_boundary_health_v1() is not null then raise exception 'Rollback must leave access gate closed'; end if; end $g$;

commit;
