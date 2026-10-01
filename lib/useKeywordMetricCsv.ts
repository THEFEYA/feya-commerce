'use client';
import { useEffect, useMemo, useState } from 'react';
import { parseKeywordMetricCsv, type MetricCsvRow } from './searchMetricCsv';

export function useKeywordMetricCsv(text:string) {
  const parsed=useMemo(()=>parseKeywordMetricCsv(text),[text]);
  const [provenance,setProvenance]=useState<{text:string;ref:string}|null>(null);
  useEffect(()=>{
    if(parsed.source!=='google_keyword_planner'||!globalThis.crypto?.subtle)return;
    let cancelled=false;
    void crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(buffer=>{
      if(!cancelled)setProvenance({text,ref:'sha256:'+Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('')});
    }).catch(()=>{if(!cancelled)setProvenance(null);});
    return ()=>{cancelled=true;};
  },[text,parsed.source]);
  return useMemo(()=>parsed.source==='google_keyword_planner'&&provenance?.text===text
    ?{...parsed,rows:parsed.rows.map((row):MetricCsvRow=>({...row,source_ref:provenance.ref}))}:parsed,[parsed,provenance,text]);
}
