import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { captureOfficialGscOnce } from '@/lib/gscOfficialCaptureServer';
import { decideDailyGscCadence } from '@/lib/gscDailyCadencePolicy';

function reply(status:number,code:string,details:Record<string,unknown>={}){
  return NextResponse.json({
    ok:status===200,code,source_health_promoted:false,auto_gmel_enabled:false,
    ...details,
  },{
    status,
    headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'},
  });
}
function authorizedCron(request:NextRequest,secret:string):boolean{
  const actual=request.headers.get('authorization')||'';
  if(!actual.startsWith('Bearer ')||actual.length>2048)return false;
  const supplied=Buffer.from(actual.slice(7),'utf8');
  const expected=Buffer.from(secret,'utf8');
  return supplied.length===expected.length
    &&timingSafeEqual(supplied,expected);
}

/**
 * Dormant, cost-aware daily GSC worker. There is deliberately NO Vercel Cron
 * registration in vercel.json until Human Owner approves a secure credential
 * rotation and standalone daily-cadence release.
 */
export async function GET(request:NextRequest){
  const secret=process.env.CRON_SECRET?.trim();
  if(!secret||secret.length<32)return reply(503,'GSC_DAILY_CRON_SECRET_NOT_CONFIGURED');
  if(!authorizedCron(request,secret))return reply(401,'GSC_DAILY_AUTH_REQUIRED');

  // Do not even query Supabase or Google when the daily automation is OFF.
  if(process.env.FEYA_GSC_DAILY_ENABLED!=='true'
    ||process.env.FEYA_GSC_READ_ENABLED!=='true'
    ||process.env.FEYA_GSC_CAPTURE_ENABLED!=='true')
    return reply(423,'GSC_DAILY_DISABLED');
  if(process.env.VERCEL_ENV!=='production'||process.env.VERCEL_GIT_COMMIT_REF!=='main')
    return reply(423,'GSC_DAILY_NOT_PRODUCTION');

  try{
    const service=getSupabaseServiceRoleClient();
    if(!service)return reply(503,'GSC_DAILY_STORAGE_UNAVAILABLE');
    const {data,error}=await service
      .from('feya_growth_gsc_observation_receipts_v1')
      .select('query_end')
      .eq('source_channel','GOOGLE_GSC_OFFICIAL_READONLY')
      .eq('property_url','sc-domain:thefeya.com')
      .order('query_end',{ascending:false})
      .limit(1);
    if(error)return reply(503,'GSC_DAILY_WATERMARK_UNAVAILABLE');
    const latest=Array.isArray(data)&&data.length===1&&typeof data[0]?.query_end==='string'
      ?data[0].query_end:null;
    const gate=decideDailyGscCadence(process.env,latest,new Date());
    if(!gate.allowed){
      return reply(gate.code==='GSC_DAILY_ALREADY_COVERED'?200:423,gate.code,{
        query_window:gate.query_window,
        previous_final_date:gate.previous_final_date,
      });
    }

    // This writer re-fetches actual final Google data, re-validates exact
    // date rows and totals and commits via immutable SHA256/Postgres RPC.
    const stored=await captureOfficialGscOnce();
    return NextResponse.json(stored.body,{
      status:stored.status,
      headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'},
    });
  }catch{
    return reply(503,'GSC_DAILY_INTERNAL_UNAVAILABLE');
  }
}
