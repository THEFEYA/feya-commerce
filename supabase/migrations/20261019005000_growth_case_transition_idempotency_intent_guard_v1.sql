-- Growth OS Core / G3 security gate: reject idempotency key re-use for a
-- different case-transition intention. Preserves existing lifecycle FSM,
-- ownership epoch CAS, audit events and service_role-only authority.
--
-- This migration is PROPOSED ONLY. It must not be applied to production without
-- independently approved rollout / rollback and native PostgreSQL tests.
-- Existing authorized exact retries keep returning the original immutable event.
-- Invalid changed target/actor/reason/epoch with the same key fails closed.
BEGIN;

CREATE OR REPLACE FUNCTION public.feya_fn_transition_growth_case_v1(
  p_case_id uuid,
  p_expected_status text,
  p_expected_ownership_epoch integer,
  p_new_status text,
  p_reason text,
  p_actor_type text DEFAULT 'system',
  p_actor_user_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE(
  case_id uuid,
  previous_status text,
  new_status text,
  ownership_epoch integer,
  transitioned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $growth_case_transition$
DECLARE
  v_case public.feya_growth_cases_v1%ROWTYPE;
  v_event public.feya_growth_case_events_v1%ROWTYPE;
  v_now timestamptz := now();
  v_allowed boolean := false;
BEGIN
  IF nullif(btrim(coalesce(p_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Transition reason is required';
  END IF;

  IF p_actor_type NOT IN ('human','agent','system') THEN
    RAISE EXCEPTION 'Unsupported actor type: %', p_actor_type;
  END IF;

  IF p_new_status NOT IN (
    'OPEN','TRIAGED','INVESTIGATING','DECISION_READY','ACTIONING',
    'MEASURING','LEARNING','CLOSED','BLOCKED','DEFERRED',
    'CANCELLED','NOT_OBSERVABLE'
  ) THEN
    RAISE EXCEPTION 'Unsupported target case status: %', p_new_status;
  END IF;

  -- One serialized decision/one accountable Case. Serialize replay and CAS
  -- against ownership transfers and concurrent requests for this Case.
  SELECT * INTO v_case
  FROM public.feya_growth_cases_v1 c
  WHERE c.case_id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Growth Case not found: %', p_case_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_event
    FROM public.feya_growth_case_events_v1 e
    WHERE e.case_id=p_case_id
      AND e.idempotency_key=p_idempotency_key
      AND e.event_type='STATUS_TRANSITIONED'
    ORDER BY e.created_at, e.case_event_id
    LIMIT 1;

    IF FOUND THEN
      -- Ambiguous historic duplicates should never silently authorize a replay.
      IF EXISTS (
        SELECT 1 FROM public.feya_growth_case_events_v1 other
        WHERE other.case_id=p_case_id
          AND other.idempotency_key=p_idempotency_key
          AND other.event_type='STATUS_TRANSITIONED'
          AND other.case_event_id<>v_event.case_event_id
      ) THEN
        RAISE EXCEPTION 'growth_case_idempotency_ambiguous_event';
      END IF;

      -- Old Core returned this historical row BEFORE checking new parameters.
      -- Exact request intent, including nullable actor ID, is now mandatory.
      IF v_event.from_status IS DISTINCT FROM p_expected_status
        OR v_event.to_status IS DISTINCT FROM p_new_status
        OR v_event.ownership_epoch IS DISTINCT FROM p_expected_ownership_epoch
        OR v_event.actor_type IS DISTINCT FROM p_actor_type
        OR v_event.actor_user_id IS DISTINCT FROM p_actor_user_id
        OR v_event.reason IS DISTINCT FROM p_reason THEN
        RAISE EXCEPTION 'growth_case_idempotency_intent_mismatch';
      END IF;

      RETURN QUERY
      SELECT p_case_id, v_event.from_status, v_event.to_status,
             v_event.ownership_epoch, v_event.created_at;
      RETURN;
    END IF;
  END IF;

  IF v_case.case_status <> p_expected_status THEN
    RAISE EXCEPTION 'Stale case status: expected %, current %',
      p_expected_status,v_case.case_status;
  END IF;

  IF v_case.ownership_epoch <> p_expected_ownership_epoch THEN
    RAISE EXCEPTION 'Stale ownership epoch: expected %, current %',
      p_expected_ownership_epoch,v_case.ownership_epoch;
  END IF;

  IF p_new_status = v_case.case_status THEN
    RAISE EXCEPTION 'Growth Case is already in status %',p_new_status;
  END IF;

  -- EXACT original canonical FSM. Do not introduce new allowed transitions.
  v_allowed := CASE v_case.case_status
    WHEN 'OPEN' THEN p_new_status IN ('TRIAGED','BLOCKED','DEFERRED','CANCELLED')
    WHEN 'TRIAGED' THEN p_new_status IN ('INVESTIGATING','DECISION_READY','BLOCKED','DEFERRED','CANCELLED')
    WHEN 'INVESTIGATING' THEN p_new_status IN ('DECISION_READY','BLOCKED','DEFERRED','CANCELLED','NOT_OBSERVABLE')
    WHEN 'DECISION_READY' THEN p_new_status IN ('ACTIONING','BLOCKED','DEFERRED','CANCELLED')
    WHEN 'ACTIONING' THEN p_new_status IN ('MEASURING','LEARNING','BLOCKED','CANCELLED')
    WHEN 'MEASURING' THEN p_new_status IN ('LEARNING','BLOCKED','CANCELLED','NOT_OBSERVABLE')
    WHEN 'LEARNING' THEN p_new_status IN ('ACTIONING','CLOSED','BLOCKED','CANCELLED')
    WHEN 'BLOCKED' THEN p_new_status IN (
      'TRIAGED','INVESTIGATING','DECISION_READY','ACTIONING',
      'MEASURING','LEARNING','DEFERRED','CANCELLED'
    )
    WHEN 'DEFERRED' THEN p_new_status IN ('TRIAGED','CANCELLED')
    WHEN 'NOT_OBSERVABLE' THEN p_new_status IN ('DEFERRED','CLOSED','CANCELLED')
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid Growth Case transition: % -> %',
      v_case.case_status,p_new_status;
  END IF;

  UPDATE public.feya_growth_cases_v1 c
    SET case_status=p_new_status,
        blocked_reason=CASE WHEN p_new_status='BLOCKED' THEN p_reason ELSE NULL END,
        closed_at=CASE WHEN p_new_status IN ('CLOSED','CANCELLED') THEN v_now ELSE NULL END,
        updated_at=v_now
  WHERE c.case_id=p_case_id;

  INSERT INTO public.feya_growth_case_events_v1(
    case_id,event_type,from_status,to_status,from_owner,to_owner,ownership_epoch,
    actor_type,actor_user_id,reason,idempotency_key,created_at
  )
  VALUES (
    p_case_id,'STATUS_TRANSITIONED',v_case.case_status,p_new_status,
    v_case.current_accountable_domain,v_case.current_accountable_domain,
    v_case.ownership_epoch,p_actor_type,p_actor_user_id,p_reason,
    p_idempotency_key,v_now
  );

  RETURN QUERY
  SELECT p_case_id,v_case.case_status,p_new_status,v_case.ownership_epoch,v_now;
END;
$growth_case_transition$;

-- Preserve previous grants. No direct client/anon write capability.
REVOKE ALL ON FUNCTION public.feya_fn_transition_growth_case_v1(
  uuid,text,integer,text,text,text,uuid,text
) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_transition_growth_case_v1(
  uuid,text,integer,text,text,text,uuid,text
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
