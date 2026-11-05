// Deterministic, offline US FREE_LISTINGS feed. Node 24; no credentials or writes to Google.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildRows as pilotRows} from './build-us-pilot-feed.mjs';

const DIR=new URL('../../docs/merchant/catalog-us-20261105/',import.meta.url);
const SIZES=['XS','S','M','L','XL','XXL','XXXL'];
const OMITTED='d42dd678-7b11-4f38-890e-411de686f418';
const sha=s=>createHash('sha256').update(s).digest('hex');
const json=u=>JSON.parse(readFileSync(u,'utf8'));
export const REMEDIES={
  EXACT_SELECTED_OFFER_REQUIRED:'Add a source-backed configuration/color deep link that preselects an exact purchasable offer and matches checkout; retain the approved copy and prices.',
  INDEPENDENT_PARTNER_SELECTION_REQUIRED:'Implement a source-backed two-partner size/color landing selection; do not collapse both partners into one size.',
  TARGET_GENDER_REVIEW_REQUIRED:'Confirm the intended garment audience in Product Truth/source attributes; do not infer gender from the model or force unisex.',
  CONFIRMED_PHOTOGRAPHED_COLOR_REQUIRED:'Confirm the default photographed color against the owner-reviewed color authority.',
  PRODUCT_IMAGE_REQUIRED:'Select and visually review an existing truthful gallery image.',
  IMAGE_REVIEW_REQUIRED:'Visually review the exact selected gallery URL and record the decision; do not reuse a review for a different image.',
};

export function inputs(){
  return {capture:json(new URL('source_live_readback.json',DIR)),
    facets:json(new URL('source_audience_readback.json',DIR)),qa:json(new URL('image_review.json',DIR)),
    bindings:json(new URL('../../config/approved-content-review-bindings.json',import.meta.url)),
    pilot:pilotRows(readFileSync(new URL('../../docs/merchant/pilot-us-20261103/source_live_readback.tsv',import.meta.url),'utf8'))};
}

export function assertFresh(capture,now=Date.now(),maxAgeMs=86_400_000){
  for(const p of capture.products){
    const age=now-Date.parse(p.observed_at);
    assert.ok(Number.isFinite(age)&&age>=0&&age<=maxAgeMs,'STALE_PUBLIC_READBACK:'+p.canonical_product_id);
  }
}

