import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OFFER_PROMOTION_CONTRACT,OFFER_PROMOTION_HEALTH_RPC,OFFER_PROMOTION_RPC,
  parseOfferPromotionReceipt,parseOfferPromotionRequest,promoteOffer,
  type OfferPromotionRequest,
} from '../../lib/commerceOfferPromotionStorage.ts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const req=():OfferPromotionRequest=>({contract_version:OFFER_PROMOTION_CONTRACT,request_id:id(1),canonical_product_id:id(2),
  expected_variant_revision:3,expected_offer_revision:0,release_ref:'synthetic-release',max_quantity_per_line:4,variant_ids:[id(3)]});
const rec=()=>({contract_version:OFFER_PROMOTION_CONTRACT,request_id:id(1),canonical_product_id:id(2),variant_revision:3,
  offer_revision_id:id(4),offer_revision:1,release_ref:'synthetic-release',variant_count:1,execution_request_id:id(5),
  change_event_id:id(6),request_hash:'a'.repeat(64),quote_ready:true,order_creation_enabled:false,payment_enabled:false,indexing_enabled:false,replayed:false});

test('promotion request is exact and excludes client price/currency/orderability fields',()=>{
  assert.equal(parseOfferPromotionRequest(req()).variant_ids.length,1);
  for(const patch of [{amount_minor:1},{currency:'USD'},{orderable:true},{variant_ids:[id(3),id(3)]},{max_quantity_per_line:0}])
    assert.throws(()=>parseOfferPromotionRequest({...req(),...patch}),/request_invalid/);
});
test('receipt binds exact product/revisions/count and keeps later commerce gates disabled',()=>{
  const out=parseOfferPromotionReceipt(rec(),req());
  assert.equal(out.quote_ready,true);assert.equal(out.payment_enabled,false);
  assert.throws(()=>parseOfferPromotionReceipt({...rec(),offer_revision:2},req()),/receipt_invalid/);
  assert.throws(()=>parseOfferPromotionReceipt({...rec(),payment_enabled:true},req()),/receipt_invalid/);
});
test('storage checks health before promotion and forwards authenticated actor only',async()=>{
  const calls:any[]=[];
  const client={rpc:async(name:string,args?:Record<string,unknown>)=>{
    calls.push([name,args]);
    if(name===OFFER_PROMOTION_HEALTH_RPC)return{data:{contract_version:OFFER_PROMOTION_CONTRACT,ready:true,
      direct_offer_table_write_enabled:false,promotion_rpc_enabled:true,order_creation_enabled:false,payment_enabled:false,indexing_enabled:false},error:null};
    return{data:rec(),error:null};
  }};
  const out=await promoteOffer(client,id(9),req(),id(2));
  assert.equal(out.offer_revision,1);assert.deepEqual(calls.map(x=>x[0]),[OFFER_PROMOTION_HEALTH_RPC,OFFER_PROMOTION_RPC]);
  assert.equal(calls[1][1].p_actor_user_id,id(9));
});
test('unexpectedly permissive health state closes the writer',async()=>{
  for(const patch of [{ready:false},{direct_offer_table_write_enabled:true},{payment_enabled:true},{indexing_enabled:true}]){
    const client={rpc:async()=>({data:{contract_version:OFFER_PROMOTION_CONTRACT,ready:true,direct_offer_table_write_enabled:false,
      promotion_rpc_enabled:true,order_creation_enabled:false,payment_enabled:false,indexing_enabled:false,...patch},error:null})};
    await assert.rejects(promoteOffer(client,id(9),req()),/contract_not_ready/);
  }
});
