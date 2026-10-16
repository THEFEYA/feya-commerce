-- FEYA Growth OS: bounded, deterministic TSEO -> GMEL evidence preflight.
-- Purpose: validate ACTIVE Search Release source against completed TSEO snapshot,
-- persist one auditable handoff and result WITHOUT a paid AI call or autonomous
-- GMEL assertion. This does not measure actual Google indexing or ROI.
-- Only a trusted service_role server may execute. No schedules are enabled.
BEGIN;

CREATE OR REPLACE FUNCTION public.feya_fn_reconcile_tseo_gmel_release_v1(
  p_case_id uuid,
  p_expected_ownership_epoch integer,
  p_source_workflow_run_id uuid
)
RETURNS TABLE(
  handoff_id uuid,
  handoff_status text,
  created_new boolean,
  review_method text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $growth_gmel_preflight$
DECLARE
  v_case public.feya_growth_cases_v1%rowtype;
  v_run public.feya_growth_workflow_runs_v1%rowtype;
  v_release public.feya_search_releases_v1%rowtype;
  v_existing public.feya_growth_handoffs_v1%rowtype;
  v_handoff record;
  v_result record;
  v_receipt jsonb;
  v_total integer;
  v_unique_pages integer;
  v_unique_paths integer;
  v_index integer;
  v_noindex integer;
  v_invalid integer;
  v_product_rows integer;
  v_product_unique integer;
  v_bindings integer;
  v_missing_bindings integer;
  v_extra_products integer;
  v_key text;
  v_question text := 'Проверить границы доказательств ACTIVE Search Release: намерения index/noindex не равны фактической индексации Google или бизнес-результату';
  v_method text := 'AUTOMATED_SQL_RECONCILIATION_NO_LLM';
BEGIN
  IF p_case_id IS NULL OR p_source_workflow_run_id IS NULL
      OR p_expected_ownership_epoch IS NULL OR p_expected_ownership_epoch <= 0 THEN
    RAISE EXCEPTION 'growth_gmel_preflight_invalid_identity';
  END IF;

  -- Serialize retries and transfers before inspecting any independent evidence.
  SELECT * INTO v_case FROM public.feya_growth_cases_v1 c
    WHERE c.case_id = p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.case_type <> 'TSEO_INDEXABILITY_SHADOW'
      OR v_case.current_accountable_domain <> 'TSEO'
      OR v_case.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
      OR v_case.case_status IN ('CLOSED','CANCELLED','BLOCKED','DEFERRED','NOT_OBSERVABLE') THEN
    RAISE EXCEPTION 'growth_gmel_preflight_case_stale_or_ineligible';
  END IF;

  SELECT * INTO v_run FROM public.feya_growth_workflow_runs_v1 w
    WHERE w.workflow_run_id=p_source_workflow_run_id AND w.case_id=p_case_id
    FOR SHARE;
  IF NOT FOUND OR v_run.ownership_epoch IS DISTINCT FROM v_case.ownership_epoch
      OR v_run.workflow_status <> 'COMPLETED'
      OR v_run.workflow_type <> 'RECORD_INDEXABILITY_PROPOSAL'
      OR v_run.current_step_code <> 'VERIFY_ACTIVE_SEARCH_RELEASE'
      OR v_run.state_json->>'mode' <> 'SHADOW'
      OR v_run.state_json->>'dry_run' <> 'true'
      OR v_run.state_json->>'production_mutations_allowed' <> 'false' THEN
    RAISE EXCEPTION 'growth_gmel_preflight_missing_verified_tseo_step';
  END IF;
  v_receipt := v_run.state_json->'indexability_receipt';
  IF v_receipt IS NULL OR jsonb_typeof(v_receipt) <> 'object'
      OR v_receipt->>'template' <> 'TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1'
      OR v_receipt->>'source' <> 'feya_search_releases_v1:ACTIVE'
      OR v_receipt->>'coverage' <> 'COMPLETE'
      OR v_receipt->>'changes_applied' <> '0'
      OR v_receipt->>'model_calls' <> '0' THEN
    RAISE EXCEPTION 'growth_gmel_preflight_missing_source_receipt';
  END IF;

  -- A previous human-reviewed handoff for THIS workflow is preserved.
  -- New deterministic attempts must never erase or supersede a human review.
  SELECT * INTO v_existing FROM public.feya_growth_handoffs_v1 h
    WHERE h.case_id=p_case_id AND h.ownership_epoch=v_case.ownership_epoch
      AND h.source_domain='TSEO' AND h.target_domain='GMEL'
      AND h.evidence_json->>'original_workflow_run_id'=p_source_workflow_run_id::text
      AND h.handoff_status NOT IN ('CANCELLED','DEAD_LETTER')
    ORDER BY h.created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing.handoff_id,v_existing.handoff_status,
      false, 'EXISTING_REVIEW_PRESERVED'::text;
    RETURN;
  END IF;

  -- Only the existing approved GMEL role may receive this preflight.
  IF NOT EXISTS (
    SELECT 1 FROM public.feya_growth_role_activation_v1 r
    WHERE r.role_code='GMEL' AND r.runtime_status IN ('SHADOW','ACTIVE')
      AND r.allowed_action_codes_json ? 'RECORD_LEARNING_EVIDENCE'
  ) THEN
    RAISE EXCEPTION 'growth_gmel_preflight_gmel_role_not_allowed';
  END IF;

  SELECT * INTO STRICT v_release
    FROM public.feya_search_releases_v1 r WHERE r.release_status='ACTIVE';
  IF v_release.target_origin <> 'https://thefeya.com'
      OR v_release.release_version IS NULL OR v_release.release_version <= 0
      OR v_receipt->>'release_code' IS DISTINCT FROM v_release.release_code
      OR v_receipt->>'release_version' IS DISTINCT FROM v_release.release_version::text
      OR v_receipt->>'target_origin' IS DISTINCT FROM v_release.target_origin THEN
    RAISE EXCEPTION 'growth_gmel_preflight_release_changed_since_tseo';
  END IF;

  SELECT count(*)::integer, count(DISTINCT i.seo_page_id)::integer,
    count(DISTINCT i.url_path_snapshot)::integer,
    count(*) FILTER(WHERE i.intended_index_state='index')::integer,
    count(*) FILTER(WHERE i.intended_index_state='noindex')::integer,
    count(*) FILTER(WHERE i.intended_index_state NOT IN ('index','noindex')
      OR i.intended_index_state IS NULL)::integer,
    count(*) FILTER(WHERE i.page_type_snapshot='product')::integer,
    count(DISTINCT i.canonical_product_id)
      FILTER(WHERE i.page_type_snapshot='product')::integer
    INTO v_total,v_unique_pages,v_unique_paths,v_index,v_noindex,
      v_invalid,v_product_rows,v_product_unique
  FROM public.feya_search_release_items_v1 i
  WHERE i.release_id=v_release.release_id;

  SELECT count(*)::integer INTO v_bindings
    FROM public.feya_storefront_approved_product_bindings_v1;

  SELECT count(*)::integer INTO v_missing_bindings
    FROM public.feya_storefront_approved_product_bindings_v1 b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.feya_search_release_items_v1 i
      WHERE i.release_id=v_release.release_id
        AND i.canonical_product_id=b.canonical_product_id
        AND i.page_type_snapshot='product'
    );
  SELECT count(*)::integer INTO v_extra_products
    FROM public.feya_search_release_items_v1 i
    WHERE i.release_id=v_release.release_id
      AND i.page_type_snapshot='product'
      AND NOT EXISTS (
        SELECT 1 FROM public.feya_storefront_approved_product_bindings_v1 b
        WHERE b.canonical_product_id=i.canonical_product_id
      );

  IF v_total < 1 OR v_invalid <> 0 OR v_total <> v_index+v_noindex
    OR v_total <> v_unique_pages OR v_total <> v_unique_paths
    OR v_product_rows <> v_product_unique OR v_product_rows <> v_bindings
    OR v_missing_bindings <> 0 OR v_extra_products <> 0
    OR v_receipt->>'intended_urls_counted' IS DISTINCT FROM v_total::text
    OR v_receipt->>'intended_index' IS DISTINCT FROM v_index::text
    OR v_receipt->>'intended_noindex' IS DISTINCT FROM v_noindex::text
    OR v_receipt->>'approved_product_bindings' IS DISTINCT FROM v_bindings::text THEN
    RAISE EXCEPTION 'growth_gmel_preflight_source_reconciliation_failed';
  END IF;

  v_key := 'growth:auto-gmel-preflight:'||p_source_workflow_run_id::text
    ||':epoch:'||p_expected_ownership_epoch::text;

  SELECT * INTO STRICT v_handoff
  FROM public.feya_fn_create_growth_handoff_v1(
    p_case_id=>p_case_id,
    p_expected_ownership_epoch=>p_expected_ownership_epoch,
    p_source_domain=>'TSEO',
    p_target_domain=>'GMEL',
    p_handoff_mode=>'SERVICE',
    p_question=>v_question,
    p_evidence_json=>jsonb_build_object(
      'source','ACTIVE_SEARCH_RELEASE',
      'release_code',v_release.release_code,
      'release_version',v_release.release_version,
      'original_workflow_run_id',p_source_workflow_run_id,
      'index_intended',v_index,
      'noindex_intended',v_noindex,
      'approved_product_bindings',v_bindings,
      'verified_at',clock_timestamp()
    ),
    p_known_facts_json=>jsonb_build_array(
      'ACTIVE release intent reconciled to canonical SEO page and product IDs',
      'This is a deterministic programmatic source check, not a GMEL LLM'),
    p_known_unknowns_json=>jsonb_build_array(
      'Google actual indexed URLs are unknown without live GSC',
      'Organic clicks and conversion are not yet measured with reliable data'),
    p_expected_output_schema_code=>'GMEL_RELEASE_EVIDENCE_SCOPE_V1',
    p_expected_output_schema_json=>'{"type":"object","required":["verdict","scope","actual_google_indexing_observable","independent_review_method","notes"],"properties":{"verdict":{"type":"string"},"scope":{"type":"string"},"actual_google_indexing_observable":{"type":"boolean"},"independent_review_method":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
    p_case_handoff_budget=>8,
    p_created_by_type=>'system',
    p_idempotency_key=>v_key
  );
  IF v_handoff.handoff_status <> 'OPEN' THEN
    RETURN QUERY SELECT v_handoff.handoff_id,v_handoff.handoff_status,
      false,'EXISTING_HANDOFF'::text;
    RETURN;
  END IF;

  SELECT * INTO STRICT v_result
  FROM public.feya_fn_complete_growth_handoff_v1(
    p_handoff_id=>v_handoff.handoff_id,
    p_result_status=>'COMPLETED',
    p_result_json=>jsonb_build_object(
      'verdict','INTERNAL_RELEASE_CONSISTENCY_PASS',
      'scope','ACTIVE_SEARCH_RELEASE_INTENT_ONLY',
      'actual_google_indexing_observable',false,
      'independent_review_method',v_method,
      'notes','Deterministic server-side reconciliation of release URL identities, index/noindex intent and approved product bindings; NOT an autonomous GMEL model and NOT a business outcome.',
      'evidence_level','L0_OBSERVATION',
      'business_outcome_state','NOT_MEASURABLE',
      'release_code',v_release.release_code,
      'release_version',v_release.release_version,
      'intended_index',v_index,
      'intended_noindex',v_noindex,
      'unique_urls',v_unique_paths,
      'approved_product_bindings',v_bindings,
      'original_workflow_run_id',p_source_workflow_run_id,
      'autonomous_gmel_agent_executed',false,
      'deterministic_core_preflight_executed',true,
      'model_calls',0,
      'changes_applied',0
    ),
    p_result_reason=>'Автоматическая проверка исходных фактов выполнена Core SQL. Содержательное независимое AI-рассуждение GMEL и бизнес-измерения НЕ проводились.',
    p_actor_domain=>'GMEL'
  );
  IF v_result.stale_result IS DISTINCT FROM FALSE
      OR v_result.handoff_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'growth_gmel_preflight_handoff_unexpected_completion';
  END IF;

  RETURN QUERY SELECT v_handoff.handoff_id,v_result.handoff_status,
    v_handoff.created_new,v_method;
END;
$growth_gmel_preflight$;

REVOKE ALL ON FUNCTION public.feya_fn_reconcile_tseo_gmel_release_v1(uuid,integer,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_reconcile_tseo_gmel_release_v1(uuid,integer,uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
