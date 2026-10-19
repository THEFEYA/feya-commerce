-- Growth OS G2c/GDAE: private, immutable, bounded HTTP source archive.
-- Existing GSC receipts, cases, workflows, handoffs and source health unchanged.
-- Deliberately NO new public Storage bucket or scheduled importer.
-- PROPOSED; do not apply to live Supabase without separate owner approval.
BEGIN;

CREATE TABLE public.feya_growth_external_http_observation_receipts_v1 (
  receipt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL DEFAULT 'TSEO_PRODUCTION_HTTP_OBSERVATION'
    CHECK(source_code='TSEO_PRODUCTION_HTTP_OBSERVATION'),
  source_channel text NOT NULL DEFAULT 'GITHUB_ACTIONS_PRODUCTION_ORIGIN'
    CHECK(source_channel='GITHUB_ACTIONS_PRODUCTION_ORIGIN'),
  repository text NOT NULL CHECK(repository='THEFEYA/feya-commerce'),
  source_event text NOT NULL CHECK(source_event='push'),
  source_ref text NOT NULL CHECK(source_ref='refs/heads/main'),
  origin text NOT NULL CHECK(origin='https://thefeya.com'),
  workflow_run_id bigint NOT NULL CHECK(workflow_run_id>0),
  artifact_id bigint NOT NULL CHECK(artifact_id>0),
  deployment_sha text NOT NULL CHECK(deployment_sha~'^[0-9a-f]{40}$'),
  artifact_zip_sha256 text NOT NULL CHECK(artifact_zip_sha256~'^[0-9a-f]{64}$'),
  release_id uuid NOT NULL REFERENCES public.feya_search_releases_v1(release_id)
    ON DELETE RESTRICT,
  release_code text NOT NULL,
  release_version integer NOT NULL CHECK(release_version>0),
  release_hash text NOT NULL CHECK(release_hash~'^[0-9a-f]{64}$'),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL CHECK(finished_at>=started_at),
  index_urls_observed integer NOT NULL CHECK(index_urls_observed>0),
  product_urls_sampled integer NOT NULL CHECK(product_urls_sampled>0),
  product_urls_in_release integer NOT NULL CHECK(product_urls_in_release>0),
  payload_json jsonb NOT NULL CHECK(jsonb_typeof(payload_json)='object'),
  payload_sha256 text NOT NULL UNIQUE CHECK(payload_sha256~'^[0-9a-f]{64}$'),
  verification_state text NOT NULL DEFAULT 'PROVENANCE_REVIEW_REQUIRED'
    CHECK(verification_state='PROVENANCE_REVIEW_REQUIRED'),
  evidence_level text NOT NULL DEFAULT 'L0_OBSERVATION'
    CHECK(evidence_level='L0_OBSERVATION'),
  independent_qa_passed boolean NOT NULL DEFAULT false
    CHECK(independent_qa_passed=false),
  google_indexed_state_known boolean NOT NULL DEFAULT false
    CHECK(google_indexed_state_known=false),
  business_outcome_measured boolean NOT NULL DEFAULT false
    CHECK(business_outcome_measured=false),
  source_health_promoted boolean NOT NULL DEFAULT false
    CHECK(source_health_promoted=false),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT feya_growth_external_http_observation_receipts_source_unique_v1
    UNIQUE(repository,workflow_run_id,artifact_id)
);

COMMENT ON TABLE public.feya_growth_external_http_observation_receipts_v1 IS
 'Private append-only GDAE archive of independently observed FEYA Production HTTP L0 evidence. Not Google indexation, autonomous GMEL QA, trusted business metric or permission to mutate Growth Cases.';
ALTER TABLE public.feya_growth_external_http_observation_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feya_growth_external_http_observation_receipts_v1
  FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.feya_growth_external_http_observation_receipts_v1 TO service_role;

CREATE FUNCTION public.feya_fn_reject_external_http_receipt_rewrite_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $receipt_immutable$
BEGIN
 RAISE EXCEPTION 'GROWTH_HTTP_RECEIPT_IMMUTABLE';
END;
$receipt_immutable$;

CREATE TRIGGER feya_growth_external_http_receipt_immutable_v1
BEFORE UPDATE OR DELETE ON public.feya_growth_external_http_observation_receipts_v1
FOR EACH ROW EXECUTE FUNCTION public.feya_fn_reject_external_http_receipt_rewrite_v1();

