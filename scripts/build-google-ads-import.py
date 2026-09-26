"""Reviewed additive evolution of the existing atomic importer; never executed on production here."""
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
old=(root/'supabase/migrations/20260923232105_keyword_metric_atomic_import_v1.sql').read_text()
fn=old[old.index('create function public.feya_commerce_import_keyword_metrics_atomic_v1'):old.index('revoke all on function public.feya_commerce_import_keyword_metrics_atomic_v1')]
original_body=fn.split('$$')[1]
fn=fn.replace('create function','create or replace function',1)
fn=fn.replace('  new_count integer=0;','''  new_count integer=0;
  g jsonb; api_batch public.feya_metric_request_batch_v1%rowtype;
  bk public.feya_metric_request_batch_keywords_v1%rowtype;
  api_import boolean; selected_ids uuid[]; observed_ids uuid[]; remaining integer;''')
fn=fn.replace("  rows_count=jsonb_array_length(p_payload->'observations');", """  g=p_payload->'google_ads';
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
  rows_count=jsonb_array_length(p_payload->'observations');""")
fn=fn.replace("    if old_receipt.payload is distinct from p_payload then raise exception using errcode='23505',message='Idempotency key already belongs to a different payload.'; end if;", """    -- An API request key identifies the explicit request, not a fresh provider capture.
    -- Concurrent identical requests return the first committed capture unchanged.
    if old_receipt.payload is distinct from p_payload and not (api_import and
      (old_receipt.payload->'google_ads') - array['source_ref','source_request_id','account_currency','account_time_zone'] is not distinct from
      g - array['source_ref','source_request_id','account_currency','account_time_zone']) then
      raise exception using errcode='23505',message='Idempotency key already belongs to a different payload.';
    end if;""")
fn=fn.replace('  -- Validate every row before any INSERT.', '''  if api_import then
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
  -- Validate every row before any INSERT.''')
fn=fn.replace("e->>'source' is distinct from 'google_ads_csv'", "e->>'source' is distinct from (case when api_import then 'google_ads_api' else 'google_ads_csv' end)")
fn=fn.replace("    if o->>'keyword_bank_id' is not null", """    if api_import then
      select * into bk from public.feya_metric_request_batch_keywords_v1 where metric_batch_keyword_id=(o#>>'{metadata,batch_keyword_id}')::uuid;
      if bk.keyword_norm is distinct from o->>'keyword_norm' or
         lower(regexp_replace(btrim(pg_catalog.normalize(bk.keyword,'NFKC')),'\\s+',' ','g')) is distinct from o->>'keyword_norm' or
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
    if o->>'keyword_bank_id' is not null""")
fn=fn.replace("'manual_csv',e->>'bid_currency_code'", "case when api_import then 'google_cloud_project_oauth' else 'manual_csv' end,e->>'bid_currency_code'")
fn=fn.replace('  insert into public.feya_commerce_seo_metric_import_receipts_v1', '''  if api_import then
    update public.feya_metric_request_batch_keywords_v1 set keyword_status='metrics_fetched',
      evidence_json=evidence_json||jsonb_build_object('atomic_demand_request_key',p_request_key,'context_review_required',true)
      where metric_batch_keyword_id=any(selected_ids);
    select count(*) into remaining from public.feya_metric_request_batch_keywords_v1 where metric_batch_id=api_batch.metric_batch_id and keyword_status<>'metrics_fetched';
    update public.feya_metric_request_batch_v1 set batch_status=case when remaining=0 then 'applied' else 'partial' end,
      result_summary_json=result_summary_json||jsonb_build_object('last_atomic_demand_request_key',p_request_key,'remaining_keyword_rows',remaining,'context_review_required',true,'metric_contract','google_ads_atomic_evidence_v1'),updated_at=now()
      where metric_batch_id=api_batch.metric_batch_id;
  end if;
  insert into public.feya_commerce_seo_metric_import_receipts_v1''')
md5=lambda s:hashlib.md5(s.encode()).hexdigest()
newmd5=md5(fn.split('$$')[1])
preflight=f"""-- Unapplied migration8. Extends the SAME immutable store and receipt transaction.
begin;
do $preflight$ begin
 if md5((select prosrc from pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure))<>'{md5(original_body)}' or
    public.feya_commerce_metric_reader_boundary_health_v1() is distinct from 'metric_reader_boundary_v1' or
    public.feya_commerce_metric_access_boundary_health_v1() is distinct from 'metric_access_boundary_v2' then
   raise exception 'Unexpected atomic importer or boundary; stop for review';
 end if;
end $preflight$;
"""
health=f"""
create function public.feya_commerce_google_ads_import_contract_v1() returns text
language sql stable security invoker set search_path='' as $$
 select case when
  (select md5(prosrc)='{newmd5}' and not prosecdef and proconfig @> array['search_path=""','TimeZone=UTC'] from pg_catalog.pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure)
  and not pg_catalog.has_function_privilege('anon','public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)','EXECUTE')
  and not pg_catalog.has_function_privilege('authenticated','public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)','EXECUTE')
  and public.feya_commerce_metric_reader_boundary_health_v1()='metric_reader_boundary_v1'
  and public.feya_commerce_metric_access_boundary_health_v1()='metric_access_boundary_v2'
 then 'google_ads_atomic_evidence_v1'::text else null end
$$;
revoke all on function public.feya_commerce_google_ads_import_contract_v1() from public,anon,authenticated;
grant execute on function public.feya_commerce_google_ads_import_contract_v1() to service_role;
"""
# SQL validator resolves function references on execution; create health before replacing importer.
post="""do $postcondition$ begin
 if public.feya_commerce_google_ads_import_contract_v1() is distinct from 'google_ads_atomic_evidence_v1' then raise exception 'Google Ads postcondition failed'; end if;
end $postcondition$;
commit;
"""
(root/'supabase/migrations/20260924095003_google_ads_atomic_evidence_v1.sql').write_text(preflight+health+fn+post)
# Restores CSV-only importer while keeping stored API observations and reader isolation intact.
rollback=f"""-- Separately reviewed emergency rehearsal: disable API flag first; never remove reader isolation.
begin;
do $$ begin
 if public.feya_commerce_google_ads_import_contract_v1() is distinct from 'google_ads_atomic_evidence_v1' then raise exception 'Rollback precondition failed'; end if;
end $$;
{old[old.index('create function public.feya_commerce_import_keyword_metrics_atomic_v1'):old.index('revoke all on function public.feya_commerce_import_keyword_metrics_atomic_v1')].replace('create function','create or replace function',1)}
commit;
"""
(root/'tests/search-db/fixtures/rollback-google-ads-import.sql').write_text(rollback)
