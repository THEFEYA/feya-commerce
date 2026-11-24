import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputs,buildCatalog,buildFiles,toXml,toMerchantTsv,assertFresh,POLICY_GENDER_CASES,UNSPECIFIED_GENDER_POLICY} from '../../scripts/merchant/build-catalog-feed.mjs';
import {extractFlightProduct,inspectPublicPage} from '../../scripts/merchant/capture-catalog.mjs';
import {EXACT_COLOR_PRICE_PRODUCTS} from '../../lib/bonanzaColorPriceExceptions.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {applyPublishedProductPrices,publishedPriceContractVersion,publishedRegularEurMinor} from '../../lib/storefrontPublishedPrices.ts';
import {applyOwnerReviewedStorefrontCorrections} from '../../lib/storefrontOwnerReviewedCorrections.ts';
import {restoreSourceProvenPurchaseOptions} from '../../lib/storefrontSourceOptionLabels.ts';
import {projectReviewedBonanzaColors} from '../../lib/bonanzaReviewedColorProjection.ts';
import {resolvePdpLandingSelection} from '../../lib/pdpLandingSelection.ts';
import {colorChoiceLabel} from '../../lib/bonanzaColorChoices.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';

const priceFixtures=[1,2].flatMap(part=>JSON.parse(readFileSync(new URL('../fixtures/approved-product-selectors-20261026-part'+part+'.json',import.meta.url))).products);
function capturedProduct(capture){
  const source=priceFixtures.find(p=>p.canonical_product_id===capture.canonical_product_id);
  const product={...source,primary_image_url:capture.primary_image_url,
    media_gallery:capture.images.map((url,position)=>({url,position,media_type:'image'}))};
  return applyPublishedProductPrices(projectReviewedBonanzaColors(restoreSourceProvenPurchaseOptions(applyOwnerReviewedStorefrontCorrections(product)),'detail'));
}

test('full gallery evidence preserves the seventh-frame Both Shoulders photo without selecting or publishing a variant',()=>{
  const review=JSON.parse(readFileSync(new URL('../../docs/merchant/variant-landings-20261106/gallery_review.json',import.meta.url),'utf8'));
  const g=review.products.find(p=>p.etsy_tail==='4348580005');
  const fixtures=JSON.parse(readFileSync(new URL('../fixtures/merchant-landing-products-20261106.json',import.meta.url),'utf8'));
  const source=fixtures.products.find(p=>p.etsy_tail===g.etsy_tail).product;
  const p={...source,card_title:g.title,h1:g.title,
    media_gallery:g.media.map(m=>({url:m.url,position:m.position,media_type:'image'}))};
  const flight='1:'+JSON.stringify({product:p})+'\n';
  const ld={'@type':'Product',sku:g.canonical_product_id,name:g.title,description:'Observed gallery capture regression.',offers:pdpOfferJsonLd(p,g.base_url)};
  const html='<link rel="canonical" href="'+g.base_url+'"><meta name="robots" content="index, follow">'
    +'<script type="application/ld+json">'+JSON.stringify(ld)+'</script>'
    +'<script>self.__next_f.push('+JSON.stringify([1,flight])+')</script><!--'+review.deployment_id+'-->';
  const capture=inspectPublicPage(html,g.base_url,{canonical_product_id:g.canonical_product_id,content_sha256:g.approved_content_sha256},review.deployment_id);
  assert.equal(g.media_count,8);
  assert.equal(g.media[6].classification,'TWO_SHOULDERS');
  assert.deepEqual(capture.images,g.media.map(m=>m.url));
  assert.ok(capture.images.includes(g.media[6].url),'an existing two-shoulder image after frame6 must remain reviewable');
  assert.equal(capture.selected_configuration,null);
  assert.equal(capture.offer['@type'],'AggregateOffer');
  assert.ok(capture.candidate_reasons.includes('EXACT_SELECTED_OFFER_REQUIRED'));
});

test('whole frozen207 corpus has explicit readiness and all84 accepted IDs survive',()=>{
  const data=inputs(),{rows,report}=buildCatalog(data);
  assert.deepEqual(report.totals,{products:207,ready:207,hold:0,offers:1575,preserved_pilot_offers:84});
  const actual=new Map(rows.map(r=>[r.id,r]));
  for(const prior of data.pilot)assert.deepEqual(actual.get(prior.id),prior);
  for(const p of report.products){
    assert.equal(p.offer_count,p.status==='READY'?(p.size_combinations||7):0);
    assert.equal(p.remedies.length,p.reasons.length);
    if(p.status==='HOLD')assert.ok(p.reasons.length);
  }
});

