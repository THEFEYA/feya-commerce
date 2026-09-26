type Snapshot = {snapshot_id:string|number;keyword_norm:string;source_api:string|null;geo:string|null;language:string|null;avg_monthly_searches:number|null;competition_index:number|null;fetched_at:string|null};
const TABLE='feya_commerce_seo_keyword_metric_snapshots_v1';
const SELECT='snapshot_id,keyword_norm,source_api,geo,language,avg_monthly_searches,competition_index,fetched_at';
/** Raw observation overview, never a source-context approval or latest-demand estimate. */
export async function loadMetricStatus(client:any) {
  const snapshots:Snapshot[]=[];
  for(let offset=0;;offset+=1000){
    if(offset>=100000)throw Error('Слишком много наблюдений для полной сводки; требуется агрегированный источник.');
    const {data,error}=await client.from(TABLE).select(SELECT).order('snapshot_id',{ascending:true}).range(offset,offset+999);
    if(error||!Array.isArray(data))throw Error(error?.message||'Источник наблюдений недоступен.');
    snapshots.push(...data);if(data.length<1000)break;
  }
  const unique=new Set<string>(),groups=new Map<string,{source_code:string;country_code:string;language_code:string;metric_rows:number;keywords:Set<string>;last_metric_at:string|null}>();
  for(const s of snapshots){
    const key=JSON.stringify([s.source_api,s.geo,s.language]);
    const g=groups.get(key)||{source_code:s.source_api||'unknown',country_code:s.geo||'—',language_code:s.language||'—',metric_rows:0,keywords:new Set<string>(),last_metric_at:null};
    g.metric_rows++;g.keywords.add(s.keyword_norm);unique.add(s.keyword_norm);
    if(s.fetched_at&&(!g.last_metric_at||s.fetched_at>g.last_metric_at))g.last_metric_at=s.fetched_at;
    groups.set(key,g);
  }
  return {totalRows:snapshots.length,totalKeywords:unique.size,rows:[...groups.values()].map(({keywords,...g})=>({...g,unique_keywords:keywords.size})).sort((a,b)=>JSON.stringify([a.source_code,a.country_code,a.language_code]).localeCompare(JSON.stringify([b.source_code,b.country_code,b.language_code])))};
}
