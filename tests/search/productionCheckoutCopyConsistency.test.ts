import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CHECKOUT_POLICY_BUNDLE_V1} from '../../lib/payments/checkoutPolicyEvidence.ts';

test('Live checkout never appears disabled in the public footer or inactive-account explanation',()=>{
  const footer=readFileSync('components/Footer.tsx','utf8');
  const account=readFileSync('app/account/page.tsx','utf8');
  assert.doesNotMatch(footer,/Checkout not active/i);
  assert.match(footer,/href="\/privacy"/);
  assert.match(footer,/href="\/terms"/);
  assert.match(account,/Customer account sign-in is not active yet/);
  assert.match(account,/place an order as a guest/);
  assert.doesNotMatch(account,/checkout and account services are still disabled/i);
});

test('Privacy checkout state comes from real payment status, and accepted policy is reversioned',()=>{
  const privacy=readFileSync('app/privacy/page.tsx','utf8');
  assert.match(privacy,/readPaymentsPublicActive\(\)/);
  assert.match(privacy,/sellerOnlineEnabled\s*\?/);
  assert.match(privacy,/Online checkout is active/);
  assert.match(privacy,/Online checkout and payment processing are not active at this time/);
  assert.doesNotMatch(privacy,/Online checkout, payment processing and optional production analytics are not activated until/);
  assert.equal(CHECKOUT_POLICY_BUNDLE_V1.version,'thefeya-sale-policy-20261029-v3');
  const bytes=readFileSync('app/privacy/page.tsx');
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(sha,CHECKOUT_POLICY_BUNDLE_V1.sources.privacy.git_blob_sha1);
});
