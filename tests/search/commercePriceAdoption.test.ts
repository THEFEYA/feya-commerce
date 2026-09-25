import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyPriceAdoptionEvidence,classifyProductPriceAdoption,type PriceAdoptionEvidence} from '../../lib/commercePriceAdoption.ts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const base=():PriceAdoptionEvidence=>({
 canonical_product_id:id(1),configuration_price_id:id(2),sellable_configuration_id:id(3),
 source_amount:'199.39',public_price_amount:'199.39',manual_override_amount:null,source_currency:'EUR',confidence:'95.00',
 fallback_flag:false,price_status:'draft',price_review_status:'not_reviewed',configuration_review_status:'not_reviewed',
 configuration_is_public_candidate:true,configuration_is_sampler:false,
});
test('unchanged high-confidence source price becomes a review candidate, not an automatic approval',()=>{
 const r=classifyPriceAdoptionEvidence(base());assert.equal(r.state,'clean_source_baseline');
 assert.deepEqual(r.reason_codes,['SOURCE_EQUALS_PUBLIC_UNCHANGED']);
});
test('already governed exact row stays ready',()=>{
 const x=base();x.price_status='approved';x.price_review_status='approved';x.configuration_review_status='approved';
 assert.deepEqual(classifyPriceAdoptionEvidence(x),{state:'already_ready',reason_codes:[]});
});
test('manual override is isolated for explicit review even when internally consistent',()=>{
 const x=base();x.manual_override_amount='260.00';x.public_price_amount='260.00';
 const r=classifyPriceAdoptionEvidence(x);assert.equal(r.state,'manual_override_review');
});
test('fallback, low confidence, mismatch and missing source never enter clean baseline',()=>{
 for(const mutate of [
  (x:PriceAdoptionEvidence)=>{x.fallback_flag=true;},
  (x:PriceAdoptionEvidence)=>{x.confidence='94.99';},
  (x:PriceAdoptionEvidence)=>{x.public_price_amount='200.00';},
  (x:PriceAdoptionEvidence)=>{x.source_amount=null;},
 ]){
  const x=base();mutate(x);assert.equal(classifyPriceAdoptionEvidence(x).state,'hold');
 }
});
test('product classification separates manual override from clean source products',()=>{
 const clean=base(),second={...base(),configuration_price_id:id(4)};
 assert.equal(classifyProductPriceAdoption([clean,second]).state,'clean_source_baseline');
 second.manual_override_amount='210.00';second.public_price_amount='210.00';
 assert.equal(classifyProductPriceAdoption([clean,second]).state,'manual_override_review');
});
test('one unexplained row holds the whole product batch candidate',()=>{
 const clean=base(),bad={...base(),configuration_price_id:id(4),public_price_amount:'999'};
 assert.equal(classifyProductPriceAdoption([clean,bad]).state,'hold');
});
