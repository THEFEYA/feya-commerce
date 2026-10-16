-- FEYA Growth OS — atomic AI budget gate, dormant by default.
-- NO policies / provider calls are created or enabled by this migration.
-- Financial commitment needs a genuine owner-approved future policy and an
-- already-running, role-bound leased GMEL workflow. Use service_role ONLY.
BEGIN;

CREATE TABLE IF NOT EXISTS public.feya_growth_ai_budget_policies_v1 (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose='GMEL_SEMANTIC_EVIDENCE_V1'),
  provider text NOT NULL CHECK (provider IN ('OPENAI','ANTHROPIC')),
  model_id text NOT NULL CHECK (length(model_id) BETWEEN 2 AND 100),
  price_contract_version text NOT NULL CHECK (length(price_contract_version) BETWEEN 1 AND 120),
  input_usd_per_million numeric(14,6) NOT NULL CHECK (input_usd_per_million>0),
  output_usd_per_million numeric(14,6) NOT NULL CHECK (output_usd_per_million>0),
  max_total_usd numeric(14,6) NOT NULL CHECK (max_total_usd>0),
  max_single_call_usd numeric(14,6) NOT NULL CHECK (max_single_call_usd>0),
  max_input_tokens integer NOT NULL CHECK (max_input_tokens>0),
  max_output_tokens integer NOT NULL CHECK (max_output_tokens>0),
  enabled boolean NOT NULL DEFAULT false,
  approved_by_user_id uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feya_ai_budget_approval_complete CHECK (
    NOT enabled OR (
      approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL AND
      expires_at IS NOT NULL AND expires_at>approved_at AND
      max_single_call_usd<=max_total_usd
    )
  )
);
CREATE TABLE IF NOT EXISTS public.feya_growth_ai_spend_reservations_v1 (
  reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.feya_growth_ai_budget_policies_v1(policy_id),
  case_id uuid NOT NULL REFERENCES public.feya_growth_cases_v1(case_id),
  handoff_id uuid NOT NULL REFERENCES public.feya_growth_handoffs_v1(handoff_id),
  workflow_run_id uuid NOT NULL REFERENCES public.feya_growth_workflow_runs_v1(workflow_run_id),
  ownership_epoch integer NOT NULL CHECK(ownership_epoch>0),
  worker_id text NOT NULL CHECK(length(worker_id) BETWEEN 1 AND 120),
  request_key text NOT NULL UNIQUE CHECK(length(request_key) BETWEEN 16 AND 180),
  request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
  input_max_tokens integer NOT NULL CHECK(input_max_tokens>0),
  output_max_tokens integer NOT NULL CHECK(output_max_tokens>0),
  reserved_usd numeric(14,6) NOT NULL CHECK(reserved_usd>0),
  -- Freeze pricing when reserving so later policy edits cannot rewrite history.
  provider text NOT NULL,
  model_id text NOT NULL,
  price_contract_version text NOT NULL,
  input_usd_per_million numeric(14,6) NOT NULL,
  output_usd_per_million numeric(14,6) NOT NULL,
  status text NOT NULL DEFAULT 'RESERVED'
    CHECK(status IN ('RESERVED','SUBMITTED','SETTLED','UNCERTAIN','RELEASED')),
  actual_input_tokens integer CHECK(actual_input_tokens>=0),
  actual_output_tokens integer CHECK(actual_output_tokens>=0),
  charged_usd numeric(14,6) CHECK(charged_usd>=0),
  provider_response_id text CHECK(length(provider_response_id)<=180),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  settled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feya_ai_reservation_result_consistency CHECK(
    (status='SETTLED' AND charged_usd IS NOT NULL AND settled_at IS NOT NULL)
    OR (status<>'SETTLED' AND charged_usd IS NULL)
  )
);
-- One paid-attempt budget reservation per handoff; any retry reuses its key.
CREATE UNIQUE INDEX IF NOT EXISTS feya_growth_ai_spend_one_handoff_v1
  ON public.feya_growth_ai_spend_reservations_v1(handoff_id)
  WHERE status IN ('RESERVED','SUBMITTED','SETTLED','UNCERTAIN');
CREATE INDEX IF NOT EXISTS feya_growth_ai_spend_by_budget_v1
  ON public.feya_growth_ai_spend_reservations_v1(policy_id,status);

