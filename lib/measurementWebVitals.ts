import type {Metric} from 'web-vitals';
import type {FeyaMeasurementPageContext} from './measurementContract';

type WebVitalsLibrary={
  onCLS:(callback:(metric:Metric)=>void)=>void;
  onINP:(callback:(metric:Metric)=>void)=>void;
  onLCP:(callback:(metric:Metric)=>void)=>void;
};

export function resolveWebVitalContext(
  navigationURL:string|undefined,
  documentPath:string,
  origin:string,
  contexts:ReadonlyMap<string,FeyaMeasurementPageContext>,
){
  let url:URL;
  try{url=new URL(navigationURL||documentPath,origin);}catch{return null;}
  const path=url.pathname.replace(/\/+$/,'')||'/';
  if(url.origin!==origin||path.startsWith('/admin')||path.startsWith('/api'))return null;
  return contexts.get(path)||null;
}

// Observers belong to the browser document, not to individual React renders or
// client-side route changes. Load the SDK only after the live consent gate opens.
export function createWebVitalsCollector(options:{
  load:()=>Promise<WebVitalsLibrary>;
  allowed:(metric?:Metric)=>boolean;
  send:(metric:Metric)=>boolean;
}){
  let registered=false;
  let disabled=false;
  let pending:Promise<void>|null=null;
  const lastValues=new Map<string,number>();

  function report(metric:Metric){
    if(disabled||!options.allowed(metric))return;
    if(!['LCP','INP','CLS'].includes(metric.name)
      ||!metric.id?.trim()
      ||!Number.isFinite(metric.value)||metric.value<0
      ||!Number.isFinite(metric.delta))return;
    // CLS/INP can report again when the document is hidden. Retain changed
    // cumulative values and their deltas, without duplicating unchanged samples.
    if(lastValues.get(metric.id)===metric.value)return;
    if(options.send(metric))lastValues.set(metric.id,metric.value);
  }

  async function start(){
    if(disabled||registered||!options.allowed())return;
    if(pending)return pending;
    pending=(async()=>{
      const library=await options.load();
      // Consent or the production context can change while the chunk loads.
      if(disabled||registered||!options.allowed())return;
      registered=true;
      library.onCLS(report);
      library.onINP(report);
      library.onLCP(report);
    })();
    try{await pending;}finally{pending=null;}
  }

  function disable(){
    // The SDK does not expose observer disposal. After withdrawal/private
    // navigation, discard this document's reports even if consent is granted
    // again: a cumulative metric would otherwise include the excluded interval.
    disabled=true;
    lastValues.clear();
  }

  return{start,disable};
}
