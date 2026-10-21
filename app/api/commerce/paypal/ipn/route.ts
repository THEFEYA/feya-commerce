import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {verifyPayPalStandardIpnPostback} from '@/lib/sellerOnlinePayPalStandardIpn';

const HEADERS={
 'Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
};
const JSON_REPLY=(body:Record<string,unknown>,status:number)=>
 NextResponse.json(body,{status,headers:HEADERS});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSACTION=/^[A-Za-z0-9_-]{6,120}$/;
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req:NextRequest){
  // Never start accepting callbacks implicitly when a vendor just saved settings.
  // The commerce launch must separately approve a genuine payment account,
  // a payable server order, PII/privacy processing and live checkout.
  if(process.env.FEYA_PAYPAL_IPN_INGEST_ENABLED!=='true'||
    process.env.VERCEL_ENV!=='production'||
    req.nextUrl.hostname!=='thefeya.com')return JSON_REPLY({ok:false,code:'disabled'},423);
  const contentType=req.headers.get('content-type')||'';
  if(!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded'))
    return JSON_REPLY({ok:false,code:'unsupported_content_type'},415);
  let body:string;
  try{body=await req.text();}catch{return JSON_REPLY({ok:false,code:'invalid_body'},400);}
  if(!body||body.length>16000||body.includes('\u0000'))
    return JSON_REPLY({ok:false,code:'invalid_body'},400);
  const pairs=new URLSearchParams(body);
  const field=(key:string):string|null=>{
    const vals=pairs.getAll(key);
    return vals.length===1?vals[0]:null;
  };
  const txn=field('txn_id');
  const invoice=field('invoice');
  const gross=field('mc_gross');
  const currency=field('mc_currency');
  const receiver=field('receiver_email');
  const custom=field('custom');
  const completed=field('payment_status');
  const sandbox=field('test_ipn');
  if(!txn||!TRANSACTION.test(txn)||!invoice||!UUID.test(invoice)||
    !gross||!/^(0|[1-9]\d{0,7})\.\d{2}$/.test(gross)||
    !receiver||!EMAIL.test(receiver)||!custom||custom.length>240||
    currency!=='EUR'||completed!=='Completed'||
    (sandbox!==null&&sandbox!=='1'))
    return JSON_REPLY({ok:false,code:'invalid_callback'},400);

  // An actual postback must pass PayPal's VERIFICATION before being stored.
  const environment=sandbox==='1'?'sandbox':'live';
  const verified=await verifyPayPalStandardIpnPostback(body,environment);
  if(!verified.ok)
    return JSON_REPLY({ok:false,code:'provider_verification_failed'},verified.code==='provider_unavailable'?503:400);

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return JSON_REPLY({ok:false,code:'storage_unavailable'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const amountMinor=Math.round(Number(gross)*100);
  if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)
    return JSON_REPLY({ok:false,code:'invalid_amount'},400);
  const digest=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
  try{
    const {data,error}=await db.rpc('feya_seller_online_record_paypal_ipn_unbound_v1',{
      p_event_sha256:digest(body),
      p_txn_sha256:digest(environment+':'+txn),
      p_invoice_id:invoice,
      p_custom:custom,
      p_receiver_email:receiver,
      p_amount_minor:amountMinor,
      p_currency:'EUR',
      p_environment:environment,
    });
    if(error)return JSON_REPLY({ok:false,code:'storage_unavailable'},503);
    if(!data||data.ok!==true)return JSON_REPLY({ok:false,code:'unmatched_payment'},422);
    return JSON_REPLY({ok:true,recorded:true,bound_to_order:false,payment_enabled:false},200);
  }catch{
    return JSON_REPLY({ok:false,code:'storage_unavailable'},503);
  }
}
