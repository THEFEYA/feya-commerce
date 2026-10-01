-- Unapplied migration8. Extends the SAME immutable store and receipt transaction.
begin;
do $preflight$ begin
 if md5((select prosrc from pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure))<>'1c33334384f695d9f0267ce3a49a8591' or
    public.feya_commerce_metric_reader_boundary_health_v1() is distinct from 'metric_reader_boundary_v1' or
    public.feya_commerce_metric_access_boundary_health_v1() is distinct from 'metric_access_boundary_v2' then
   raise exception 'Unexpected atomic importer or boundary; stop for review';
 end if;
end $preflight$;

create function public.feya_commerce_google_ads_import_contract_v1() returns text
language sql stable security invoker set search_path='' as $$
 select case when
  (select md5(prosrc)='7f40730f26082940ea76e09b56883a73' and not prosecdef and proconfig @> array['search_path=""','TimeZone=UTC'] from pg_catalog.pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure)
  and not pg_catalog.has_function_privilege('anon','public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)','EXECUTE')
  and not pg_catalog.has_function_privilege('authenticated','public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)','EXECUTE')
  and public.feya_commerce_metric_reader_boundary_health_v1()='metric_reader_boundary_v1'
  and public.feya_commerce_metric_access_boundary_health_v1()='metric_access_boundary_v2'
 then 'google_ads_atomic_evidence_v1'::text else null end
