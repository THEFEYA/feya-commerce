import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inputs,buildCatalog,buildFiles,toXml,assertFresh} from '../../scripts/merchant/build-catalog-feed.mjs';
import {extractFlightProduct} from '../../scripts/merchant/capture-catalog.mjs';

test('whole frozen207 corpus has explicit readiness and all84 accepted IDs survive',()=>{
  const data=inputs(),{rows,report}=buildCatalog(data);
  assert.deepEqual(report.totals,{products:207,ready:191,hold:16,offers:1337,preserved_pilot_offers:84});
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
  assert.equal(rows.length,1330);
  for(const p of d.capture.products.filter(p=>p.offer['@type']==='AggregateOffer')){
    assert.equal(report.products.find(r=>r.canonical_product_id===p.canonical_product_id).status,'HOLD');
  }
});

test('audience contradicting approved text is rejected; model appearance is unused',()=>{
  const d=inputs(),p=d.capture.products.find(p=>p.gender==='male');
  d.facets.products.find(f=>f.canonical_product_id===p.canonical_product_id).audience_values_json=['women'];
  assert.throws(()=>buildCatalog(d),/audience contradicts/);
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
