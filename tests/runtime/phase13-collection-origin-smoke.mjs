import {mkdir,writeFile} from 'node:fs/promises';

const origin='https://thefeya.com';
const checks=[
 {path:'/collections/shoulder-armor',membership:80,minCards:20},
 {path:'/collections/festival-outfits',membership:111,minCards:20},
 {path:'/collections/costume-masks',membership:11,minCards:11},
];
const result={contract:'phase13_collections_full_stream_v1',origin,at:new Date().toISOString(),cases:[]};
const controllerTimeoutMs=30000,maxBytes=8*1024*1024;
const browserUA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36';

async function inspect(spec){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),controllerTimeoutMs),start=Date.now();
 try{
  const response=await fetch(new URL(spec.path,origin),{redirect:'follow',signal:controller.signal,
   headers:{accept:'text/html','user-agent':browserUA,'cache-control':'no-cache'}});
  let html='',bytes=0,truncated=false;
  if(!response.body)throw new Error('missing_stream');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done){html+=decoder.decode();break;}
    bytes+=value.byteLength;
    if(bytes>maxBytes){truncated=true;break;}
    html+=decoder.decode(value,{stream:true});
   }
  }finally{if(truncated){try{await reader.cancel();}catch{}}}
  const count=[...html.matchAll(/<a\b[^>]{0,2500}\bdata-testid=["']product-card-[^"']+["'][^>]*>/g)].length;
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').toLowerCase();
  const errors=[];
  if(response.status!==200)errors.push('http_not_200');
  if(truncated)errors.push('html_too_large');
  if(html.includes('NEXT_HTTP_ERROR_FALLBACK;404'))errors.push('hidden_streamed_404');
  if(!html.includes('data-testid="collection-snapshot-summary"'))errors.push('membership_summary_absent');
  if(!visible.includes(String(spec.membership)+' orderable pieces'))errors.push('membership_count_wrong');
  if(count<spec.minCards)errors.push('product_cards_missing');
  return {path:spec.path,status:response.status,expectedMemberCount:spec.membership,
    renderedCards:count,elapsedMs:Date.now()-start,bytes,pass:errors.length===0,errors};
 }finally{clearTimeout(timer);controller.abort();}
}
for(const spec of checks){
 const attempts=[];
 for(let i=1;i<=2;i++){
  try{attempts.push({...await inspect(spec),attempt:i});}
  catch(error){attempts.push({path:spec.path,attempt:i,pass:false,error:String(error?.message||error).slice(0,160)});}
  if(attempts.at(-1).pass)break;
  if(i===1)await new Promise(done=>setTimeout(done,500));
 }
 result.cases.push({path:spec.path,pass:attempts.some(a=>a.pass),degraded:attempts.length>1,attempts});
}
result.checked=result.cases.length;
result.passed=result.cases.filter(c=>c.pass).length;
result.degraded=result.cases.filter(c=>c.degraded).length;
await mkdir('runtime-results',{recursive:true});
await writeFile('runtime-results/phase13-collection-origin-smoke.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checked:result.checked,passed:result.passed,degraded:result.degraded,
 cases:result.cases.map(c=>({path:c.path,pass:c.pass,degraded:c.degraded,attempts:c.attempts.map(a=>({
  status:a.status,cards:a.renderedCards,elapsedMs:a.elapsedMs,errors:a.errors,error:a.error
 }))}))},null,2));
if(result.passed!==result.checked){
 if(process.env.PHASE12_ALLOW_BLOCKED==='true'){
  console.warn('Collection origin test advisory on PR; new reader is not yet in Production.');
 }else{
  console.error('Collection full streamed HTML or immutable membership proof failed on Production.');
  process.exitCode=1;
 }
}
process.exit(process.exitCode??0);
