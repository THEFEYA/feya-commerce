import {NextRequest,NextResponse} from 'next/server';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';
import {manualPriceGovernanceApprovalDecision} from '@/lib/commerceManualPriceGovernanceApproval';
export const runtime='nodejs';export const dynamic='force-dynamic';
const RELEASE_REF='feya-review-207-20260924';
const PRODUCT_IDS=['057fbd51-52f5-4404-b126-e5d75b8599f4','5602d557-9d98-454b-bc98-9b9ea84b442f'].sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>process.env.FEYA_COMMERCE_MANUAL_PRICE_GOVERNANCE_ENABLED==='true';
const clean=(v:unknown)=>typeof v==='string'?v.trim():'';
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function sameOrigin(r:NextRequest){const o=r.headers.get('origin'),h=r.headers.get('host');if(!o||!h)return false;try{const u=new URL(o);return u.origin===o&&u.host===h&&u.protocol===r.nextUrl.protocol}catch{return false}}
export async function POST(request:NextRequest){
 const actor=await requireOwnerActionActor();if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
 if(!enabled())return reply({ok:false,code:'manual_price_governance_disabled'},423);
 if(!sameOrigin(request))return reply({ok:false,code:'manual_price_governance_same_origin_required'},403);
 let body:any;try{body=await request.json()}catch{return reply({ok:false,code:'invalid_json'},400)}
 const id=clean(body?.execution_request_id),expected=clean(body?.expected_status).toUpperCase(),reason=clean(body?.reason),key=clean(body?.idempotency_key)||crypto.randomUUID();
 if(!uuid(id))return reply({ok:false,code:'invalid_execution_request_id'},400);if(expected!=='APPROVAL_REQUIRED')return reply({ok:false,code:'invalid_expected_status'},400);if(reason.length<3||reason.length>1500)return reply({ok:false,code:'invalid_reason'},400);
 const {data:e,error:ee}=await actor.service.rpc('feya_commerce_manual_price_lane_governance_evidence_v1');if(ee)return reply({ok:false,code:'manual_price_governance_evidence_failed',error:ee.message},503);
 const evidence=e as any;if(!evidence?.candidate||evidence?.already_ready||typeof evidence?.evidence_sha256!=='string')return reply({ok:false,code:'manual_price_governance_not_candidate'},409);
 const {data:row,error:le}=await actor.service.from('feya_growth_execution_requests_v1').select('execution_request_id,action_code,mutation_domain,request_status,requested_by_type,requested_by_user_id,target_scope_json,target_version_refs_json,request_payload_json').eq('execution_request_id',id).maybeSingle();
 if(le)return reply({ok:false,code:'manual_price_governance_approval_lookup_failed',error:le.message},503);if(!row)return reply({ok:false,code:'manual_price_governance_request_not_found'},404);
 const scope=manualPriceGovernanceApprovalDecision({row,actorUserId:actor.userId,releaseRef:RELEASE_REF,productIds:PRODUCT_IDS,currentEvidenceSha256:evidence.evidence_sha256});
 if(!scope.ok)return reply({ok:false,code:'manual_price_governance_approval_scope_mismatch',reason_codes:scope.reasons},409);
 const {data,error}=await actor.service.rpc('feya_fn_owner_approve_execution_request_v1',{p_execution_request_id:id,p_expected_status:expected,p_reason:reason,p_human_user_id:actor.userId,p_idempotency_key:key});
 if(error){const m=error.message||'Manual price governance approval failed.';const stale=/stale|does not require approval/i.test(m);return reply({ok:false,code:stale?'stale_execution_state':'manual_price_governance_approval_failed',error:m},stale?409:500)}
 return reply({ok:true,approval:Array.isArray(data)?data[0]:data,release_ref:RELEASE_REF,message:'Exact manual price lane governance approved. Execution remains separate.'});
}