ALTER TABLE public.feya_growth_ai_budget_policies_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feya_growth_ai_spend_reservations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feya_growth_ai_budget_policies_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.feya_growth_ai_spend_reservations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.feya_growth_ai_budget_policies_v1 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.feya_growth_ai_spend_reservations_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.feya_fn_reserve_gmel_ai_spend_v1(
 p_budget_id uuid, p_case_id uuid, p_handoff_id uuid, p_workflow_run_id uuid,
 p_expected_epoch integer, p_worker_id text, p_request_key text,
 p_request_sha256 text, p_max_input_tokens integer, p_max_output_tokens integer
)
RETURNS TABLE(reservation_id uuid, reservation_status text,
  reserved_usd numeric, call_allowed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $feya_reserve$
DECLARE
 v_case public.feya_growth_cases_v1%rowtype;
 v_h public.feya_growth_handoffs_v1%rowtype;
 v_w public.feya_growth_workflow_runs_v1%rowtype;
 v_policy public.feya_growth_ai_budget_policies_v1%rowtype;
 v_prev public.feya_growth_ai_spend_reservations_v1%rowtype;
 v_created public.feya_growth_ai_spend_reservations_v1%rowtype;
 v_committed numeric(14,6);
 v_max numeric(14,6);
 v_now timestamptz:=clock_timestamp();
BEGIN
 IF p_budget_id IS NULL OR p_case_id IS NULL OR p_handoff_id IS NULL OR p_workflow_run_id IS NULL
    OR p_expected_epoch IS NULL OR p_expected_epoch<=0
    OR length(btrim(coalesce(p_worker_id,''))) NOT BETWEEN 1 AND 120
    OR length(btrim(coalesce(p_request_key,''))) NOT BETWEEN 16 AND 180
    OR p_request_key IS DISTINCT FROM btrim(p_request_key)
    OR p_worker_id IS DISTINCT FROM btrim(p_worker_id)
    OR p_request_sha256 IS NULL OR p_request_sha256 !~ '^[0-9a-f]{64}$'
    OR p_max_input_tokens IS NULL OR p_max_input_tokens<=0
    OR p_max_output_tokens IS NULL OR p_max_output_tokens<=0 THEN
   RAISE EXCEPTION 'GMEL_BUDGET_INVALID_REQUEST';
 END IF;
 SELECT * INTO v_case FROM public.feya_growth_cases_v1 c WHERE c.case_id=p_case_id FOR SHARE;
 IF NOT FOUND OR v_case.case_status NOT IN ('OPEN','TRIAGED','INVESTIGATING')
   OR v_case.current_accountable_domain<>'TSEO'
   OR v_case.ownership_epoch IS DISTINCT FROM p_expected_epoch THEN
   RAISE EXCEPTION 'GMEL_BUDGET_CASE_STALE';
 END IF;
 SELECT * INTO v_h FROM public.feya_growth_handoffs_v1 h
 WHERE h.handoff_id=p_handoff_id FOR SHARE;
 IF NOT FOUND OR v_h.case_id<>p_case_id OR v_h.ownership_epoch<>p_expected_epoch
   OR v_h.source_domain<>'TSEO' OR v_h.target_domain<>'GMEL'
   OR v_h.handoff_status<>'OPEN' THEN
   RAISE EXCEPTION 'GMEL_BUDGET_HANDOFF_NOT_OPEN';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.feya_growth_role_activation_v1 r
   WHERE r.role_code='GMEL' AND r.runtime_status IN ('SHADOW','ACTIVE')
     AND r.allowed_action_codes_json ? 'RECORD_LEARNING_EVIDENCE') THEN
   RAISE EXCEPTION 'GMEL_BUDGET_ROLE_NOT_ALLOWED';
 END IF;
 SELECT * INTO v_w FROM public.feya_growth_workflow_runs_v1 w
 WHERE w.workflow_run_id=p_workflow_run_id FOR SHARE;
 IF NOT FOUND OR v_w.case_id<>p_case_id OR v_w.ownership_epoch<>p_expected_epoch
   OR v_w.workflow_type<>'GMEL_SEMANTIC_EVIDENCE_V1'
   OR v_w.current_step_code<>'MODEL_REVIEW'
   OR v_w.workflow_status<>'RUNNING'
   OR v_w.lease_owner IS DISTINCT FROM p_worker_id
   OR v_w.lease_expires_at IS NULL OR v_w.lease_expires_at<=v_now
   OR v_w.state_json->>'handoff_id' IS DISTINCT FROM p_handoff_id::text
   OR v_w.state_json->>'mode' IS DISTINCT FROM 'SHADOW'
   OR v_w.state_json->>'dry_run' IS DISTINCT FROM 'true' THEN
   RAISE EXCEPTION 'GMEL_BUDGET_UNLEASED_WORK';
 END IF;

 -- Lock the budget policy to serialise ALL concurrent reservations for it.
 SELECT * INTO v_policy FROM public.feya_growth_ai_budget_policies_v1 b
 WHERE b.policy_id=p_budget_id FOR UPDATE;
 IF NOT FOUND OR NOT v_policy.enabled OR v_policy.approved_by_user_id IS NULL
   OR v_policy.approved_at IS NULL OR v_policy.approved_at>v_now
   OR v_policy.expires_at IS NULL OR v_policy.expires_at<=v_now
   OR v_policy.purpose<>'GMEL_SEMANTIC_EVIDENCE_V1' THEN
   RAISE EXCEPTION 'GMEL_BUDGET_OWNER_APPROVAL_MISSING';
 END IF;
 IF p_max_input_tokens>v_policy.max_input_tokens
   OR p_max_output_tokens>v_policy.max_output_tokens THEN
   RAISE EXCEPTION 'GMEL_BUDGET_TOKEN_CEILING';
 END IF;

 SELECT * INTO v_prev FROM public.feya_growth_ai_spend_reservations_v1 s
 WHERE s.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
   IF v_prev.policy_id<>p_budget_id OR v_prev.case_id<>p_case_id
      OR v_prev.handoff_id<>p_handoff_id OR v_prev.workflow_run_id<>p_workflow_run_id
      OR v_prev.ownership_epoch<>p_expected_epoch OR v_prev.worker_id<>p_worker_id
      OR v_prev.request_sha256<>p_request_sha256
      OR v_prev.input_max_tokens<>p_max_input_tokens
      OR v_prev.output_max_tokens<>p_max_output_tokens THEN
     RAISE EXCEPTION 'GMEL_BUDGET_IDEMPOTENCY_CONFLICT';
   END IF;
   -- Replaying a reservation does NOT grant permission to send again.
   RETURN QUERY SELECT v_prev.reservation_id,v_prev.status,v_prev.reserved_usd,false;
   RETURN;
 END IF;

 v_max:=ceil((p_max_input_tokens::numeric*v_policy.input_usd_per_million+
               p_max_output_tokens::numeric*v_policy.output_usd_per_million)) / 1000000::numeric;
 IF v_max<=0 OR v_max>v_policy.max_single_call_usd THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SINGLE_CALL_CAP';
 END IF;
 SELECT coalesce(sum(CASE
   WHEN s.status IN ('RESERVED','SUBMITTED','UNCERTAIN') THEN s.reserved_usd
   WHEN s.status='SETTLED' THEN s.charged_usd
   ELSE 0 END),0)
 INTO v_committed FROM public.feya_growth_ai_spend_reservations_v1 s
 WHERE s.policy_id=p_budget_id;
 IF v_committed+v_max>v_policy.max_total_usd THEN
   RAISE EXCEPTION 'GMEL_BUDGET_TOTAL_CAP';
 END IF;

 INSERT INTO public.feya_growth_ai_spend_reservations_v1(
  policy_id,case_id,handoff_id,workflow_run_id,ownership_epoch,
  worker_id,request_key,request_sha256,input_max_tokens,output_max_tokens,reserved_usd,
  provider,model_id,price_contract_version,input_usd_per_million,output_usd_per_million
 ) VALUES(
  p_budget_id,p_case_id,p_handoff_id,p_workflow_run_id,p_expected_epoch,
  btrim(p_worker_id),btrim(p_request_key),p_request_sha256,
  p_max_input_tokens,p_max_output_tokens,v_max,
  v_policy.provider,v_policy.model_id,v_policy.price_contract_version,
  v_policy.input_usd_per_million,v_policy.output_usd_per_million
 ) RETURNING * INTO v_created;
 RETURN QUERY SELECT v_created.reservation_id,v_created.status,v_created.reserved_usd,true;
