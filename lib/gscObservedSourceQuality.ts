/**
 * GDAE Phase 13 P0C: read-only observation audit from immutable GSC receipts.
 * Source-health registry, buyer commerce and GMEL admission are NEVER inferred
 * from one receipt. Provider missing rows remain missing (not zero).
 */
import { expectedFinalGscWindow } from './gscDailyCadencePolicy';

export type GscQualityRow = {
  receipt_id: string;
  source_channel: string;
  property_url: string;
  search_type: string;
  data_state: string;
  query_start: string;
  query_end: string;
  finalized_through: string;
  observed_days: number;
  daily_rows_json: unknown;
  clicks_total: number | string | null;
  impressions_total: number | string | null;
  average_position: number | string | null;
  payload_sha256: string;
  recorded_at: string;
  source_health_promoted: boolean;
};

export type GscObservedQuality = {
  state: 'NO_OFFICIAL_OBSERVATION' | 'OBSERVED_L0' | 'PARTIAL_PROVIDER_COVERAGE' |
    'INVALID_OFFICIAL_OBSERVATION' | 'OUTDATED_OFFICIAL_OBSERVATION';
  receiptId: string | null;
  sourceChannel: 'GOOGLE_GSC_OFFICIAL_READONLY';
  property: 'sc-domain:thefeya.com';
  recordedAt: string | null;
  startDate: string | null;
  finalDate: string | null;
  observedDays: number | null;
  missingDays: number | null;
  clicks: number | null;
  impressions: number | null;
  averagePosition: number | null;
  crcEvidenceHash: string | null;
  expectedFinalDate: string | null;
  uncoveredFinalDays: number | null;
  canonicalSourceHealthy: false;
  gmElModelEligible: false;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
function validDate(value:unknown):value is string{
  if(typeof value!=='string'||!ISO.test(value))return false;
  const ms=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value;
}
function positiveInt(value:unknown):value is number{
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
}
function nonnegativeInteger(value:unknown):number|null{
  const parsed=typeof value==='number'?value:
    typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)?Number(value):NaN;
  return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
}
function decimal(value:unknown):number|null{
  if(value===null||value===undefined)return null;
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const parsed=Number(value);
  return Number.isFinite(parsed)&&parsed>=0?parsed:null;
}
function dateDiff(a:string,b:string){
  return Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
}

export function inspectOfficialGscReceipts(
  rows: readonly GscQualityRow[],now:Date=new Date()
):GscObservedQuality{
  const base:GscObservedQuality={
    state:'NO_OFFICIAL_OBSERVATION',receiptId:null,
    sourceChannel:'GOOGLE_GSC_OFFICIAL_READONLY',property:'sc-domain:thefeya.com',
    recordedAt:null,startDate:null,finalDate:null,observedDays:null,
    missingDays:null,clicks:null,impressions:null,averagePosition:null,
    crcEvidenceHash:null,expectedFinalDate:expectedFinalGscWindow(now)?.end_date||null,
    uncoveredFinalDays:null,canonicalSourceHealthy:false,gmElModelEligible:false,
  };
  const official=rows.filter(x=>x?.source_channel==='GOOGLE_GSC_OFFICIAL_READONLY')
    .sort((a,b)=>b.query_end.localeCompare(a.query_end)
      ||b.recorded_at.localeCompare(a.recorded_at)
      ||b.payload_sha256.localeCompare(a.payload_sha256));
  if(!official.length)return base;
  const r=official[0];
  const invalid={...base,state:'INVALID_OFFICIAL_OBSERVATION' as const};
  if(r.property_url!=='sc-domain:thefeya.com'||r.search_type!=='web'||r.data_state!=='final'
    ||r.source_health_promoted!==false||!UUID.test(r.receipt_id||'')
    ||!SHA.test(r.payload_sha256||'')
    ||!validDate(r.query_start)||!validDate(r.query_end)
    ||!validDate(r.finalized_through)
    ||r.finalized_through<r.query_end||r.query_end<r.query_start
    ||!Number.isFinite(Date.parse(r.recorded_at||''))
    ||Date.parse(r.recorded_at)>now.getTime()+30000
    ||!Array.isArray(r.daily_rows_json)
  )return invalid;
  const span=dateDiff(r.query_end,r.query_start)+1;
  if(span<=0||span>32||!positiveInt(r.observed_days)
    ||r.daily_rows_json.length!==r.observed_days||r.observed_days>span)
    return invalid;
  const seen=new Set<string>();
  let clicks=0,impressions=0,weighted=0;
  for(const raw of r.daily_rows_json){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return invalid;
    const item=raw as Record<string,unknown>;
    if(Object.keys(item).sort().join(',')!=='clicks,date,impressions,position'
      ||!validDate(item.date)||item.date<r.query_start||item.date>r.query_end
      ||seen.has(item.date)||!positiveInt(item.clicks)
      ||!positiveInt(item.impressions)||item.clicks>item.impressions
      ||typeof item.position!=='number'||!Number.isFinite(item.position)
      ||item.position<0||item.position>10000
      ||(item.impressions===0&&item.position!==0)
      ||(item.impressions>0&&item.position<=0))return invalid;
    seen.add(item.date);
    clicks+=item.clicks;
    impressions+=item.impressions;
    weighted+=item.impressions*item.position;
  }
  if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions)
    ||!Number.isFinite(weighted)
    ||nonnegativeInteger(r.clicks_total)!==clicks
    ||nonnegativeInteger(r.impressions_total)!==impressions
    ||(impressions>0
      ?r.average_position===null||decimal(r.average_position)===null
        ||Math.abs(weighted/impressions-decimal(r.average_position)!)>0.001
      :r.average_position!==null)
  )return invalid;
  const missingDays=span-seen.size;
  const expected=base.expectedFinalDate;
  const uncovered=expected?Math.max(0,dateDiff(expected,r.query_end)):null;
  return{
    ...base,
    state:missingDays>0?'PARTIAL_PROVIDER_COVERAGE'
      :uncovered!==null&&uncovered>2?'OUTDATED_OFFICIAL_OBSERVATION':'OBSERVED_L0',
    receiptId:r.receipt_id,
    recordedAt:r.recorded_at,
    startDate:r.query_start,
    finalDate:r.query_end,
    observedDays:r.observed_days,
    missingDays,
    clicks,impressions,
    averagePosition:impressions>0?weighted/impressions:null,
    crcEvidenceHash:r.payload_sha256,
    uncoveredFinalDays:uncovered,
  };
}
