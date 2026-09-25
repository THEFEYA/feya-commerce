import { NextRequest,NextResponse } from 'next/server';
import sourceJson from '@/docs/search/closed-review-source-manifest-20260924.json';
import binding from '@/config/closed-review-presentation-binding.json';
import { requireOfferPromotionActor } from '@/lib/commerceOfferPromotionServer';
import { OfferPromotionStorageError,parseOfferPromotionRequest,promoteOffer } from '@/lib/commerceOfferPromotionStorage';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{productId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');if(!origin||!host)return false;
  try{const url=new URL(origin);return url.origin===origin&&url.host===host&&url.protocol===request.nextUrl.protocol;}catch{return false;}
}
async function limitedJson(request:NextRequest){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new OfferPromotionStorageError('offer_promotion_json_required',415);
  const reader=request.body?.getReader();if(!reader)throw new OfferPromotionStorageError('offer_promotion_json_required',400);
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;
    if(length>131072){await reader.cancel();throw new OfferPromotionStorageError('offer_promotion_payload_too_large',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new OfferPromotionStorageError('offer_promotion_json_invalid',400);}
}
function releaseContains(productId:string){
  const entries=(sourceJson as any)?.entries;
  return Array.isArray(entries)&&entries.some((entry:any)=>entry?.identity?.canonical_product_id===productId);
}
function failure(error:unknown){
  if(error instanceof OfferPromotionStorageError)return reply({ok:false,code:error.message,write_outcome:error.outcome,
    retry_same_request:error.outcome==='unknown',order_creation_enabled:false,payment_enabled:false,indexing_enabled:false},error.status);
  return reply({ok:false,code:'offer_promotion_request_failed',write_outcome:'unknown',retry_same_request:true,
    order_creation_enabled:false,payment_enabled:false,indexing_enabled:false},503);
}
export async function POST(request:NextRequest,context:Context){
  try{
    const actor=await requireOfferPromotionActor();if(!actor.ok)return reply({ok:false,code:actor.code},actor.status);
    if(!sameOrigin(request))return reply({ok:false,code:'offer_promotion_same_origin_required'},403);
    const {productId}=await context.params;if(!UUID.test(productId))return reply({ok:false,code:'offer_promotion_product_id_invalid'},400);
    if(!releaseContains(productId))return reply({ok:false,code:'offer_promotion_product_not_in_release'},409);
    const raw=await limitedJson(request);
    let parsed;
    try{parsed=parseOfferPromotionRequest(raw,productId);}catch{throw new OfferPromotionStorageError('offer_promotion_request_invalid',422);}
    if(parsed.release_ref!==binding.release_id)throw new OfferPromotionStorageError('offer_promotion_release_conflict',409);
    const receipt=await promoteOffer(actor.client,actor.actorId,parsed,productId);
    return reply({ok:true,...receipt},receipt.replayed?200:201);
  }catch(error){return failure(error);}
}
