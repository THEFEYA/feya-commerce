import { prepareGoogleAdsPlan, googleAdsEvidencePayload } from '../../lib/googleAdsDemandAdapter.ts';
export const googleBatch='30000000-0000-4000-8000-000000000001';
export const googleIDs=['30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003'];
export function googleFixture(now=new Date()) {
  const start=new Date(Date.UTC(now.getUTCFullYear()-1,now.getUTCMonth(),1)).toISOString().slice(0,7);
  const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0)).toISOString().slice(0,7);
  const batch={metric_batch_id:googleBatch,provider_code:'google_ads_api',request_geo:'US',request_language:'en',batch_status:'ready'};
  const rows=googleIDs.map((id,i)=>({metric_batch_id:googleBatch,metric_batch_keyword_id:id,keyword:i?'synthetic armor outfits':'synthetic armor outfit',keyword_norm:i?'synthetic armor outfits':'synthetic armor outfit',keyword_status:'queued_for_metric_request'}));
  const input={keyword_ids:googleIDs,period_start:start,period_end:end};
  const env={GOOGLE_ADS_CUSTOMER_ID:'1234567890'};
  const plan=prepareGoogleAdsPlan(batch,rows,input,env,now);
  const months=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const history=Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+i,1));return {year:String(d.getUTCFullYear()),month:months[d.getUTCMonth()],monthlySearches:i===0?null:'0'};});
  const response={results:[{text:'synthetic armor outfit',closeVariants:['synthetic armor outfits'],keywordMetrics:{avgMonthlySearches:'0',competition:'LOW',competitionIndex:'0',lowTopOfPageBidMicros:'1234567',highTopOfPageBidMicros:'2500000',monthlySearchVolumes:history}}]};
  const context={currencyCode:'UAH',timeZone:'Europe/Kyiv'};
  return {now,batch,rows,input,env,plan,response,context,payload:()=>googleAdsEvidencePayload(plan,response,context,'fixture-request',now)};
}
