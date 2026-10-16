-- FEYA Growth OS: durable GMEL semantic-work lease, dormant and service-only.
-- Reuses canonical Growth Case/Handoff/Workflow/Events + approved AI spend policies.
-- This function NEVER reserves dollars, sends a provider request, completes a
-- handoff, changes SEO or enables Cron. It fails closed on missing trustworthy data.
BEGIN;

CREATE OR REPLACE FUNCTION public.feya_fn_claim_gmel_semantic_handoff_v1(
  p_case_id uuid,
  p_handoff_id uuid,
  p_expected_ownership_epoch integer,
  p_policy_id uuid,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 180
)
RETURNS TABLE(
  workflow_run_id uuid,
  case_id uuid,
  handoff_id uuid,
  workflow_status text,
  created_new boolean,
  attempt_count integer,
  retry_count integer,
  lease_expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $feya_gmel_lease$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_case public.feya_growth_cases_v1%rowtype;
  v_handoff public.feya_growth_handoffs_v1%rowtype;
  v_policy public.feya_growth_ai_budget_policies_v1%rowtype;
  v_run public.feya_growth_workflow_runs_v1%rowtype;
  v_created record;
  v_created_new boolean := false;
  v_scope text;
  v_required text[];
  v_code text;
  v_matches integer;
  v_fresh boolean;
  v_before text;
  v_key text;
BEGIN
  IF p_case_id IS NULL OR p_handoff_id IS NULL OR p_policy_id IS NULL
    OR p_expected_ownership_epoch IS NULL OR p_expected_ownership_epoch<1
    OR nullif(btrim(coalesce(p_worker_id,'')),'') IS NULL
    OR length(p_worker_id)>120 OR p_worker_id IS DISTINCT FROM btrim(p_worker_id)
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 60 AND 600 THEN
    RAISE EXCEPTION 'GMEL_LEASE_INVALID_INPUT';
  END IF;

  -- Current owner is TSEO even for a collaborating GMEL reviewer.
  -- The old role-bound claim assumes case owner = executor, so it MUST NOT
  -- be used for this handoff; this function checks the recipient explicitly.
  SELECT * INTO v_case FROM public.feya_growth_cases_v1 c
    WHERE c.case_id=p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.case_status NOT IN ('OPEN','TRIAGED','INVESTIGATING')
    OR v_case.current_accountable_domain<>'TSEO'
    OR v_case.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch THEN
    RAISE EXCEPTION 'GMEL_LEASE_CASE_NOT_ELIGIBLE';
  END IF;

  SELECT * INTO v_handoff FROM public.feya_growth_handoffs_v1 h
    WHERE h.handoff_id=p_handoff_id FOR UPDATE;
  IF NOT FOUND OR v_handoff.case_id IS DISTINCT FROM p_case_id
    OR v_handoff.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
    OR v_handoff.source_domain<>'TSEO' OR v_handoff.target_domain<>'GMEL'
    OR v_handoff.handoff_status<>'OPEN'
    OR v_handoff.handoff_mode<>'SERVICE'
    OR v_handoff.expected_output_schema_code<>'GMEL_SEMANTIC_EVIDENCE_V1'
    OR jsonb_typeof(v_handoff.expected_output_schema_json)<>'object'
    OR v_handoff.expected_output_schema_json='{}'::jsonb
    OR length(btrim(v_handoff.question))<12
    OR (v_handoff.expires_at IS NOT NULL AND v_handoff.expires_at<=v_now) THEN
    RAISE EXCEPTION 'GMEL_LEASE_HANDOFF_NOT_ELIGIBLE';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.feya_growth_role_activation_v1 r
    WHERE r.role_code='GMEL' AND r.runtime_status IN ('SHADOW','ACTIVE')
      AND r.allowed_action_codes_json ? 'RECORD_LEARNING_EVIDENCE'
  ) THEN
    RAISE EXCEPTION 'GMEL_LEASE_ROLE_NOT_ENABLED';
  END IF;

  v_scope := v_handoff.evidence_json->>'analysis_purpose';
  IF v_scope='SEARCH_PERFORMANCE' THEN
    v_required:=ARRAY['ORGANIC_SEARCH_PERFORMANCE'];
  ELSIF v_scope='COMMERCIAL_OUTCOME' THEN
    v_required:=ARRAY[
      'ORGANIC_SEARCH_PERFORMANCE','BEHAVIORAL_ANALYTICS',
      'COMMERCE_ORDER_TRUTH','COMMERCE_REVENUE_TRUTH'];
  ELSE
    RAISE EXCEPTION 'GMEL_LEASE_PURPOSE_UNSUPPORTED';
  END IF;

  -- Derive admissibility again INSIDE SQL; no browser/LLM-supplied "fresh" flag.
  FOREACH v_code IN ARRAY v_required LOOP
    SELECT count(*),
      coalesce(bool_and(
        s.health_state='HEALTHY' AND s.freshness_state='FRESH'
        AND s.checked_at IS NOT NULL AND s.checked_at<=v_now
        AND s.checked_at>=v_now-interval '7 days'
      ),false)
    INTO v_matches,v_fresh
    FROM public.feya_commerce_v_data_source_health_effective_safe_v2 s
    WHERE s.source_code=v_code;
    IF v_matches<>1 OR NOT v_fresh THEN
      RAISE EXCEPTION 'GMEL_LEASE_SOURCE_NOT_VERIFIED: %',v_code;
    END IF;
  END LOOP;

  -- No implicit cost, model downgrade or subscription entitlements. An enabled
  -- price contract with real Human Owner approval is a minimum, not permission
  -- to send a model request. The spending RPC must later RESERVE atomically.
  SELECT * INTO v_policy FROM public.feya_growth_ai_budget_policies_v1 b
    WHERE b.policy_id=p_policy_id FOR SHARE;
  IF NOT FOUND OR NOT v_policy.enabled
    OR v_policy.approved_by_user_id IS NULL
    OR v_policy.approved_at IS NULL OR v_policy.approved_at>v_now
    OR v_policy.expires_at IS NULL OR v_policy.expires_at<=v_now
    OR v_policy.purpose<>'GMEL_SEMANTIC_EVIDENCE_V1' THEN
    RAISE EXCEPTION 'GMEL_LEASE_OWNER_BUDGET_REQUIRED';
  END IF;

  v_key:='growth:gmel-semantic:'||p_handoff_id::text
    ||':epoch:'||p_expected_ownership_epoch::text;
  SELECT * INTO STRICT v_created
  FROM public.feya_fn_create_workflow_run_v1(
    p_case_id=>p_case_id,
    p_expected_ownership_epoch=>p_expected_ownership_epoch,
    p_workflow_type=>'GMEL_SEMANTIC_EVIDENCE_V1',
    p_current_step_code=>'MODEL_REVIEW',
    p_state_json=>jsonb_build_object(
      'handoff_id',p_handoff_id,'analysis_purpose',v_scope,
      'mode','SHADOW','dry_run',true,
      'budget_policy_id',p_policy_id,
      'model_state','NOT_SENT',
      'production_mutations_allowed',false
    ),
    p_max_retries=>1,
    p_created_by_type=>'system',
    p_idempotency_key=>v_key
  );
  v_created_new:=v_created.created_new;

  SELECT * INTO v_run FROM public.feya_growth_workflow_runs_v1 w
    WHERE w.workflow_run_id=v_created.workflow_run_id FOR UPDATE;
  IF NOT FOUND OR v_run.case_id IS DISTINCT FROM p_case_id
    OR v_run.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
    OR v_run.workflow_type<>'GMEL_SEMANTIC_EVIDENCE_V1'
    OR v_run.current_step_code<>'MODEL_REVIEW'
    OR v_run.state_json->>'handoff_id' IS DISTINCT FROM p_handoff_id::text
    OR v_run.state_json->>'analysis_purpose' IS DISTINCT FROM v_scope
    OR v_run.state_json->>'budget_policy_id' IS DISTINCT FROM p_policy_id::text
    OR v_run.state_json->>'mode' IS DISTINCT FROM 'SHADOW'
    OR v_run.state_json->>'dry_run' IS DISTINCT FROM 'true'
    OR v_run.state_json->>'production_mutations_allowed' IS DISTINCT FROM 'false'
  THEN
    RAISE EXCEPTION 'GMEL_LEASE_WORKFLOW_SCOPE_MISMATCH';
  END IF;

  IF v_run.workflow_status='WAITING'
    AND (v_run.wake_at IS NULL OR v_run.wake_at>v_now) THEN RETURN; END IF;
  IF v_run.workflow_status='RUNNING'
    AND (v_run.lease_expires_at IS NULL OR v_run.lease_expires_at>v_now) THEN RETURN; END IF;
  IF v_run.workflow_status NOT IN ('READY','WAITING','RUNNING') THEN RETURN; END IF;

  -- Fail safe if even a RESERVED attempt exists: after a worker crash we
  -- cannot assume the provider request was never sent. No silent re-spending.
  IF EXISTS (
    SELECT 1 FROM public.feya_growth_ai_spend_reservations_v1 b
    WHERE b.handoff_id=p_handoff_id
      AND b.status IN ('RESERVED','SUBMITTED','SETTLED','UNCERTAIN')
  ) THEN
    IF v_run.workflow_status='RUNNING'
      AND v_run.lease_expires_at<=v_now THEN
      UPDATE public.feya_growth_workflow_runs_v1 w
      SET workflow_status='BLOCKED',
        wait_reason='GMEL_SPEND_RESERVATION_NEEDS_REVIEW',
        lease_owner=NULL,lease_expires_at=NULL,updated_at=v_now
      WHERE w.workflow_run_id=v_run.workflow_run_id;
      INSERT INTO public.feya_growth_workflow_events_v1(
        workflow_run_id,case_id,event_type,from_status,to_status,
        step_code,worker_id,reason,payload_json
      ) VALUES(
        v_run.workflow_run_id,p_case_id,'WORKFLOW_BLOCKED','RUNNING','BLOCKED',
        'MODEL_REVIEW',p_worker_id,'Reservation present: no automatic replay',
        jsonb_build_object('handoff_id',p_handoff_id,'budget_policy_id',p_policy_id)
      );
    END IF;
    RETURN;
  END IF;

  IF v_run.workflow_status='RUNNING' THEN
    IF v_run.retry_count>=v_run.max_retries THEN
      UPDATE public.feya_growth_workflow_runs_v1 w
      SET workflow_status='DEAD_LETTER',
        last_error='GMEL worker lease expired after retry ceiling',
        lease_owner=NULL,lease_expires_at=NULL,updated_at=v_now
      WHERE w.workflow_run_id=v_run.workflow_run_id;
      INSERT INTO public.feya_growth_workflow_events_v1(
        workflow_run_id,case_id,event_type,from_status,to_status,
        step_code,worker_id,reason,payload_json
      ) VALUES (
        v_run.workflow_run_id,p_case_id,'WORKFLOW_DEAD_LETTER','RUNNING','DEAD_LETTER',
        'MODEL_REVIEW',p_worker_id,'Retry ceiling exhausted before provider send',
        jsonb_build_object('handoff_id',p_handoff_id)
      );
      RETURN;
    END IF;
    UPDATE public.feya_growth_workflow_runs_v1 w
    SET retry_count=w.retry_count+1 WHERE w.workflow_run_id=v_run.workflow_run_id;
  END IF;

  v_before:=v_run.workflow_status;
  UPDATE public.feya_growth_workflow_runs_v1 w
  SET workflow_status='RUNNING',attempt_count=w.attempt_count+1,
    lease_owner=p_worker_id,
    lease_expires_at=v_now+make_interval(secs=>p_lease_seconds),
    wake_at=NULL,wait_reason=NULL,
    started_at=coalesce(w.started_at,v_now),updated_at=v_now
  WHERE w.workflow_run_id=v_run.workflow_run_id RETURNING * INTO v_run;

  INSERT INTO public.feya_growth_workflow_events_v1(
    workflow_run_id,case_id,event_type,from_status,to_status,
    step_code,worker_id,reason,payload_json
  ) VALUES(
    v_run.workflow_run_id,p_case_id,'WORKFLOW_CLAIMED',v_before,'RUNNING',
    'MODEL_REVIEW',p_worker_id,
    'GMEL handoff scoped lease; budget reservation and provider send NOT yet authorised',
    jsonb_build_object('handoff_id',p_handoff_id,'epoch',p_expected_ownership_epoch,
      'attempt_count',v_run.attempt_count,'retry_count',v_run.retry_count)
  );

  RETURN QUERY SELECT v_run.workflow_run_id,v_run.case_id,p_handoff_id,
    v_run.workflow_status,v_created_new,v_run.attempt_count,
    v_run.retry_count,v_run.lease_expires_at;
END;
$feya_gmel_lease$;

REVOKE ALL ON FUNCTION public.feya_fn_claim_gmel_semantic_handoff_v1(
  uuid,uuid,integer,uuid,text,integer)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_claim_gmel_semantic_handoff_v1(
  uuid,uuid,integer,uuid,text,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;