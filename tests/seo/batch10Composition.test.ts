import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { applyOwnerReviewedStorefrontCorrections as correct } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer as offer, sellableOfferIncludedLabels } from '../../lib/storefrontSellableOffer.ts';
import { recommendCatalogKeywords } from '../../lib/seoCatalogKeywordRecommendation.ts';
import { partitionListingMasterComponentAxes } from '../../lib/listingMasterSearchAxisContract.ts';

type OfferFixture = Record<string, unknown> & { canonical_product_id: string; configurations: Record<string, unknown>[] };
const products: OfferFixture[]=JSON.parse(fs.readFileSync(new URL('./fixtures/batch10Offers.json',import.meta.url),'utf8'));

test('Batch10 grouped choices keep separate identities, contents and original prices',()=>{
 for(const p of [products[1],products[3]]){
  const raw=JSON.stringify(p),fixed=correct(p),truth=offer(fixed);
  assert.equal(truth.status,'ready');
  assert.equal(JSON.stringify(p),raw);
  assert.deepEqual(correct(fixed),fixed);
  assert.deepEqual(fixed.configurations.map(r=>[r.configuration_id,r.public_label,r.display_price_amount]),p.configurations.map(r=>[r.configuration_id,r.public_label,r.display_price_amount]));
  const upper=fixed.configurations.find(r=>r.public_label==='Bra + Shoulders');
  const lower=fixed.configurations.find(r=>r.public_label==='Belt + Garters');
  assert.ok(upper);
  assert.ok(lower);
  assert.notEqual(upper.component_code,lower.component_code);
  assert.deepEqual(sellableOfferIncludedLabels(truth,upper),['Top','Shoulders']);
  assert.deepEqual(sellableOfferIncludedLabels(truth,lower),['Belt','Garters']);
  const full=truth.aggregate_options.find(r=>r.code==='full_set');
  assert.ok(full);
  assert.ok(full.member_codes.includes('top') && full.member_codes.includes('legs'));
  assert.ok(truth.signature);
  const signature: Array<{ id: string; members: string[] }>=JSON.parse(truth.signature.split('storefront-sellable-offer-v1:')[1]);
  assert.deepEqual(signature.find(r=>r.id===upper.configuration_id)?.members,['shoulders','top']);
  assert.deepEqual(signature.find(r=>r.id===lower.configuration_id)?.members,['belt','legs']);
  assert.equal(correct({...p,canonical_product_id:'unreviewed'}).configurations,p.configurations);
 }
 const selected=['harness','legs','spine','tail'];
 assert.deepEqual(partitionListingMasterComponentAxes(selected,offer(correct(products[3]))).selected,selected);
});

test('Batch10 exact reviewed outfit intent preserves metrics and factual gates',()=>{
 const p=correct(products[1]);
 const product={...p,material:'Vegan leather',sellable_offer:offer(p),included_components:offer(p).component_labels};
 const keyword={id:'metric-row',keyword:'silver metallic outfit',keyword_norm:'silver metallic outfit',bank_bucket:'visual_collection',page_type:'collection_visual',review_status:'approved_draft',score:67,avg_monthly_searches:140,competition:'HIGH',competition_index:100,region:'US',language:'en',metric_source:'google_keyword_planner',last_checked:'2026-06-29'};
 const focus={component:['top','shoulders','belt','legs','choker'],material:['silver','vegan leather'],event:['festival'],style:['cosmic'],persona:['performer'],audience:['women'],component_focus_contract:'seo_search_axes_v1'};
 const run=(f: Record<string, unknown>=focus,k: Record<string, unknown>=keyword,prod: Record<string, unknown>=product)=>recommendCatalogKeywords({product:prod,focus:f,approvedKeywords:[k]}).keywords;
 assert.equal(run()[0]?.role,'primary');
 assert.equal(run()[0]?.avg_monthly_searches,140);
 assert.equal(run({...focus,material:['gold','vegan leather']},keyword,{...product,canonical_color_label:'Gold',color:'Gold'}).length,0);
 assert.equal(run({...focus,exclude:['silver metallic outfit']}).length,0);
 assert.equal(run(focus,{...keyword,metric_source:null}).length,0);
 assert.ok(!run(focus,keyword,{...product,canonical_product_id:'unreviewed'}).some(r=>r.role==='primary'));
});
