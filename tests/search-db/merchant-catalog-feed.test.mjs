import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputs,buildCatalog,buildFiles,toXml,toMerchantTsv,assertFresh} from '../../scripts/merchant/build-catalog-feed.mjs';
import {extractFlightProduct} from '../../scripts/merchant/capture-catalog.mjs';
import {EXACT_COLOR_PRICE_PRODUCTS} from '../../lib/bonanzaColorPriceExceptions.ts';

test('whole frozen207 corpus has explicit readiness and all84 accepted IDs survive',()=>{
  const data=inputs(),{rows,report}=buildCatalog(data);
  assert.deepEqual(report.totals,{products:207,ready:196,hold:11,offers:1372,preserved_pilot_offers:84});
  const actual=new Map(rows.map(r=>[r.id,r]));
  for(const prior of data.pilot)assert.deepEqual(actual.get(prior.id),prior);
  for(const p of report.products){
    assert.equal(p.offer_count,p.status==='READY'?7:0);
    assert.equal(p.remedies.length,p.reasons.length);
    if(p.status==='HOLD')assert.ok(p.reasons.length);
  }
});

test('committed XML and207-row manifests reproduce byte-for-byte without network',()=>{
  const {files}=buildFiles(inputs());
  for(const [name,value] of Object.entries(files))assert.equal(readFileSync(new URL('../../docs/merchant/catalog-us-20261105/'+name,import.meta.url),'utf8'),value);
});

test('changed checkout price, incomplete sizes, corpus or duplicate identity fail closed',()=>{
  for(const change of [
    d=>{d.capture.products[2].size_quotes[0].unit_minor++;},
    d=>{d.capture.products[2].size_quotes.pop();},
    d=>{d.capture.products.pop();},
    d=>{d.capture.products[2].canonical_product_id=d.capture.products[3].canonical_product_id;},
  ]){const d=inputs();change(d);assert.throws(()=>buildCatalog(d));}
});

test('new unreviewed image and unresolved offer never enter the feed',()=>{
  const d=inputs(),id=d.capture.products[2].canonical_product_id;
  d.qa.products.find(p=>p.canonical_product_id===id).image_url='https://example.invalid/new-unreviewed.jpg';
  const {rows,report}=buildCatalog(d);
  assert.ok(report.products.find(p=>p.canonical_product_id===id).reasons.includes('IMAGE_REVIEW_REQUIRED'));
  assert.equal(rows.length,1365);
  for(const p of d.capture.products.filter(p=>p.offer['@type']==='AggregateOffer')){
    assert.equal(report.products.find(r=>r.canonical_product_id===p.canonical_product_id).status,'HOLD');
  }
});

test('audience contradicting approved text is rejected; model appearance is unused',()=>{
  const d=inputs(),p=d.capture.products.find(p=>p.gender==='male');
  d.facets.products.find(f=>f.canonical_product_id===p.canonical_product_id).audience_values_json=['women'];
  assert.throws(()=>buildCatalog(d),/audience contradicts/);
});

test('explicit original tags resolve only their own products; removing evidence restores the holds',()=>{
  const d=inputs(),{rows,report}=buildCatalog(d);
  for(const c of d.confirmations.products){
    const p=report.products.find(p=>p.canonical_product_id===c.canonical_product_id);
    assert.equal(p.gender,'female');assert.equal(p.status,'READY');
    assert.equal(p.gender_evidence,'source_listing_tag:'+c.confirmed_tag);
  }
  const addedGroups=new Set(report.products.filter(p=>d.confirmations.products.some(c=>c.canonical_product_id===p.canonical_product_id)).map(p=>p.configuration_id));
  const colorGroups=new Set(report.products.filter(p=>EXACT_COLOR_PRICE_PRODUCTS.includes(p.canonical_product_id)).map(p=>p.configuration_id));
  const originalTsv=toMerchantTsv(rows.filter(r=>!addedGroups.has(r.item_group_id)&&!colorGroups.has(r.item_group_id)));
  // Preserve every previously published row, not only the first84 pilot IDs.
  assert.equal(createHash('sha256').update(originalTsv).digest('hex'),'e4d8ce334f7c6a2fb1e8562948f1765b7ddd3a88b79c3fd5d6958634dfb3705c');
  const original193=toMerchantTsv(rows.filter(r=>!colorGroups.has(r.item_group_id)));
  assert.equal(createHash('sha256').update(original193).digest('hex'),'81f5a14a3f56d5f71efbf875fe6a98f36a4cea809aa41ee71d986367960e70f3');
  d.confirmations.products=[];
  const fallback=buildCatalog(d);
  assert.equal(fallback.rows.length,1358);assert.equal(fallback.report.totals.hold,13);
  assert.equal(report.products.find(p=>p.etsy_tail==='1780729637').status,'HOLD');
});

