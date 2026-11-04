import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FEYA_MEASUREMENT_CONTRACT_VERSION,
  buildMeasurementEnvelope,
  ga4EventParameters,
  type FeyaMeasurementPageContext,
} from '../../lib/measurementContract.ts';

const page:FeyaMeasurementPageContext={
  page_id:'11111111-1111-4111-8111-111111111111',
  page_version_id:'22222222-2222-4222-8222-222222222222',
  release_id:'33333333-3333-4333-8333-333333333333',
  canonical_product_id:null,
  path:'/collections/stage-outfits',
  environment:'production',
  measurement_enabled:true,
  ga4_measurement_id:'G-TEST123',
};

test('measurement envelope preserves stable FEYA IDs instead of reconstructing identity from text or URLs',()=>{
  const event=buildMeasurementEnvelope({
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'view_item',
    page,
    landing_page_id:'11111111-1111-4111-8111-111111111111',
    canonical_product_id:'66666666-6666-4666-8666-666666666666',
    items:[{
      canonical_product_id:'66666666-6666-4666-8666-666666666666',
      sku_id:'sku-runtime-fixture',
      quantity:1,
      item_price:149,
      item_value:149,
      currency:'USD',
    }],
    currency:'USD',
    value:149,
  });

  assert.equal(event.contract_version,FEYA_MEASUREMENT_CONTRACT_VERSION);
  assert.equal(event.page_id,page.page_id);
  assert.equal(event.page_version_id,page.page_version_id);
  assert.equal(event.release_id,page.release_id);
  assert.equal(event.landing_page_id,page.page_id);
  assert.equal(event.canonical_product_id,'66666666-6666-4666-8666-666666666666');
  assert.equal(event.consent_state,'granted');
  assert.equal(ga4EventParameters(event).items?.[0].canonical_product_id,event.canonical_product_id);
  assert.equal(ga4EventParameters(event).items?.[0].item_id,event.canonical_product_id);
  assert.equal(ga4EventParameters(event).items?.[0].item_variant,'sku-runtime-fixture');
});

test('one product keeps the same GA4 item identity throughout the funnel and across configuration changes',()=>{
  const product='66666666-6666-4666-8666-666666666666';
  const configurations=[undefined,'77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888'];
  const events=['select_item','view_item','add_to_cart','begin_checkout','purchase'] as const;
  for(const event_name of events){
    for(const sku_id of configurations){
      const event=buildMeasurementEnvelope({
        event_id:'44444444-4444-4444-8444-444444444444',
        session_id:'55555555-5555-4555-8555-555555555555',
        event_name,page,landing_page_id:page.page_id,
        canonical_product_id:product,
        items:[{canonical_product_id:product,sku_id,quantity:2,item_price:195.4,currency:'EUR'}],
        currency:'EUR',value:390.8,
        ...(event_name==='purchase'?{transaction_id:'order-fixture',server_order_receipt_id:'receipt-fixture'}:{}),
      });
      const ga=ga4EventParameters(event);
      assert.equal(ga.items?.[0].item_id,product,`${event_name}: configuration must not split the product report`);
      assert.equal(ga.items?.[0].item_variant,sku_id);
      assert.equal(ga.items?.[0].sku_id,sku_id);
      assert.equal(ga.items?.[0].quantity,2);
      assert.equal(ga.items?.[0].price,195.4);
      assert.equal(ga.currency,'EUR');
      assert.equal(ga.value,390.8);
    }
  }
});

test('multi-product GA4 purchase keeps each product distinct and retains its purchased configuration',()=>{
  const items=[
    {canonical_product_id:'66666666-6666-4666-8666-666666666666',sku_id:'77777777-7777-4777-8777-777777777777',quantity:1,item_price:195.4},
    {canonical_product_id:'99999999-9999-4999-8999-999999999999',sku_id:'88888888-8888-4888-8888-888888888888',quantity:2,item_price:99.5},
  ];
  const event=buildMeasurementEnvelope({
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'purchase',page,landing_page_id:page.page_id,
    transaction_id:'order-fixture',server_order_receipt_id:'receipt-fixture',currency:'EUR',value:394.4,items,
  });
  const ga=ga4EventParameters(event);
  assert.deepEqual(ga.items?.map(item=>[item.item_id,item.item_variant,item.quantity,item.price]),[
    ['66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777',1,195.4],
    ['99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888',2,99.5],
  ]);
  assert.equal(ga.transaction_id,'order-fixture');
  assert.equal(ga.server_order_receipt_id,'receipt-fixture');
});

test('measurement contract fails closed outside an enabled production measurement context',()=>{
  assert.throws(()=>buildMeasurementEnvelope({
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'page_view',
    page:{...page,measurement_enabled:false,environment:'preview',ga4_measurement_id:null},
    landing_page_id:page.page_id,
  }),/FEYA_MEASUREMENT_DISABLED_FOR_ENVIRONMENT/);
});

test('purchase cannot be emitted without a real transaction and server order receipt',()=>{
  const base={
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'purchase' as const,
    page,
    landing_page_id:page.page_id,
    currency:'USD',
    value:149,
    items:[{canonical_product_id:'66666666-6666-4666-8666-666666666666',quantity:1,item_price:149,currency:'USD'}],
  };
  assert.throws(()=>buildMeasurementEnvelope(base),/PURCHASE_TRANSACTION_REQUIRED/);
  assert.throws(()=>buildMeasurementEnvelope({...base,transaction_id:'order-123'}),/PURCHASE_SERVER_RECEIPT_REQUIRED/);

  const purchase=buildMeasurementEnvelope({
    ...base,
    transaction_id:'order-123',
    server_order_receipt_id:'receipt-123',
  });
  assert.equal(purchase.transaction_id,'order-123');
  assert.equal(purchase.server_order_receipt_id,'receipt-123');
});

test('web vital events require an explicit metric and numeric value',()=>{
  assert.throws(()=>buildMeasurementEnvelope({
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'web_vital',
    page,
    landing_page_id:page.page_id,
  }),/WEB_VITAL_NAME_REQUIRED/);
});

test('web vital aggregation preserves the metric ID and signed delta under the navigation page version',()=>{
  const input={
    event_id:'44444444-4444-4444-8444-444444444444',
    session_id:'55555555-5555-4555-8555-555555555555',
    event_name:'web_vital' as const,page,landing_page_id:page.page_id,
    metric_name:'INP' as const,metric_value:150,metric_id:'v6-document-1',
    metric_delta:-50,metric_navigation_type:'navigate',
  };
  const event=buildMeasurementEnvelope(input);
  assert.equal(event.page_version_id,page.page_version_id);
  assert.equal(ga4EventParameters(event).metric_id,'v6-document-1');
  assert.equal(ga4EventParameters(event).metric_delta,-50);
  assert.throws(()=>buildMeasurementEnvelope({...input,metric_delta:Infinity}),/WEB_VITAL_DELTA_INVALID/);
});

