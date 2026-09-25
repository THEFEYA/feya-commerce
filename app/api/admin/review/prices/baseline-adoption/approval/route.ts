import { NextRequest,NextResponse } from 'next/server';
import audit from '@/docs/search/price-baseline-audit-manifest-20260925.json';
import release from '@/docs/search/closed-review-source-manifest-20260924.json';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { priceBaselineApprovalScopeDecision } from '@/lib/commercePriceBaselineApproval';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF=String((audit as any).release_ref||'');
const EXPECTED_PRODUCTS=Number((audit as any).counts?.clean_source_products||0);
const EXPECTED_ROWS=Number((audit as any).counts?.clean_source_price_rows||0);
const MANUAL_IDS=new Set<string>(((audit as any).manual_override_product_ids||[]).map(String));
const CLEAN_IDS=((release as any).entries||[]).map((entry:any)=>String(entry?.identity?.canonical_product_id||'')).filter((id:string)=>id&&!MANUAL_IDS.has(id)).sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>process.env.FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED==='true';

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}
}
function text(value:unknown){return typeof value==='string'?value.trim():''}
function uuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'price_baseline_adoption_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'price_baseline_same_origin_required'},403);

  let body:any;
  try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const executionRequestId=text(body?.execution_request_id);
  const expectedStatus=text(body?.expected_status).toUpperCase();
  const reason=text(body?.reason);
  const idempotencyKey=text(body?.idempotency_key)||crypto.randomUUID();

  if(!uuid(executionRequestId))return reply({ok:false,code:'invalid_execution_request_id'},400);
  if(expectedStatus!=='APPROVAL_REQUIRED')return reply({ok:false,code:'invalid_expected_status'},400);
  if(reason.length<3||reason.length>1500)return reply({ok:false,code:'invalid_reason'},400);

  const {data:requestRow,error:requestError}=await actor.service
    .from('feya_growth_execution_requests_v1')
    .select('execution_request_id,action_code,mutation_domain,request_status,requested_by_type,requested_by_user_id,target_scope_json,target_version_refs_json,request_payload_json')
    .eq('execution_request_id',executionRequestId)
    .maybeSingle();

  if(requestError)return reply({ok:false,code:'price_baseline_approval_lookup_failed',error:requestError.message},503);
  if(!requestRow)return reply({ok:false,code:'price_baseline_execution_request_not_found'},404);

  if(CLEAN_IDS.length!==EXPECTED_PRODUCTS)return reply({ok:false,code:'price_baseline_release_manifest_mismatch'},503);

  const scope=priceBaselineApprovalScopeDecision({
    row:requestRow,
    actorUserId:actor.userId,
    releaseRef:RELEASE_REF,
    cleanProductIds:CLEAN_IDS,
    expectedRows:EXPECTED_ROWS,
  });

  if(!scope.ok)return reply({ok:false,code:'price_baseline_approval_scope_mismatch',reason_codes:scope.reasons},409);

  const {data,error}=await actor.service.rpc('feya_fn_owner_approve_execution_request_v1',{
    p_execution_request_id:executionRequestId,
    p_expected_status:expectedStatus,
    p_reason:reason,
    p_human_user_id:actor.userId,
    p_idempotency_key:idempotencyKey,
  });

  if(error){
    const message=error.message||'Price baseline approval failed.';
    const stale=/stale|does not require approval/i.test(message);
    return reply({ok:false,code:stale?'stale_execution_state':'price_baseline_approval_failed',error:message},stale?409:500);
  }

  return reply({
    ok:true,
    approval:Array.isArray(data)?data[0]:data,
    release_ref:RELEASE_REF,
    message:'Exact price-baseline Execution Request approved. Execution remains a separate step.',
  });
}
