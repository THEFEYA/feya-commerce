import { NextRequest,NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { manualRepairApprovalScopeDecision } from '@/lib/commerceManualConfigurationRepairApproval';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF='feya-review-207-20260924';
const PRODUCT_IDS=[
  '057fbd51-52f5-4404-b126-e5d75b8599f4',
  '5602d557-9d98-454b-bc98-9b9ea84b442f',
].sort();
const EXPECTED_EVIDENCE='19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>process.env.FEYA_COMMERCE_MANUAL_CONFIGURATION_REPAIR_ENABLED==='true';
function sameOrigin(request:NextRequest){const origin=request.headers.get('origin'),host=request.headers.get('host');if(!origin||!host)return false;try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}}
const clean=(v:unknown)=>typeof v==='string'?v.trim():'';
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'manual_configuration_repair_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'manual_configuration_repair_same_origin_required'},403);

  let body:any;try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const executionRequestId=clean(body?.execution_request_id);
  const expectedStatus=clean(body?.expected_status).toUpperCase();
  const reason=clean(body?.reason);
  const idempotencyKey=clean(body?.idempotency_key)||crypto.randomUUID();
  if(!uuid(executionRequestId))return reply({ok:false,code:'invalid_execution_request_id'},400);
  if(expectedStatus!=='APPROVAL_REQUIRED')return reply({ok:false,code:'invalid_expected_status'},400);
  if(reason.length<3||reason.length>1500)return reply({ok:false,code:'invalid_reason'},400);

  const {data:row,error:lookupError}=await actor.service.from('feya_growth_execution_requests_v1')
    .select('execution_request_id,action_code,mutation_domain,request_status,requested_by_type,requested_by_user_id,target_scope_json,target_version_refs_json,request_payload_json')
    .eq('execution_request_id',executionRequestId).maybeSingle();
  if(lookupError)return reply({ok:false,code:'manual_configuration_repair_approval_lookup_failed',error:lookupError.message},503);
  if(!row)return reply({ok:false,code:'manual_configuration_repair_request_not_found'},404);

  const scope=manualRepairApprovalScopeDecision({row,actorUserId:actor.userId,releaseRef:RELEASE_REF,productIds:PRODUCT_IDS,expectedEvidenceSha256:EXPECTED_EVIDENCE});
  if(!scope.ok)return reply({ok:false,code:'manual_configuration_repair_approval_scope_mismatch',reason_codes:scope.reasons},409);

  const {data,error}=await actor.service.rpc('feya_fn_owner_approve_execution_request_v1',{
    p_execution_request_id:executionRequestId,
    p_expected_status:expectedStatus,
    p_reason:reason,
    p_human_user_id:actor.userId,
    p_idempotency_key:idempotencyKey,
  });
  if(error){const message=error.message||'Manual configuration repair approval failed.';const stale=/stale|does not require approval/i.test(message);return reply({ok:false,code:stale?'stale_execution_state':'manual_configuration_repair_approval_failed',error:message},stale?409:500);}
  return reply({ok:true,approval:Array.isArray(data)?data[0]:data,release_ref:RELEASE_REF,message:'Exact two-product configuration repair approved. Execution remains separate.'});
}
