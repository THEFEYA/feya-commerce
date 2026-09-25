import { NextRequest,NextResponse } from 'next/server';
import release from '@/docs/search/closed-review-source-manifest-20260924.json';
import audit from '@/docs/search/price-baseline-audit-manifest-20260925.json';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const RELEASE_REF=String((audit as any).release_ref||'');
const MANUAL_IDS=new Set<string>(((audit as any).manual_override_product_ids||[]).map(String));
const CLEAN_IDS=((release as any).entries||[])
  .map((entry:any)=>String(entry?.identity?.canonical_product_id||''))
  .filter((id:string)=>id&&!MANUAL_IDS.has(id))
  .sort();
const EXPECTED_PRODUCTS=Number((audit as any).counts?.clean_source_products||0);
const EXPECTED_ROWS=Number((audit as any).counts?.clean_source_price_rows||0);
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
const enabled=()=>process.env.FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED==='true';

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{const u=new URL(origin);return u.origin===origin&&u.host===host&&u.protocol===request.nextUrl.protocol;}catch{return false;}
}

async function exactPreview(service:any){
  const {data,error}=await service.rpc('feya_commerce_preview_price_baseline_adoption_v1',{p_product_ids:CLEAN_IDS});
  if(error)throw new Error(error.message||'price_baseline_preview_failed');
  const p=data as any;
  const preAdoption=p?.candidate_product_count===EXPECTED_PRODUCTS
    &&p?.candidate_price_row_count===EXPECTED_ROWS&&p?.already_ready_product_count===0&&p?.hold_product_count===0;
  const adopted=p?.candidate_product_count===0&&p?.already_ready_product_count===EXPECTED_PRODUCTS&&p?.hold_product_count===0;
  if(!preAdoption&&!adopted)throw new Error('price_baseline_audit_drift');
  return{...p,state:adopted?'already_adopted':'ready_for_owner_approval'};
}

export async function GET(){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error,enabled:false},actor.status);
  if(!enabled())return reply({ok:false,code:'price_baseline_adoption_disabled',enabled:false,release_ref:RELEASE_REF},423);
  try{return reply({ok:true,enabled:true,release_ref:RELEASE_REF,...await exactPreview(actor.service)});}
  catch(error){return reply({ok:false,code:error instanceof Error?error.message:'price_baseline_preview_failed'},409);}
}

export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor();
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);
  if(!enabled())return reply({ok:false,code:'price_baseline_adoption_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'price_baseline_same_origin_required'},403);

  let body:any;
  try{body=await request.json();}catch{return reply({ok:false,code:'invalid_json'},400);}
  const action=String(body?.action||'');

  if(action==='prepare'){
    try{
      const p=await exactPreview(actor.service);
      if(p.state==='already_adopted')return reply({ok:true,state:'already_adopted',release_ref:RELEASE_REF,...p});
      const idempotencyKey=`price-baseline:${RELEASE_REF}:${p.evidence_sha256}`;
      const {data,error}=await actor.service.rpc('feya_fn_create_execution_request_v1',{
        p_action_code:'ADOPT_SOURCE_PRICE_BASELINE',
        p_mutation_domain:'COMMERCE_PRICE',
        p_target_scope_json:{entity_type:'RELEASE',entity_key:RELEASE_REF},
        p_target_version_refs_json:{release_ref:RELEASE_REF,evidence_sha256:p.evidence_sha256,price_row_count:EXPECTED_ROWS},
        p_request_payload_json:{
          contract_version:'commerce_price_baseline_adoption_v1',
          release_ref:RELEASE_REF,canonical_product_ids:CLEAN_IDS,
          evidence_sha256:p.evidence_sha256,price_row_count:EXPECTED_ROWS,
        },
        p_rollback_plan_json:{mode:'explicit_compensating_change',preserve_audit_history:true},
        p_postflight_check_json:{expected_price_rows:EXPECTED_ROWS,payment_enabled:false,indexing_enabled:false},
        p_requested_by_type:'human',p_requested_by_user_id:actor.userId,p_idempotency_key:idempotencyKey,
      });
      if(error)throw new Error(error.message||'price_baseline_prepare_failed');
      const row=Array.isArray(data)?data[0]:data;
      return reply({ok:true,state:'prepared',release_ref:RELEASE_REF,preview:p,execution:row});
    }catch(error){return reply({ok:false,code:error instanceof Error?error.message:'price_baseline_prepare_failed'},409);}
  }

  if(action==='execute'){
    const executionRequestId=String(body?.execution_request_id||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(executionRequestId))
      return reply({ok:false,code:'invalid_execution_request_id'},400);
    const {data,error}=await actor.service.rpc('feya_commerce_execute_price_baseline_adoption_v1',{p_execution_request_id:executionRequestId});
    if(error)return reply({ok:false,code:error.message||'price_baseline_execute_failed'},409);
    return reply({ok:true,result:data});
  }

  return reply({ok:false,code:'unsupported_action'},400);
}
