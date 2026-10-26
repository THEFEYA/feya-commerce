/** A tiny, owner-only launch decision: provider setup, website release,
 * first real physical paid order, then separate Search Release authorization.
 * No credentials, captures or API secrets appear in this data structure.
 */
export type OwnerPaymentGateState={
  environment:string;
  engine:string;
  store_key_set:boolean;
  payee_email:string|null;
  payments_kill_switch:boolean;
  active:boolean;
  commerce_release_approved:boolean;
  ready_to_activate:boolean;
  checks:{credentials:boolean;payee:boolean;webhook:boolean;test_payment:boolean;test_environment:string|null};
  paid_orders:number;
};

export type OwnerSearchGateState={
  activeVersion:number|null;
  activeProductNoindex:number|null;
  candidateVersion:number|null;
  candidateStatus:string|null;
  candidateIndexedProducts:number|null;
  candidateFailedGates:number|null;
};

export type OwnerLaunchSummary={
  providerVerified:boolean;
  paymentReleaseApproved:boolean;
  buyerPaymentsActive:boolean;
  physicalPurchaseProved:boolean;
  seoCandidateReady:boolean;
  seoCurrentlyIndexingProducts:boolean;
  nextAction:'verify_provider'|'approve_payment_release'|'emergency_pause'|'activate_payment'|'test_real_purchase'|'approve_search_release'|'search_status_unavailable';
};

/** Do not equate a €1 installation test with an end-to-end customer order. */
export function ownerLaunchSummary(
  provider:OwnerPaymentGateState,
  search:OwnerSearchGateState|null,
):OwnerLaunchSummary{
  const checks=provider.checks;
  const providerVerified=provider.environment==='live'
    &&provider.store_key_set &&Boolean(provider.payee_email)
    &&(provider.engine==='paypal_standard'||(checks.credentials&&checks.payee&&checks.webhook))
    &&checks.test_payment&&checks.test_environment==='live';
  const buyerPaymentsActive=provider.active&&provider.commerce_release_approved
    &&!provider.payments_kill_switch;
  const physicalPurchaseProved=Number.isSafeInteger(provider.paid_orders)&&provider.paid_orders>0;
  const seoCandidateReady=search?.candidateVersion===13
    &&search.candidateIndexedProducts===207
    &&search.candidateStatus==='GATE_FAILED';
  const seoCurrentlyIndexingProducts=search?.activeVersion===13
    &&search.activeProductNoindex===0;
  const nextAction:OwnerLaunchSummary['nextAction']=!providerVerified?'verify_provider'
    :!provider.commerce_release_approved?'approve_payment_release'
    :provider.payments_kill_switch?'emergency_pause'
    :!buyerPaymentsActive?'activate_payment'
    :!physicalPurchaseProved?'test_real_purchase'
    :!search?'search_status_unavailable'
    :'approve_search_release';
  return{
    providerVerified,paymentReleaseApproved:provider.commerce_release_approved,
    buyerPaymentsActive,physicalPurchaseProved,
    seoCandidateReady,seoCurrentlyIndexingProducts,nextAction,
  };
}
