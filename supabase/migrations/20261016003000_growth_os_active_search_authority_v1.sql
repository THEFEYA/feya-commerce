-- TheFEYA Growth OS: canonical ACTIVE Search Release evidence correction.
-- REPLACES ONLY the owner TSEO intake function from 20261016001500.
-- Earlier legacy indexability portfolio view must NEVER be used as live Search truth.
-- Atomic case/workflow creation; no model call, content mutation or Cron.
-- Assumes the initial owner TSEO shadow function is already installed.
-- The caller is a server-side owner-authenticated service client, never a browser RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.feya_fn_start_tseo_shadow_readiness_v1(
  p_actor_user_id uuid,
  p_business_question text,
  p_request_key uuid
)
RETURNS TABLE (
  case_id uuid,
  case_code text,
  workflow_run_id uuid,
  workflow_status text,
  created_new boolean,
  ownership_epoch integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $tseo_shadow_intake$
DECLARE
  v_question text := btrim(coalesce(p_business_question, ''));
  v_case record;
  v_workflow record;
  v_actor uuid;
  v_old_question text;
  v_key text;
BEGIN
  IF p_actor_user_id IS NULL OR p_request_key IS NULL THEN
    RAISE EXCEPTION 'shadow_intake_owner_or_request_missing';
  END IF;
  IF length(v_question) < 12 OR length(v_question) > 500 THEN
    RAISE EXCEPTION 'shadow_intake_invalid_question';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.feya_growth_role_activation_v1 a
    WHERE a.role_code='TSEO'
      AND a.runtime_status='SHADOW'
      AND (a.allowed_action_codes_json ? 'RECORD_INDEXABILITY_PROPOSAL')
  ) THEN
    RAISE EXCEPTION 'shadow_intake_role_not_available';
  END IF;

  v_key := 'shadow-tseo-indexability:'||p_request_key::text;
  -- Serialise retries with the same request key even across API instances.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  SELECT * INTO STRICT v_case
  FROM public.feya_fn_create_growth_case_v1(
    p_case_type => 'TSEO_INDEXABILITY_SHADOW',
    p_title => 'Сверка действующего Search Release',
    p_business_question => v_question,
    p_accountable_domain => 'TSEO',
    p_priority => 'P3',
    p_maturity_state => 'PRE_LAUNCH',
    p_entity_scope_json => jsonb_build_object(
      'source','feya_search_releases_v1',
      'source_authority','ACTIVE_SEARCH_RELEASE',
      'target_origin','https://thefeya.com',
      'change_allowed',false
    ),
    p_signal_refs_json => '[]'::jsonb,
    p_created_by_type => 'human',
    p_created_by_user_id => p_actor_user_id,
    p_idempotency_key => v_key
  );

  -- A retry is allowed only for the same owner and exact request.
  SELECT c.created_by_user_id,c.business_question
    INTO v_actor,v_old_question
  FROM public.feya_growth_cases_v1 c WHERE c.case_id=v_case.case_id;
  IF v_actor IS DISTINCT FROM p_actor_user_id
    OR v_old_question IS DISTINCT FROM v_question THEN
    RAISE EXCEPTION 'shadow_intake_request_reused_with_different_payload';
  END IF;

  SELECT * INTO STRICT v_workflow
  FROM public.feya_fn_create_workflow_run_v1(
    p_case_id => v_case.case_id,
    p_expected_ownership_epoch => v_case.ownership_epoch,
    p_workflow_type => 'RECORD_INDEXABILITY_PROPOSAL',
    p_current_step_code => 'VERIFY_ACTIVE_SEARCH_RELEASE',
    p_state_json => jsonb_build_object(
      'mode','SHADOW','dry_run',true,
      'template_code','TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1',
      'case_origin','OWNER_UI','model_calls_allowed',false,
      'production_mutations_allowed',false,
      'status_message','В очереди на сверку текущего Search Release без изменений сайта'
    ),
    p_max_retries => 1,
    p_created_by_type => 'human',
    p_created_by_user_id => p_actor_user_id,
    p_idempotency_key => v_key||':workflow'
  );

  RETURN QUERY SELECT v_case.case_id,v_case.case_code,v_workflow.workflow_run_id,
    v_workflow.workflow_status,(v_case.created_new AND v_workflow.created_new),
    v_case.ownership_epoch;
END;
$tseo_shadow_intake$;

REVOKE ALL ON FUNCTION public.feya_fn_start_tseo_shadow_readiness_v1(uuid,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_start_tseo_shadow_readiness_v1(uuid,text,uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
