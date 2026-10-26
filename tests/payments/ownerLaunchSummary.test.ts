import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerLaunchSummary,type OwnerPaymentGateState,type OwnerSearchGateState}
  from '../../lib/payments/ownerLaunchSummary.ts';

const verified:OwnerPaymentGateState={
  environment:'live',engine:'paypal_checkout',store_key_set:true,payee_email:'merchant@example.com',
  payments_kill_switch:false,active:false,
  commerce_release_approved:false,ready_to_activate:false,
  checks:{credentials:true,payee:true,webhook:true,test_payment:true,test_environment:'live'},
  paid_orders:0,
};
const v13:OwnerSearchGateState={
  activeVersion:12,activeProductNoindex:207,candidateVersion:13,
  candidateStatus:'GATE_FAILED',candidateIndexedProducts:207,candidateFailedGates:20,
};

test('live €1 proves integration, NOT customer sales or search indexation',()=>{
  const r=ownerLaunchSummary(verified,v13);
  assert.equal(r.providerVerified,true);
  assert.equal(r.seoCandidateReady,true);
  assert.equal(r.buyerPaymentsActive,false);
  assert.equal(r.physicalPurchaseProved,false);
  assert.equal(r.seoCurrentlyIndexingProducts,false);
  assert.equal(r.nextAction,'approve_payment_release');
});

test('distinct Production signoff then owner activation then real PAID product',()=>{
  const signed={...verified,commerce_release_approved:true,ready_to_activate:true};
  assert.equal(ownerLaunchSummary(signed,v13).nextAction,'activate_payment');
  assert.equal(ownerLaunchSummary({...signed,active:true},v13).nextAction,'test_real_purchase');
  assert.equal(ownerLaunchSummary({...signed,active:true,paid_orders:1},v13).nextAction,'approve_search_release');
});

test('a paid installation TEST must never substitute for paid_orders',()=>{
  assert.equal(ownerLaunchSummary({...verified,active:true,
    commerce_release_approved:true,paid_orders:0},v13).physicalPurchaseProved,false);
});

test('missing release evidence fails closed instead of showing ready-to-index',()=>{
  assert.equal(ownerLaunchSummary({...verified,active:true,
    commerce_release_approved:true,paid_orders:1},null).nextAction,'search_status_unavailable');
  assert.equal(ownerLaunchSummary(verified,{...v13,candidateIndexedProducts:206}).seoCandidateReady,false);
  assert.equal(ownerLaunchSummary(verified,{...v13,candidateStatus:'ACTIVE',
    activeVersion:13,activeProductNoindex:0}).seoCurrentlyIndexingProducts,true);
});

test('sandbox or an unverified payee never becomes checkout-ready',()=>{
  assert.equal(ownerLaunchSummary({...verified,environment:'sandbox'},v13).providerVerified,false);
  assert.equal(ownerLaunchSummary({...verified,checks:{...verified.checks,payee:false}},v13).providerVerified,false);
  assert.equal(ownerLaunchSummary({...verified,store_key_set:false},v13).nextAction,'verify_provider');
  assert.equal(ownerLaunchSummary({...verified,payee_email:null},v13).providerVerified,false);
  assert.equal(ownerLaunchSummary({...verified,commerce_release_approved:true,active:true,
    payments_kill_switch:true},v13).buyerPaymentsActive,false);
});
