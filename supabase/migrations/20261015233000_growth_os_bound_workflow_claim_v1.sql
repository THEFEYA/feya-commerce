-- TheFEYA Growth OS: scoped, role-gated claim for one exact workflow.
-- Additive: existing global feya_fn_claim_next_workflow_v1 remains unchanged.
-- Production activation is NOT granted: callable only by a trusted server-side
-- service_role dispatcher; browser callers never choose worker identity.
BEGIN;

CREATE OR REPLACE FUNCTION public.feya_fn_claim_bound_workflow_v1(
  p_workflow_run_id uuid,
  p_expected_case_id uuid,
  p_expected_ownership_epoch integer,
  p_expected_accountable_domain text,
  p_expected_workflow_type text,
  p_expected_step_code text,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS TABLE (
  workflow_run_id uuid,
  case_id uuid,
  ownership_epoch integer,
  workflow_type text,
  current_step_code text,
  state_json jsonb,
  attempt_count integer,
  retry_count integer,
  lease_expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $growth_bound_claim$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_case public.feya_growth_cases_v1%rowtype;
  v_run public.feya_growth_workflow_runs_v1%rowtype;
  v_role public.feya_growth_role_activation_v1%rowtype;
  v_from_status text;
BEGIN
  IF p_workflow_run_id IS NULL OR p_expected_case_id IS NULL
      OR p_expected_ownership_epoch IS NULL OR p_expected_ownership_epoch <= 0 THEN
    RAISE EXCEPTION 'growth_bound_claim_invalid_identity';
  END IF;

  IF nullif(btrim(coalesce(p_worker_id,'')),'') IS NULL
      OR length(p_worker_id) > 120
      OR nullif(btrim(coalesce(p_expected_accountable_domain,'')),'') IS NULL
      OR nullif(btrim(coalesce(p_expected_workflow_type,'')),'') IS NULL
      OR nullif(btrim(coalesce(p_expected_step_code,'')),'') IS NULL THEN
    RAISE EXCEPTION 'growth_bound_claim_invalid_scope';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'growth_bound_claim_invalid_lease';
  END IF;

  -- Inactive agents cannot claim work. No implicit CORE/HUMAN_OWNER role bypass.
  SELECT * INTO v_role FROM public.feya_growth_role_activation_v1 r
  WHERE r.role_code = p_expected_accountable_domain;
  IF NOT FOUND OR v_role.runtime_status NOT IN ('SHADOW','ACTIVE') THEN
    RAISE EXCEPTION 'growth_bound_claim_role_not_enabled';
  END IF;
  IF coalesce(v_role.allowed_action_codes_json,'[]'::jsonb) ? p_expected_workflow_type IS NOT TRUE THEN
    RAISE EXCEPTION 'growth_bound_claim_action_not_allowed';
  END IF;

  -- Lock case before workflow: a concurrent owner transfer cannot race claim.
  SELECT * INTO v_case FROM public.feya_growth_cases_v1 c
  WHERE c.case_id = p_expected_case_id FOR SHARE;
  IF NOT FOUND OR v_case.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
      OR v_case.current_accountable_domain IS DISTINCT FROM p_expected_accountable_domain
      OR v_case.case_status IN ('CLOSED','CANCELLED','BLOCKED','DEFERRED','NOT_OBSERVABLE') THEN
    RAISE EXCEPTION 'growth_bound_claim_case_stale_or_blocked';
  END IF;

  -- Claim EXACTLY the requested workflow; never the global "next" row.
  SELECT * INTO v_run FROM public.feya_growth_workflow_runs_v1 w
  WHERE w.workflow_run_id = p_workflow_run_id
  FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_run.case_id IS DISTINCT FROM p_expected_case_id
      OR v_run.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
      OR v_run.workflow_type IS DISTINCT FROM p_expected_workflow_type
      OR v_run.current_step_code IS DISTINCT FROM p_expected_step_code THEN
    RAISE EXCEPTION 'growth_bound_claim_workflow_scope_changed';
  END IF;

  -- SHADOW means real observation/proposal work without production effects.
  IF v_role.runtime_status = 'SHADOW'
      AND (v_run.state_json->>'mode' IS DISTINCT FROM 'SHADOW'
           OR v_run.state_json->>'dry_run' IS DISTINCT FROM 'true') THEN
    RAISE EXCEPTION 'growth_bound_claim_shadow_requires_dry_run';
  END IF;

  IF v_run.workflow_status = 'WAITING'
     AND (v_run.wake_at IS NULL OR v_run.wake_at > v_now) THEN
    RETURN;
  END IF;
  IF v_run.workflow_status = 'RUNNING'
     AND (v_run.lease_expires_at IS NULL OR v_run.lease_expires_at > v_now) THEN
    RETURN;
  END IF;
  IF v_run.workflow_status NOT IN ('READY','WAITING','RUNNING') THEN
    RETURN;
  END IF;

  -- Lost worker leases consume retry budget; do not retry crashed jobs forever.
  IF v_run.workflow_status = 'RUNNING' THEN
    IF v_run.retry_count >= v_run.max_retries THEN
      UPDATE public.feya_growth_workflow_runs_v1 w
      SET workflow_status='DEAD_LETTER',
          last_error='Worker lease expired after retry budget',
          lease_owner=NULL,lease_expires_at=NULL,wake_at=NULL,
          updated_at=v_now
      WHERE w.workflow_run_id = p_workflow_run_id;
      INSERT INTO public.feya_growth_workflow_events_v1(
        workflow_run_id,case_id,event_type,from_status,to_status,
        step_code,worker_id,reason,payload_json
      ) VALUES (
        v_run.workflow_run_id,v_run.case_id,'WORKFLOW_DEAD_LETTER','RUNNING','DEAD_LETTER',
        v_run.current_step_code,p_worker_id,'Lease retry budget exhausted',
        jsonb_build_object('prior_worker',v_run.lease_owner,'retries',v_run.retry_count)
      );
      RETURN;
    END IF;
    UPDATE public.feya_growth_workflow_runs_v1 w
    SET retry_count=w.retry_count+1
    WHERE w.workflow_run_id=p_workflow_run_id;
  END IF;

  v_from_status := v_run.workflow_status;
  UPDATE public.feya_growth_workflow_runs_v1 w
  SET workflow_status='RUNNING',
      attempt_count=w.attempt_count+1,
      lease_owner=p_worker_id,
      lease_expires_at=v_now + make_interval(secs=>p_lease_seconds),
      started_at=coalesce(w.started_at,v_now),
      wake_at=NULL,wait_reason=NULL,updated_at=v_now
  WHERE w.workflow_run_id=p_workflow_run_id
  RETURNING * INTO v_run;

  INSERT INTO public.feya_growth_workflow_events_v1(
    workflow_run_id,case_id,event_type,from_status,to_status,
    step_code,worker_id,reason,payload_json
  ) VALUES (
    v_run.workflow_run_id,v_run.case_id,'WORKFLOW_CLAIMED',
    v_from_status,'RUNNING',v_run.current_step_code,p_worker_id,
    'Scoped worker lease claimed',
    jsonb_build_object('ownership_epoch',v_run.ownership_epoch,
      'accountable_domain',p_expected_accountable_domain,
      'attempt_count',v_run.attempt_count,'retry_count',v_run.retry_count,
      'lease_expires_at',v_run.lease_expires_at)
  );

  RETURN QUERY SELECT v_run.workflow_run_id,v_run.case_id,
    v_run.ownership_epoch,v_run.workflow_type,v_run.current_step_code,
    v_run.state_json,v_run.attempt_count,v_run.retry_count,v_run.lease_expires_at;
END;
$growth_bound_claim$;

REVOKE ALL ON FUNCTION public.feya_fn_claim_bound_workflow_v1(
  uuid,uuid,integer,text,text,text,text,integer
) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_claim_bound_workflow_v1(
  uuid,uuid,integer,text,text,text,text,integer
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
