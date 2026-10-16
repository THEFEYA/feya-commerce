-- FEYA GDAE: immutable operator-verified GSC evidence, NOT canonical ingestion or source health.
-- One small operational receipt per bounded read; future Google revisions create new receipts.
BEGIN;

CREATE TABLE public.feya_growth_gsc_observation_receipts_v1 (
  receipt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL DEFAULT 'ORGANIC_SEARCH_PERFORMANCE'
    CHECK(source_code='ORGANIC_SEARCH_PERFORMANCE'),
  source_channel text NOT NULL CHECK(source_channel='HYPD_MCP_READONLY_MANUAL'),
  property_url text NOT NULL CHECK(property_url='sc-domain:thefeya.com'),
  search_type text NOT NULL DEFAULT 'web' CHECK(search_type='web'),
  data_state text NOT NULL DEFAULT 'final' CHECK(data_state='final'),
  query_start date NOT NULL,
  query_end date NOT NULL,
  finalized_through date NOT NULL,
  observed_days integer NOT NULL CHECK(observed_days BETWEEN 0 AND 32),
  daily_rows_json jsonb NOT NULL CHECK(jsonb_typeof(daily_rows_json)='array'),
  clicks_total bigint,
  impressions_total bigint,
  average_position numeric,
  source_evidence_ref text NOT NULL,
  payload_sha256 text NOT NULL UNIQUE CHECK(payload_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  source_health_promoted boolean NOT NULL DEFAULT false CHECK(source_health_promoted=false),
  CHECK(query_end>=query_start AND query_end-query_start<=31),
  CHECK(finalized_through>=query_end),
  CHECK((clicks_total IS NULL AND impressions_total IS NULL AND average_position IS NULL)
    OR (clicks_total>=0 AND impressions_total>=0 AND clicks_total<=impressions_total)),
  CHECK((observed_days=0 AND clicks_total IS NULL AND impressions_total IS NULL)
    OR (observed_days>0 AND clicks_total IS NOT NULL AND impressions_total IS NOT NULL))
);

COMMENT ON TABLE public.feya_growth_gsc_observation_receipts_v1 IS
  'GDAE add-only manual Google Search Console observation receipts; not RAW Google credential access, not canonical source-health or a GMEL model-admission input.';

ALTER TABLE public.feya_growth_gsc_observation_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feya_growth_gsc_observation_receipts_v1
  FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON TABLE public.feya_growth_gsc_observation_receipts_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.feya_fn_reject_gsc_evidence_rewrite_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $gsc_reject$
BEGIN
  RAISE EXCEPTION 'GSC_RECEIPT_IMMUTABLE';
END;
$gsc_reject$;
CREATE TRIGGER feya_gsc_evidence_rewrite_block_v1
BEFORE UPDATE OR DELETE ON public.feya_growth_gsc_observation_receipts_v1
FOR EACH ROW EXECUTE FUNCTION public.feya_fn_reject_gsc_evidence_rewrite_v1();
REVOKE ALL ON FUNCTION public.feya_fn_reject_gsc_evidence_rewrite_v1()
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.feya_fn_stage_gsc_daily_observation_v1(
  p_property_url text,
  p_source_channel text,
  p_query_start date,
  p_query_end date,
  p_finalized_through date,
  p_daily_rows jsonb,
  p_expected_clicks bigint,
  p_expected_impressions bigint,
  p_expected_average_position numeric,
  p_source_evidence_ref text
)
RETURNS TABLE(receipt_id uuid, created_new boolean, payload_sha256 text, observed_days integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $gsc_stage$
DECLARE
  v_now_date date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
  v_item jsonb;
  v_date_text text;
  v_day date;
  v_clicks_text text;
  v_impressions_text text;
  v_clicks bigint;
  v_impressions bigint;
  v_position numeric;
  v_days date[] := ARRAY[]::date[];
  v_rows jsonb := '[]'::jsonb;
  v_length integer;
  v_clicks_total bigint := 0;
  v_impressions_total bigint := 0;
  v_weighted numeric := 0;
  v_position_total numeric;
  v_digest text;
  v_receipt_id uuid;
  v_created boolean := false;
BEGIN
  IF p_property_url IS DISTINCT FROM 'sc-domain:thefeya.com'
    OR p_source_channel IS DISTINCT FROM 'HYPD_MCP_READONLY_MANUAL'
    OR p_query_start IS NULL OR p_query_end IS NULL
    OR p_finalized_through IS NULL
    OR p_query_start<(v_now_date-interval '16 months')::date
    OR p_query_end<p_query_start OR p_query_end-p_query_start>31
    OR p_query_end>v_now_date-2
    OR p_finalized_through<p_query_end OR p_finalized_through>v_now_date
    OR p_daily_rows IS NULL OR jsonb_typeof(p_daily_rows)<>'array'
    OR nullif(btrim(coalesce(p_source_evidence_ref,'')),'') IS NULL
    OR length(p_source_evidence_ref) NOT BETWEEN 12 AND 200
    OR p_source_evidence_ref !~ '^[A-Za-z0-9:_./-]+$'
  THEN
    RAISE EXCEPTION 'GSC_RECEIPT_INVALID_ENVELOPE';
  END IF;
  v_length:=jsonb_array_length(p_daily_rows);
  IF v_length>32 THEN
    RAISE EXCEPTION 'GSC_RECEIPT_TOO_MANY_ROWS';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_daily_rows) AS t(value) LOOP
    IF jsonb_typeof(v_item)<>'object'
      OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>4
      OR NOT(v_item ?& ARRAY['date','clicks','impressions','position'])
      OR jsonb_typeof(v_item->'clicks')<>'number'
      OR jsonb_typeof(v_item->'impressions')<>'number'
      OR jsonb_typeof(v_item->'position')<>'number'
    THEN
      RAISE EXCEPTION 'GSC_RECEIPT_INVALID_ROW_STRUCTURE';
    END IF;
    v_date_text:=v_item->>'date';
    v_clicks_text:=v_item->>'clicks';
    v_impressions_text:=v_item->>'impressions';
    IF v_date_text IS NULL OR v_date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      OR v_clicks_text !~ '^(0|[1-9][0-9]{0,14})$'
      OR v_impressions_text !~ '^(0|[1-9][0-9]{0,14})$'
    THEN
      RAISE EXCEPTION 'GSC_RECEIPT_INVALID_ROW_VALUE';
    END IF;
    v_day:=to_date(v_date_text,'YYYY-MM-DD');
    v_clicks:=v_clicks_text::bigint;
    v_impressions:=v_impressions_text::bigint;
    v_position:=(v_item->>'position')::numeric;
    IF to_char(v_day,'YYYY-MM-DD')<>v_date_text
      OR v_day<p_query_start OR v_day>p_query_end
      OR v_day=ANY(v_days)
      OR v_clicks>v_impressions
      OR v_position<0 OR v_position>10000
      OR (v_impressions=0 AND v_position<>0)
      OR (v_impressions>0 AND v_position<=0)
    THEN
      RAISE EXCEPTION 'GSC_RECEIPT_INVALID_ROW_SEMANTICS';
    END IF;
    v_days:=array_append(v_days,v_day);
    v_clicks_total:=v_clicks_total+v_clicks;
    v_impressions_total:=v_impressions_total+v_impressions;
    v_weighted:=v_weighted+(v_position*v_impressions);
    v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
      'date',v_date_text,'clicks',v_clicks,
      'impressions',v_impressions,'position',v_position));
  END LOOP;

  SELECT coalesce(jsonb_agg(item ORDER BY item->>'date'),'[]'::jsonb)
  INTO v_rows FROM jsonb_array_elements(v_rows) AS sorted(item);

  IF v_length=0 THEN
    IF p_expected_clicks IS NOT NULL OR p_expected_impressions IS NOT NULL
      OR p_expected_average_position IS NOT NULL THEN
      RAISE EXCEPTION 'GSC_RECEIPT_EMPTY_IS_NOT_ZERO';
    END IF;
    v_position_total:=NULL;
  ELSE
    IF p_expected_clicks IS DISTINCT FROM v_clicks_total
      OR p_expected_impressions IS DISTINCT FROM v_impressions_total THEN
      RAISE EXCEPTION 'GSC_RECEIPT_TOTALS_MISMATCH';
    END IF;
    v_position_total:=CASE WHEN v_impressions_total=0 THEN NULL
      ELSE v_weighted/v_impressions_total END;
    IF (v_position_total IS NULL AND p_expected_average_position IS NOT NULL)
      OR (v_position_total IS NOT NULL AND
        (p_expected_average_position IS NULL
          OR abs(v_position_total-p_expected_average_position)>0.001)) THEN
      RAISE EXCEPTION 'GSC_RECEIPT_AVERAGE_POSITION_MISMATCH';
    END IF;
  END IF;

  v_digest:=encode(sha256(convert_to(jsonb_build_object(
    'contract','GSC_DAILY_EVIDENCE_V1',
    'channel',p_source_channel,'property',p_property_url,
    'search_type','web','data_state','final',
    'start',p_query_start,'end',p_query_end,'finalized',p_finalized_through,
    'rows',v_rows,'reported_clicks',p_expected_clicks,
    'reported_impressions',p_expected_impressions,
    'reported_position',p_expected_average_position
  )::text,'UTF8')),'hex');

  INSERT INTO public.feya_growth_gsc_observation_receipts_v1(
    source_channel,property_url,query_start,query_end,finalized_through,
    observed_days,daily_rows_json,clicks_total,impressions_total,
    average_position,source_evidence_ref,payload_sha256
  ) VALUES(
    p_source_channel,p_property_url,p_query_start,p_query_end,p_finalized_through,
    v_length,v_rows,p_expected_clicks,p_expected_impressions,
    v_position_total,p_source_evidence_ref,v_digest
  ) ON CONFLICT (payload_sha256) DO NOTHING
  RETURNING public.feya_growth_gsc_observation_receipts_v1.receipt_id INTO v_receipt_id;
  v_created:=v_receipt_id IS NOT NULL;
  IF NOT v_created THEN
    SELECT r.receipt_id INTO v_receipt_id
    FROM public.feya_growth_gsc_observation_receipts_v1 r
    WHERE r.payload_sha256=v_digest;
  END IF;
  RETURN QUERY SELECT v_receipt_id,v_created,v_digest,v_length;
END;
$gsc_stage$;

REVOKE ALL ON FUNCTION public.feya_fn_stage_gsc_daily_observation_v1(
  text,text,date,date,date,jsonb,bigint,bigint,numeric,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_stage_gsc_daily_observation_v1(
  text,text,date,date,date,jsonb,bigint,bigint,numeric,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
