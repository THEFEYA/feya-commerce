import {NextRequest,NextResponse} from 'next/server';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';
export const runtime='nodejs';export const dynamic='force-dynamic';
const RELEASE_REF='feya-review-207-20260924';
const PRODUCT_IDS=['057fbd51-52f5-4404-b126-e5d75b8599f4','5602d557-9d98-454b-bc98-9b9ea84b442f'].sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>process.env.FEYA_COMMERCE_MANUAL_PRICE_GOVERNANCE_ENABLED==='true';
function sameOrigin(r:NextRequest){const o=r.headers.get('origin'),h=r.headers.get('host');if(!o||!h)return false;try{const u=new URL(o);return u.origin===o&&u.host===h&&u.protocol===r.nextUrl.protocol}catch{return false}}
async function evidence(service:any){
 const {data,error}=await service.rpc('feya_commerce_manual_price_lane_governance_evidence_v1');if(error)throw new Error(error.message||'manual_price_governance_evidence_failed');
 const v=data as any;
 if(v?.contract_version!=='manual_price_lane_governance_v1'||v?.price_rows!==6||v?.configuration_rows!==6||v?.manual_override_rows!==2||v?.source_carry_forward_rows!==4||v?.commercial_values_change!==false||v?.payment_enabled!==false||v?.indexing_enabled!==false)throw new Error('manual_price_governance_evidence_invalid');
 return v;
}
export async function GET(){
 const actor=await requireOwnerActionActor();if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error,enabled:false},actor.status);
 if(!enabled())return reply({ok:false,code:'manual_price_governance_disabled',enabled:false},423);
 try{const e=await evidence(actor.service);return reply({ok:true,enabled:true,release_ref:RELEASE_REF,product_ids:PRODUCT_IDS,evidence:e,state:e.already_ready?'already_ready':e.candidate?'ready_for_owner_approval':'not_candidate'})}
 catch(err){return reply({ok:false,code:err instanceof Error?err.message:'manual_price_governance_evidence_failed'},409)}
}
export async function POST(request:NextRequest){
 const actor=await requireOwnerActionActor();if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
 if(!enabled())return reply({ok:false,code:'manual_price_governance_disabled'},423);
 if(!sameOrigin(request))return reply({ok:false,code:'manual_price_governance_same_origin_required'},403);
 let body:any;try{body=await request.json()}catch{return reply({ok:false,code:'invalid_json'},400)}
 const action=String(body?.action||'');
 if(action==='prepare'){
  try{
   const e=await evidence(actor.service);
   if(e.already_ready)return reply({ok:true,state:'already_ready',release_ref:RELEASE_REF,evidence:e});
   if(!e.candidate)return reply({ok:false,code:'manual_price_governance_not_candidate',evidence:e},409);
   const {data,error}=await actor.service.rpc('feya_fn_create_execution_request_v1',{
    p_action_code:'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',p_mutation_domain:'COMMERCE_PRICE',
    p_target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'manual-price-lane',canonical_product_ids:PRODUCT_IDS},
    p_target_version_refs_json:{release_ref:RELEASE_REF,evidence_sha256:e.evidence_sha256,price_rows:6,configuration_rows:6},
    p_request_payload_json:{contract_version:'manual_price_lane_governance_v1',release_ref:RELEASE_REF,canonical_product_ids:PRODUCT_IDS,evidence_sha256:e.evidence_sha256,expected_price_rows:6,expected_configuration_rows:6},
    p_rollback_plan_json:{mode:'explicit_compensating_change',preserve_audit_history:true,commercial_values_unchanged:true},
    p_postflight_check_json:{strict_ready_rows:6,commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false},
    p_requested_by_type:'human',p_requested_by_user_id:actor.userId,
    p_idempotency_key:`manual-price-governance:${RELEASE_REF}:${e.evidence_sha256}`,
   });
   if(error)throw new Error(error.message||'manual_price_governance_prepare_failed');
   return reply({ok:true,state:'prepared',release_ref:RELEASE_REF,evidence:e,execution:Array.isArray(data)?data[0]:data});
  }catch(err){return reply({ok:false,code:err instanceof Error?err.message:'manual_price_governance_prepare_failed'},409)}
 }
 if(action==='execute'){
  const id=String(body?.execution_request_id||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply({ok:false,code:'invalid_execution_request_id'},400);
  const {data,error}=await actor.service.rpc('feya_commerce_execute_manual_price_lane_governance_v1',{p_execution_request_id:id});if(error)return reply({ok:false,code:error.message||'manual_price_governance_execute_failed'},409);
  return reply({ok:true,result:data});
 }
 return reply({ok:false,code:'unsupported_action'},400);
}