test('only reviewed color-price harnesses can enter without a Full Set and must match the photographed color',()=>{
  const d=inputs(),{rows,report}=buildCatalog(d);
  for(const id of EXACT_COLOR_PRICE_PRODUCTS){
    const p=d.capture.products.find(p=>p.canonical_product_id===id),entry=report.products.find(p=>p.canonical_product_id===id);
    assert.equal(entry.status,'READY');assert.equal(entry.offer_count,7);
    const emitted=rows.filter(r=>r.item_group_id===entry.configuration_id);
    assert.equal(emitted.length,7);
    for(const row of emitted){assert.equal(row.color,p.selected_configuration.configuration_color);assert.equal(row.product_type,'Costumes > Harness');}
  }
  for(const change of [
    x=>{x.capture.products.find(p=>p.selected_configuration?.full_set&&!p.candidate_reasons.length).selected_configuration.full_set=false;},
    x=>{x.capture.products.find(p=>p.canonical_product_id===EXACT_COLOR_PRICE_PRODUCTS[0]).selected_configuration.configuration_color='Black';},
    x=>{x.capture.products.find(p=>p.canonical_product_id===EXACT_COLOR_PRICE_PRODUCTS[0]).selected_configuration.component_code='top';},
  ]){const x=inputs();change(x);assert.throws(()=>buildCatalog(x));}
});

test('misbound, ambiguous, contradictory or incomplete source audience evidence fails closed',()=>{
  for(const change of [
    d=>{d.confirmations.products[0].etsy_tail='1780729637';},
    d=>{d.confirmations.products[0].source_tags=[];},
    d=>{d.confirmations.products[0].confirmed_tag='Showgirl';d.confirmations.products[0].source_tags.push('Showgirl');},
    d=>{d.confirmations.products[0].gender='male';},
    d=>{d.confirmations.products[0].source_hash='unverified';},
    d=>{d.confirmations.products.push(d.confirmations.products[0]);},
    d=>{d.facets.products.find(p=>p.canonical_product_id===d.confirmations.products[0].canonical_product_id).audience_values_json=['men'];},
  ]){const d=inputs();change(d);assert.throws(()=>buildCatalog(d));}
});

test('stale readbacks cannot be published while deterministic historical checks remain valid',()=>{
  const d=inputs(),now=Date.parse(d.capture.captured_at)+1000;
  assert.doesNotThrow(()=>assertFresh(d.capture,now));
  assert.throws(()=>assertFresh(d.capture,now+86_400_000),/STALE_PUBLIC_READBACK/);
  assert.doesNotThrow(()=>buildCatalog(d));
});

test('XML escapes product text and links and declares AI-assisted copy and Ads exclusions',()=>{
  const {rows}=buildCatalog(inputs()),row={...rows[0],title:'A&B <C> "D"',description:"X's > Y"};
  const xml=toXml([row]);
  assert.match(xml,/A&amp;B &lt;C&gt; &quot;D&quot;/);
  assert.match(xml,/X&apos;s &gt; Y/);
  assert.equal((xml.match(/trained_algorithmic_media/g)||[]).length,2);
  assert.match(xml,/<g:structured_title>/);assert.match(xml,/<g:structured_description>/);
  assert.match(xml,/<g:excluded_destination>Shopping_ads<\/g:excluded_destination>/);
  assert.doesNotMatch(xml,/<g:adult>|<g:gtin>|<g:mpn>|<g:shipping>/);
});

test('public payload extraction parses JSON without evaluating scripts',()=>{
  const p={canonical_product_id:'test',configurations:[],description:'braces } { and escaped "quotes"'};
  const data='1:'+JSON.stringify({product:p})+'\n';
  const html='<script>throw new Error("must never execute")</script><script>self.__next_f.push('+JSON.stringify([1,data])+')</script>';
  assert.deepEqual(extractFlightProduct(html),p);
});

test('configured TSV source keeps IDs and uses correctly escaped structured copy fields',()=>{
  const {rows}=buildCatalog(inputs());
  const text=toMerchantTsv([{...rows[0],title:'12" panel: Gold',description:'A "quoted" word: and detail'}]);
  const [head,line]=text.trim().split('\n'),columns=head.split('\t'),r=Object.fromEntries(line.split('\t').map((s,i)=>[columns[i],s]));
  assert.equal(r.id,rows[0].id);assert.equal(r.price,rows[0].price);
  assert.equal(r.structured_title,'trained_algorithmic_media:"12"" panel: Gold"');
  assert.equal(r.structured_description,'trained_algorithmic_media:"A ""quoted"" word: and detail"');
  assert.equal(r.excluded_destination,'Shopping_ads');
  assert.ok(!columns.includes('title')&&!columns.includes('description'));
});
