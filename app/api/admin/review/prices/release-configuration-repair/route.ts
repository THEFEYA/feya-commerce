import {NextRequest,NextResponse} from 'next/server';
import release from '@/docs/search/closed-review-source-manifest-20260924.json';
import structureAudit from '@/docs/search/configuration-binding-audit-20260925.json';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF=String((structureAudit as any).release_ref||'');
const PRODUCT_IDS=((release as any).entries||[])
  .map((entry:any)=>String(entry?.identity?.canonical_product_id||'')).filter(Boolean).sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>true; // Exact owner-auth + evidence/hash + Execution Gateway are the activation boundary.

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');if(!origin||!host)return false;
  try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}
}
async function evidence(service:any){
  if(PRODUCT_IDS.length!==207)throw new Error('release_configuration_binding_manifest_mismatch');
  const {data,error}=await service.rpc('feya_commerce_release_configuration_binding_evidence_v1',{p_product_ids:PRODUCT_IDS});
  if(error)throw new Error(error.message||'release_configuration_binding_evidence_failed');
  const v=data as any;
  const pre=v?.contract_version==='release_configuration_binding_repair_v1'&&v?.release_ref===RELEASE_REF
    &&v?.release_product_count===207&&v?.price_row_count===856&&v?.configuration_axis_rows===846
    &&v?.rebind_rows===631&&v?.create_configuration_rows===631&&v?.color_price_axis_rows===9
    &&v?.direct_owner_rows===1&&v?.candidate===true&&v?.commercial_values_change===false;
  const repaired=v?.contract_version==='release_configuration_binding_repair_v1'&&v?.release_ref===RELEASE_REF
    &&v?.release_product_count===207&&v?.price_row_count===856&&v?.configuration_axis_rows===846
    &&v?.rebind_rows===0&&v?.color_price_axis_rows===9&&v?.direct_owner_rows===1&&v?.already_repaired===true;
  if(!pre&&!repaired)throw new Error('release_configuration_binding_evidence_drift');
  return{...v,state:repaired?'already_repaired':'ready_for_owner_approval'};
}

export async function GET(){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error,enabled:false},actor.status);
  if(!enabled())return reply({ok:false,code:'release_configuration_binding_repair_disabled',enabled:false},423);
  try{return reply({ok:true,enabled:true,release_ref:RELEASE_REF,product_count:PRODUCT_IDS.length,evidence:await evidence(actor.service)});}
  catch(error){return reply({ok:false,code:error instanceof Error?error.message:'release_configuration_binding_evidence_failed'},409);}
}

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'release_configuration_binding_repair_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'release_configuration_binding_same_origin_required'},403);
  let body:any;try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const action=String(body?.action||'');

  if(action==='prepare'){
    try{
      const current=await evidence(actor.service);
      if(current.state==='already_repaired')return reply({ok:true,state:'already_repaired',release_ref:RELEASE_REF,evidence:current});
      const evidenceSha=String(current.evidence_sha256||'');
      const {data,error}=await actor.service.rpc('feya_fn_create_execution_request_v1',{
        p_action_code:'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
        p_mutation_domain:'COMMERCE_CONFIGURATION',
        p_target_scope_json:{entity_type:'RELEASE',entity_key:RELEASE_REF,canonical_product_ids:PRODUCT_IDS},
        p_target_version_refs_json:{release_ref:RELEASE_REF,evidence_sha256:evidenceSha,price_rows:856,configuration_axis_rows:846},
        p_request_payload_json:{
          contract_version:'release_configuration_binding_repair_v1',release_ref:RELEASE_REF,
          canonical_product_ids:PRODUCT_IDS,evidence_sha256:evidenceSha,
          expected_price_rows:856,expected_configuration_axis_rows:846,
          expected_rebind_rows:631,expected_create_configurations:631,
        },
        p_rollback_plan_json:{mode:'explicit_compensating_change',preserve_audit_history:true,commercial_values_unchanged:true},
        p_postflight_check_json:{expected_price_rows:856,expected_configuration_axis_rows:846,expected_rebind_rows:0,
          color_price_axis_rows_held:9,commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false},
        p_requested_by_type:'human',p_requested_by_user_id:actor.userId,
        p_idempotency_key:`release-configuration-binding:${RELEASE_REF}:${evidenceSha}`,
      });
      if(error)throw new Error(error.message||'release_configuration_binding_prepare_failed');
      return reply({ok:true,state:'prepared',release_ref:RELEASE_REF,evidence:current,execution:Array.isArray(data)?data[0]:data});
    }catch(error){return reply({ok:false,code:error instanceof Error?error.message:'release_configuration_binding_prepare_failed'},409);}
  }

  if(action==='execute'){
    const id=String(body?.execution_request_id||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return reply({ok:false,code:'invalid_execution_request_id'},400);
    const {data,error}=await actor.service.rpc('feya_commerce_execute_release_configuration_binding_repair_v1',{p_execution_request_id:id});
    if(error)return reply({ok:false,code:error.message||'release_configuration_binding_execute_failed'},409);
    return reply({ok:true,result:data});
  }
  return reply({ok:false,code:'unsupported_action'},400);
}
