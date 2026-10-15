-- FEYA Growth OS preflight — ROLLBACK ONLY, no persistent test records.
-- Run only with service role and when no claimable production workflow exists.
-- This proves DB functions, not actual AI-agent execution.
BEGIN;
DO $smoke$
DECLARE
  c RECORD;
  c2 RECORD;
  w RECORD;
  w2 RECORD;
  cl RECORD;
  done RECORD;
  stored RECORD;
  event_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.feya_growth_workflow_runs_v1
             WHERE workflow_status IN ('READY','WAITING','RUNNING')) THEN
    RAISE EXCEPTION 'Cannot run rollback smoke when existing workflow may be claimed';
  END IF;
  SELECT * INTO STRICT c FROM public.feya_fn_create_growth_case_v1(
    p_case_type => 'IMPLEMENTATION_READINESS',
    p_title => 'Rollback-only workflow contract proof',
    p_business_question => 'Does a scoped shadow case retain state and receipts?',
    p_accountable_domain => 'CORE',p_priority => 'P3',
    p_maturity_state => 'PRE_LAUNCH',p_created_by_type => 'system',
    p_idempotency_key => 'preflight:growthcase-20261015-v1'
  );
  SELECT * INTO STRICT c2 FROM public.feya_fn_create_growth_case_v1(
    p_case_type => 'IMPLEMENTATION_READINESS',
    p_title => 'Rollback-only workflow contract proof',
    p_business_question => 'Does a scoped shadow case retain state and receipts?',
    p_accountable_domain => 'CORE',p_priority => 'P3',
    p_maturity_state => 'PRE_LAUNCH',p_created_by_type => 'system',
    p_idempotency_key => 'preflight:growthcase-20261015-v1'
  );
  IF NOT c.created_new OR c2.created_new OR c2.case_id <> c.case_id THEN
    RAISE EXCEPTION 'Growth Case idempotency regression';
  END IF;
  SELECT * INTO STRICT w FROM public.feya_fn_create_workflow_run_v1(
    p_case_id => c.case_id,p_expected_ownership_epoch => c.ownership_epoch,
    p_workflow_type => 'SHADOW_RUNTIME_PROOF',
    p_current_step_code => 'CHECKPOINT_VERIFY',
    p_state_json => '{"preflight":true}'::jsonb,
    p_max_retries => 1,p_created_by_type => 'system',
    p_idempotency_key => 'preflight:growthworkflow-20261015-v1'
  );
  SELECT * INTO STRICT w2 FROM public.feya_fn_create_workflow_run_v1(
    p_case_id => c.case_id,p_expected_ownership_epoch => c.ownership_epoch,
    p_workflow_type => 'SHADOW_RUNTIME_PROOF',
    p_current_step_code => 'CHECKPOINT_VERIFY',
    p_state_json => '{"preflight":true}'::jsonb,
    p_max_retries => 1,p_created_by_type => 'system',
    p_idempotency_key => 'preflight:growthworkflow-20261015-v1'
  );
  IF NOT w.created_new OR w2.created_new OR w2.workflow_run_id <> w.workflow_run_id THEN
    RAISE EXCEPTION 'Workflow idempotency regression';
  END IF;
  SELECT * INTO STRICT cl FROM public.feya_fn_claim_next_workflow_v1(
    p_worker_id => 'fe-smoke-rollback',p_lease_seconds => 60
  );
  IF cl.workflow_run_id <> w.workflow_run_id THEN
    RAISE EXCEPTION 'Claim returned unexpected workflow';
  END IF;
  SELECT * INTO STRICT done FROM public.feya_fn_complete_workflow_v1(
    p_workflow_run_id => w.workflow_run_id,p_worker_id => 'fe-smoke-rollback',
    p_result_state_patch => '{"verified":true}'::jsonb
  );
  SELECT * INTO STRICT stored FROM public.feya_growth_workflow_runs_v1
    WHERE workflow_run_id = w.workflow_run_id;
  SELECT count(*) INTO event_count FROM public.feya_growth_workflow_events_v1
    WHERE workflow_run_id = w.workflow_run_id;
  IF done.workflow_status <> 'COMPLETED' OR stored.lease_owner IS NOT NULL
     OR stored.state_json->>'verified' <> 'true'
     OR stored.state_json->>'preflight' <> 'true'
     OR event_count <> 3 THEN
    RAISE EXCEPTION 'Completion, checkpoint, lease or event regression';
  END IF;
END;
$smoke$;
SELECT 'PASS' AS verified, 'rollback-only canonical case/workflow preflight' AS scope;
ROLLBACK;
