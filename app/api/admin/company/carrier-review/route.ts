import {NextRequest,NextResponse} from 'next/server';
import {requireOwnerActionActor} from '@/lib/ownerActionAuth';
import {readCarrierOwnerContext,confirmOwnerParcelReview,
  CarrierOwnerReviewError} from '@/lib/commerceCarrierOwnerReview';

const reply=(body:unknown,status=200)=>NextResponse.json(body,{
  status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'},
});
const allowed=()=>process.env.FEYA_COMMERCE_CARRIER_OWNER_REVIEW_ENABLED==='true';
function sameOrigin(request:NextRequest):boolean{
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{
    const url=new URL(origin);
    return url.origin===origin&&url.host===host&&url.protocol===request.nextUrl.protocol;
  }catch{return false;}
}
function failure(error:unknown){
  if(error instanceof CarrierOwnerReviewError)return reply({ok:false,code:error.message},error.status);
  return reply({ok:false,code:'carrier_owner_review_unavailable'},503);
}
async function jsonRequest(request:NextRequest):Promise<unknown>{
  const reader=request.body?.getReader();
  if(!reader)throw new CarrierOwnerReviewError('carrier_owner_review_request_invalid',400);
  const parts:Uint8Array[]=[];let size=0;
  try{
    for(;;){
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>3000){await reader.cancel();throw new CarrierOwnerReviewError('carrier_owner_review_request_too_large',413);}
      parts.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
  }catch(e){
    if(e instanceof CarrierOwnerReviewError)throw e;
    throw new CarrierOwnerReviewError('carrier_owner_review_request_invalid',400);
  }finally{reader.releaseLock();}
}
export async function GET(){
  const actor=await requireOwnerActionActor('delivery_workspace_draft');
  if(!actor.ok)return reply({ok:false,code:actor.code},actor.status);
  if(!allowed())return reply({ok:false,code:'carrier_owner_review_disabled'},423);
  try{
    const context=await readCarrierOwnerContext(actor.service);
    return reply({ok:true,context});
  }catch(e){return failure(e);}
}
export async function POST(request:NextRequest){
  const actor=await requireOwnerActionActor('delivery_workspace_draft');
  if(!actor.ok)return reply({ok:false,code:actor.code},actor.status);
  if(!allowed())return reply({ok:false,code:'carrier_owner_review_disabled'},423);
  if(!sameOrigin(request))return reply({ok:false,code:'carrier_owner_review_same_origin_required'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return reply({ok:false,code:'carrier_owner_review_request_invalid'},415);
  try{
    const body=await jsonRequest(request);
    const receipt=await confirmOwnerParcelReview(actor.service,body,actor.userId);
    return reply({ok:true,receipt});
  }catch(e){return failure(e);}
}
