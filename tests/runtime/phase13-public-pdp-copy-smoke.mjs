import {readFile,mkdir,writeFile} from 'node:fs/promises';

const origin='https://thefeya.com';
const fixture=JSON.parse(await readFile(new URL('./fixtures/phase13-pdp-owner-samples-v1.json',import.meta.url),'utf8'));
const pins=JSON.parse(await readFile(new URL('../../config/approved-content-review-bindings.json',import.meta.url),'utf8'));
const gate=await readFile(new URL('../../lib/phase13PdpCopyReleaseGate.ts',import.meta.url),'utf8');
const gitAuthorized=/PHASE13_PRODUCTION_PUBLISH_AUTHORIZED\s*=\s*true as boolean/.test(gate);
const mainPush=process.env.PHASE13_REQUIRE_PUBLISHED_COPY==='true';
const strict=mainPush&&gitAuthorized;
const right=['Sizing & fit','Production time','Shipping & delivery','Material','Care','Made to order & customization'];
const left=['About this piece',"Why you'll love it",'Ideal for','Designed for self-expression'];
const clean=(v)=>String(v??'')
 .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
 .replace(/&#([0-9]+);/g,(_,dec)=>String.fromCodePoint(parseInt(dec,10)))
 .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key.toLowerCase()]))
 .replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const visible=(html)=>clean(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '));
const attr=(tag,name)=>{
 for(const x of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))
  if(x[1].toLowerCase()===name.toLowerCase())return x[2]??x[3]??x[4]??'';
 return null;
};
const report={contract:'phase13_public_pdp_copy_postflight_v1',timestamp:new Date().toISOString(),
 origin,gitAuthorized,mainPush,strict,skipped:!strict,checked:0,passed:0,reasons:[],samples:[]};
const live=pins.entries.filter(x=>x.canonical_product_id!=='d42dd678-7b11-4f38-890e-411de686f418');
if(fixture.samples.length!==5||pins.entries.length!==208||live.length!==207)report.reasons.push('frozen_manifest_or_sample_drift');
for(const sample of fixture.samples){
 const found=live.find(x=>x.canonical_product_id===sample.canonical_product_id&&x.url_path==='/shop/'+sample.slug);
 if(!found||!/^[a-f0-9]{64}$/.test(found.content_sha256)||!sample.h1)report.reasons.push('invalid_sample_pin');
}
if(strict&&!report.reasons.length){
 for(const sample of fixture.samples){
  const path='/shop/'+sample.slug,errors=[];
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000),started=Date.now();
  let status=null,bytes=null;
  try{
   const response=await fetch(new URL(path,origin),{
     signal:controller.signal,cache:'no-store',redirect:'follow',
     headers:{accept:'text/html','cache-control':'no-cache',
      'user-agent':'Mozilla/5.0 (compatible; Google-InspectionTool/1.0; FEYA-PDP-Release-Check/1.0)'}
   });
   status=response.status;
   const html=await response.text();
   bytes=Buffer.byteLength(html,'utf8');
   if(status!==200)errors.push('http_not_200');
   if(bytes>8*1024*1024)errors.push('oversize_html');
   if(html.includes('NEXT_HTTP_ERROR_FALLBACK;404'))errors.push('hidden_404');
   if(html.includes('Product data is temporarily unavailable.'))errors.push('source_unavailable');
   const robots=[...html.matchAll(/<meta\b[^>]*>/gi)]
      .filter(x=>['robots','googlebot'].includes(String(attr(x[0],'name')||'').toLowerCase()))
      .map(x=>String(attr(x[0],'content')||'').toLowerCase());
   if(!robots.some(x=>x.includes('noindex'))&&!String(response.headers.get('x-robots-tag')||'').toLowerCase().includes('noindex'))errors.push('pdp_noindex_lost');
   const canonicals=[...html.matchAll(/<link\b[^>]*>/gi)].filter(x=>String(attr(x[0],'rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
   let canonicalMatch=false;
   try{canonicalMatch=new URL(attr(canonicals[0]?.[0]||'','href')||'',origin).href===new URL(path,origin).href}catch{}
   if(!canonicalMatch)errors.push('pdp_canonical_changed');
   const body=visible(html);
   if(!body.includes(clean(sample.h1)))errors.push('original_h1_not_rendered');
   const seq=left.map(x=>body.indexOf(clean(x)));
   if(seq.some(x=>x<0)||!seq.every((x,i)=>i===0||x>seq[i-1]))errors.push('four_approved_blocks_missing_or_ordered_wrong');
   const includedAt=body.indexOf("what's included");
   const whyAt=body.indexOf("why you'll love it",Math.max(0,includedAt));
   if(includedAt<0||whyAt<=includedAt)errors.push('left_included_section_missing');
   const leftIncluded=includedAt<0||whyAt<=includedAt?'':body.slice(includedAt,whyAt);
   for(const item of sample.included){
    const word=new RegExp('\\b'+clean(item).replace(/\s+/g,'\\s+')+'\\b');
    if(!word.test(leftIncluded))errors.push('confirmed_physical_piece_not_rendered:'+item.toLowerCase().replace(/\s+/g,'_'));
   }
   for(const label of right)if(!body.includes(clean(label)))errors.push('right_pdp_heading_missing:'+label.toLowerCase().replace(/\W+/g,'_'));
  }catch(error){errors.push(error?.name==='AbortError'?'timeout':'request_failed');}
  finally{clearTimeout(timeout);controller.abort();}
  report.checked++;
  if(errors.length===0)report.passed++;
  report.samples.push({path,status,elapsedMs:Date.now()-started,bytes,pass:errors.length===0,errors});
 }
}
await mkdir('runtime-results',{recursive:true});
await writeFile('runtime-results/phase13-public-pdp-copy-postflight.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({strict,skipped:report.skipped,checked:report.checked,passed:report.passed,reasons:report.reasons,samples:report.samples.map(x=>({path:x.path,status:x.status,elapsedMs:x.elapsedMs,pass:x.pass,errors:x.errors}))},null,2));
if(strict&&(report.reasons.length||report.checked!==5||report.passed!==5))process.exitCode=1;
process.exit(process.exitCode??0);