test('committed XML and207-row manifests reproduce byte-for-byte without network',()=>{
  const {files}=buildFiles(inputs());
  for(const [name,value] of Object.entries(files))assert.equal(readFileSync(new URL('../../docs/merchant/catalog-us-20261105/'+name,import.meta.url),'utf8'),value);
});

test('reviewed clothing accessories keep their own categories across sizes', () => {
  const {files} = buildFiles(inputs());
  const tsv = files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [columns, ...rows] = tsv.trimEnd().split('\n').map(line => line.split('\t'));
  const groupIndex = columns.indexOf('item_group_id');
  const categoryIndex = columns.indexOf('google_product_category');
  const typeIndex = columns.indexOf('product_type');
  const accessories = 'Apparel & Accessories > Clothing Accessories';
  const costumes = 'Apparel & Accessories > Costumes & Accessories > Costumes';
  const cases = [
    ['66058dbc-f8ed-4189-ba0e-464204df96df', accessories + ' > Suspenders', 'Clothing Accessories > Suspenders'],
    ['9cf4b355-2c03-4c05-b5ba-2ca8c49ab572', accessories + ' > Suspenders', 'Clothing Accessories > Suspenders'],
    ['4b56be10-1771-4a5c-9daa-6ae70e8650f0', accessories, 'Clothing Accessories > Chest Harnesses'],
    ['0f849f66-1594-4689-b86c-fb4e6aca62c3', costumes, 'Costumes > Full Set'],
    ['dc3b0fea-fc8e-4154-852e-dbdbcc3f6fbf', costumes, 'Costumes > Harness'],
  ];
  for (const [group, category, type] of cases) {
    const matching = rows.filter(row => row[groupIndex] === group);
    assert.equal(matching.length, 7);
    for (const row of matching) {
      assert.equal(row[categoryIndex], category);
      assert.equal(row[typeIndex], type);
    }
  }
});

test('live feeds publish the regular Silver Full Set price for the seven reviewed sizes',()=>{
  const data=inputs();
  const {rows}=buildCatalog(data);
  const {files}=buildFiles(data);
  const configuration='41e7d07b-761b-4edb-bdc3-ed4258c1aa4a';
  const baseline=rows.filter(row=>row.item_group_id===configuration);
  assert.equal(baseline.length,7);
  assert.ok(baseline.every(row=>row.price==='183.44 EUR'));
  const tsv=files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [header,...lines]=tsv.trimEnd().split('\n').map(line=>line.split('\t'));
  const prices=new Map(lines.map(cells=>[cells[header.indexOf('id')],cells[header.indexOf('price')]]));
  const xml=files['thefeya_us_free_listings_catalog_20261105.xml'].split('<item>');
  for(const row of baseline){
    assert.equal(prices.get(row.id),'409.46 EUR');
    const item=xml.find(block=>block.includes('<g:id>'+row.id+'</g:id>'));
    assert.ok(item?.includes('<g:price>409.46 EUR</g:price>'));
  }
});

