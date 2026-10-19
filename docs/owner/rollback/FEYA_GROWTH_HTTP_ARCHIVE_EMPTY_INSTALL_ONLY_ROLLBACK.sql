-- FEYA G2c HTTP L0 archive v1 — EMERGENCY INSTALL ROLLBACK, NEVER AUTO-APPLIED.
-- This is a targeted rollback for NEW, EMPTY objects introduced by PR #186,
-- NOT a backup or restoration of the shared Supabase project.
--
-- Allowed only with explicit owner/DBA approval after schema identity review.
-- If even one preserved archive receipt exists, fail closed: keep history,
-- disable staging and repair forward. No CASCADE, no other project objects.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

DO $precheck$
DECLARE
  v_owner text;
BEGIN
  IF to_regclass('public.feya_growth_external_http_observation_receipts_v1') IS NULL
     OR to_regprocedure('public.feya_fn_stage_external_http_observation_v1(jsonb)') IS NULL
     OR to_regprocedure('public.feya_fn_reject_external_http_receipt_rewrite_v1()') IS NULL THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ROLLBACK_TARGET_MISSING';
  END IF;

  SELECT pg_get_userbyid(c.relowner) INTO v_owner
  FROM pg_class c
  WHERE c.oid='public.feya_growth_external_http_observation_receipts_v1'::regclass;
  IF v_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ROLLBACK_OWNER_MISMATCH';
  END IF;
END;
$precheck$;

-- Exclusive lock prevents a new writer from inserting between empty-check and DROP.
LOCK TABLE public.feya_growth_external_http_observation_receipts_v1
IN ACCESS EXCLUSIVE MODE;

DO $empty_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.feya_growth_external_http_observation_receipts_v1
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ROLLBACK_NONEMPTY_KEEP_IMMUTABLE_HISTORY';
  END IF;
END;
$empty_guard$;

-- Only newly installed function/table/trigger; no dependent tables and no CASCADE.
DROP FUNCTION public.feya_fn_stage_external_http_observation_v1(jsonb);
DROP TABLE public.feya_growth_external_http_observation_receipts_v1;
DROP FUNCTION public.feya_fn_reject_external_http_receipt_rewrite_v1();
NOTIFY pgrst,'reload schema';
COMMIT;
