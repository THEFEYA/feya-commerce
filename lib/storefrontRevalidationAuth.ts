import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

function safeMatch(provided:string|undefined,configured:string) {
  if(!provided)return false;
  const a=Buffer.from(provided,'utf8'),b=Buffer.from(configured,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
}

export function storefrontRevalidationAuth(request:NextRequest) {
  const configured=process.env.FEYA_STOREFRONT_REVALIDATION_TOKEN;
  if(!configured)return {configured:false,authorized:false};
  const bearer=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const header=request.headers.get('x-feya-storefront-revalidation-token')?.trim();
  return {configured:true,authorized:safeMatch(bearer||header||undefined,configured)};
}

export function withStorefrontRevalidationAuth(handler:(request:NextRequest)=>Promise<Response>) {
  return async(request:NextRequest)=>{
    const auth=storefrontRevalidationAuth(request);
    if(!auth.configured||!auth.authorized){
      return Response.json(
        {ok:false,code:auth.configured?'storefront_revalidation_auth_required':'storefront_revalidation_auth_unavailable'},
        {status:auth.configured?401:503,headers:{'Cache-Control':'private, no-store'}},
      );
    }
    const response=await handler(request);
    response.headers.set('Cache-Control','private, no-store');
    return response;
  };
}
