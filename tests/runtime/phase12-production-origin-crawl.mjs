import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve4, resolve6, resolveCname } from 'node:dns/promises';

const manifest=JSON.parse(await readFile(new URL('./fixtures/phase12-wave-a-v10-production-crawl.json',import.meta.url),'utf8'));
const origin=new URL(manifest.release.targetOrigin).origin;
const result={
  contract:'phase12_production_origin_crawl_evidence_v1',
  startedAt:new Date().toISOString(),
  release:manifest.release,
  origin,
  dns:{},
  originChecks:[],
  indexCandidates:[],
  retiredRedirects:[],
  productNoindex:{expected:manifest.productNoindexPaths.length,checked:0,passed:0,failed:[]},
  utilityNoindex:[],
  filterNoindex:[],
  robots:null,
  sitemap:null,
  errors:[],
};

function fail(message,detail={}){
  result.errors.push({message,...detail});
}
function normalizeUrl(value){
  const u=new URL(value,origin);
  if(u.pathname!=='/'&&u.pathname.endsWith('/'))u.pathname=u.pathname.slice(0,-1);
  return u.toString();
}
function attr(tag,name){
  const wanted=name.toLowerCase();
  for(const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){
    if(String(match[1]||'').toLowerCase()===wanted)return match[2]??match[3]??match[4]??'';
  }
  return null;
}
function headSignals(html){
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
  const robots=[];
  for(const tag of metas){
    const name=(attr(tag,'name')||'').toLowerCase();
    if(name==='robots'||name==='googlebot'){
      robots.push({name,content:(attr(tag,'content')||'').toLowerCase()});
    }
  }
  let canonical=null;
  for(const tag of links){
    const rel=(attr(tag,'rel')||'').toLowerCase().split(/\s+/);
    if(rel.includes('canonical')){
      canonical=attr(tag,'href');
      break;
    }
  }
  return{robots,canonical};
}
function hasNoindex(signals,headers){
  const xrobots=(headers.get('x-robots-tag')||'').toLowerCase();
  if(xrobots.includes('noindex'))return true;
  return signals.robots.some(r=>r.content.includes('noindex'));
}
async function fetchHead(path,{redirect='manual',timeoutMs=20000,maxBytes=262144}={}){
  let lastError;
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(new URL(path,origin),{
        redirect,
        signal:controller.signal,
        headers:{
          'user-agent':'Mozilla/5.0 (compatible; TheFEYA-Phase12-ReleaseCrawl/1.0; +https://thefeya.com)',
          'accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'cache-control':'no-cache',
        },
      });
      let html='';
      if(response.body){
        const reader=response.body.getReader();
        const decoder=new TextDecoder();
        try{
          while(html.length<maxBytes){
            const {done,value}=await reader.read();
            if(done)break;
            html+=decoder.decode(value,{stream:true});
            if(/<\/head>/i.test(html))break;
          }
        }finally{
          try{await reader.cancel();}catch{}
        }
      }
      clearTimeout(timer);
      return{status:response.status,headers:response.headers,html,url:response.url,attempt};
    }catch(error){
      clearTimeout(timer);
      lastError=error;
      if(attempt<3)await new Promise(r=>setTimeout(r,500*attempt));
    }
  }
  throw lastError;
}
async function fetchText(path,{redirect='manual',timeoutMs=20000}={}){
  let lastError;
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(new URL(path,origin),{
        redirect,
        signal:controller.signal,
        headers:{
          'user-agent':'Mozilla/5.0 (compatible; TheFEYA-Phase12-ReleaseCrawl/1.0; +https://thefeya.com)',
          'cache-control':'no-cache',
        },
      });
      const text=await response.text();
      clearTimeout(timer);
      return{status:response.status,headers:response.headers,text,url:response.url,attempt};
    }catch(error){
      clearTimeout(timer);
      lastError=error;
      if(attempt<3)await new Promise(r=>setTimeout(r,500*attempt));
    }
  }
  throw lastError;
}
async function checkNoindexPath(path,{canonical=true,allow404=false}={}){
  const response=await fetchHead(path);
  const signals=headSignals(response.html);
  const entry={
    path,
    status:response.status,
    noindex:hasNoindex(signals,response.headers),
    canonical:signals.canonical?normalizeUrl(signals.canonical):null,
    xRobotsTag:response.headers.get('x-robots-tag')||null,
    attempt:response.attempt,
  };
  if(allow404&&response.status===404)return{...entry,pass:true};
  let pass=response.status===200&&entry.noindex;
  if(canonical){
    const expected=normalizeUrl(path);
    pass=pass&&entry.canonical===expected;
    entry.expectedCanonical=expected;
  }
  return{...entry,pass};
}
async function mapLimit(items,limit,fn){
  const output=new Array(items.length);
  let cursor=0;
  async function worker(){
    while(true){
      const i=cursor++;
      if(i>=items.length)return;
      try{output[i]=await fn(items[i],i);}
      catch(error){output[i]={path:items[i],pass:false,error:String(error?.message||error)};}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
  return output;
}

for(const [label,resolver] of [['A',resolve4],['AAAA',resolve6],['CNAME',resolveCname]]){
  try{result.dns[label]=await resolver('thefeya.com');}
  catch(error){result.dns[label]=[];result.dns[label+'Error']=String(error?.code||error?.message||error);}
}
for(const [label,resolver] of [['A',resolve4],['AAAA',resolve6],['CNAME',resolveCname]]){
  try{result.dns['www_'+label]=await resolver('www.thefeya.com');}
  catch(error){result.dns['www_'+label]=[];result.dns['www_'+label+'Error']=String(error?.code||error?.message||error);}
}

try{
  const home=await fetchHead('/');
  const signals=headSignals(home.html);
  const markerA=home.html.includes('/collections/burning-man-outfits');
  const markerB=home.html.includes('/collections/performance-costumes');
  const homeEntry={
    host:'thefeya.com',
    status:home.status,
    canonical:signals.canonical?normalizeUrl(signals.canonical):null,
    noindex:hasNoindex(signals,home.headers),
    phase12Markers:{burningManOwner:markerA,performanceOwner:markerB},
    pass:home.status===200
      && normalizeUrl(signals.canonical||'/')===normalizeUrl('/')
      && hasNoindex(signals,home.headers)
      && markerA&&markerB,
  };
  result.originChecks.push(homeEntry);
  if(!homeEntry.pass)fail('Canonical production origin did not prove the Phase 12 storefront',homeEntry);
}catch(error){fail('Canonical production origin fetch failed',{error:String(error?.message||error)});}

try{
  const wwwUrl=new URL(origin);wwwUrl.hostname='www.'+wwwUrl.hostname;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  const response=await fetch(wwwUrl,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; TheFEYA-Phase12-ReleaseCrawl/1.0)'}});
  clearTimeout(timer);
  const location=response.headers.get('location');
  let pass=false;
  let canonical=null;
  let noindex=false;
  if(response.status>=300&&response.status<400&&location){
    pass=new URL(location,wwwUrl).hostname==='thefeya.com';
  }else if(response.status===200){
    const html=await response.text();
    const signals=headSignals(html);
    canonical=signals.canonical?normalizeUrl(signals.canonical):null;
    noindex=hasNoindex(signals,response.headers);
    pass=canonical===normalizeUrl('/')&&noindex;
  }
  const entry={host:'www.thefeya.com',status:response.status,location,canonical,noindex,pass};
  result.originChecks.push(entry);
  if(!pass)fail('www host is neither a canonical redirect nor a canonicalized noindex page',entry);
}catch(error){fail('www production origin fetch failed',{error:String(error?.message||error)});}

for(const path of manifest.indexCandidates){
  try{
    const entry=await checkNoindexPath(path);
    result.indexCandidates.push(entry);
    if(!entry.pass)fail('Wave A candidate failed pre-activation crawl contract',entry);
  }catch(error){
    const entry={path,pass:false,error:String(error?.message||error)};
    result.indexCandidates.push(entry);fail('Wave A candidate fetch failed',entry);
  }
}

for(const item of manifest.retiredRedirects){
  try{
    const response=await fetchHead(item.from);
    const location=response.headers.get('location');
    const resolved=location?normalizeUrl(new URL(location,new URL(item.from,origin)).toString()):null;
    const expected=normalizeUrl(item.to);
    const entry={...item,status:response.status,location:resolved,expected,pass:response.status===308&&resolved===expected};
    result.retiredRedirects.push(entry);
    if(!entry.pass)fail('Retired owner route failed permanent redirect contract',entry);
  }catch(error){
    const entry={...item,pass:false,error:String(error?.message||error)};
    result.retiredRedirects.push(entry);fail('Retired owner route fetch failed',entry);
  }
}

const productEntries=await mapLimit(manifest.productNoindexPaths,8,async path=>checkNoindexPath(path));
for(const entry of productEntries){
  result.productNoindex.checked++;
  if(entry.pass)result.productNoindex.passed++;
  else{
    result.productNoindex.failed.push(entry);
    fail('Product dependency failed noindex/canonical contract',{path:entry.path,status:entry.status,error:entry.error||null});
  }
}

for(const path of manifest.utilityNoindexPaths){
  try{
    const entry=await checkNoindexPath(path,{allow404:path==='/account'});
    result.utilityNoindex.push(entry);
    if(!entry.pass)fail('Utility dependency failed noindex contract',entry);
  }catch(error){
    const entry={path,pass:false,error:String(error?.message||error)};
    result.utilityNoindex.push(entry);fail('Utility dependency fetch failed',entry);
  }
}

for(const path of manifest.filterNoindexPaths){
  try{
    const entry=await checkNoindexPath(path);
    result.filterNoindex.push(entry);
    if(!entry.pass)fail('Filter state failed noindex/canonical contract',entry);
  }catch(error){
    const entry={path,pass:false,error:String(error?.message||error)};
    result.filterNoindex.push(entry);fail('Filter state fetch failed',entry);
  }
}

try{
  const response=await fetchText('/robots.txt');
  const hasSitemap=/^\s*Sitemap:/im.test(response.text);
  const disallowAdmin=/Disallow:\s*\/admin\//i.test(response.text);
  const disallowInternal=/Disallow:\s*\/api\/internal\//i.test(response.text);
  const entry={status:response.status,hasSitemap,disallowAdmin,disallowInternal,body:response.text.slice(0,4000),pass:response.status===200&&!hasSitemap&&disallowAdmin&&disallowInternal};
  result.robots=entry;
  if(!entry.pass)fail('robots.txt failed inactive-release contract',entry);
}catch(error){fail('robots.txt fetch failed',{error:String(error?.message||error)});}

try{
  const response=await fetchText('/sitemap.xml');
  const urlCount=(response.text.match(/<url(?:\s|>)/gi)||[]).length;
  const entry={status:response.status,urlCount,body:response.text.slice(0,4000),pass:response.status===200&&urlCount===0};
  result.sitemap=entry;
  if(!entry.pass)fail('sitemap.xml exposed URLs before activation',entry);
}catch(error){fail('sitemap.xml fetch failed',{error:String(error?.message||error)});}

result.finishedAt=new Date().toISOString();
result.summary={
  passed:result.errors.length===0,
  errorCount:result.errors.length,
  indexCandidatesChecked:result.indexCandidates.length,
  indexCandidatesPassed:result.indexCandidates.filter(x=>x.pass).length,
  productNoindexExpected:result.productNoindex.expected,
  productNoindexChecked:result.productNoindex.checked,
  productNoindexPassed:result.productNoindex.passed,
  retiredRedirectsPassed:result.retiredRedirects.filter(x=>x.pass).length,
  utilityNoindexPassed:result.utilityNoindex.filter(x=>x.pass).length,
  filterNoindexPassed:result.filterNoindex.filter(x=>x.pass).length,
};
await mkdir('runtime-results',{recursive:true});
await writeFile('runtime-results/phase12-production-origin-crawl.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
if(result.errors.length){
  console.error(JSON.stringify(result.errors.slice(0,30),null,2));
  process.exitCode=1;
}
