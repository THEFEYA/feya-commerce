// Read-only capture of the CURRENT public storefront. No Supabase credentials,
// checkout POSTs, paid calls, or Google submissions. Run with Node 24.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {sortedOptions,optionKey,optionPrice,isFullSetOption,colorOptions,getMedia} from '../../lib/storefront.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {priceCartLine,PDP_SIZES} from '../../lib/payments/catalogLinePricing.ts';
import {isSourceConfirmedPairedSet} from '../../lib/payments/pairedSetSelection.ts';

export const ORIGIN='https://thefeya.com';
const OMITTED_DUPLICATE='d42dd678-7b11-4f38-890e-411de686f418';
const sha=value=>createHash('sha256').update(value).digest('hex');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>');

/** Parse only JSON; never execute scripts from a page. */
export function extractFlightProduct(html){
  const parts=[];
  for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
    const script=m[1].trim();
    if(!script.startsWith('self.__next_f.push('))continue;
    const args=JSON.parse(script.slice('self.__next_f.push('.length,script.lastIndexOf(')')));
    if(args[0]===1&&typeof args[1]==='string')parts.push(args[1]);
  }
  const flight=parts.join('');
  const products=[];
  for(const m of flight.matchAll(/"product":(?=\{)/g)){
    const start=m.index+m[0].length;
    let depth=0,inString=false,escaped=false,end=start;
    for(;end<flight.length;end++){
      const c=flight[end];
      if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;}
      else if(c==='"')inString=true;
      else if(c==='{')depth++;
      else if(c==='}'&&--depth===0){end++;break;}
    }
    const product=JSON.parse(flight.slice(start,end));
    if(product.canonical_product_id&&Array.isArray(product.configurations))products.push(product);
  }
  assert.equal(products.length,1,'exactly one public ProductDetail payload required');
  return products[0];
}

export function inspectPublicPage(html,url,pin,deploymentId){
  assert.ok(html.includes(deploymentId),'mixed or unexpected deployment');
  const canonical=decode(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'');
  assert.equal(canonical,url,'canonical differs from captured URL');
  const robots=html.match(/<meta name="robots" content="([^"]+)"/)?.[1]||'';
  assert.match(robots,/(?:^|,\s*)index(?:,|$)/);assert.doesNotMatch(robots,/noindex|nofollow/);
  const product=extractFlightProduct(html);
  assert.equal(product.canonical_product_id,pin.canonical_product_id);
  assert.equal(ORIGIN+'/shop/'+product.product_slug,url);
  const jsonLd=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m=>JSON.parse(m[1])).find(x=>x['@type']==='Product');
  assert.ok(jsonLd,'public Product JSON-LD missing');
  assert.equal(jsonLd.sku,pin.canonical_product_id);
  const expected=pdpOfferJsonLd(product,url);
  assert.deepEqual(jsonLd.offers,expected,'live Offer differs from current shared pricing helper');
  const options=sortedOptions(product);
  const selected=expected?.['@type']==='Offer'
    ?options.find((o,i)=>optionKey(o,i)===expected.sku):null;
  const colorCode=product.default_color_choice||null;
  const color=colorOptions(product)[0]||null;
  const images=getMedia(product).map(x=>String(x.url)).filter(x=>/^https:\/\//.test(x));
  const reasons=[];
  if(!selected)reasons.push('EXACT_SELECTED_OFFER_REQUIRED');
  if(selected&&isSourceConfirmedPairedSet(selected))reasons.push('INDEPENDENT_PARTNER_SELECTION_REQUIRED');
  if(!color||color==='Mirror'||!colorCode)reasons.push('CONFIRMED_PHOTOGRAPHED_COLOR_REQUIRED');
  if(!images.length)reasons.push('PRODUCT_IMAGE_REQUIRED');
  const text=jsonLd.name+' '+jsonLd.description+' '+product.card_title+' '+product.h1;
  const female=/\b(women|woman|female|girl|goddess|showgirl)\b/i.test(text);
  const male=/\b(men|man|male|boy)\b/i.test(text.replace(/burning\s+man/ig,''));
  const gender=female&&!male?'female':male&&!female?'male':null;
  if(!gender)reasons.push('TARGET_GENDER_REVIEW_REQUIRED');
  const sizeQuotes=[];
  if(selected&&color&&!isSourceConfirmedPairedSet(selected)){
    for(const size of PDP_SIZES.filter(s=>s!=='Custom')){
      try{
        const line=priceCartLine(product,{
          id:product.canonical_product_id+'-merchant-'+size,slug:product.product_slug,
          configuration_id:optionKey(selected),size,color,color_code:colorCode,
          quantity:1,wearer:null,made_to_measure:false,client_unit_minor:null,
        });
        assert.equal(line.unit_minor,Math.round(Number(expected.price)*100));
        sizeQuotes.push({size,unit_minor:line.unit_minor,line_minor:line.line_minor});
      }catch(error){reasons.push('CHECKOUT_PARITY_REQUIRED:'+String(error.code||error.message));break;}
    }
  }
  return{
    canonical_product_id:product.canonical_product_id,etsy_tail:product.product_slug.match(/-(\d+)$/)?.[1],
    slug:product.product_slug,url,canonical,robots,observed_at:new Date().toISOString(),
    approved_content_sha256:pin.content_sha256,html_sha256:sha(html),
    title:jsonLd.name,description:jsonLd.description,offer:jsonLd.offers,
    source_title:product.card_title||product.h1,
    selected_configuration:selected?{id:optionKey(selected),label:selected.public_label,
      full_set:isFullSetOption(selected),component_code:selected.component_code,
      configuration_color:selected.configuration_color||null,
      unit_minor:Math.round(optionPrice(selected)*100)}:null,
    color,color_code:colorCode,gender,size_quotes:sizeQuotes,images:images.slice(0,6),
    primary_image_url:product.primary_image_url,size_mode:product.size_mode,
    production_profile:product.production_profile,shipping_profile:product.shipping_profile,
    candidate_reasons:[...new Set(reasons)],option_count:options.length,
  };
}

