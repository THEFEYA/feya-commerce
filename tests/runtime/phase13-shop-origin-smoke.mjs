// Phase13 public Shop FULL HTML proof. Strict only after main reaches Production.
// The Phase12 crawl intentionally stops once metadata is available and therefore
// cannot detect a streamed React NEXT_HTTP_ERROR_FALLBACK;404 with zero cards.
import { mkdir, writeFile } from 'node:fs/promises';

const origin='https://thefeya.com';
const checks=[
  {path:'/shop',minCards:20},
  {path:'/shop?page=2',minCards:20},
  {path:'/shop?color=Gold',minCards:1},
  {path:'/shop?piece=Skirt',minCards:1},
];
const results=[];
const maxBytes=8*1024*1024;
const timeoutMs=30000;
const browserUA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36';

async function inspect(path,minCards){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const started=performance.now();
  try{
    const response=await fetch(new URL(path,origin),{
      redirect:'follow',signal:controller.signal,
      headers:{'user-agent':browserUA,'accept':'text/html','cache-control':'no-cache'},
    });
    // Consume the entire streaming response, not just the 200-status shell.
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
    }finally{
      if(truncated){try{void reader.cancel().catch(()=>{});}catch{}}
    }
    const cardMatches=[...html.matchAll(/<a\b[^>]{0,2500}\bdata-testid=["']product-card-[^"']+["'][^>]*>/g)];
    const visibleCards=cardMatches.length;
    const streamed404=html.includes('NEXT_HTTP_ERROR_FALLBACK;404');
    const unavailable=html.includes('Storefront catalog is temporarily unavailable.');
    const elapsedMs=Math.round(performance.now()-started);
    return {
      path,status:response.status,visibleCards,minCards,
      bytes,elapsedMs,streamed404,unavailable,truncated,
      pass:response.status===200 && !streamed404 && !unavailable && !truncated && visibleCards>=minCards,
    };
  }finally{clearTimeout(timer);controller.abort();}
}
for(const {path,minCards} of checks){
  let attempts=[];
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const item=await inspect(path,minCards);
      attempts.push({...item,attempt});
      if(item.pass)break;
    }catch(error){
      attempts.push({path,attempt,pass:false,error:String(error?.message||error).slice(0,220)});
    }
    if(attempt===1)await new Promise(resolve=>setTimeout(resolve,500));
  }
  results.push({path,pass:attempts.some(a=>a.pass),degraded:attempts.length>1,attempts});
}
const failures=results.filter(r=>!r.pass);
const report={
  contract:'phase13_shop_full_stream_origin_v1',at:new Date().toISOString(),origin,
  checked:results.length,passed:results.length-failures.length,degraded:results.filter(r=>r.degraded).length,
  cases:results,
};
await mkdir('runtime-results',{recursive:true});
await writeFile('runtime-results/phase13-shop-origin-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checked:report.checked,passed:report.passed,degraded:report.degraded,cases:results.map(x=>({path:x.path,pass:x.pass,attempts:x.attempts.map(a=>({status:a.status,cards:a.visibleCards,elapsedMs:a.elapsedMs,streamed404:a.streamed404,error:a.error}))}))},null,2));
if(failures.length){
  if(process.env.PHASE12_ALLOW_BLOCKED==='true'){
    console.warn('Shop Production streamed SSR smoke is advisory on PR (the PR is not deployed to the public origin).');
  }else{
    console.error('Shop Production streamed SSR smoke failed: hidden 404, unavailable catalog or missing real product-card markup');
    process.exitCode=1;
  }
}
// Keep GitHub workflow steps deterministic despite Node/undici keep-alive handles.
process.exit(process.exitCode??0);