export function buildCatalog({capture,facets,qa,bindings,pilot}){
  const pins=bindings.entries.filter(p=>p.canonical_product_id!==OMITTED);
  assert.equal(pins.length,207);assert.equal(capture.products.length,207);
  assert.equal(capture.source_manifest_sha256,sha(JSON.stringify(bindings)));
  const pinsById=new Map(pins.map(p=>[p.canonical_product_id,p]));
  const sortedIds=a=>a.map(p=>p.canonical_product_id).sort();
  assert.deepEqual(sortedIds(capture.products),sortedIds(pins),'capture must cover the exact frozen207 corpus');
  assert.deepEqual(sortedIds(facets.products),sortedIds(pins),'audience snapshot must cover207');
  assert.deepEqual(sortedIds(qa.products),sortedIds(pins),'image decisions must cover207');
  assert.equal(new Set(sortedIds(capture.products)).size,207,'duplicate product');
  assert.equal(facets.snapshot_code,'feya-n7-20260928-v3');
  const facetById=new Map(facets.products.map(p=>[p.canonical_product_id,p]));
  const qaById=new Map(qa.products.map(p=>[p.canonical_product_id,p]));
  const pilotByGroup=new Map();
  for(const row of pilot){const group=pilotByGroup.get(row.item_group_id)||[];group.push(row);pilotByGroup.set(row.item_group_id,group);}
  assert.equal(pilot.length,84);assert.equal(pilotByGroup.size,12);
  const rows=[],manifest=[];
  for(const p of [...capture.products].sort((a,b)=>a.slug.localeCompare(b.slug))){
    const pin=pinsById.get(p.canonical_product_id);
    assert.equal(p.approved_content_sha256,pin.content_sha256,'approved content binding changed');
    assert.equal(p.url,'https://thefeya.com'+pin.url_path);
    assert.equal(p.canonical,p.url);assert.match(p.robots,/(?:^|,\s*)index(?:,|$)/);
    assert.doesNotMatch(p.robots,/noindex|nofollow/);
    assert.ok(p.title.length>0&&p.title.length<=150);
    assert.ok(p.description.length>0&&p.description.length<=5000);
    const f=facetById.get(p.canonical_product_id),image=qaById.get(p.canonical_product_id);
    const audience=f.audience_values_json;
    const facetGender=audience.includes('women')&&!audience.includes('men')?'female'
      :audience.includes('men')&&!audience.includes('women')?'male':null;
    assert.ok(!facetGender||!p.gender||facetGender===p.gender,'audience contradicts approved text');
    const gender=facetGender||p.gender;
    const reasons=new Set(p.candidate_reasons.filter(r=>r!=='TARGET_GENDER_REVIEW_REQUIRED'));
    if(!gender)reasons.add('TARGET_GENDER_REVIEW_REQUIRED');
    if(image.decision!=='PASS'||!p.images.includes(image.image_url))reasons.add('IMAGE_REVIEW_REQUIRED');
    assert.match(image.reviewed_derivative_sha256,/^[a-f0-9]{64}$/);
    const conf=p.selected_configuration;
    if(!conf||p.offer?.['@type']!=='Offer')reasons.add('EXACT_SELECTED_OFFER_REQUIRED');
    if(conf&&!reasons.has('INDEPENDENT_PARTNER_SELECTION_REQUIRED')){
      assert.match(conf.id,/^[a-f0-9-]{36}$/);assert.equal(conf.full_set,true);
      assert.equal(p.offer.sku,conf.id);assert.equal(p.offer.priceCurrency,'EUR');
      assert.equal(p.offer.availability,'https://schema.org/InStock');
      assert.ok(Number.isSafeInteger(conf.unit_minor)&&conf.unit_minor>0);
      assert.equal(Math.round(Number(p.offer.price)*100),conf.unit_minor);
      assert.deepEqual(p.size_quotes.map(q=>q.size),SIZES,'all standard sizes must be priced');
      for(const q of p.size_quotes){assert.equal(q.unit_minor,conf.unit_minor);assert.equal(q.line_minor,conf.unit_minor);}
    }
    const holds=[...reasons].sort();
    const entry={canonical_product_id:p.canonical_product_id,etsy_tail:p.etsy_tail,title:p.title,url:p.url,
      status:holds.length?'HOLD':'READY',offer_count:holds.length?0:SIZES.length,
      configuration_id:conf?.id||null,price_eur:conf?(conf.unit_minor/100).toFixed(2):null,
      photographed_color:p.color,gender,gender_evidence:facetGender?'storefront_facet_snapshot':'approved_copy',
      image_url:image.image_url,reasons:holds,remedies:holds.map(r=>REMEDIES[r]||'Resolve source/checkout parity: '+r)};
    manifest.push(entry);
    if(holds.length)continue;
    const prior=pilotByGroup.get(conf.id);
    if(prior){
      // Preserve all 84 accepted offer identities and values. Only title/description
      // transport changes to Google's structured fields for the AI-assisted copy.
      for(const old of prior){
        assert.equal(old.title,p.title);assert.equal(old.description,p.description);
        assert.equal(old.price,entry.price_eur+' EUR');assert.equal(old.gender,gender);
        assert.equal(old.color,p.color);assert.equal(old.image_link,image.image_url);
        assert.equal(new URL(old.link).pathname,new URL(p.url).pathname);
        assert.equal(old.id,conf.id+'-'+old.size);rows.push({...old});
      }
      continue;
    }
    for(const size of SIZES){
      rows.push({id:conf.id+'-'+size,item_group_id:conf.id,title:p.title,description:p.description,
        link:p.url+'?utm_source=google&utm_medium=organic_shopping&utm_campaign=mc_us_free_listings_catalog',
        image_link:image.image_url,additional_image_link:'',availability:'in_stock',price:entry.price_eur+' EUR',
        condition:'new',brand:'TheFEYA',identifier_exists:'no',
        google_product_category:'Apparel & Accessories > Costumes & Accessories > Costumes',
        product_type:'Costumes > Full Set',color:p.color.replace(/\s*\+\s*/g,'/'),size,size_system:'US',gender,
        age_group:'adult',custom_label_0:'us_catalog_20261105'});
    }
  }
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'duplicate offer IDs');
  const byId=new Map(rows.map(r=>[r.id,r]));
  for(const old of pilot)assert.deepEqual(byId.get(old.id),old,'approved pilot row removed or changed');
  for(const row of rows){assert.ok(row.id.length<=50);assert.ok(row.color.split('/').length<=3);}
  const report={version:'thefeya_merchant_catalog_manifest_v1',captured_at:capture.captured_at,
    source_git_sha:capture.source_git_sha,deployment_id:capture.deployment_id,
    reviewed_at:qa.reviewed_at,channel:'FREE_LISTINGS',country:'US',currency:'EUR',
    totals:{products:207,ready:manifest.filter(p=>p.status==='READY').length,
      hold:manifest.filter(p=>p.status==='HOLD').length,offers:rows.length,preserved_pilot_offers:84},
    products:manifest};
  return {rows,report};
}

