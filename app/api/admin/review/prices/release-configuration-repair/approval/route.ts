import {NextRequest,NextResponse} from 'next/server';
import release from '@/docs/search/closed-review-source-manifest-20260924.json';
import structureAudit from '@/docs/search/configuration-binding-audit-20260925.json';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';
import {releaseConfigurationRepairApprovalScopeDecision} from '@/lib/commerceReleaseConfigurationRepairApproval';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF=String((structureAudit as any).release_ref||'');
const PRODUCT_IDS=((release as any).entries||[]).map((entry:any)=>String(entry?.identity?.canonical_product_id||'')).filter(Boolean).sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>true; // Exact owner-auth + evidence/hash + Execution Gateway are the activation boundary.
function sameOrigin(request:NextRequest){const origin=request.headers.get('origin'),host=request.headers.get('host');if(!origin||!host)return false;try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}}
const clean=(v:unknown)=>typeof v==='string'?v.trim():'';
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'release_configuration_binding_repair_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'release_configuration_binding_same_origin_required'},403);

  let body:any;try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const executionRequestId=clean(body?.execution_request_id);
  const expectedStatus=clean(body?.expected_status).toUpperCase();
  const reason=clean(body?.reason);
  const idempotencyKey=clean(body?.idempotency_key)||crypto.randomUUID();
  if(!uuid(executionRequestId))return reply({ok:false,code:'invalid_execution_request_id'},400);
  if(expectedStatus!=='APPROVAL_REQUIRED')return reply({ok:false,code:'invalid_expected_status'},400);
  if(reason.length<3||reason.length>1500)return reply({ok:false,code:'invalid_reason'},400);
  if(PRODUCT_IDS.length!==207)return reply({ok:false,code:'release_configuration_binding_manifest_mismatch'},503);

  const [{data:row,error:lookupError},{data:evidence,error:evidenceError}]=await Promise.all([
    actor.service.from('feya_growth_execution_requests_v1')
      .select('execution_request_id,action_code,mutation_domain,request_status,requested_by_type,requested_by_user_id,target_scope_json,target_version_refs_json,request_payload_json')
      .eq('execution_request_id',executionRequestId).maybeSingle(),
    actor.service.rpc('feya_commerce_release_configuration_binding_evidence_v1',{p_product_ids:PRODUCT_IDS}),
  ]);
  if(lookupError)return reply({ok:false,code:'release_configuration_binding_approval_lookup_failed',error:lookupError.message},503);
  if(evidenceError)return reply({ok:false,code:'release_configuration_binding_evidence_failed',error:evidenceError.message},503);
  if(!row)return reply({ok:false,code:'release_configuration_binding_request_not_found'},404);
  if((evidence as any)?.candidate!==true)return reply({ok:false,code:'release_configuration_binding_not_candidate',evidence},409);

  const evidenceSha=String((evidence as any)?.evidence_sha256||'');
  const scope=releaseConfigurationRepairApprovalScopeDecision({
    row,actorUserId:actor.userId,releaseRef:RELEASE_REF,productIds:PRODUCT_IDS,expectedEvidenceSha256:evidenceSha,
  });
  if(!scope.ok)return reply({ok:false,code:'release_configuration_binding_approval_scope_mismatch',reason_codes:scope.reasons},409);

  const {data,error}=await actor.service.rpc('feya_fn_owner_approve_execution_request_v1',{
    p_execution_request_id:executionRequestId,p_expected_status:expectedStatus,p_reason:reason,
    p_human_user_id:actor.userId,p_idempotency_key:idempotencyKey,
  });
  if(error){
    const message=error.message||'Release configuration repair approval failed.';
    const stale=/stale|does not require approval/i.test(message);
    return reply({ok:false,code:stale?'stale_execution_state':'release_configuration_binding_approval_failed',error:message},stale?409:500);
  }
  return reply({ok:true,approval:Array.isArray(data)?data[0]:data,release_ref:RELEASE_REF,
    message:'Exact release configuration repair approved. Commercial amounts remain unchanged; execution is separate.'});
}