END;
$feya_reserve$;

CREATE OR REPLACE FUNCTION public.feya_fn_submit_gmel_ai_spend_v1(
 p_reservation_id uuid,p_worker_id text
)
RETURNS TABLE(reservation_status text, may_call_provider boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $feya_submit$
DECLARE v_r public.feya_growth_ai_spend_reservations_v1%rowtype;
        v_w public.feya_growth_workflow_runs_v1%rowtype;
        v_policy public.feya_growth_ai_budget_policies_v1%rowtype;
        v_now timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO v_r FROM public.feya_growth_ai_spend_reservations_v1 r
 WHERE r.reservation_id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v_r.worker_id IS DISTINCT FROM p_worker_id THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SUBMIT_WRONG_WORKER';
 END IF;
 IF v_r.status<>'RESERVED' THEN
   RETURN QUERY SELECT v_r.status,false; RETURN;
 END IF;
 -- Owner/role may have changed since budget reservation. Recheck at SEND.
 IF NOT EXISTS (SELECT 1 FROM public.feya_growth_cases_v1 c
   WHERE c.case_id=v_r.case_id AND c.ownership_epoch=v_r.ownership_epoch
     AND c.current_accountable_domain='TSEO'
     AND c.case_status IN ('OPEN','TRIAGED','INVESTIGATING') FOR SHARE) OR
   NOT EXISTS (SELECT 1 FROM public.feya_growth_handoffs_v1 h
   WHERE h.handoff_id=v_r.handoff_id AND h.case_id=v_r.case_id
     AND h.ownership_epoch=v_r.ownership_epoch
     AND h.source_domain='TSEO' AND h.target_domain='GMEL'
     AND h.handoff_status='OPEN' FOR SHARE) OR
   NOT EXISTS (SELECT 1 FROM public.feya_growth_role_activation_v1 a
   WHERE a.role_code='GMEL' AND a.runtime_status IN ('SHADOW','ACTIVE')
     AND a.allowed_action_codes_json ? 'RECORD_LEARNING_EVIDENCE') THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SUBMIT_SCOPE_REVOKED';
 END IF;
 SELECT * INTO v_w FROM public.feya_growth_workflow_runs_v1 w
 WHERE w.workflow_run_id=v_r.workflow_run_id FOR SHARE;
 IF NOT FOUND OR v_w.workflow_status<>'RUNNING'
   OR v_w.lease_owner IS DISTINCT FROM p_worker_id
   OR v_w.lease_expires_at IS NULL OR v_w.lease_expires_at<=v_now
   OR v_w.workflow_type IS DISTINCT FROM 'GMEL_SEMANTIC_EVIDENCE_V1'
   OR v_w.current_step_code IS DISTINCT FROM 'MODEL_REVIEW'
   OR v_w.state_json->>'handoff_id' IS DISTINCT FROM v_r.handoff_id::text THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SUBMIT_LEASE_EXPIRED';
 END IF;
 SELECT * INTO v_policy FROM public.feya_growth_ai_budget_policies_v1 b
 WHERE b.policy_id=v_r.policy_id;
 IF NOT FOUND OR NOT v_policy.enabled OR v_policy.expires_at<=v_now
   OR v_policy.approved_by_user_id IS NULL THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SUBMIT_POLICY_REVOKED';
 END IF;
 UPDATE public.feya_growth_ai_spend_reservations_v1 r
 SET status='SUBMITTED',submitted_at=v_now,updated_at=v_now
 WHERE r.reservation_id=p_reservation_id;
 -- Persisted SUBMITTED **before** an external request. Replays yield false;
 -- ambiguous provider outcomes are not retried automatically.
 RETURN QUERY SELECT 'SUBMITTED'::text,true;
END;
$feya_submit$;

CREATE OR REPLACE FUNCTION public.feya_fn_settle_gmel_ai_spend_v1(
 p_reservation_id uuid,p_worker_id text,p_usage_known boolean,
 p_input_tokens integer DEFAULT NULL,p_output_tokens integer DEFAULT NULL,
 p_provider_response_id text DEFAULT NULL
)
RETURNS TABLE(reservation_status text, settled_usd numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $feya_settle$
DECLARE v_r public.feya_growth_ai_spend_reservations_v1%rowtype;
        v_p public.feya_growth_ai_budget_policies_v1%rowtype;
        v_now timestamptz:=clock_timestamp();
        v_charge numeric(14,6);
BEGIN
 SELECT * INTO v_r FROM public.feya_growth_ai_spend_reservations_v1 r
 WHERE r.reservation_id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v_r.worker_id IS DISTINCT FROM p_worker_id THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SETTLE_WRONG_WORKER';
 END IF;
 IF v_r.status IN ('SETTLED','UNCERTAIN') THEN
   IF v_r.status='SETTLED' AND p_usage_known IS TRUE
      AND v_r.actual_input_tokens IS NOT DISTINCT FROM p_input_tokens
      AND v_r.actual_output_tokens IS NOT DISTINCT FROM p_output_tokens THEN
     RETURN QUERY SELECT v_r.status,v_r.charged_usd; RETURN;
   ELSIF v_r.status='UNCERTAIN' AND p_usage_known IS FALSE THEN
     RETURN QUERY SELECT v_r.status,v_r.reserved_usd; RETURN;
   END IF;
   RAISE EXCEPTION 'GMEL_BUDGET_SETTLE_ALREADY_FINAL';
 END IF;
 IF v_r.status<>'SUBMITTED' THEN
   RAISE EXCEPTION 'GMEL_BUDGET_SETTLE_NEVER_SUBMITTED';
 END IF;
 IF p_usage_known IS DISTINCT FROM TRUE THEN
   UPDATE public.feya_growth_ai_spend_reservations_v1 r
   SET status='UNCERTAIN',updated_at=v_now
   WHERE r.reservation_id=p_reservation_id;
   -- Hold worst-case reserve for any ambiguous provider outcome.
   RETURN QUERY SELECT 'UNCERTAIN'::text,v_r.reserved_usd; RETURN;
 END IF;
 IF p_input_tokens IS NULL OR p_input_tokens<0
   OR p_output_tokens IS NULL OR p_output_tokens<0
   OR p_input_tokens>v_r.input_max_tokens
   OR p_output_tokens>v_r.output_max_tokens
   OR nullif(btrim(coalesce(p_provider_response_id,'')),'') IS NULL
   OR length(p_provider_response_id)>180 THEN
   RAISE EXCEPTION 'GMEL_BUDGET_USAGE_NOT_VERIFIABLE';
 END IF;
 SELECT * INTO STRICT v_p FROM public.feya_growth_ai_budget_policies_v1 b
 WHERE b.policy_id=v_r.policy_id;
 v_charge:=ceil((p_input_tokens::numeric*v_r.input_usd_per_million+
                 p_output_tokens::numeric*v_r.output_usd_per_million)) / 1000000::numeric;
 IF v_charge>v_r.reserved_usd THEN
   RAISE EXCEPTION 'GMEL_BUDGET_ACTUAL_SPEND_EXCEEDS_RESERVATION';
 END IF;
 UPDATE public.feya_growth_ai_spend_reservations_v1 r
 SET status='SETTLED',actual_input_tokens=p_input_tokens,
   actual_output_tokens=p_output_tokens,charged_usd=v_charge,
   provider_response_id=btrim(p_provider_response_id),
   settled_at=v_now,updated_at=v_now
 WHERE r.reservation_id=p_reservation_id;
 RETURN QUERY SELECT 'SETTLED'::text,v_charge;
END;
$feya_settle$;

CREATE OR REPLACE FUNCTION public.feya_fn_release_unsent_gmel_ai_spend_v1(
 p_reservation_id uuid,p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $feya_release$
DECLARE v_r public.feya_growth_ai_spend_reservations_v1%rowtype;
BEGIN
 SELECT * INTO v_r FROM public.feya_growth_ai_spend_reservations_v1 r
 WHERE r.reservation_id=p_reservation_id FOR UPDATE;
 IF NOT FOUND OR v_r.worker_id IS DISTINCT FROM p_worker_id THEN
   RAISE EXCEPTION 'GMEL_BUDGET_RELEASE_WRONG_WORKER';
 END IF;
 IF v_r.status='RELEASED' THEN RETURN false; END IF;
 IF v_r.status<>'RESERVED' THEN
   RAISE EXCEPTION 'GMEL_BUDGET_RELEASE_AFTER_SEND_FORBIDDEN';
 END IF;
 UPDATE public.feya_growth_ai_spend_reservations_v1 r
 SET status='RELEASED',updated_at=clock_timestamp()
 WHERE r.reservation_id=p_reservation_id;
 RETURN true;
END;
$feya_release$;

REVOKE ALL ON FUNCTION public.feya_fn_reserve_gmel_ai_spend_v1(
 uuid,uuid,uuid,uuid,integer,text,text,text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.feya_fn_submit_gmel_ai_spend_v1(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.feya_fn_settle_gmel_ai_spend_v1(uuid,text,boolean,integer,integer,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.feya_fn_release_unsent_gmel_ai_spend_v1(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_reserve_gmel_ai_spend_v1(
 uuid,uuid,uuid,uuid,integer,text,text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_submit_gmel_ai_spend_v1(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_settle_gmel_ai_spend_v1(
 uuid,text,boolean,integer,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_release_unsent_gmel_ai_spend_v1(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;