async function getText(url){
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{'user-agent':'TheFEYA-ReadOnly-Catalog-Validation/1.0'}});
  assert.equal(res.status,200,'public HTTP status '+res.status);
  const body=await res.text();assert.ok(body.length<2_000_000,'oversized public response');
  return body;
}

export async function captureCatalog({deploymentId,gitSha,output,concurrency=6,resumeFrom}){
  assert.match(deploymentId,/^dpl_[A-Za-z0-9]+$/);assert.match(gitSha,/^[a-f0-9]{40}$/);
  const manifest=JSON.parse(readFileSync(new URL('../../config/approved-content-review-bindings.json',import.meta.url),'utf8'));
  const pins=manifest.entries.filter(x=>x.canonical_product_id!==OMITTED_DUPLICATE);
  assert.equal(pins.length,207);assert.equal(new Set(pins.map(x=>x.canonical_product_id)).size,207);
  const sitemap=await getText(ORIGIN+'/sitemap.xml');
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1])).filter(u=>new URL(u).pathname.startsWith('/shop/'));
  const expected=pins.map(p=>ORIGIN+p.url_path).sort();
  assert.deepEqual([...urls].sort(),expected,'sitemap differs from approved207 corpus');
  const prior=resumeFrom?JSON.parse(readFileSync(resumeFrom,'utf8')):null;
  if(prior){assert.equal(prior.deployment_id,deploymentId);assert.equal(prior.source_git_sha,gitSha);}
  const byId=new Map((prior?.products||[]).map(p=>[p.canonical_product_id,p]));
  const queue=[...pins].sort((a,b)=>a.url_path.localeCompare(b.url_path));
  const products=[];let cursor=0;
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(cursor<queue.length){
      const pin=queue[cursor++],url=ORIGIN+pin.url_path;
      const previous=byId.get(pin.canonical_product_id);
      const age=Date.now()-Date.parse(previous?.observed_at||'');
      if(previous?.source_title&&previous.approved_content_sha256===pin.content_sha256
        &&previous.url===url&&Number.isFinite(age)&&age>=0&&age<=3_600_000){products.push(previous);continue;}
      let last;
      for(let attempt=0;attempt<2;attempt++){
        try{const html=await getText(url);products.push(inspectPublicPage(html,url,pin,deploymentId));last=null;break;}
        catch(error){last=error;}
      }
      if(last)throw new Error(pin.url_path+': '+last.message);
      if(products.length%25===0)console.log(JSON.stringify({captured:products.length,total:207}));
    }
  }));
  products.sort((a,b)=>a.slug.localeCompare(b.slug));
  const result={version:'thefeya_merchant_catalog_capture_v1',origin:ORIGIN,
    captured_at:new Date().toISOString(),deployment_id:deploymentId,source_git_sha:gitSha,
    source_manifest_sha256:sha(JSON.stringify(manifest)),sitemap_sha256:sha(sitemap),products};
  mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({products:products.length,exact_offer_candidates:products.filter(p=>!p.candidate_reasons.length).length,
    reasons:products.reduce((a,p)=>{for(const r of p.candidate_reasons)a[r]=(a[r]||0)+1;return a;},{})}));
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=Object.fromEntries(process.argv.slice(2).map((s,i,a)=>s.startsWith('--')?[s.slice(2),a[i+1]]:null).filter(Boolean));
  await captureCatalog({deploymentId:args['deployment-id'],gitSha:args['git-sha'],output:args.output,resumeFrom:args['resume-from']});
}