export const xmlEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function toXml(rows){
  const field=(name,value)=>'      <g:'+name+'>'+xmlEscape(value)+'</g:'+name+'>\n';
  let out='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>TheFEYA US free listings catalogue</title>\n    <link>https://thefeya.com</link>\n    <description>Owner-approved catalogue; photographed color and standard sizes.</description>\n';
  for(const row of rows){
    out+='    <item>\n';
    for(const key of ['id','item_group_id'])out+=field(key,row[key]);
    for(const key of ['title','description'])out+='      <g:structured_'+key+'>\n        <g:digital_source_type>trained_algorithmic_media</g:digital_source_type>\n        <g:content>'+xmlEscape(row[key])+'</g:content>\n      </g:structured_'+key+'>\n';
    for(const [key,value] of Object.entries(row)){
      if(['id','item_group_id','title','description','additional_image_link'].includes(key)||!value)continue;
      out+=field(key,value);
    }
    for(const url of row.additional_image_link.split(',').filter(Boolean))out+=field('additional_image_link',url);
    // The active account source currently targets FREE_LISTINGS only; also keep
    // an explicit destination exclusion if someone later links an Ads account.
    out+=field('excluded_destination','Shopping_ads');
    out+='    </item>\n';
  }
  return out+'  </channel>\n</rss>\n';
}

export function buildFiles(data){
  const {rows,report}=buildCatalog(data);
  const columns=['canonical_product_id','etsy_tail','status','offer_count','configuration_id','price_eur','photographed_color','gender','title','url','reasons','remedies'];
  const cell=v=>{const s=Array.isArray(v)?v.join(' | '):String(v??'');assert.doesNotMatch(s,/[\t\r\n]/);return s;};
  return {report,files:{'thefeya_us_free_listings_catalog_20261105.xml':toXml(rows),
    'readiness_manifest.json':JSON.stringify(report,null,2)+'\n',
    'readiness_manifest.tsv':[columns.join('\t'),...report.products.map(p=>columns.map(c=>cell(p[c])).join('\t'))].join('\n')+'\n'}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const data=inputs();if(process.argv.includes('--publish-preflight'))assertFresh(data.capture);
  const {report,files}=buildFiles(data);
  for(const [name,content] of Object.entries(files)){
    const path=new URL(name,DIR);
    if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),content,name+' must be regenerated');
    else writeFileSync(path,content);
  }
  console.log(JSON.stringify(report.totals));
}