test('every submitted offer keeps US service inheritance and carries both quoted Hong Kong services',()=>{
  const {report,files}=buildFiles(inputs());
  const days=JSON.parse(readFileSync(new URL('../../docs/merchant/catalog-us-20261105/production-business-days-20261123.json',import.meta.url)));
  const byGroup=new Map(report.products.map(p=>[p.configuration_id,days[p.canonical_product_id]]));
  const tsv=files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [columns,...lines]=tsv.trimEnd().split('\n').map(line=>line.split('\t'));
  const xmlItems=files['thefeya_us_free_listings_catalog_20261105.xml'].split('<item>').slice(1);
  assert.equal(lines.length,1577);
  assert.equal(xmlItems.length,lines.length);
  let originalOffers=0;
  for(const [index,cells] of lines.entries()){
    const xml=xmlItems[index];
    for(const key of ['shipping_handling_business_days','shipping_transit_business_days']){
      assert.equal(cells[columns.indexOf(key)],'M-F');
      assert.ok(xml.includes('<g:'+key+'>M-F</g:'+key+'>'));
    }
    const group=cells[columns.indexOf('item_group_id')];
    if(!byGroup.has(group))continue;
    originalOffers++;
    const [low,high]=byGroup.get(group);
    const header='shipping(country:service:price:min_handling_time:max_handling_time:min_transit_time:max_transit_time)';
    const countries=group==='f17cad18-1bc9-4d89-9163-d11239fb7fc0'?['HK','SG']:['HK'];
    const expected=['US::::::',...countries.flatMap(country=>[
      country+':Standard:19.00 EUR:'+low+':'+high+':10:14',
      country+':Express:35.00 EUR:'+low+':'+high+':6:9',
    ])];
    assert.equal(cells[columns.indexOf(header)],expected.join(','));
    const services=[...xml.matchAll(/<g:shipping>([\s\S]*?)<\/g:shipping>/g)].map(match=>match[1].trim());
    assert.equal(services.length,expected.length);
    assert.equal(services[0],'<g:country>US</g:country>');
    for(const [i,country] of countries.entries()){
      for(const offset of [1,2])assert.ok(services[2*i+offset].includes('<g:country>'+country+'</g:country>'));
    }
    for(const [offset,method,price] of [[1,'Standard','19.00'],[2,'Express','35.00']]){
      assert.ok(services[offset].includes('<g:service>'+method+'</g:service>'));
      assert.ok(services[offset].includes('<g:price>'+price+' EUR</g:price>'));
      assert.ok(services[offset].includes('<g:min_handling_time>'+low+'</g:min_handling_time>'));
      assert.ok(services[offset].includes('<g:max_handling_time>'+high+'</g:max_handling_time>'));
    }
    assert.equal(cells[columns.indexOf('excluded_destination')],'Shopping_ads');
  }
  assert.equal(originalOffers,1575);
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
  assert.equal(rows.length,1568);
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
  const selectedGroups=new Set(d.capture.products.filter(p=>p.selected_landing).map(p=>p.selected_configuration.id));
  const newGroups=new Set([...POLICY_GENDER_CASES.values()].map(c=>c.configuration));
  const prior203=rows.filter(r=>!newGroups.has(r.item_group_id));
  assert.equal(prior203.length,1421);
  assert.equal(createHash('sha256').update(toMerchantTsv(prior203)).digest('hex'),'c425b50c9cb3b1941e6d4527b30e6ded0083df31b5d68f31f4c7210794e09495');
  const prior196=rows.filter(r=>!selectedGroups.has(r.item_group_id));
  assert.equal(prior196.length,1372);
  assert.equal(createHash('sha256').update(toMerchantTsv(prior196)).digest('hex'),'3a600dcbf248328f17f3f2ac1838a554e4334c706355232f02fde793b7b6c3d5');
  const originalTsv=toMerchantTsv(prior196.filter(r=>!addedGroups.has(r.item_group_id)&&!colorGroups.has(r.item_group_id)));
  // Preserve every previously published row, not only the first84 pilot IDs.
  assert.equal(createHash('sha256').update(originalTsv).digest('hex'),'e4d8ce334f7c6a2fb1e8562948f1765b7ddd3a88b79c3fd5d6958634dfb3705c');
  const original193=toMerchantTsv(prior196.filter(r=>!colorGroups.has(r.item_group_id)));
  assert.equal(createHash('sha256').update(original193).digest('hex'),'81f5a14a3f56d5f71efbf875fe6a98f36a4cea809aa41ee71d986367960e70f3');
  d.confirmations.products=[];
  const fallback=buildCatalog(d);
  assert.equal(fallback.rows.length,1561);assert.equal(fallback.report.totals.hold,2);
  assert.equal(report.products.find(p=>p.etsy_tail==='1780729637').status,'READY');
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

test('selected feed rows preserve exact size/configuration/photo and source audience; invalid proof fails closed',()=>{
  const d=inputs(),{rows}=buildCatalog(d);
  const selected=d.capture.products.filter(p=>p.selected_landing);
  assert.equal(selected.length,11);
  for(const p of selected){
    const group=rows.filter(r=>r.item_group_id===p.selected_configuration.id);
    const paired=Boolean(p.selected_landing.selection.womenColorCode);
    assert.equal(group.length,paired?49:7);
    for(const r of group){
      const url=new URL(r.link);
      if(paired){
        const [w,m]=r.size.split('/');
        assert.equal(url.searchParams.get('size'),null);
        assert.equal(url.searchParams.get('women_size'),w);assert.equal(url.searchParams.get('men_size'),m);
        assert.equal(url.searchParams.get('women_color'),p.selected_landing.selection.womenColorCode);
        assert.equal(url.searchParams.get('men_color'),p.selected_landing.selection.menColorCode);
        assert.equal(r.id,p.selected_configuration.id+'-W'+w+'-M'+m);
        assert.ok(r.title.endsWith('Women '+w+' / Men '+m));
      }else{
        assert.equal(url.searchParams.get('size'),r.size);
        assert.equal(url.searchParams.get('color'),p.color_code);
        assert.ok(r.title.endsWith(p.selected_configuration.label));
      }
      assert.equal(url.searchParams.get('configuration'),p.selected_configuration.id);
      assert.equal(r.image_link,p.selected_landing.image_url);
      assert.ok(r.description.startsWith('Selected configuration: '+p.selected_configuration.label+'.'));
      assert.equal(r.price,(p.selected_configuration.unit_minor/100).toFixed(2)+' EUR');
    }
  }
  for(const mutate of [
    p=>{p.selected_landing.selection.configurationId='00000000-0000-0000-0000-000000000000';},
    p=>{p.selected_landing.displayed_image='https://example.invalid/other.jpg';},
    p=>{p.selected_landing.selection.size='Custom';},
    p=>{p.selected_landing.selection.womenSize='S';},
    p=>{p.selected_landing.source_label='Other';},
    p=>{p.selected_configuration.component_code='harness';},
    p=>{p.offer.url=p.url;},
  ]){
    const x=inputs();mutate(x.capture.products.find(p=>p.selected_landing));
    assert.throws(()=>buildCatalog(x));
  }
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

test('Google unspecified-gender mapping is narrow, does not override source audience, and pairs retain all49 independent sizes',()=>{
  const d=inputs(),built=buildCatalog(d);
  for(const [tail,c] of POLICY_GENDER_CASES){
    const entry=built.report.products.find(p=>p.etsy_tail===tail);
    assert.equal(entry.gender,'unisex');assert.equal(entry.gender_evidence,'google_unspecified_gender_mapping:'+UNSPECIFIED_GENDER_POLICY);
    assert.equal(entry.offer_count,c.paired?49:7);
  }
  for(const change of [
    p=>{p.selected_landing.source_pair_confirmed=false;},
    p=>{p.selected_landing.selection.size='M';},
    p=>{p.selected_landing.selection.menSize=null;},
    p=>{p.selected_landing.selection.menColorCode=p.selected_landing.selection.womenColorCode;},
    p=>{p.size_quotes.pop();},
    p=>{p.size_quotes[0].men_size='M';},
  ]){const x=inputs();change(x.capture.products.find(p=>p.etsy_tail==='4488185754'));assert.throws(()=>buildCatalog(x));}
  const explicit=inputs(),witch=explicit.capture.products.find(p=>p.etsy_tail==='1780729637');
  explicit.facets.products.find(p=>p.canonical_product_id===witch.canonical_product_id).audience_values_json=['women'];
  assert.equal(buildCatalog(explicit).report.products.find(p=>p.etsy_tail==='1780729637').gender,'female');
  const absent=inputs(),p=absent.capture.products.find(p=>p.etsy_tail==='1780729637');delete p.selected_landing;
  assert.equal(buildCatalog(absent).report.products.find(p=>p.etsy_tail==='1780729637').status,'HOLD');
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

test('only the partially observed corset gains size-specific links with the correct price in both feeds',()=>{
  const data=inputs();
  const {rows}=buildCatalog(data);
  const {files}=buildFiles(data);
  const tsv=files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [header,...lines]=tsv.trimEnd().split('\n').map(line=>line.split('\t'));
  const ids=header.indexOf('id'),links=header.indexOf('link'),prices=header.indexOf('price');
  const current=new Map(lines.map(cells=>[cells[ids],cells]));
  const xml=files['thefeya_us_free_listings_catalog_20261105.xml'].split('<item>');
  const selected='bc5d078e-6a54-4270-9f17-52c0b55a3dd8';
  let changes=0;
  for(const row of rows){
    const cells=current.get(row.id);
    assert.ok(cells);
    if(row.item_group_id!==selected){
      assert.equal(cells[links],row.link);continue;
    }
    const link=new URL(cells[links]),prior=new URL(row.link);
    assert.equal(link.origin+link.pathname,prior.origin+prior.pathname);
    assert.equal(link.searchParams.get('configuration'),selected);
    assert.equal(link.searchParams.get('size'),row.size);
    for(const [key,value] of prior.searchParams)assert.equal(link.searchParams.get(key),value);
    const price=['XXL','XXXL'].includes(row.size)?'183.44 EUR':'230.21 EUR';
    assert.equal(cells[prices],price);
    const item=xml.find(block=>block.includes('<g:id>'+row.id+'</g:id>'));
    assert.ok(item?.includes('<g:price>'+price+'</g:price>'));
    assert.ok(item?.includes('<g:link>'+link.href.replaceAll('&','&amp;')+'</g:link>'));
    changes++;
  }
  assert.equal(changes,7);
});

test('a fresh capture validates each size against its own published amount and keeps accepted pilot identities',()=>{
  const d=inputs();
  const corset=d.capture.products.find(p=>p.etsy_tail==='4373546738');
  const silver=d.capture.products.find(p=>p.etsy_tail==='1883724741');
  for(const product of [corset,silver]){
    const config=product.selected_configuration;
    config.price_contract_version=publishedPriceContractVersion;
    config.unit_minor=publishedRegularEurMinor(product.canonical_product_id,config.id,'M');
    product.offer.price=(config.unit_minor/100).toFixed(2);
    for(const row of product.size_quotes){
      row.unit_minor=publishedRegularEurMinor(product.canonical_product_id,config.id,row.size);
      row.line_minor=row.unit_minor;
    }
  }
  const {rows}=buildCatalog(d);
  const matching=(config,size)=>rows.find(row=>row.item_group_id===config.id&&row.size===size);
  assert.equal(matching(corset.selected_configuration,'XXL').price,'183.44 EUR');
  assert.equal(matching(corset.selected_configuration,'M').price,'230.21 EUR');
  assert.equal(matching(silver.selected_configuration,'M').price,'409.46 EUR');
  const large=corset.size_quotes.find(row=>row.size==='XXL');
  large.unit_minor=23021;large.line_minor=23021;
  assert.throws(()=>buildCatalog(d),/quoted size price/);
  corset.selected_configuration.price_contract_version='older-catalog';
  assert.throws(()=>buildCatalog(d),/capture price release/);
});

test('public recapture accepts the reviewed default photograph and verifies both prices on a size-only landing',()=>{
  const listing=inputs().capture.products.find(p=>p.etsy_tail==='4373546738');
  const product=capturedProduct(listing);
  const configuration=listing.selected_configuration.id;
  const link=listing.url+'?configuration='+configuration+'&size=XXL';
  const selection=resolvePdpLandingSelection(product,{configuration,size:'XXL'}).selection;
  const offers=pdpOfferJsonLd(product,listing.url,selection);
  const ld={'@type':'Product',sku:product.canonical_product_id,name:listing.title,description:listing.description,image:listing.images,offers};
  const flight='1:'+JSON.stringify({product})+'\n';
  const html='<link rel="canonical" href="'+listing.url+'"><meta name="robots" content="index, follow">'
    +'<script type="application/ld+json">'+JSON.stringify(ld)+'</script>'
    +'<img fetchPriority="high" src="'+listing.images[0]+'"><script>self.__next_f.push('+JSON.stringify([1,flight])+')</script><!--local-price-test-->';
  const result=inspectPublicPage(html,listing.url,{canonical_product_id:product.canonical_product_id},'local-price-test',link);
  assert.equal(result.selected_size_landing.size,'XXL');
  assert.equal(result.selected_size_landing.image_url,listing.images[0]);
  assert.equal(result.selected_configuration.unit_minor,18344);
  assert.equal(result.size_quotes.find(row=>row.size==='M').unit_minor,23021);
  assert.equal(result.size_quotes.find(row=>row.size==='XXL').unit_minor,18344);
  assert.ok(!result.candidate_reasons.some(reason=>reason.startsWith('CHECKOUT_PARITY_REQUIRED')));
  assert.throws(()=>inspectPublicPage(html.replace('src="'+listing.images[0]+'"','src="https://example.invalid/wrong.jpg"'),listing.url,
    {canonical_product_id:product.canonical_product_id},'local-price-test',link),/displayed main image/);
});

test('all Merchant URLs select the advertised SKU and charge the exact advertised size price',()=>{
  const data=inputs();
  const {report,files}=buildFiles(data);
  const byConfig=new Map(report.products.map(p=>[p.configuration_id,p.canonical_product_id]));
  const extra=JSON.parse(readFileSync(new URL('../../docs/merchant/catalog-us-20261105/international-offers-20261123.json',import.meta.url)));
  for(const entry of extra)byConfig.set(entry.configurationId,entry.productId);
  const pages=new Map(data.capture.products.map(c=>[c.canonical_product_id,capturedProduct(c)]));
  const tsv=files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [header,...rows]=tsv.trimEnd().split('\n').map(line=>line.split('\t'));
  assert.equal(rows.length,1577);
  for(const cells of rows){
    const row=Object.fromEntries(header.map((key,i)=>[key,cells[i]]));
    const product=pages.get(byConfig.get(row.item_group_id)),url=new URL(row.link);
    const landing=resolvePdpLandingSelection(product,Object.fromEntries(url.searchParams));
    assert.notEqual(landing.status,'invalid',row.id);
    const selection=landing.selection,offer=pdpOfferJsonLd(product,url.origin+url.pathname,selection);
    assert.equal(offer?.sku,row.item_group_id,row.id);
    assert.equal(offer.price+' '+offer.priceCurrency,row.price,row.id);
    const pair=selection?.womenSize?{
      women:{size:selection.womenSize,color:selection.womenColorCode},men:{size:selection.menSize,color:selection.menColorCode},
    }:null;
    const color=pair?.women.color||selection?.colorCode||product.default_color_choice;
    const unit=Math.round(Number(offer.price)*100);
    const quote=priceCartLine(product,{id:product.canonical_product_id+'-'+row.id,slug:product.product_slug,
      configuration_id:row.item_group_id,size:pair?.women.size||row.size,color:colorChoiceLabel(color),color_code:color,
      quantity:1,wearer:null,made_to_measure:false,paired_selection:pair,client_unit_minor:unit});
    assert.equal(quote.price_changed,false,row.id);assert.equal(quote.unit_minor,unit,row.id);
  }
});

test('international single items carry their own photo, effective price and checkout delivery to the reviewed destinations',()=>{
  const {files}=buildFiles(inputs());
  const tsv=files['../pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv'];
  const [header,...lines]=tsv.trimEnd().split('\n').map(line=>line.split('\t'));
  const rows=lines.map(cells=>Object.fromEntries(header.map((k,i)=>[k,cells[i]])));
  const extra=JSON.parse(readFileSync(new URL('../../docs/merchant/catalog-us-20261105/international-offers-20261123.json',import.meta.url)));
  for(const entry of extra){
    const row=rows.find(r=>r.item_group_id===entry.configurationId);
    assert.equal(row.id,entry.configurationId+'-M');
    assert.equal(row.price,entry.countries.includes('AU')?'700.64 EUR':'370.34 EUR');
    assert.equal(row.image_link,entry.imageUrl);
    assert.equal(row.excluded_destination,'Shopping_ads');
    assert.match(row.structured_description,/only/);
    const services=row[header.find(k=>k.startsWith('shipping('))].split(',').map(s=>s.split(':'));
    assert.deepEqual(services.map(s=>s[0]),entry.countries.flatMap(c=>[c,c]));
    for(const [c,method,price,, ,min,max] of services){
      const standard=method==='Standard';
      assert.equal(price,(c==='AU'?(standard?'39.00':'55.00'):(standard?'19.00':'35.00'))+' EUR');
      assert.deepEqual([min,max],standard?['10','14']:['6','9']);
    }
    const xml=files['thefeya_us_free_listings_catalog_20261105.xml'].split('<item>').find(s=>s.includes('<g:id>'+row.id+'</g:id>'));
    assert.equal((xml.match(/<g:shipping>/g)||[]).length,services.length);
    assert.ok(xml.includes('<g:image_link>'+entry.imageUrl+'</g:image_link>'));
  }
});
