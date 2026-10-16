import {type NextRequest,NextResponse} from 'next/server';
import {withInternalApi} from '@/lib/internalAuth';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {probeOfficialGscReadOnly} from '@/lib/gscOfficialReadOnly';
import {planOfficialGscCapture} from '@/lib/gscOfficialCapture';

function respond(body:Record<string,unknown>,status:number){
  return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
}

/**
 * Explicit, token-authenticated one-shot capture; NO Cron, public input,
 * model invocation, SEO/commerce mutation or source-health promotion.
 */
async function handlePost(_request:NextRequest){
  // Both independent owner-controlled switches must be true, before Google OAuth.
  if(process.env.FEYA_GSC_CAPTURE_ENABLED!=='true'
    ||process.env.FEYA_GSC_READ_ENABLED!=='true'){
    return respond({ok:false,code:'GSC_CAPTURE_DISABLED',source_health_promoted:false},503);
  }
  const service=getSupabaseServiceRoleClient();
  if(!service){
    return respond({ok:false,code:'GSC_CAPTURE_STORAGE_UNAVAILABLE',source_health_promoted:false},503);
  }
  const checkedAt=new Date();
  const report=await probeOfficialGscReadOnly(process.env,fetch,checkedAt);
  const planned=planOfficialGscCapture(process.env,report,new Date());
  if(!planned.ok){
    return respond({ok:false,code:planned.code,source_health_promoted:false},
      planned.code==='GSC_CAPTURE_NO_FINAL_ROWS'?200:503);
  }
  try{
    // Service-only RPC verifies source channel, provenance, totals and date rows.
    // It stores no OAuth tokens and refuses history rewrites / invalid source status.
    const {data,error}=await service.rpc('feya_fn_stage_gsc_daily_observation_v1',planned.args);
    if(error)return respond({ok:false,code:'GSC_CAPTURE_STORAGE_REJECTED',source_health_promoted:false},503);
    const result=Array.isArray(data)?data[0]:null;
    if(!result||typeof result.receipt_id!=='string'
      ||typeof result.payload_sha256!=='string'
      ||!/^[-0-9a-f]{36}$/i.test(result.receipt_id)
      ||!/^[0-9a-f]{64}$/.test(result.payload_sha256)
      ||typeof result.created_new!=='boolean'
      ||result.observed_days!==planned.args.p_daily_rows.length)
      return respond({ok:false,code:'GSC_CAPTURE_STORAGE_RECEIPT_INVALID',source_health_promoted:false},503);
    return respond({
      ok:true,code:result.created_new?'GSC_CAPTURE_RECORDED':'GSC_CAPTURE_ALREADY_RECORDED',
      receipt_id:result.receipt_id,payload_sha256:result.payload_sha256,
      created_new:result.created_new,
      property:'sc-domain:thefeya.com',
      source_channel:'GOOGLE_GSC_OFFICIAL_READONLY',
      window:{start_date:planned.args.p_query_start,end_date:planned.args.p_query_end},
      observed_days:result.observed_days,
      clicks:planned.args.p_expected_clicks,
      impressions:planned.args.p_expected_impressions,
      source_health_promoted:false,
      auto_gmel_enabled:false
    },200);
  }catch{
    return respond({ok:false,code:'GSC_CAPTURE_STORAGE_UNAVAILABLE',source_health_promoted:false},503);
  }
}
export const POST=withInternalApi(handlePost);
