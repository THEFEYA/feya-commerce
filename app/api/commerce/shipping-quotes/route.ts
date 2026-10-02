import {NextRequest,NextResponse} from 'next/server';
import {getCommerceShippingQuoteServerClient} from '@/lib/commerceShippingQuoteServer';
import {createCommerceShippingQuote,CommerceShippingQuoteError} from '@/lib/commerceShippingQuoteStorage';

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
    throw new CommerceShippingQuoteError('shipping_quote_json_required',415);
  const reader=request.body?.getReader();
  if(!reader)throw new CommerceShippingQuoteError('shipping_quote_json_required',400);
  const chunks:Uint8Array[]=[];let length=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    length+=value.length;
    if(length>16384){await reader.cancel();throw new CommerceShippingQuoteError('shipping_quote_payload_too_large',413);}
    chunks.push(value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw new CommerceShippingQuoteError('shipping_quote_json_invalid',400);}
}

function failure(error:unknown){
  if(error instanceof CommerceShippingQuoteError)
    return reply({
      ok:false,code:error.message,write_outcome:error.outcome,
      retry_same_request:error.outcome==='unknown',
      shipping_authority_ready:false,
      order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },error.status);
  return reply({
    ok:false,code:'shipping_quote_request_failed',write_outcome:'unknown',retry_same_request:true,
    shipping_authority_ready:false,
    order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
  },503);
}

export async function POST(request:NextRequest){
  try{
    const server=getCommerceShippingQuoteServerClient();
    if(!server.ok)return reply({
      ok:false,code:server.code,shipping_authority_ready:false,
      order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },server.status);
    if(!sameOrigin(request))return reply({
      ok:false,code:'shipping_quote_same_origin_required',shipping_authority_ready:false,
      order_creation_enabled:false,payment_enabled:false,provider_session_enabled:false,
    },403);
    const body=await limitedJson(request);
    const receipt=await createCommerceShippingQuote(server.client,body);
    return reply({ok:true,...receipt},receipt.replayed?200:201);
  }catch(error){return failure(error);}
}
