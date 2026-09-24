-- Separately reviewed emergency rehearsal: disable API flag first; never remove reader isolation.
begin;
do $$ begin
 if public.feya_commerce_google_ads_import_contract_v1() is distinct from 'google_ads_atomic_evidence_v1' then raise exception 'Rollback precondition failed'; end if;
end $$;
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
  rows_count=jsonb_array_length(p_payload->'observations');
  if rows_count not between 1 and 5000 then raise exception using errcode='22023',message='Expected 1-5000 observations.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('feya-metric-request:'||p_request_key,0));
  select * into old_receipt from public.feya_commerce_seo_metric_import_receipts_v1 where request_key=p_request_key;
  if found then
    if old_receipt.payload is distinct from p_payload then raise exception using errcode='23505',message='Idempotency key already belongs to a different payload.'; end if;
    return jsonb_build_object('request_key',p_request_key,'entries',old_receipt.entries,'replayed',true,'inserted_observations',0);
  end if;

  -- Validate every row before any INSERT. Never silently import a passing subset.
  for o in select value from jsonb_array_elements(p_payload->'observations') loop
    e=o->'evidence';
    if jsonb_typeof(o) is distinct from 'object' or jsonb_typeof(e) is distinct from 'object' or
       not (e ?& array['keyword','source','source_ref','market','language','network','fetched_at','period_start','period_end','avg_monthly_searches','search_volume_range','competition','competition_index','low_bid','high_bid','bid_currency_code']) or
       coalesce(length(btrim(e->>'keyword')),0)=0 or e->>'keyword' like '%\_%' or
       o->>'keyword_norm' is distinct from lower(regexp_replace(btrim(pg_catalog.normalize(e->>'keyword','NFKC')),'\s+',' ','g')) or
       e->>'source' is distinct from 'google_ads_csv' or coalesce(length(btrim(e->>'source_ref')),0)=0 or
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
        'context_review_required',linked_keyword,p_request_key,encode(sha256(convert_to(jsonb_build_array(e->>'market',e->>'language',e->>'network')::text,'UTF8')),'hex'),'manual_csv',e->>'bid_currency_code',k,o) returning * into m;
      new_count=new_count+1;
    end if;
    entries=entries||jsonb_build_array(jsonb_build_object('observation_key',k,'import_row_id',s.import_row_id::text,'snapshot_id',m.snapshot_id::text,'keyword_id',m.keyword_id::text,'keyword_bank_id',o->>'keyword_bank_id'));
  end loop;
  insert into public.feya_commerce_seo_metric_import_receipts_v1(request_key,payload,entries) values(p_request_key,p_payload,entries);
  return jsonb_build_object('request_key',p_request_key,'entries',entries,'replayed',false,'inserted_observations',new_count);
end $$;

commit;
