import {NextRequest,NextResponse} from 'next/server';
import {getCommerceOrderIntentServerClient} from '@/lib/commerceOrderIntentServer';
import {createCommerceOrderIntent,CommerceOrderIntentError} from '@/lib/commerceOrderIntentStorage';

const reply=(body:unknown,status=200)=>NextResponse.json(body,{
  status,
  headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'},
});

function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{
    const url=new URL(origin);
    return url.origin===origin&&url.host===host&&url.protocol===request.nextUrl.protocol;
  }catch{return false;}
}

async function limitedJson(request:NextRequest){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new CommerceOrderIntentError('order_intent_json_required',415);
  const reader=request.body?.getReader();
  if(!reader)throw new CommerceOrderIntentError('order_intent_json_required',400);
  const chunks:Uint8Array[]=[];let length=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    length+=value.length;
    if(length>65536){await reader.cancel();throw new CommerceOrderIntentError('order_intent_payload_too_large',413);}
    chunks.push(value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw new CommerceOrderIntentError('order_intent_json_invalid',400);}
}

function failure(error:unknown){
  if(error instanceof CommerceOrderIntentError)
    return reply({
      ok:false,code:error.message,write_outcome:error.outcome,
      retry_same_request:error.outcome==='unknown',
      shipping_authority_ready:false,
      order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },error.status);
  return reply({
    ok:false,code:'order_intent_request_failed',write_outcome:'unknown',retry_same_request:true,
    shipping_authority_ready:false,order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
  },503);
}

export async function POST(request:NextRequest){
  try{
    const server=getCommerceOrderIntentServerClient();
    if(!server.ok)return reply({
      ok:false,code:server.code,
      shipping_authority_ready:false,order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },server.status);
    if(!sameOrigin(request))return reply({
      ok:false,code:'order_intent_same_origin_required',
      shipping_authority_ready:false,order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },403);
    const body=await limitedJson(request);
    const receipt=await createCommerceOrderIntent(server.client,body);
    return reply({ok:true,...receipt},receipt.replayed?200:201);
  }catch(error){return failure(error);}
}
