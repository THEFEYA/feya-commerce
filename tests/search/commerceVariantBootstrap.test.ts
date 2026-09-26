import assert from 'node:assert/strict';
import test from 'node:test';
import {buildInitialVariantBootstrapDraft} from '../../lib/commerceVariantBootstrap.ts';
import type {VariantDraftContext} from '../../lib/commerceVariantDraftStorage.ts';

function context():VariantDraftContext{
  return{
    contract_version:'product_variant_draft_v1',
    canonical_product_id:'10000000-0000-4000-8000-000000000001',
    current_revision:0,
    snapshot:null,
    snapshot_sha256:null,
    source_bindings:{
      product_fingerprint:'a'.repeat(32),
      configurations:[
        {configuration_price_id:'20000000-0000-4000-8000-000000000001',sellable_configuration_id:'30000000-0000-4000-8000-000000000001',price_fingerprint:'b'.repeat(32),configuration_fingerprint:'c'.repeat(32)},
        {configuration_price_id:'20000000-0000-4000-8000-000000000002',sellable_configuration_id:'30000000-0000-4000-8000-000000000002',price_fingerprint:'d'.repeat(32),configuration_fingerprint:'e'.repeat(32)},
        {configuration_price_id:'20000000-0000-4000-8000-000000000003',sellable_configuration_id:'30000000-0000-4000-8000-000000000003',price_fingerprint:'f'.repeat(32),configuration_fingerprint:'1'.repeat(32)},
      ],
    },
    configuration_context:[
      {configuration_price_id:'20000000-0000-4000-8000-000000000001',sellable_configuration_id:'30000000-0000-4000-8000-000000000001',source_label:'Full Set',source_amount:100,source_currency:'EUR',public_price_amount:100,manual_override_amount:null,price_status:'approved',review_status:'approved'},
      {configuration_price_id:'20000000-0000-4000-8000-000000000002',sellable_configuration_id:'30000000-0000-4000-8000-000000000002',source_label:'Top',source_amount:70,source_currency:'EUR',public_price_amount:70,manual_override_amount:null,price_status:'approved',review_status:'approved'},
      {configuration_price_id:'20000000-0000-4000-8000-000000000003',sellable_configuration_id:'30000000-0000-4000-8000-000000000003',source_label:'Skirt',source_amount:60,source_currency:'EUR',public_price_amount:60,manual_override_amount:null,price_status:'approved',review_status:'approved'},
    ],
    draft_only:true,can_publish:false,can_index:false,can_enable_checkout:false,
  };
}

test('ordinary bootstrap creates exactly one draft variant per exact price row with no invented dimensions',()=>{
  const first=buildInitialVariantBootstrapDraft(context());
  const second=buildInitialVariantBootstrapDraft(context());
  assert.deepEqual(second,first);
  assert.equal(first.snapshot.configurations.length,3);
  assert.equal(first.snapshot.variants.length,3);
  assert.deepEqual(first.snapshot.colors,[]);
  assert.deepEqual(first.snapshot.sizes,[]);
  assert.ok(first.snapshot.variants.every(v=>v.color_id===null&&v.size_id===null&&v.state==='draft'));
  assert.deepEqual(first.snapshot.variants.map(v=>v.configuration_price_id).sort(),
    first.snapshot.configurations.map(c=>c.configuration_price_id).sort());
  assert.ok(first.snapshot.configurations.every(c=>c.base_price.status==='unverified'&&c.base_price.amount_minor===null));
});

test('explicit color-price bootstrap binds each price row to one matching color and never creates a Cartesian product',()=>{
  const input=buildInitialVariantBootstrapDraft(context(),[
    {configuration_price_id:'20000000-0000-4000-8000-000000000001',label:'Black'},
    {configuration_price_id:'20000000-0000-4000-8000-000000000002',label:'Green'},
    {configuration_price_id:'20000000-0000-4000-8000-000000000003',label:'Brown'},
  ]);
  assert.equal(input.snapshot.colors.length,3);
  assert.equal(input.snapshot.variants.length,3);
  assert.ok(input.snapshot.variants.every(v=>v.color_id!==null&&v.size_id===null));
  assert.equal(new Set(input.snapshot.variants.map(v=>v.color_id)).size,3);
  for(const v of input.snapshot.variants){
    assert.ok(input.snapshot.colors.some(c=>c.id===v.color_id&&c.state==='confirmed'));
  }
});

test('bootstrap refuses stale revision, foreign color binding and missing currency',()=>{
  const stale=context();stale.current_revision=1;
  assert.throws(()=>buildInitialVariantBootstrapDraft(stale),/requires_empty_product_revision/);

  assert.throws(()=>buildInitialVariantBootstrapDraft(context(),[
    {configuration_price_id:'20000000-0000-4000-8000-000000009999',label:'Black'},
  ]),/color_scope_invalid/);

  const bad=context();bad.configuration_context[0].source_currency=null;
  assert.throws(()=>buildInitialVariantBootstrapDraft(bad),/currency_invalid/);
});