$$;
revoke all on function public.feya_commerce_google_ads_import_contract_v1() from public,anon,authenticated;
grant execute on function public.feya_commerce_google_ads_import_contract_v1() to service_role;
create or replace function public.feya_commerce_import_keyword_metrics_atomic_v1(p_request_key text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare
  old_receipt public.feya_commerce_seo_metric_import_receipts_v1%rowtype;
  s public.feya_commerce_seo_keyword_metric_import_staging_v1%rowtype;
  m public.feya_commerce_seo_keyword_metric_snapshots_v1%rowtype;
  o jsonb; e jsonb; k text; keys text[]='{}'; entries jsonb='[]';
  rows_count integer; capture_at timestamptz; period_start date; period_end date;
  number_key text; number_value numeric; history jsonb; h jsonb; linked_keyword bigint;
  new_count integer=0;
  g jsonb; api_batch public.feya_metric_request_batch_v1%rowtype;
  bk public.feya_metric_request_batch_keywords_v1%rowtype;
  api_import boolean; selected_ids uuid[]; observed_ids uuid[]; remaining integer;
begin
  if p_request_key is null or p_request_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='22023',message='Invalid request key.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or
     p_payload->>'contract_version' is distinct from 'atomic_keyword_metric_import_v1' or
     coalesce(length(btrim(p_payload->>'context_evidence_ref')),0) not between 1 and 1000 or
     pg_column_size(p_payload)>2000000 or jsonb_typeof(p_payload->'observations') is distinct from 'array' then
    raise exception using errcode='22023',message='Invalid metric import envelope.';
  end if;
  g=p_payload->'google_ads';
  api_import=g is not null;
  if api_import then
    if public.feya_commerce_google_ads_import_contract_v1() is distinct from 'google_ads_atomic_evidence_v1' then
      raise exception using errcode='23514',message='Google Ads storage boundary unavailable.';
    end if;
    if jsonb_typeof(g) is distinct from 'object' or g->>'contract' is distinct from 'google_ads_atomic_evidence_v1' or
       coalesce(g->>'request_fingerprint','') !~ '^[a-f0-9]{64}$' or coalesce(g->>'customer_id','') !~ '^[0-9]{10}$' or
       g->>'api_version' is distinct from 'v25' or coalesce(g->>'source_ref','') !~ '^google-ads:[a-f0-9]{64}$' or
       coalesce(g->>'account_currency','') !~ '^[A-Z]{3}$' or coalesce(length(g->>'account_time_zone'),0)=0 or
       jsonb_typeof(g->'keyword_ids') is distinct from 'array' or
       g#>'{request,geoTargetConstants}' is distinct from '["geoTargetConstants/2840"]'::jsonb or
       g#>>'{request,language}' is distinct from 'languageConstants/1000' or
       g#>>'{request,keywordPlanNetwork}' is distinct from 'GOOGLE_SEARCH' or
       g#>'{request,includeAdultKeywords}' is distinct from 'false'::jsonb or
       jsonb_typeof(g#>'{request,keywords}') is distinct from 'array' then
      raise exception using errcode='22023',message='Invalid Google Ads request provenance.';
    end if;
    if jsonb_array_length(g->'keyword_ids') not between 1 and 20 then raise exception using errcode='22023',message='Expected 1-20 selected keywords.'; end if;
    select array_agg(value::uuid order by value::uuid) into selected_ids from jsonb_array_elements_text(g->'keyword_ids');
    if cardinality(selected_ids)<>(select count(distinct v) from unnest(selected_ids) v) then raise exception using errcode='22023',message='Duplicate keyword IDs.'; end if;
  end if;
  rows_count=jsonb_array_length(p_payload->'observations');
  if rows_count not between 1 and 5000 then raise exception using errcode='22023',message='Expected 1-5000 observations.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('feya-metric-request:'||p_request_key,0));
  select * into old_receipt from public.feya_commerce_seo_metric_import_receipts_v1 where request_key=p_request_key;
  if found then
    -- An API request key identifies the explicit request, not a fresh provider capture.
    -- Concurrent identical requests return the first committed capture unchanged.
    if old_receipt.payload is distinct from p_payload and not (api_import and
      (old_receipt.payload->'google_ads') - array['source_ref','source_request_id','account_currency','account_time_zone'] is not distinct from
      g - array['source_ref','source_request_id','account_currency','account_time_zone']) then
      raise exception using errcode='23505',message='Idempotency key already belongs to a different payload.';
    end if;
    return jsonb_build_object('request_key',p_request_key,'entries',old_receipt.entries,'replayed',true,'inserted_observations',0);
  end if;

  if api_import then
    select * into api_batch from public.feya_metric_request_batch_v1 where metric_batch_id=(g->>'batch_id')::uuid for update;
    if not found or api_batch.provider_code<>'google_ads_api' or api_batch.request_geo<>'US' or api_batch.request_language<>'en' or
       api_batch.batch_status not in ('pending','queued','ready','ready_for_fetch','partial') then
      raise exception using errcode='22023',message='Batch is not eligible for this request.';
    end if;
    perform 1 from public.feya_metric_request_batch_keywords_v1 where metric_batch_keyword_id=any(selected_ids) order by metric_batch_keyword_id for update;
    if (select count(*) from public.feya_metric_request_batch_keywords_v1 where metric_batch_keyword_id=any(selected_ids) and metric_batch_id=api_batch.metric_batch_id
        and keyword_status in ('queued_for_metric_request','pending','queued','ready'))<>cardinality(selected_ids) then
      raise exception using errcode='23505',message='Selected keywords changed or were already fetched.';
    end if;
    select array_agg((value#>>'{metadata,batch_keyword_id}')::uuid order by (value#>>'{metadata,batch_keyword_id}')::uuid) into observed_ids from jsonb_array_elements(p_payload->'observations');
    if observed_ids is distinct from selected_ids or
       (select jsonb_agg(value->>'keyword_norm' order by value->>'keyword_norm') from jsonb_array_elements(p_payload->'observations')) is distinct from
       (select jsonb_agg(value order by value) from jsonb_array_elements_text(g#>'{request,keywords}')) then
      raise exception using errcode='22023',message='Request/observation selection mismatch.';
    end if;
  end if;
  -- Validate every row before any INSERT. Never silently import a passing subset.
  for o in select value from jsonb_array_elements(p_payload->'observations') loop
    e=o->'evidence';
    if jsonb_typeof(o) is distinct from 'object' or jsonb_typeof(e) is distinct from 'object' or
       not (e ?& array['keyword','source','source_ref','market','language','network','fetched_at','period_start','period_end','avg_monthly_searches','search_volume_range','competition','competition_index','low_bid','high_bid','bid_currency_code']) or
       coalesce(length(btrim(e->>'keyword')),0)=0 or e->>'keyword' like '%\_%' or
       o->>'keyword_norm' is distinct from lower(regexp_replace(btrim(pg_catalog.normalize(e->>'keyword','NFKC')),'\s+',' ','g')) or
       e->>'source' is distinct from (case when api_import then 'google_ads_api' else 'google_ads_csv' end) or coalesce(length(btrim(e->>'source_ref')),0)=0 or
       e->>'market' is distinct from 'US' or e->>'language' is distinct from 'en' or e->>'network' is distinct from 'GOOGLE_SEARCH' or
       coalesce(e->>'period_start','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(e->>'period_end','') !~ '^\d{4}-\d{2}-\d{2}$' or
       coalesce(e->>'fetched_at','') !~ '^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$' then
      raise exception using errcode='22023',message='Incomplete or unsupported metric context.';
    end if;
    foreach number_key in array array['keyword','source','source_ref','market','language','network','fetched_at','period_start','period_end'] loop
      if jsonb_typeof(e->number_key) is distinct from 'string' then raise exception using errcode='22023',message='Context fields must be strings.'; end if;
    end loop;
    capture_at=(e->>'fetched_at')::timestamptz; period_start=(e->>'period_start')::date; period_end=(e->>'period_end')::date;
    if capture_at>now() or capture_at<now()-interval '60 days' or period_start>period_end or
       period_end>capture_at::date or period_end::timestamptz<now()-interval '91 days' then
      raise exception using errcode='22023',message='Invalid or stale metric period/capture date.';
    end if;
    if jsonb_typeof(e->'avg_monthly_searches')='null' then
      if jsonb_typeof(e->'search_volume_range') is distinct from 'object' or
         jsonb_typeof(e#>'{search_volume_range,low}') is distinct from 'number' or jsonb_typeof(e#>'{search_volume_range,high}') is distinct from 'number' or
         (e#>>'{search_volume_range,low}')::numeric<0 or (e#>>'{search_volume_range,high}')::numeric<(e#>>'{search_volume_range,low}')::numeric or
         (e#>>'{search_volume_range,high}')::numeric>2147483647 or
         (e#>>'{search_volume_range,low}')::numeric<>trunc((e#>>'{search_volume_range,low}')::numeric) or
         (e#>>'{search_volume_range,high}')::numeric<>trunc((e#>>'{search_volume_range,high}')::numeric) then
        raise exception using errcode='22023',message='Missing or invalid volume range.';
      end if;
    elsif jsonb_typeof(e->'avg_monthly_searches') is distinct from 'number' or jsonb_typeof(e->'search_volume_range') is distinct from 'null' then
      raise exception using errcode='22023',message='Invalid or ambiguous volume representation.';
    end if;
    foreach number_key in array array['avg_monthly_searches','competition_index','low_bid','high_bid'] loop
      if jsonb_typeof(e->number_key)='null' then continue; end if;
      if jsonb_typeof(e->number_key) is distinct from 'number' then raise exception using errcode='22023',message='Metric must be a JSON number or null.'; end if;
      number_value=(e->>number_key)::numeric;
      if number_value<0 or (number_key='avg_monthly_searches' and (number_value<>trunc(number_value) or number_value>2147483647)) or
         (number_key='competition_index' and (number_value>100 or number_value<>trunc(number_value))) then
        raise exception using errcode='22023',message='Metric value outside supported bounds.';
      end if;
    end loop;
    if (e->>'competition' is not null and e->>'competition' not in ('LOW','MEDIUM','HIGH')) or
       ((e->>'low_bid' is not null or e->>'high_bid' is not null) and coalesce(e->>'bid_currency_code','') !~ '^[A-Z]{3}$') or
       ((e->>'low_bid')::numeric>(e->>'high_bid')::numeric) then
      raise exception using errcode='22023',message='Invalid competition or bid currency/range.';
    end if;
    if jsonb_typeof(o->'metadata') is distinct from 'object' then raise exception using errcode='22023',message='Metadata is required.'; end if;
    history=coalesce(nullif(o#>>'{metadata,monthly_history_json}',''),'[]')::jsonb;
    if jsonb_typeof(history) is distinct from 'array' then raise exception using errcode='22023',message='Monthly history must be an array.'; end if;
    for h in select value from jsonb_array_elements(history) loop
      if coalesce(h->>'month','') !~ '^\d{4}-(0[1-9]|1[0-2])$' or
         jsonb_typeof(h->'searches') not in ('number','null') or not (h ? 'searches') or
         (h->>'searches')::numeric<0 or (h->>'searches')::numeric>2147483647 or (h->>'searches')::numeric<>trunc((h->>'searches')::numeric) or
         h->>'month'<to_char(period_start,'YYYY-MM') or h->>'month'>to_char(period_end,'YYYY-MM') then
        raise exception using errcode='22023',message='Invalid monthly history.';
      end if;
    end loop;
    if (select count(*) from jsonb_array_elements(history))<>(select count(distinct value->>'month') from jsonb_array_elements(history)) then
      raise exception using errcode='22023',message='Duplicate monthly observations.';
    end if;
    if api_import then
      select * into bk from public.feya_metric_request_batch_keywords_v1 where metric_batch_keyword_id=(o#>>'{metadata,batch_keyword_id}')::uuid;
      if bk.keyword_norm is distinct from o->>'keyword_norm' or
         lower(regexp_replace(btrim(pg_catalog.normalize(bk.keyword,'NFKC')),'\s+',' ','g')) is distinct from o->>'keyword_norm' or
         e->>'source_ref' is distinct from g->>'source_ref' or e->>'period_start' is distinct from g->>'period_start' or
         e->>'period_end' is distinct from g->>'period_end' or e->>'bid_currency_code' is distinct from g->>'account_currency' or
         period_start<>date_trunc('month',period_start)::date or period_end<>(date_trunc('month',period_start)+interval '12 months - 1 day')::date or
         jsonb_array_length(history)<>12 or
         g#>>'{request,historicalMetricsOptions,yearMonthRange,start,year}' is distinct from extract(year from period_start)::integer::text or
         g#>>'{request,historicalMetricsOptions,yearMonthRange,start,month}' is distinct from upper(btrim(to_char(period_start,'Month'))) or
         g#>>'{request,historicalMetricsOptions,yearMonthRange,end,year}' is distinct from extract(year from period_end)::integer::text or
         g#>>'{request,historicalMetricsOptions,yearMonthRange,end,month}' is distinct from upper(btrim(to_char(period_end,'Month'))) or
         coalesce(o#>>'{metadata,observation_group}','') !~ '^[a-f0-9]{64}$' or
         coalesce(length(o#>>'{metadata,returned_keyword}'),0)=0 or
         jsonb_typeof((o#>>'{metadata,close_variants_json}')::jsonb) is distinct from 'array' or
         jsonb_typeof((o#>>'{metadata,raw_input_json}')::jsonb) is distinct from 'object' then
        raise exception using errcode='22023',message='API evidence disagrees with selected keyword/request period/context.';
      end if;
    end if;
    if o->>'keyword_bank_id' is not null and not exists(select 1 from public.seo_keyword_bank_v1 b where b.id=(o->>'keyword_bank_id')::uuid and b.keyword_norm=o->>'keyword_norm' and b.region=e->>'market' and b.language=e->>'language') then
      raise exception using errcode='23503',message='Keyword bank ID does not match the observation.';
    end if;
    if o->>'existing_snapshot_id' is not null and not exists(select 1 from public.feya_commerce_seo_keyword_metric_snapshots_v1 x where x.snapshot_id=(o->>'existing_snapshot_id')::bigint and x.keyword_norm=o->>'keyword_norm' and x.geo=e->>'market' and x.language=e->>'language') then
      raise exception using errcode='23503',message='Historical snapshot ID does not match the observation.';
    end if;
    k=encode(sha256(convert_to(jsonb_build_array(o->>'keyword_norm',e->>'source',e->>'source_ref',e->>'market',e->>'language',e->>'network',e->>'period_start',e->>'period_end')::text,'UTF8')),'hex');
    if k=any(keys) then raise exception using errcode='22023',message='Duplicate observation in normalized payload.'; end if;
    keys=array_append(keys,k);
  end loop;
  -- Consistent observation lock order avoids reversed overlapping-batch deadlocks.
  for k in select unnest(keys) order by 1 loop perform pg_advisory_xact_lock(hashtextextended('feya-metric-observation:'||k,0)); end loop;
  for o in select value from jsonb_array_elements(p_payload->'observations') loop
    e=o->'evidence';
    k=encode(sha256(convert_to(jsonb_build_array(o->>'keyword_norm',e->>'source',e->>'source_ref',e->>'market',e->>'language',e->>'network',e->>'period_start',e->>'period_end')::text,'UTF8')),'hex');
    select * into s from public.feya_commerce_seo_keyword_metric_import_staging_v1 where demand_observation_key=k;
    if found then
      if s.demand_evidence_json is distinct from o then raise exception using errcode='23505',message='Source observation has conflicting values; use a reviewed source revision.'; end if;
      select * into m from public.feya_commerce_seo_keyword_metric_snapshots_v1 where demand_observation_key=k;
      if not found or m.demand_evidence_json is distinct from o then raise exception using errcode='23514',message='Stored observation pair is incomplete or inconsistent.'; end if;
    else
      select keyword_id into linked_keyword from public.feya_commerce_seo_keyword_master_v1 where keyword_norm=o->>'keyword_norm';
      insert into public.feya_commerce_seo_keyword_metric_import_staging_v1
        (batch_code,keyword,keyword_norm,geo,language,avg_monthly_searches,competition,competition_index,low_top_of_page_bid,high_top_of_page_bid,monthly_search_volumes_raw,source_file_name,import_status,import_note,demand_observation_key,demand_evidence_json)
      values ('demand:'||p_request_key,e->>'keyword',o->>'keyword_norm',e->>'market',e->>'language',(e->>'avg_monthly_searches')::integer,e->>'competition',(e->>'competition_index')::numeric,(e->>'low_bid')::numeric,(e->>'high_bid')::numeric,o::text,e->>'source_ref','promoted_to_snapshots','Atomic observation storage only; keyword/page approval unchanged.',k,o) returning * into s;
      insert into public.feya_commerce_seo_keyword_metric_snapshots_v1
        (keyword_norm,source_api,geo,language,avg_monthly_searches,competition,competition_index,low_top_of_page_bid,high_top_of_page_bid,monthly_search_volumes_json,fetched_at,raw_payload_json,data_freshness_status,keyword_id,source_request_id,targeting_context_hash,access_model,bid_currency_code,demand_observation_key,demand_evidence_json)
      values (o->>'keyword_norm',e->>'source',e->>'market',e->>'language',(e->>'avg_monthly_searches')::integer,e->>'competition',(e->>'competition_index')::numeric,(e->>'low_bid')::numeric,(e->>'high_bid')::numeric,
        coalesce(nullif(o#>>'{metadata,monthly_history_json}',''),'[]')::jsonb,(e->>'fetched_at')::timestamptz,
        jsonb_build_object('contract_version','atomic_keyword_metric_import_v1','request_key',p_request_key,'import_row_id',s.import_row_id::text,'context_evidence_ref',p_payload->>'context_evidence_ref','observation',o),
        'context_review_required',linked_keyword,p_request_key,encode(sha256(convert_to(jsonb_build_array(e->>'market',e->>'language',e->>'network')::text,'UTF8')),'hex'),case when api_import then 'google_cloud_project_oauth' else 'manual_csv' end,e->>'bid_currency_code',k,o) returning * into m;
      new_count=new_count+1;
    end if;
    entries=entries||jsonb_build_array(jsonb_build_object('observation_key',k,'import_row_id',s.import_row_id::text,'snapshot_id',m.snapshot_id::text,'keyword_id',m.keyword_id::text,'keyword_bank_id',o->>'keyword_bank_id'));
  end loop;
  if api_import then
    update public.feya_metric_request_batch_keywords_v1 set keyword_status='metrics_fetched',
      evidence_json=evidence_json||jsonb_build_object('atomic_demand_request_key',p_request_key,'context_review_required',true)
      where metric_batch_keyword_id=any(selected_ids);
    select count(*) into remaining from public.feya_metric_request_batch_keywords_v1 where metric_batch_id=api_batch.metric_batch_id and keyword_status<>'metrics_fetched';
    update public.feya_metric_request_batch_v1 set batch_status=case when remaining=0 then 'applied' else 'partial' end,
      result_summary_json=result_summary_json||jsonb_build_object('last_atomic_demand_request_key',p_request_key,'remaining_keyword_rows',remaining,'context_review_required',true,'metric_contract','google_ads_atomic_evidence_v1'),updated_at=now()
      where metric_batch_id=api_batch.metric_batch_id;
  end if;
  insert into public.feya_commerce_seo_metric_import_receipts_v1(request_key,payload,entries) values(p_request_key,p_payload,entries);
  return jsonb_build_object('request_key',p_request_key,'entries',entries,'replayed',false,'inserted_observations',new_count);
end $$;
do $postcondition$ begin
 if public.feya_commerce_google_ads_import_contract_v1() is distinct from 'google_ads_atomic_evidence_v1' then raise exception 'Google Ads postcondition failed'; end if;
end $postcondition$;
commit;
