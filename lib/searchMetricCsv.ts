import { normalizeResearchKeyword } from './searchDemandEvidence.ts';

export type MetricCsvRow = Record<string, string>;
export type MetricCsvContext = Partial<Record<'region' | 'language' | 'network' | 'period_start' | 'period_end' | 'last_checked' | 'bid_currency_code' | 'source_ref', string>>;
export const METRIC_CSV_COLUMNS = ['keyword','region','language','network','metric_source','source_ref','period_start','period_end','last_checked','avg_monthly_searches','volume_range_low','volume_range_high','competition','competition_index','low_bid','high_bid','bid_currency_code','monthly_history_json','returned_keyword','close_variants_json','observation_group','parse_issues','raw_input_json','notes'];
const EMPTY = /^(?:|--?|—|n\/a|na|null|unknown)$/i;

/** Explicit lexical parsing: no rounding, currency stripping, or null-to-zero coercion. */
export function parseMetricNumber(value: unknown, kind: 'integer' | 'decimal' = 'decimal', decimalSeparator?: '.' | ',') {
  const text = String(value ?? '').trim().replace(/[\u00a0\u202f]/g,' ');
  if (EMPTY.test(text)) return {value:null, error:null};
  let token = text;
  if (/\s/.test(token)) {
    if (!/^\d{1,3}(?: \d{3})+(?:[.,]\d+)?$/.test(token)) return {value:null,error:'invalid_numeric_grouping'};
    token = token.replaceAll(' ','');
  }
  if (kind === 'integer' && /^\d{1,3}(?:,\d{3})+$/.test(token)) token = token.replaceAll(',','');
  else if (kind === 'decimal' && token.includes(',')) {
    if (decimalSeparator === ',') {
      if (!/^\d+(?:,\d+)?$/.test(token)) return {value:null,error:'ambiguous_decimal'};
      token = token.replace(',','.');
    } else if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(token)) token = token.replaceAll(',','');
    else return {value:null,error:'ambiguous_decimal'};
  }
  if (!(kind === 'integer' ? /^\d+$/ : /^\d+(?:\.\d+)?$/).test(token)) return {value:null,error:'invalid_numeric_token'};
  const number = Number(token);
  if (!Number.isFinite(number) || number < 0 || (kind === 'integer' && !Number.isSafeInteger(number))) return {value:null,error:'invalid_numeric_value'};
  return {value:number,error:null};
}

export function parseSearchVolume(value: unknown) {
  const text = String(value ?? '').trim();
  const range = text.match(/^(\d[\d, .\u00a0\u202f]*(?:[kKmM])?)\s*[-–]\s*(\d[\d, .\u00a0\u202f]*(?:[kKmM])?)$/);
  if (range) {
    const endpoint = (v:string) => {
      const compact=v.trim().match(/^(\d+(?:\.\d+)?)([kKmM])$/);
      if (compact) { const n=Number(compact[1])*(compact[2].toLowerCase()==='k'?1000:1000000); return Number.isSafeInteger(n)?n:null; }
      return parseMetricNumber(v,'integer').value;
    };
    const low=endpoint(range[1]), high=endpoint(range[2]);
    return low!==null && high!==null && low<=high ? {value:null,low,high,error:null} : {value:null,low:null,high:null,error:'invalid_volume_range'};
  }
  const parsed=parseMetricNumber(text,'integer');
  return {...parsed,low:null,high:null};
}

/** RFC-style quoted records including embedded newlines; malformed input is held, never repaired silently. */
export function parseDelimitedRecords(text:string, delimiter:string) {
  const records:string[][]=[]; let row:string[]=[], cell='', quoted=false, afterQuote=false;
  const errors:string[]=[];
  const pushCell=()=>{row.push(cell.trim());cell='';afterQuote=false;};
  const pushRow=()=>{pushCell();if(row.some(x=>x!==''))records.push(row);row=[];};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') {if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}} else cell+=c; continue; }
    if(c===delimiter){pushCell();continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();continue;}
    if(c==='"'&&!cell&&!afterQuote){quoted=true;continue;}
    if(c==='"'||(afterQuote&&c.trim()))errors.push('malformed_csv_quote');
    cell+=c;
  }
  if(quoted)errors.push('unterminated_csv_quote');
  if(cell||row.length)pushRow();
  return {records,errors:[...new Set(errors)]};
}
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function monthlyHistory(row:MetricCsvRow) {
  const values: Array<{month:string; searches:number|null}>=[];const errors:string[]=[];
  for(const [header,value] of Object.entries(row)) {
    const m=header.match(/^Searches:\s*([A-Za-z]+)\s+(\d{4})$/i); if(!m)continue;
    const month=MONTHS.indexOf(m[1].slice(0,3).toLowerCase())+1;
    if(!month){errors.push('unknown_month_header');continue;}
    const n=parseMetricNumber(value,'integer');if(n.error)errors.push(`monthly_history_${n.error}`);
    values.push({month:`${m[2]}-${String(month).padStart(2,'0')}`,searches:n.value});
  }
  return {values:values.sort((a,b)=>a.month.localeCompare(b.month)),errors};
}
function competition(value:string) {
  const token=value.trim().toLowerCase();
  return ({low:'LOW',medium:'MEDIUM',high:'HIGH','низкий':'LOW','низкая':'LOW','средний':'MEDIUM','средняя':'MEDIUM','высокий':'HIGH','высокая':'HIGH'} as Record<string,string>)[token] || (EMPTY.test(token)?'':token);
}

