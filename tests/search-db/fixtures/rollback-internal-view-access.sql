-- Isolated rehearsal / reviewed emergency only. Restores these seven legacy grants.

-- Retains 57-row manifest/v2 health: mismatch closes writes. Keep storage and indexing OFF.

begin;

set local search_path=public;

do $g$ begin if public.feya_commerce_metric_access_boundary_health_v1() is distinct from 'metric_access_boundary_v2' then raise exception 'Rollback preflight drift'; end if; end $g$;

revoke all on public.feya_commerce_v_keyword_cleanup_review_risk_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_keyword_cleanup_review_risk_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_keyword_cleanup_review_status_safe_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_keyword_cleanup_review_status_safe_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_page_ownership_shortlist_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_page_ownership_shortlist_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_page_query_ownership_candidate_clusters_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_page_query_ownership_candidate_clusters_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_api_validation_queue_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_api_validation_queue_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1 to anon,authenticated,service_role;

revoke all on public.feya_commerce_v_seo_keyword_validation_export_us_en_v1 from public,anon,authenticated,service_role;

grant all on public.feya_commerce_v_seo_keyword_validation_export_us_en_v1 to anon,authenticated,service_role;

do $g$ begin if public.feya_commerce_metric_access_boundary_health_v1() is not null or public.feya_commerce_metric_reader_boundary_health_v1() is distinct from 'metric_reader_boundary_v1' then raise exception 'Rollback must close access and preserve reader isolation'; end if; end $g$;

commit;