REVOKE ALL ON FUNCTION public.feya_fn_reject_external_http_receipt_rewrite_v1()
  FROM PUBLIC,anon,authenticated,service_role;

-- Preflight authority: caller must first independently verify the official
-- GitHub run, artifact bytes/digest and Vercel deployment with authenticated
-- connectors; submitted JSON and hashes are NOT self-authenticating.
-- The DB rechecks Search Release, URL membership, count and HTTP semantics.
-- One successful call archives source L0 only: no QA/learning/metrics promotion.
CREATE FUNCTION public.feya_fn_stage_external_http_observation_v1(p_payload jsonb)
RETURNS TABLE(
  receipt_id uuid,
  created_new boolean,
  payload_sha256 text,
  index_urls_observed integer,
  product_urls_sampled integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $stage_http$
DECLARE
  v_root jsonb;
  v_source jsonb;
  v_release jsonb;
  v_g2c jsonb;
  v_index_rows jsonb;
  v_product_rows jsonb;
  v_item jsonb;
  v_release_row public.feya_search_releases_v1%ROWTYPE;
  v_repo text;
  v_run_text text;
  v_artifact_text text;
  v_run bigint;
  v_artifact bigint;
  v_sha text;
  v_zip text;
  v_id uuid;
  v_release_hash text;
  v_index integer;
  v_product integer;
  v_expected_index integer;
  v_expected_product integer;
  v_missing integer;
  v_path text;
  v_kind text;
  v_pass boolean;
  v_expected_noindex boolean;
  v_digest text;
  v_existing public.feya_growth_external_http_observation_receipts_v1%ROWTYPE;
  v_created boolean := false;
  v_start timestamptz;
  v_finish timestamptz;
BEGIN
  v_root := p_payload;
  v_source := p_payload->'source';
  v_release := p_payload->'release';
  v_g2c := p_payload->'g2c';
  v_index_rows := p_payload->'indexRows';
  v_product_rows := p_payload->'productRows';

  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR octet_length(p_payload::text)>262144
    OR p_payload->>'contract' IS DISTINCT FROM 'FEYA_GROWTH_HTTP_ARCHIVE_V1'
    OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>6
    OR NOT(p_payload ?& ARRAY['contract','source','release','g2c','indexRows','productRows'])
    OR jsonb_typeof(v_source) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_release) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_g2c) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_index_rows) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_product_rows) IS DISTINCT FROM 'array'
  THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_INVALID_CONTRACT';
  END IF;

  v_repo := v_source->>'repository';
  v_run_text := v_source->>'runId';
  v_artifact_text := v_source->>'artifactId';
  v_sha := v_source->>'deploymentSha';
  v_zip := v_source->>'zipSha256';
  v_release_hash := v_release->>'hash';

  IF (SELECT count(*) FROM jsonb_object_keys(v_source))<>8
    OR NOT(v_source ?& ARRAY['repository','event','ref','origin','runId',
                             'artifactId','deploymentSha','zipSha256'])
    OR (SELECT count(*) FROM jsonb_object_keys(v_release))<>5
    OR NOT(v_release ?& ARRAY['id','code','version','hash','origin'])
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c))<>17
    OR NOT(v_g2c ?& ARRAY['schema','verdict','evidenceLevel','origin','deploymentCommitSha',
                            'release','observation','coverage','source','reasonCodes',
                            'googleIndexationConfirmed','autonomousReviewerExecuted',
                            'independentHumanQaConfirmed','fullProductNoindexCoverageConfirmed',
                            'measuredBusinessOutcome','caseMutationAllowed','sourceHealthPromoted'])
    OR v_repo IS DISTINCT FROM 'THEFEYA/feya-commerce'
    OR v_source->>'event' IS DISTINCT FROM 'push'
    OR v_source->>'ref' IS DISTINCT FROM 'refs/heads/main'
    OR v_source->>'origin' IS DISTINCT FROM 'https://thefeya.com'
    OR v_run_text IS NULL OR v_run_text !~ '^[1-9][0-9]{0,14}$'
    OR v_artifact_text IS NULL OR v_artifact_text !~ '^[1-9][0-9]{0,14}$'
    OR v_sha IS NULL OR v_sha !~ '^[0-9a-f]{40}$'
    OR v_zip IS NULL OR v_zip !~ '^[0-9a-f]{64}$'
    OR v_release_hash IS NULL OR v_release_hash !~ '^[0-9a-f]{64}$'
    OR v_release->>'origin' IS DISTINCT FROM 'https://thefeya.com'
    OR v_g2c->>'schema' IS DISTINCT FROM 'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1'
    OR v_g2c->>'verdict' IS DISTINCT FROM 'PRODUCTION_HTTP_OBSERVED'
    OR v_g2c->>'evidenceLevel' IS DISTINCT FROM 'L0_OBSERVATION'
    OR v_g2c->>'deploymentCommitSha' IS DISTINCT FROM v_sha
    OR v_g2c->>'origin' IS DISTINCT FROM 'https://thefeya.com'
    OR v_g2c#>>'{source,repository}' IS DISTINCT FROM v_repo
    OR v_g2c#>>'{source,gitEvent}' IS DISTINCT FROM 'push'
    OR v_g2c#>>'{source,gitRef}' IS DISTINCT FROM 'refs/heads/main'
    OR v_g2c#>>'{source,workflowRunId}' IS DISTINCT FROM v_run_text
    OR v_g2c#>>'{source,sourceType}' IS DISTINCT FROM 'EXTERNAL_HTTP_GITHUB_CI'
    OR jsonb_typeof(v_g2c->'reasonCodes')<>'array'
    OR jsonb_array_length(v_g2c->'reasonCodes')<>0
    OR v_g2c->>'googleIndexationConfirmed' IS DISTINCT FROM 'false'
    OR v_g2c->>'independentHumanQaConfirmed' IS DISTINCT FROM 'false'
    OR v_g2c->>'fullProductNoindexCoverageConfirmed' IS DISTINCT FROM 'false'
    OR v_g2c->>'autonomousReviewerExecuted' IS DISTINCT FROM 'false'
    OR jsonb_typeof(v_g2c->'source') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c->'source'))<>6
    OR NOT(v_g2c->'source' ?& ARRAY['repository','workflowRunId','gitEvent',
                                   'gitRef','artifactPayloadSha256','sourceType'])
    OR jsonb_typeof(v_g2c->'release') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c->'release'))<>5
    OR NOT(v_g2c->'release' ?& ARRAY['id','code','version','hash','manifestGitSha'])
    OR jsonb_typeof(v_g2c->'observation') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c->'observation'))<>2
    OR NOT(v_g2c->'observation' ?& ARRAY['startedAt','finishedAt'])
    OR jsonb_typeof(v_g2c->'coverage') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c->'coverage'))<>5
    OR NOT(v_g2c->'coverage' ?& ARRAY['indexIntent','productNoindex','shop',
                                   'collections','pdpCopySample'])
    OR jsonb_typeof(v_g2c#>'{coverage,indexIntent}') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c#>'{coverage,indexIntent}'))<>2
    OR NOT((v_g2c#>'{coverage,indexIntent}') ?& ARRAY['expected','verified'])
    OR jsonb_typeof(v_g2c#>'{coverage,productNoindex}') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c#>'{coverage,productNoindex}'))<>6
    OR NOT((v_g2c#>'{coverage,productNoindex}') ?&
           ARRAY['expected','sampled','reportedPassed','perPathVerified','untested','proof'])
    OR jsonb_typeof(v_g2c#>'{coverage,shop}') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c#>'{coverage,shop}'))<>2
    OR NOT((v_g2c#>'{coverage,shop}') ?& ARRAY['expected','verified'])
    OR jsonb_typeof(v_g2c#>'{coverage,collections}') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c#>'{coverage,collections}'))<>2
    OR NOT((v_g2c#>'{coverage,collections}') ?& ARRAY['expected','verified'])
    OR jsonb_typeof(v_g2c#>'{coverage,pdpCopySample}') IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(v_g2c#>'{coverage,pdpCopySample}'))<>2
    OR NOT((v_g2c#>'{coverage,pdpCopySample}') ?& ARRAY['expected','verified'])
    OR v_g2c#>>'{source,artifactPayloadSha256}' IS NULL
    OR v_g2c#>>'{source,artifactPayloadSha256}' !~ '^[0-9a-f]{64}$'
    OR v_g2c#>>'{release,manifestGitSha}' IS NULL
    OR v_g2c#>>'{release,manifestGitSha}' !~ '^[0-9a-f]{40}$'
    OR v_g2c->>'measuredBusinessOutcome' IS DISTINCT FROM 'false'
    OR v_g2c->>'caseMutationAllowed' IS DISTINCT FROM 'false'
    OR v_g2c->>'sourceHealthPromoted' IS DISTINCT FROM 'false'
    OR v_g2c#>>'{release,id}' IS DISTINCT FROM v_release->>'id'
    OR v_g2c#>>'{release,code}' IS DISTINCT FROM v_release->>'code'
    OR v_g2c#>>'{release,version}' IS DISTINCT FROM v_release->>'version'
    OR v_g2c#>>'{release,hash}' IS DISTINCT FROM v_release_hash
  THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_SOURCE_MISMATCH';
  END IF;

  v_run := v_run_text::bigint;
  v_artifact := v_artifact_text::bigint;
  IF v_release->>'id' IS NULL
     OR v_release->>'id' !~ '^[0-9a-f-]{36}$'
     OR v_release->>'version' IS NULL
     OR v_release->>'version' !~ '^[1-9][0-9]{0,6}$'
  THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_INVALID_RELEASE';
  END IF;

  SELECT * INTO v_release_row
  FROM public.feya_search_releases_v1 r
  WHERE r.release_id=(v_release->>'id')::uuid
  FOR SHARE;
  -- Archiving historical L0 observations must remain possible after
  -- the approved release is RETIRED. This does not make those observations
  -- admissible as current ACTIVE-release evidence for an agent/GMEL.
  IF NOT FOUND
    OR v_release_row.release_status NOT IN ('ACTIVE','RETIRED')
    OR v_release_row.release_code IS DISTINCT FROM v_release->>'code'
    OR v_release_row.release_version IS DISTINCT FROM (v_release->>'version')::integer
    OR v_release_row.release_hash IS DISTINCT FROM v_release_hash
    OR v_release_row.git_sha IS DISTINCT FROM v_g2c#>>'{release,manifestGitSha}'
    OR v_release_row.target_origin IS DISTINCT FROM 'https://thefeya.com'
  THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_RELEASE_NOT_CURRENT';
  END IF;

  SELECT count(*) FILTER(WHERE i.intended_index_state='index')::integer,
         count(*) FILTER(WHERE i.intended_index_state='noindex'
           AND i.page_type_snapshot='product')::integer
    INTO v_expected_index,v_expected_product
  FROM public.feya_search_release_items_v1 i
  WHERE i.release_id=v_release_row.release_id;

  v_index:=jsonb_array_length(v_index_rows);
  v_product:=jsonb_array_length(v_product_rows);
  IF v_index<=0 OR v_index>2048 OR v_index<>v_expected_index
    OR v_product<=0 OR v_product>1024 OR v_product>v_expected_product
    OR v_expected_product<=0
    OR v_g2c#>>'{coverage,indexIntent,expected}' IS DISTINCT FROM v_expected_index::text
    OR v_g2c#>>'{coverage,indexIntent,verified}' IS DISTINCT FROM v_index::text
    OR v_g2c#>>'{coverage,productNoindex,expected}' IS DISTINCT FROM v_expected_product::text
    OR v_g2c#>>'{coverage,productNoindex,sampled}' IS DISTINCT FROM v_product::text
    OR v_g2c#>>'{coverage,productNoindex,reportedPassed}' IS DISTINCT FROM v_product::text
    OR v_g2c#>>'{coverage,productNoindex,perPathVerified}' IS DISTINCT FROM v_product::text
    OR v_g2c#>>'{coverage,productNoindex,untested}' IS DISTINCT FROM (v_expected_product-v_product)::text
    OR v_g2c#>>'{coverage,productNoindex,proof}' IS DISTINCT FROM 'PER_PATH_CI_RECEIPT'
  THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_COVERAGE_INVALID';
  END IF;

  -- Do not infer missing samples from manifest. Every archive URL must be
  -- individually backed by HTTP evidence and be a member of this release.
  FOR v_kind IN SELECT unnest(ARRAY['index','product']) LOOP
    IF v_kind='index' THEN
      v_expected_noindex:=false;
      v_root:=v_index_rows;
    ELSE
      v_expected_noindex:=true;
      v_root:=v_product_rows;
    END IF;
    IF EXISTS (
      SELECT 1 FROM (
        SELECT item->>'path' AS path,count(*) n
        FROM jsonb_array_elements(v_root) AS r(item)
        GROUP BY item->>'path'
      ) d WHERE d.path IS NULL OR d.n<>1
    ) THEN
      RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_DUPLICATE_OR_NULL_PATH';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_root) AS x(value) LOOP
      v_path:=v_item->>'path';
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
        OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>6
        OR NOT(v_item ?& ARRAY['path','status','noindex','canonical','pass','error'])
        OR v_path IS NULL OR length(v_path)>450
        OR left(v_path,1)<>'/' OR left(v_path,2)='//'
        OR position('?' in v_path)>0 OR position('#' in v_path)>0
        OR v_item->>'status' IS DISTINCT FROM '200'
        OR v_item->>'noindex' IS DISTINCT FROM v_expected_noindex::text
        OR v_item->>'canonical' IS DISTINCT FROM ('https://thefeya.com'||v_path)
        OR v_item->>'pass' IS DISTINCT FROM 'true'
        OR v_item->>'error' IS NOT NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.feya_search_release_items_v1 i
          WHERE i.release_id=v_release_row.release_id
            AND i.url_path_snapshot=v_path
            AND i.intended_index_state=CASE WHEN v_kind='index' THEN 'index' ELSE 'noindex' END
            AND (v_kind='index' OR i.page_type_snapshot='product')
        )
      THEN
        RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_PATH_OR_HTTP_INVALID';
      END IF;
    END LOOP;
  END LOOP;

  -- Future negative/partial HTTP evidence requires a versioned broader
  -- adapter with unknown-data rules. v1 archives only FULL observed successes.
  -- It never writes "zero" for missing or timed-out URLs.
  IF v_g2c#>>'{observation,startedAt}' IS NULL
     OR v_g2c#>>'{observation,finishedAt}' IS NULL THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_MISSING_CLOCK';
  END IF;
  v_start:=(v_g2c#>>'{observation,startedAt}')::timestamptz;
  v_finish:=(v_g2c#>>'{observation,finishedAt}')::timestamptz;
  IF v_start>v_finish OR v_finish>clock_timestamp()+interval '5 minutes'
     OR v_finish-v_start>interval '25 minutes'
     OR v_finish<clock_timestamp()-interval '15 months' THEN
    RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_BAD_CLOCK';
  END IF;

  v_digest:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  SELECT * INTO v_existing
  FROM public.feya_growth_external_http_observation_receipts_v1 r
  WHERE r.repository=v_repo AND r.workflow_run_id=v_run
    AND r.artifact_id=v_artifact
  FOR SHARE;
  IF FOUND THEN
    IF v_existing.payload_sha256 IS DISTINCT FROM v_digest
      OR v_existing.artifact_zip_sha256 IS DISTINCT FROM v_zip
      OR v_existing.deployment_sha IS DISTINCT FROM v_sha THEN
      RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN QUERY SELECT v_existing.receipt_id,false,v_existing.payload_sha256,
      v_existing.index_urls_observed,v_existing.product_urls_sampled;
    RETURN;
  END IF;

  INSERT INTO public.feya_growth_external_http_observation_receipts_v1(
    repository,source_event,source_ref,origin,workflow_run_id,
    artifact_id,deployment_sha,artifact_zip_sha256,release_id,release_code,
    release_version,release_hash,started_at,finished_at,index_urls_observed,
    product_urls_sampled,product_urls_in_release,payload_json,payload_sha256
  ) VALUES(
    v_repo,'push','refs/heads/main','https://thefeya.com',v_run,v_artifact,
    v_sha,v_zip,v_release_row.release_id,v_release_row.release_code,
    v_release_row.release_version,v_release_hash,v_start,v_finish,
    v_index,v_product,v_expected_product,p_payload,v_digest
  ) ON CONFLICT DO NOTHING
  RETURNING public.feya_growth_external_http_observation_receipts_v1.receipt_id INTO v_id;

  v_created := v_id IS NOT NULL;
  IF NOT v_created THEN
    SELECT * INTO v_existing
    FROM public.feya_growth_external_http_observation_receipts_v1 r
    WHERE r.repository=v_repo AND r.workflow_run_id=v_run
      AND r.artifact_id=v_artifact;
    IF NOT FOUND OR v_existing.payload_sha256 IS DISTINCT FROM v_digest THEN
      RAISE EXCEPTION 'GROWTH_HTTP_ARCHIVE_CONCURRENT_INTENT_MISMATCH';
    END IF;
    v_id:=v_existing.receipt_id;
  END IF;

  RETURN QUERY SELECT v_id,v_created,v_digest,v_index,v_product;
END;
$stage_http$;

REVOKE ALL ON FUNCTION public.feya_fn_stage_external_http_observation_v1(jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.feya_fn_stage_external_http_observation_v1(jsonb)
 TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