export function parseKeywordMetricCsv(text:string, context:MetricCsvContext={}) {
  const cleaned=text.replace(/^\uFEFF/,'');
  if(!cleaned.trim())return {headers:[] as string[],rows:[] as MetricCsvRow[],source:'empty' as const,detectedAtLine:0,errors:[] as string[]};
  const variants=[',','\t',';'].map(delimiter=>({...parseDelimitedRecords(cleaned,delimiter),delimiter}));
  const candidate=variants.find(v=>v.records.some(r=>r.includes('Keyword')&&r.includes('Avg. monthly searches')))
    || variants.find(v=>v.records[0]?.includes('keyword'));
  if(!candidate)return {headers:[] as string[],rows:[] as MetricCsvRow[],source:'empty' as const,detectedAtLine:0,errors:['unrecognized_csv_header']};
  const googleIndex=candidate.records.findIndex(r=>r.includes('Keyword')&&r.includes('Avg. monthly searches'));
  const isGoogle=googleIndex>=0, index=isGoogle?googleIndex:0;
  const headers=candidate.records[index];
  const errors=[...candidate.errors];
  if(new Set(headers).size!==headers.length)errors.push('duplicate_csv_header');
  const rows=candidate.records.slice(index+1).map(cells=>{
    const raw:MetricCsvRow=Object.fromEntries(headers.map((h,i)=>[h,cells[i]??'']));
    const issues=[...errors,...(cells.length!==headers.length?['csv_column_count_mismatch']:[])];
    const row:MetricCsvRow=isGoogle?{
      keyword:raw.Keyword,metric_source:'google_ads_csv',
      // No inferred location, language, capture date or network from a filename/currency.
      region:raw.region||context.region||'',language:raw.language||context.language||'',network:raw.network||context.network||'',
      period_start:raw.period_start||context.period_start||'',period_end:raw.period_end||context.period_end||'',
      last_checked:raw.last_checked||context.last_checked||'',source_ref:context.source_ref||raw.source_ref||'',
      competition:competition(raw.Competition||''),bid_currency_code:raw.Currency||context.bid_currency_code||'',
      notes:JSON.stringify({source_row:raw,preamble:candidate.records.slice(0,index)})
    }:{...raw};
    if(!isGoogle)for(const [key,value] of Object.entries(context))if(!row[key])row[key]=value;
    const volume=parseSearchVolume(isGoogle?raw['Avg. monthly searches']:raw.avg_monthly_searches);
    row.avg_monthly_searches=volume.value===null?'':String(volume.value);
    row.volume_range_low=volume.low===null?(raw.volume_range_low||''):String(volume.low);
    row.volume_range_high=volume.high===null?(raw.volume_range_high||''):String(volume.high);
    if(volume.error)issues.push(volume.error);
    const numericFields=[['competition_index','Competition (indexed value)','integer'],['low_bid','Top of page bid (low range)','decimal'],['high_bid','Top of page bid (high range)','decimal']] as const;
    for(const [key,header,kind] of numericFields){const n=parseMetricNumber(isGoogle?raw[header]:raw[key],kind);row[key]=n.value===null?'':String(n.value);if(n.error)issues.push(`${key}_${n.error}`);}
    if(isGoogle){const history=monthlyHistory(raw);row.monthly_history_json=JSON.stringify(history.values);issues.push(...history.errors);}
    row.raw_input_json=raw.raw_input_json||JSON.stringify(raw);
    row.parse_issues=[...new Set([...(raw.parse_issues||'').split('|').filter(Boolean),...issues])].join('|');
    return row;
  });
  return {headers:isGoogle?[...METRIC_CSV_COLUMNS]:headers,rows,source:isGoogle?'google_keyword_planner' as const:'our_csv' as const,detectedAtLine:index+1,errors};
}

export function metricRowsToCsv(rows:MetricCsvRow[]) {
  const headers=[...new Set([...METRIC_CSV_COLUMNS,...rows.flatMap(row=>Object.keys(row))])];
  const escape=(value:string)=>`"${String(value??'').replaceAll('"','""')}"`;
  return headers.map(escape).join(',')+'\n'+rows.map(row=>headers.map(h=>escape(row[h])).join(',')).join('\n')+'\n';
}

/** Stable context/phrase identity; observation values and source are compared separately. */
export function metricObservationIdentity(row:MetricCsvRow) {
  return JSON.stringify([normalizeResearchKeyword(row.keyword||''),row.region||'',row.language||'',row.network||'',row.period_start||'',row.period_end||'',row.source_ref||'']);
}
