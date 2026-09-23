import { createHash } from 'node:crypto';
import type { previewDemandImport } from './searchDemandImportPreview.ts';

export const METRIC_IMPORT_RPC = 'feya_commerce_import_keyword_metrics_atomic_v1';
export const METRIC_IMPORT_HEALTH_RPC = 'feya_commerce_keyword_metric_import_contract_v1';
export const METRIC_IMPORT_CONTRACT = 'atomic_keyword_metric_import_v1';
// Boundary migration excludes atomic observations before legacy selection/scoring.
// Actual deployment must prove both SQL health and authenticated runtime separately.
export const METRIC_IMPORT_CONSUMERS_READY = true;
export const METRIC_IMPORT_RUNTIME_VERIFIED = false;
export const METRIC_READER_HEALTH_RPC = 'feya_commerce_metric_reader_boundary_health_v1';
export const METRIC_READER_CONTRACT = 'metric_reader_boundary_v1';
export type DemandPreview = ReturnType<typeof previewDemandImport>;
function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(value);
}

export function prepareMetricImport(preview:DemandPreview,contextEvidenceRef:string) {
  if(!preview.ok||!preview.observations.length||preview.report.rows.some(r=>!r.usable_for_current_demand_decision)) {
    throw Error('Every input row must pass demand review; partial imports are not allowed.');
  }
  if(typeof contextEvidenceRef!=='string'||!contextEvidenceRef.trim()||contextEvidenceRef.length>1000)throw Error('A context evidence reference is required.');
  const observations=preview.observations.map(o=>o.storage_observation).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
  // Context reference documents the operator assertion; it does not grant SEO approval.
  return {contract_version:METRIC_IMPORT_CONTRACT,context_evidence_ref:contextEvidenceRef.trim(),observations};
}

export function metricImportRequestKey(payload:unknown,clientKey?:string|null) {
  if(clientKey!=null&&!/^[A-Za-z0-9._:-]{8,200}$/.test(clientKey))throw Error('Invalid Idempotency-Key.');
  return createHash('sha256').update(clientKey==null?'metric-content-v1:'+canonical(payload):'metric-client-v1:'+clientKey).digest('hex');
}

type RpcClient={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:any}>};
export async function importMetricsAtomically(client:RpcClient,payload:ReturnType<typeof prepareMetricImport>,clientKey?:string|null) {
  let key:string;
  try{key=metricImportRequestKey(payload,clientKey);}catch(error){return {ok:false,httpStatus:400,error:String(error),receipt:null};}
  try {
    const {data:health,error:healthError}=await client.rpc(METRIC_IMPORT_HEALTH_RPC,{});
    if(healthError||health!==METRIC_IMPORT_CONTRACT)return {ok:false,httpStatus:503,error:'Atomic metric import contract unavailable.',receipt:null};
    const {data,error}=await client.rpc(METRIC_IMPORT_RPC,{p_request_key:key,p_payload:payload});
    if(error)return {ok:false,httpStatus:error.code==='23505'?409:['22023','23503','23514','22003'].includes(error.code)?422:500,error:error.message,receipt:null};
    if(!data||data.request_key!==key||!Array.isArray(data.entries)||data.entries.length!==payload.observations.length||data.entries.some((e:any)=>!/^\d+$/.test(e.import_row_id)||!/^\d+$/.test(e.snapshot_id))) {
      return {ok:false,httpStatus:502,error:'Invalid atomic import receipt; retry the same request key.',receipt:null};
    }
    return {ok:true,httpStatus:data.replayed?200:201,receipt:data,error:null};
  } catch {return {ok:false,httpStatus:503,error:'Metric storage unavailable; retry the same request key.',receipt:null};}
}

export function metricImportWriteBlockers(env:Record<string,string|undefined>) {
  return [env.FEYA_METRIC_IMPORT_STORAGE_ENABLED!=='true'?'storage_disabled':null,
    env.FEYA_ADMIN_AUTH_REQUIRED!=='true'?'admin_auth_required':null,
    !METRIC_IMPORT_CONSUMERS_READY?'legacy_metric_consumers_not_reconciled':null,
    !METRIC_IMPORT_RUNTIME_VERIFIED?'authenticated_metric_import_runtime_not_verified':null].filter((v):v is string=>v!==null);
}

export async function verifyMetricReaderBoundary(client:RpcClient) {
  try{const {data,error}=await client.rpc(METRIC_READER_HEALTH_RPC,{});return !error&&data===METRIC_READER_CONTRACT;}
  catch{return false;}
}
