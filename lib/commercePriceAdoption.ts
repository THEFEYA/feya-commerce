export type PriceAdoptionEvidence = {
  canonical_product_id: string;
  configuration_price_id: string;
  sellable_configuration_id: string | null;
  source_amount: number | string | null;
  public_price_amount: number | string | null;
  manual_override_amount: number | string | null;
  source_currency: string | null;
  confidence: number | string | null;
  fallback_flag: boolean | null;
  price_status: string | null;
  price_review_status: string | null;
  configuration_review_status: string | null;
  configuration_is_public_candidate: boolean | null;
  configuration_is_sampler: boolean | null;
};

export type PriceAdoptionState =
  | 'already_ready'
  | 'clean_source_baseline'
  | 'manual_override_review'
  | 'hold';

export type PriceAdoptionResult = {
  state: PriceAdoptionState;
  reason_codes: string[];
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXACT_STATUS=new Set(['approved','owner_reviewed']);

function decimal(value:number|string|null):number|null{
  if(value===null)return null;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const t=value.trim();
  if(!/^\d+(?:\.\d+)?$/.test(t))return null;
  const n=Number(t);return Number.isFinite(n)?n:null;
}

export function classifyPriceAdoptionEvidence(row:PriceAdoptionEvidence):PriceAdoptionResult{
  const reasons:string[]=[];
  if(!UUID.test(row.canonical_product_id)||!UUID.test(row.configuration_price_id))reasons.push('IDENTITY_INVALID');
  if(!row.sellable_configuration_id||!UUID.test(row.sellable_configuration_id))reasons.push('CONFIGURATION_MISSING');
  if(row.configuration_is_public_candidate!==true)reasons.push('CONFIGURATION_NOT_PUBLIC');
  if(row.configuration_is_sampler===true)reasons.push('SAMPLER');
  if(row.fallback_flag!==false)reasons.push('FALLBACK_PRICE');

  const publicAmount=decimal(row.public_price_amount);
  const sourceAmount=decimal(row.source_amount);
  const manualAmount=decimal(row.manual_override_amount);
  const confidence=decimal(row.confidence);
  if(publicAmount===null||publicAmount<=0)reasons.push('PUBLIC_PRICE_INVALID');
  if(!row.source_currency||!/^[A-Z]{3}$/.test(row.source_currency))reasons.push('CURRENCY_INVALID');
  if(confidence===null||confidence<95)reasons.push('CONFIDENCE_BELOW_BASELINE');

  const structurallySafe=reasons.length===0;
  const alreadyReady=structurallySafe
    && row.configuration_review_status==='approved'
    && row.price_review_status==='approved'
    && Boolean(row.price_status&&EXACT_STATUS.has(row.price_status));

  if(alreadyReady)return{state:'already_ready',reason_codes:[]};

  if(manualAmount!==null){
    if(publicAmount!==null&&publicAmount===manualAmount&&structurallySafe)
      return{state:'manual_override_review',reason_codes:['MANUAL_OVERRIDE_REQUIRES_EXPLICIT_REVIEW']};
    return{state:'hold',reason_codes:[...reasons,'MANUAL_OVERRIDE_MISMATCH']};
  }

  if(sourceAmount!==null&&publicAmount!==null&&sourceAmount===publicAmount&&structurallySafe)
    return{state:'clean_source_baseline',reason_codes:['SOURCE_EQUALS_PUBLIC_UNCHANGED']};

  if(sourceAmount===null)reasons.push('SOURCE_PRICE_MISSING');
  else if(publicAmount!==sourceAmount)reasons.push('PUBLIC_SOURCE_PRICE_MISMATCH');
  return{state:'hold',reason_codes:reasons};
}

export function classifyProductPriceAdoption(rows:PriceAdoptionEvidence[]){
  const results=rows.map(classifyPriceAdoptionEvidence);
  if(!results.length)return{state:'hold' as PriceAdoptionState,reason_codes:['NO_PRICE_ROWS']};
  if(results.some(r=>r.state==='hold'))return{state:'hold' as PriceAdoptionState,reason_codes:[...new Set(results.flatMap(r=>r.reason_codes))]};
  if(results.some(r=>r.state==='manual_override_review'))return{state:'manual_override_review' as PriceAdoptionState,reason_codes:['MANUAL_OVERRIDE_REQUIRES_EXPLICIT_REVIEW']};
  if(results.every(r=>r.state==='already_ready'))return{state:'already_ready' as PriceAdoptionState,reason_codes:[]};
  return{state:'clean_source_baseline' as PriceAdoptionState,reason_codes:['SOURCE_EQUALS_PUBLIC_UNCHANGED']};
}
