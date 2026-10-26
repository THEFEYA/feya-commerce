import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ownerCartPreviewExtraEstimate,requiresPaidCustomMeasurements,
  selectedPaidCustomMeasurementIds,toggleOptionalCustomMeasurement,
  type OwnerCartPreviewItem,
} from '../../lib/commerceOwnerCartReview.ts';

const id='057fbd51-52f5-4404-b126-e5d75b8599f4';
function cartItem(overrides:Partial<OwnerCartPreviewItem>={}):OwnerCartPreviewItem{
  return {
    id:id+'-sample',canonical_product_id:id,
    slug:'owner-approved-paired-set',title:'Owner approved paired set',image:'',
    config:'Full Set',size:'M',color:'Gold',qty:2,price:100,currency:'EUR',
    configuration_id:'26274d0c-81c9-44e6-9ce7-c3056c62040c',
    compare_at_unit_price_amount:null,price_contract_version:null,price_confidence_status:null,
    ...overrides,
  };
}
function quote(items:OwnerCartPreviewItem[]) {
  return ownerCartPreviewExtraEstimate(items,{
    madeToMeasureItemIds:selectedPaidCustomMeasurementIds(items),
    giftCard:false,giftBox:false,destination:'DE',
  }).made_to_measure_minor;
}
test('Custom alone stays checked and payable when existing bag flag says false',()=>{
  const item=cartItem({size:'Custom',custom_measurements_selected:false});
  assert.equal(requiresPaidCustomMeasurements(item),true);
  assert.deepEqual(selectedPaidCustomMeasurementIds([item]),[item.id]);
  assert.equal(quote([item]),3000); // two copies at €15 per actual piece
  assert.deepEqual(toggleOptionalCustomMeasurement([item],item.id),[item]);
});
test('two-person order charges only individually customized outfits',()=>{
  const one=cartItem({paired_selection:{women:{size:'Custom',color:'gold'},men:{size:'L',color:'silver'}}});
  assert.equal(quote([one]),3000);
  const two=cartItem({paired_selection:{women:{size:'Custom',color:'gold'},men:{size:'Custom',color:'silver'}}});
  assert.equal(quote([two]),6000);
});
test('optional fit service has one persistent checkbox state for displayed, quoted and payable total',()=>{
  const item=cartItem({size:'M',custom_measurements_selected:false});
  assert.deepEqual(selectedPaidCustomMeasurementIds([item]),[]);
  assert.equal(quote([item]),0);
  const selected=toggleOptionalCustomMeasurement([item],item.id);
  assert.equal(selected[0].custom_measurements_selected,true);
  assert.deepEqual(selectedPaidCustomMeasurementIds(selected),[item.id]);
  assert.equal(quote(selected),3000);
  const removed=toggleOptionalCustomMeasurement(selected,item.id);
  assert.equal(removed[0].custom_measurements_selected,false);
  assert.deepEqual(selectedPaidCustomMeasurementIds(removed),[]);
  assert.equal(quote(removed),0);
});
