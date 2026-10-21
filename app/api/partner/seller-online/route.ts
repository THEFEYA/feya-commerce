import {NextRequest,NextResponse} from 'next/server';
import {
 SELLER_SETUP_COOKIE,readSellerSetupStatus,saveSellerSetup,
 sellerSetupRequestAllowed,
} from '@/lib/sellerOnlinePartnerSetupServer';

const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
const allowed=(req:NextRequest)=>sellerSetupRequestAllowed(req.nextUrl.hostname);
const token=(req:NextRequest)=>req.cookies.get(SELLER_SETUP_COOKIE)?.value||'';

export async function GET(req:NextRequest){
  if(!allowed(req))return reply({ok:false,code:'unavailable'},404);
  const result=await readSellerSetupStatus(token(req));
  return reply(result,result.ok?200:401);
}
export async function POST(req:NextRequest){
  if(!allowed(req)||req.headers.get('origin')!=='https://thefeya.com')
    return reply({ok:false,code:'unavailable'},404);
  const raw=await req.text();
  if(raw.length>7500)return reply({ok:false,code:'payload_too_large'},413);
  let payload:unknown;
  try{payload=JSON.parse(raw);}catch{return reply({ok:false,code:'invalid_json'},400);}
  const result=await saveSellerSetup(token(req),payload);
  return reply(result,result.ok?200:result.code==='invalid_or_expired_invitation'?401:422);
}
