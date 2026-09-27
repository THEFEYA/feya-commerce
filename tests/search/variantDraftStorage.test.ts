import test from 'node:test';
import assert from 'node:assert/strict';
import { readVariantDraft, saveVariantDraft, VariantStorageError, type VariantRPCClient } from '../../lib/commerceVariantDraftStorage.ts';
import type { VariantDraftInput } from '../../lib/commerceVariantDraftSchema.ts';
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const closed={contract_version:'product_variant_draft_v1',draft_only:true,can_publish:false,can_index:false,can_enable_checkout:false};
const input:VariantDraftInput={contract_version:'product_variant_draft_v1',request_id:id(1),expected_revision:0,
  source_bindings:{product_fingerprint:'a'.repeat(32),configurations:[]},
  snapshot:{canonical_product_id:id(2),product_revision:1,pricing_policy_ref:'owner-configuration-base-price-20260924-04',
    configurations:[{configuration_price_id:id(3),sellable_configuration_id:id(4),base_price:{quote_id:id(5),price_revision:1,status:'unverified',amount_minor:10000,currency:'EUR',evidence_ref:null}}],colors:[],sizes:[],variants:[]}};
const receipt={...closed,request_id:id(1),canonical_product_id:id(2),product_revision:1,snapshot_sha256:'b'.repeat(64),execution_request_id:id(6),change_event_id:id(7),replayed:false};
function client(result:unknown,error:{code?:string;message?:string}|null=null):VariantRPCClient {
  return {rpc:async name=>name.endsWith('health_v1')?{data:{...closed,ready:true},error:null}:{data:result,error}};
}
test('variant receipt keeps stable IDs and replay evidence',async()=>{
  assert.deepEqual(await saveVariantDraft(client(receipt),id(8),input),receipt);
  assert.equal((await saveVariantDraft(client({...receipt,replayed:true}),id(8),input)).change_event_id,id(7));
});
test('malformed or mismatched write receipts require same-request retry, never a claimed success',async()=>{
  for(const patch of [{request_id:id(9)},{product_revision:2},{can_index:true},{snapshot_sha256:'bad'},{change_event_id:null}])
    await assert.rejects(saveVariantDraft(client({...receipt,...patch}),id(8),input),e=>e instanceof VariantStorageError&&e.outcome==='unknown'&&e.status===503);
});
test('lost response after writer invocation is unknown; proven database conflicts are not written',async()=>{
  const network:VariantRPCClient={rpc:async name=>{if(name.endsWith('health_v1'))return {data:{...closed,ready:true},error:null};throw new Error('response lost');}};
  await assert.rejects(saveVariantDraft(network,id(8),input),e=>e instanceof VariantStorageError&&e.outcome==='unknown');
  await assert.rejects(saveVariantDraft(client(null,{code:'P0001',message:'variant_revision_conflict'}),id(8),input),e=>e instanceof VariantStorageError&&e.status===409&&e.outcome==='not_written');
});
test('unsafe boundary prevents the writer from being invoked',async()=>{
  const calls:string[]=[];const c:VariantRPCClient={rpc:async name=>{calls.push(name);return {data:{...closed,ready:true,can_publish:true},error:null};}};
  await assert.rejects(saveVariantDraft(c,id(8),input),/variant_contract_not_ready/);assert.deepEqual(calls,['feya_commerce_variant_draft_health_v1']);
});
test('reader rejects cross-product and non-draft snapshots even when outer flags look safe',async()=>{
  const good={...closed,canonical_product_id:id(2),current_revision:1,snapshot:input.snapshot,snapshot_sha256:'b'.repeat(64),source_bindings:input.source_bindings,configuration_context:[]};
  assert.deepEqual((await readVariantDraft(client(good),id(2))).snapshot,input.snapshot);
  const wrong=structuredClone(good);wrong.snapshot.canonical_product_id=id(9);
  await assert.rejects(readVariantDraft(client(wrong),id(2)),/variant_reader_contract_invalid/);
  const approved=structuredClone(good);approved.snapshot.configurations[0].base_price.status='verified_exact';approved.snapshot.configurations[0].base_price.evidence_ref='forged';
  await assert.rejects(readVariantDraft(client(approved),id(2)),/variant_reader_contract_invalid/);
});
