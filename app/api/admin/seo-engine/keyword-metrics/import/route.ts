import { NextRequest, NextResponse } from 'next/server';
import { previewDemandImport } from '@/lib/searchDemandImportPreview';
import type { MetricCsvContext, MetricCsvRow } from '@/lib/searchMetricCsv';
import { importMetricsAtomically, metricImportWriteBlockers, prepareMetricImport } from '@/lib/searchMetricAtomicStorage';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Existing admin endpoint. Previous target tables were absent; do not create a parallel metric core. */
export async function POST(request: NextRequest) {
  try {
    const text=await request.text();
    if(new TextEncoder().encode(text).length>2_000_000)return NextResponse.json({ok:false,error:'Review payload exceeds 2 MB.'},{status:413});
    const input=JSON.parse(text);
    if(!input||typeof input!=='object'||Array.isArray(input))return NextResponse.json({ok:false,error:'Expected an import object.'},{status:400});
    if(input.dry_run===false){
      const blockers=metricImportWriteBlockers(process.env);
      if(blockers.length)return NextResponse.json({ok:false,status:'storage_bridge_not_enabled',blockers,writes_performed:0,error:'Atomic storage is prepared; activation awaits legacy consumer integration and authenticated runtime verification.'},{status:423,headers:{'Cache-Control':'no-store'}});
    }
    if(input.csv_text!==undefined&&typeof input.csv_text!=='string')return NextResponse.json({ok:false,error:'csv_text must be a string.'},{status:400});
    if(input.rows!==undefined&&(!Array.isArray(input.rows)||input.rows.some((row:unknown)=>!row||typeof row!=='object'||Array.isArray(row))))return NextResponse.json({ok:false,error:'rows must contain objects.'},{status:400});
    const rows=input.rows?.map((row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v===null||v===undefined?'':String(v)]))) as MetricCsvRow[]|undefined;
    const context:MetricCsvContext={};
    for(const key of ['region','language','network','period_start','period_end','last_checked','bid_currency_code','source_ref'] as const) {
      if(typeof input.context?.[key]==='string')context[key]=input.context[key];
    }
    const result=previewDemandImport({csv_text:input.csv_text,rows,context},new Date());
    if(input.dry_run===false){
      let payload:ReturnType<typeof prepareMetricImport>;
      try{payload=prepareMetricImport(result,input.context_evidence_ref);}catch(error){return NextResponse.json({ok:false,error:String(error),writes_performed:0},{status:422,headers:{'Cache-Control':'no-store'}});}
      const client=getSupabaseServiceClient();
      if(!client)return NextResponse.json({ok:false,error:'Metric storage unavailable.',writes_performed:0},{status:503,headers:{'Cache-Control':'no-store'}});
      const saved=await importMetricsAtomically(client,payload,request.headers.get('Idempotency-Key'));
      return NextResponse.json({...saved,can_assign_primary:false,can_publish:false,can_index:false},{status:saved.httpStatus,headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json(result,{status:result.ok?200:422,headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Invalid import payload.',writes_performed:0},{status:400});
  }
}
