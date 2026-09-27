import { NextRequest, NextResponse } from 'next/server';
import { withInternalApi } from '@/lib/internalAuth';
import { readInternalExecutionRequest } from '@/lib/internalExecutionRequest';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { GOOGLE_ADS_BATCH_STATUSES, GOOGLE_ADS_HEALTH_RPC, GOOGLE_ADS_IMPORT_CONTRACT, googleBatchId, googleRequestKey, prepareGoogleAdsPlan, googleAdsEvidencePayload } from '@/lib/googleAdsDemandAdapter';
import { getOAuthAccessToken, getGoogleAdsCustomerContext, runGoogleAdsKeywordMetrics, GoogleAdsApiError } from '@/lib/googleAdsProvider';
import { METRIC_IMPORT_RPC, metricImportWriteBlockers, verifyMetricReaderBoundary } from '@/lib/searchMetricAtomicStorage';

export const dynamic = 'force-dynamic';
const rights={can_assign_primary:false,can_publish:false,can_index:false};
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json({...rights,...body},{status});

async function handler(request:NextRequest) {
  const execution=await readInternalExecutionRequest(request,{queryDryRun:true});
  if(!execution.ok)return execution.response;
  const {body,dryRun}=execution;
  try {
    if(!dryRun){const blockers=metricImportWriteBlockers(process.env);if(process.env.FEYA_GOOGLE_ADS_IMPORT_ENABLED!=='true')blockers.push('google_ads_import_disabled');if(blockers.length)return reply({ok:false,blockers,saved_rows:0},503);}
    const query=request.nextUrl.searchParams;
    const candidates=[body.batch_id,body.batchId,...query.getAll('batch_id'),...query.getAll('batchId')].filter(v=>v!==undefined);
    if(candidates.length>1&&new Set(candidates).size>1)throw Error('Conflicting batch identifiers.');
    if(!candidates.length)return reply({ok:false,code:'explicit_batch_required',dry_run:dryRun,saved_rows:0},400);
    const batchId=googleBatchId(candidates[0]);
    const requestKey=dryRun?null:googleRequestKey(request.headers.get('Idempotency-Key'));
    const supabase=getSupabaseServiceRoleClient();if(!supabase)return reply({ok:false,code:'metric_storage_unavailable',saved_rows:0},503);
    const {data:batch,error:batchError}=await supabase.from('feya_metric_request_batch_v1').select('*').eq('metric_batch_id',batchId).maybeSingle();
    if(batchError)return reply({ok:false,code:'batch_read_failed',saved_rows:0},503);
    if(!batch)return reply({ok:false,code:'batch_not_found',saved_rows:0},404);
    // Preview offers stable IDs for an explicit POST; it never calls Google.
    if(dryRun&&!body.keyword_ids){
      const r=await supabase.from('feya_metric_request_batch_keywords_v1').select('metric_batch_keyword_id,keyword,keyword_norm,keyword_status').eq('metric_batch_id',batchId).neq('keyword_status','metrics_fetched').order('metric_batch_keyword_id').limit(20);
      if(r.error)return reply({ok:false,code:'keyword_read_failed',saved_rows:0},503);
      return reply({ok:true,dry_run:true,batch_id:batchId,selection:r.data,required:['keyword_ids','period_start (YYYY-MM)','period_end (YYYY-MM)','Idempotency-Key'],saved_rows:0,google_ads_request_ok:false,write_mode:'preview_only'});
    }
    if(!Array.isArray(body.keyword_ids)||body.keyword_ids.length<1||body.keyword_ids.length>20)throw Error('Select 1–20 keyword IDs.');
    const ids=body.keyword_ids.map(googleBatchId);
    const {data:rows,error:rowError}=await supabase.from('feya_metric_request_batch_keywords_v1').select('*').eq('metric_batch_id',batchId).in('metric_batch_keyword_id',ids);
    if(rowError)return reply({ok:false,code:'keyword_read_failed',saved_rows:0},503);
    const plan=prepareGoogleAdsPlan(batch,rows||[],body,process.env,new Date());
    if(dryRun)return reply({ok:true,dry_run:true,batch_id:batchId,google_ads_request:plan.request,request_fingerprint:plan.fingerprint,saved_rows:0,google_ads_request_ok:false,write_mode:'preview_only'});
    const health=await supabase.rpc(GOOGLE_ADS_HEALTH_RPC);
    if(health.error||health.data!==GOOGLE_ADS_IMPORT_CONTRACT||!await verifyMetricReaderBoundary(supabase))return reply({ok:false,code:'google_ads_storage_contract_unavailable',saved_rows:0},503);
    const previous=await supabase.from('feya_commerce_seo_metric_import_receipts_v1').select('payload,entries').eq('request_key',requestKey!).maybeSingle();
    if(previous.error)return reply({ok:false,code:'receipt_read_failed',saved_rows:0},503);
    if(previous.data){
      if(previous.data.payload?.google_ads?.request_fingerprint!==plan.fingerprint)return reply({ok:false,code:'idempotency_conflict',saved_rows:0},409);
      return reply({ok:true,dry_run:false,batch_id:batchId,saved_rows:0,google_ads_request_ok:false,write_mode:'atomic_receipt_replay',receipt:{request_key:requestKey,entries:previous.data.entries,replayed:true,inserted_observations:0}});
    }
    if(!GOOGLE_ADS_BATCH_STATUSES.includes(batch.batch_status)||(rows||[]).some(r=>!['queued_for_metric_request','pending','queued','ready'].includes(r.keyword_status)))return reply({ok:false,code:'batch_or_keyword_not_fetchable',saved_rows:0},409);
    const token=await getOAuthAccessToken();
    const context=await getGoogleAdsCustomerContext(plan.customer_id,token);
    if(!context.currencyCode||!context.timeZone)return reply({ok:false,code:'google_account_context_unavailable',saved_rows:0},502);
    const result=await runGoogleAdsKeywordMetrics({customerId:plan.customer_id,endpoint:plan.endpoint,payload:plan.request},token);
    let payload;
    try{payload=googleAdsEvidencePayload(plan,result.payload,context,result.requestId,new Date());}
    catch(error){return reply({ok:false,code:'google_response_requires_review',safe_error_message:error instanceof Error?error.message:'Invalid Google response',saved_rows:0,google_ads_request_ok:true},422);}
    if(!await verifyMetricReaderBoundary(supabase))return reply({ok:false,code:'metric_boundary_changed',saved_rows:0},503);
    const saved=await supabase.rpc(METRIC_IMPORT_RPC,{p_request_key:requestKey,p_payload:payload});
    if(saved.error)return reply({ok:false,code:'atomic_google_import_failed',saved_rows:0,retry_same_request_key:true},saved.error.code==='23505'?409:['22023','23514','23503'].includes(saved.error.code)?422:503);
    const receipt=saved.data;
    if(receipt?.request_key!==requestKey||!Array.isArray(receipt.entries)||receipt.entries.length!==ids.length||receipt.entries.some((e:Record<string,unknown>)=>typeof e.snapshot_id!=='string'||!/^\d+$/.test(e.snapshot_id)||typeof e.import_row_id!=='string'||!/^\d+$/.test(e.import_row_id)))return reply({ok:false,code:'invalid_receipt_retry_same_key'},502);
    return reply({ok:true,dry_run:false,batch_id:batchId,saved_rows:receipt.inserted_observations,receipt,google_ads_request_ok:true,write_mode:'atomic_evidence',context_review_required:true},receipt.replayed?200:201);
  } catch(error) {
    if(error instanceof GoogleAdsApiError)return reply({ok:false,code:'google_ads_request_failed',saved_rows:0,google_ads_request_ok:false,...error.diagnostics},502);
    return reply({ok:false,code:'google_ads_import_rejected',saved_rows:0,safe_error_message:'Check the explicit batch, keyword IDs, period, targeting and provider configuration.'},400);
  }
}
export const GET=withInternalApi(handler);
export const POST=withInternalApi(handler);
