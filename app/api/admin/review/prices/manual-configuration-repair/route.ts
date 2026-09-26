import { NextRequest,NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF='feya-review-207-20260924';
const PRODUCT_IDS=[
  '057fbd51-52f5-4404-b126-e5d75b8599f4',
  '5602d557-9d98-454b-bc98-9b9ea84b442f',
].sort();
const EXPECTED_EVIDENCE='19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>false; // Superseded by catalog-wide REPAIR_RELEASE_CONFIGURATION_BINDINGS after production structural audit.

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}
}
async function evidence(service:any){
  const {data,error}=await service.rpc('feya_commerce_manual_configuration_repair_evidence_v1');
  if(error)throw new Error(error.message||'manual_configuration_repair_evidence_failed');
  const value=data as any;
  if(value?.contract_version!=='manual_configuration_binding_repair_v1'
    ||value?.price_rows!==6||value?.configuration_rows!==3
    ||value?.evidence_sha256!==EXPECTED_EVIDENCE
    ||value?.commercial_values_change!==false
    ||value?.price_review_status_change!==false)
    throw new Error('manual_configuration_repair_evidence_drift');
  return value;
}

export async function GET(){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error,enabled:false},actor.status);
  if(!enabled())return reply({ok:false,code:'manual_configuration_repair_disabled',enabled:false},423);
  try{return reply({ok:true,enabled:true,release_ref:RELEASE_REF,product_ids:PRODUCT_IDS,evidence:await evidence(actor.service)});}
  catch(error){return reply({ok:false,code:error instanceof Error?error.message:'manual_configuration_repair_evidence_failed'},409);}
}

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'manual_configuration_repair_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'manual_configuration_repair_same_origin_required'},403);

  let body:any;
  try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const action=String(body?.action||'');

  if(action==='prepare'){
    try{
      const current=await evidence(actor.service);
      const {data,error}=await actor.service.rpc('feya_fn_create_execution_request_v1',{
        p_action_code:'REPAIR_MANUAL_CONFIGURATION_BINDINGS',
        p_mutation_domain:'COMMERCE_CONFIGURATION',
        p_target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'manual-price-lane',canonical_product_ids:PRODUCT_IDS},
        p_target_version_refs_json:{release_ref:RELEASE_REF,evidence_sha256:EXPECTED_EVIDENCE,price_rows:6,target_configurations:6},
        p_request_payload_json:{
          contract_version:'manual_configuration_binding_repair_v1',
          release_ref:RELEASE_REF,
          canonical_product_ids:PRODUCT_IDS,
          evidence_sha256:EXPECTED_EVIDENCE,
          expected_price_rows:6,
          expected_target_configurations:6,
        },
        p_rollback_plan_json:{mode:'explicit_compensating_change',preserve_audit_history:true,commercial_values_unchanged:true},
        p_postflight_check_json:{expected_price_rows:6,expected_configuration_rows:6,commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false},
        p_requested_by_type:'human',
        p_requested_by_user_id:actor.userId,
        p_idempotency_key:`manual-configuration-repair:${RELEASE_REF}:${EXPECTED_EVIDENCE}`,
      });
      if(error)throw new Error(error.message||'manual_configuration_repair_prepare_failed');
      return reply({ok:true,state:'prepared',release_ref:RELEASE_REF,evidence:current,execution:Array.isArray(data)?data[0]:data});
    }catch(error){return reply({ok:false,code:error instanceof Error?error.message:'manual_configuration_repair_prepare_failed'},409);}
  }

  if(action==='execute'){
    const id=String(body?.execution_request_id||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return reply({ok:false,code:'invalid_execution_request_id'},400);
    const {data,error}=await actor.service.rpc('feya_commerce_execute_manual_configuration_repair_v1',{p_execution_request_id:id});
    if(error)return reply({ok:false,code:error.message||'manual_configuration_repair_execute_failed'},409);
    return reply({ok:true,result:data});
  }

  return reply({ok:false,code:'unsupported_action'},400);
}
