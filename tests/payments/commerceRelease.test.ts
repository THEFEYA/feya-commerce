import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPaidCommerceReleaseApproved} from '../../lib/payments/commerceRelease.ts';

const read=(path:string)=>readFileSync(path,'utf8');

test('real production sales require independent owner commerce release',()=>{
 assert.equal(isPaidCommerceReleaseApproved({VERCEL_ENV:'production'}),false);
 assert.equal(isPaidCommerceReleaseApproved({VERCEL_ENV:'production',FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED:'false'}),false);
 assert.equal(isPaidCommerceReleaseApproved({VERCEL_ENV:'production',FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED:'true'}),true);
 assert.equal(isPaidCommerceReleaseApproved({VERCEL_ENV:'preview'}),true);
 assert.equal(isPaidCommerceReleaseApproved({}),true);
});

test('production charge, public UI, owner/technician activation and legal copy all fail closed',()=>{
 for(const path of [
   'lib/payments/checkoutService.ts','lib/payments/publicState.ts',
   'lib/payments/installation.ts',
   'app/api/admin/payments/route.ts',
   'app/api/partner/seller-online/activate/route.ts',
 ]) assert.ok(read(path).includes('isPaidCommerceReleaseApproved'),path);
 assert.ok(read('app/api/partner/seller-online/activate/route.ts').includes('commerce_release_pending'));
 assert.ok(read('app/api/admin/payments/route.ts').includes('commerce_release_pending'));
 assert.ok(read('lib/payments/checkoutService.ts').includes('!isPaidCommerceReleaseApproved()'));
 assert.ok(read('lib/payments/checkoutRequest.ts').includes('Your payment status may be unknown'));
 assert.ok(!read('lib/payments/checkoutRequest.ts').includes('Your card has not been charged.'));
 assert.ok(read('components/payments/SellerOnlineInstallClient.tsx').includes('status.commerce_release_approved'));
});
