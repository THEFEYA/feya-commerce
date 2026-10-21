import {NextRequest,NextResponse} from 'next/server';
import {
  SELLER_SETUP_COOKIE,SELLER_SETUP_BASE,
  readSellerSetupStatus,sellerSetupRequestAllowed,validSellerSetupToken,
} from '@/lib/sellerOnlinePartnerSetupServer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const heads={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'};
export async function POST(req:NextRequest){
  if(!sellerSetupRequestAllowed(req.nextUrl.hostname)
    ||req.headers.get('origin')!=='https://thefeya.com')
    return NextResponse.json({ok:false,code:'unavailable'},{status:404,headers:heads});
  const raw=await req.text();
  if(raw.length>300)return NextResponse.json({ok:false,code:'invalid'},{status:400,headers:heads});
  let token:unknown;
  try{token=(JSON.parse(raw) as {token?:unknown}).token;}catch{return NextResponse.json({ok:false,code:'invalid'},{status:400,headers:heads});}
  if(!validSellerSetupToken(token))
    return NextResponse.json({ok:false,code:'invalid'},{status:401,headers:heads});
  const status=await readSellerSetupStatus(token);
  if(!status.ok)return NextResponse.json(status,{status:401,headers:heads});
  const response=NextResponse.json({ok:true,connected:true},{headers:heads});
  response.cookies.set(SELLER_SETUP_COOKIE,token,{
    httpOnly:true,secure:true,sameSite:'strict',
    path:SELLER_SETUP_BASE,maxAge:7*24*60*60,
  });
  return response;
}
