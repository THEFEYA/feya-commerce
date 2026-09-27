import {NextRequest,NextResponse} from 'next/server';
import audit from '@/docs/search/color-price-lane-audit-20260926.json';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF=String((audit as any).release_ref||'');
const PRODUCT_IDS=((audit as any).product_ids||[]).map(String).sort();
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');if(!origin||!host)return false;
  try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}
}
async function evidence(service:any){
  if(PRODUCT_IDS.length!==3)throw new Error('color_price_lane_manifest_mismatch');
  const {data,error}=await service.rpc('feya_commerce_color_price_lane_evidence_v1');
  if(error)throw new Error(error.message||'color_price_lane_evidence_failed');
  const v=data as any;
  const pre=v?.contract_version==='color_price_lane_governance_v1'&&v?.release_ref===RELEASE_REF
    &&v?.product_count===3&&v?.price_rows===9&&v?.color_axis_rows===9&&v?.exact_source_rows===9
    &&v?.recognized_color_rows===9&&v?.target_create_rows===6&&v?.target_conflict_rows===0
    &&v?.candidate===true&&v?.commercial_values_change===false;
  const ready=v?.contract_version==='color_price_lane_governance_v1'&&v?.release_ref===RELEASE_REF
    &&v?.product_count===3&&v?.price_rows===9&&v?.strict_ready_rows===9&&v?.already_ready===true;
  if(!pre&&!ready)throw new Error('color_price_lane_evidence_drift');
  return{...v,state:ready?'already_ready':'ready_for_owner_approval'};
}
async function releaseRepairReady(service:any){
  const {data,error}=await service.from('feya_growth_execution_requests_v1')
    .select('execution_request_id')
    .eq('action_code','REPAIR_RELEASE_CONFIGURATION_BINDINGS')
    .eq('request_status','SUCCEEDED')
    .contains('target_scope_json',{entity_key:RELEASE_REF})
    .limit(1);
  if(error)throw new Error(error.message||'color_price_lane_dependency_lookup_failed');
  return Array.isArray(data)&&data.length>0;
}

export async function GET(){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  try{
    const [current,dependencyReady]=await Promise.all([evidence(actor.service),releaseRepairReady(actor.service)]);
    return reply({ok:true,release_ref:RELEASE_REF,product_ids:PRODUCT_IDS,dependency_ready:dependencyReady,evidence:current});
  }catch(error){return reply({ok:false,code:error instanceof Error?error.message:'color_price_lane_evidence_failed'},409);}
}

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!sameOrigin(request))return reply({ok:false,code:'color_price_lane_same_origin_required'},403);
  let body:any;try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const action=String(body?.action||'');

  if(action==='prepare'){
    try{
      if(!await releaseRepairReady(actor.service))return reply({ok:false,code:'color_price_lane_release_repair_required'},409);
      const current=await evidence(actor.service);
      if(current.state==='already_ready')return reply({ok:true,state:'already_ready',release_ref:RELEASE_REF,evidence:current});
      const evidenceSha=String(current.evidence_sha256||''),commercialSha=String(current.commercial_values_sha256||'');
      const {data,error}=await actor.service.rpc('feya_fn_create_execution_request_v1',{
        p_action_code:'ADOPT_COLOR_PRICE_LANE_GOVERNANCE',
        p_mutation_domain:'COMMERCE_PRICE',
        p_target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'color-price-lane',canonical_product_ids:PRODUCT_IDS},
        p_target_version_refs_json:{release_ref:RELEASE_REF,evidence_sha256:evidenceSha,commercial_values_sha256:commercialSha,price_rows:9},
        p_request_payload_json:{
          contract_version:'color_price_lane_governance_v1',release_ref:RELEASE_REF,canonical_product_ids:PRODUCT_IDS,
          evidence_sha256:evidenceSha,commercial_values_sha256:commercialSha,
          expected_products:3,expected_price_rows:9,expected_create_configurations:6,
        },
        p_rollback_plan_json:{mode:'explicit_compensating_change',preserve_audit_history:true,commercial_values_unchanged:true},
        p_postflight_check_json:{strict_ready_rows:9,commercial_values_unchanged:true,variant_color_binding_required:true,
          cartesian_expansion_allowed:false,payment_enabled:false,indexing_enabled:false},
        p_requested_by_type:'human',p_requested_by_user_id:actor.userId,
        p_idempotency_key:`color-price-lane:${RELEASE_REF}:${evidenceSha}`,
      });
      if(error)throw new Error(error.message||'color_price_lane_prepare_failed');
      return reply({ok:true,state:'prepared',release_ref:RELEASE_REF,evidence:current,execution:Array.isArray(data)?data[0]:data});
    }catch(error){return reply({ok:false,code:error instanceof Error?error.message:'color_price_lane_prepare_failed'},409);}
  }

  if(action==='execute'){
    const id=String(body?.execution_request_id||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return reply({ok:false,code:'invalid_execution_request_id'},400);
    const {data,error}=await actor.service.rpc('feya_commerce_execute_color_price_lane_governance_v1',{p_execution_request_id:id});
    if(error)return reply({ok:false,code:error.message||'color_price_lane_execute_failed'},409);
    return reply({ok:true,result:data});
  }
  return reply({ok:false,code:'unsupported_action'},400);
}
