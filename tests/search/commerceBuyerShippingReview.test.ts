import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {
  BUYER_SERVICES_REVIEW,reviewServiceBreakdown,
} from '../../lib/commerceBuyerServiceReview.ts';
import {
  FEYA_EUR_STANDARD_MINOR,FEYA_EUR_EXPRESS_MINOR,
  FEYA_REMOTE_ZONE_SURCHARGE_MINOR,
} from '../../lib/commerceOwnerEurRatePreset.ts';
import {EXTRA_DISTINCT_LISTING_EUR_MINOR} from '../../lib/commerceExtraListingHandlingEur.ts';

const id=()=>randomUUID();
const quote=(items:string[],method:'standard'|'express'='standard',country='US')=>
  reviewServiceBreakdown({method,country,canonical_product_ids:items});
const blob=(path:string)=>{
  const src=readFileSync(path);
  return createHash('sha1').update(`blob ${src.length}\0`).update(src).digest('hex');
};

test('commercial Standard and Express use owner EUR prices and priority queue, NOT carrier API products',()=>{
  assert.equal(BUYER_SERVICES_REVIEW.length,2);
  assert.deepEqual(BUYER_SERVICES_REVIEW.map(x=>x.method),['standard','express']);
  assert.deepEqual(BUYER_SERVICES_REVIEW.map(x=>x.amount_minor),[FEYA_EUR_STANDARD_MINOR,FEYA_EUR_EXPRESS_MINOR]);
  assert.equal(FEYA_EUR_STANDARD_MINOR,1900);
  assert.equal(FEYA_EUR_EXPRESS_MINOR,3500);
  assert.deepEqual(BUYER_SERVICES_REVIEW.map(x=>x.queue_priority),['regular','priority']);
  assert.deepEqual(BUYER_SERVICES_REVIEW.map(x=>x.carrier_selected_by),
    ['thefeya_at_dispatch','thefeya_at_dispatch']);
  assert.deepEqual(BUYER_SERVICES_REVIEW.map(x=>x.transit_business_days),
    [{min:10,max:14},{min:6,max:9}]);
  assert.ok(BUYER_SERVICES_REVIEW.every(x=>x.payable===false&&x.payment_enabled===false
    &&x.public_rates_enabled===false));
});

test('handling charged once per EXTRA DISTINCT listing, NOT per item quantity, colour, option or parcel',()=>{
  const p1=id(),p2=id(),p3=id();
  assert.equal(EXTRA_DISTINCT_LISTING_EUR_MINOR,500);
  assert.equal(quote([p1]).handling_minor,0);
  assert.equal(quote([p1,p1,p1]).handling_minor,0);
  assert.equal(quote([p1,p2]).handling_minor,500);
  assert.equal(quote([p1,p2,p3]).handling_minor,1000);
  const r=quote([p1,p2,p3],'express');
  assert.equal(r.shipping_minor,3500);
  assert.equal(r.estimate_fees_minor,4500);
  assert.equal(r.pending_parcel_count_confirmation,true);
  assert.equal(r.carrier_eligibility_verified,false);
  assert.equal(r.payable,false);assert.equal(r.amount_due_minor,null);
});

test('AU/MX/NZ remote increment only a one-parcel illustration, never mandatory worldwide shipping',()=>{
  const p=id();
  for(const country of ['AU','MX','NZ']){
    const r=quote([p],'standard',country);
    assert.equal(r.remote_example_minor,FEYA_REMOTE_ZONE_SURCHARGE_MINOR);
    assert.equal(r.estimate_fees_minor,3900);
    assert.equal(r.carrier_eligibility_verified,false);
    assert.equal(r.pending_parcel_count_confirmation,true);
  }
  for(const country of ['US','DE','GB','CA','ES','SA']){
    assert.equal(quote([p],'standard',country).remote_example_minor,0);
  }
});
test('preview parser rejects fake amounts, invalid countries, unapproved arbitrary method and bogus product ids',()=>{
  const product=id();
  for(const invalid of [
    {method:'overnight',country:'US',canonical_product_ids:[product]},
    {method:'standard',country:'us',canonical_product_ids:[product]},
    {method:'standard',country:'ZZZ',canonical_product_ids:[product]},
    {method:'standard',country:'US',canonical_product_ids:[]},
    {method:'standard',country:'US',canonical_product_ids:['not-id']},
    {method:'express',country:'DE',canonical_product_ids:[product,...Array.from({length:21},id)]},
  ]) assert.throws(()=>reviewServiceBreakdown(invalid as never),/buyer_service_review_invalid/);
});
test('review routes are PREVIEW-only and noindex, never replace indexed v12 shipping/contact or payable cart',()=>{
  const legacy=readFileSync('supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql','utf8');
  for(const path of ['app/shipping/page.tsx','app/contact/page.tsx']){
    assert.match(legacy,new RegExp(blob(path)),path);
  }
  for(const path of ['app/checkout-review/page.tsx','app/shipping-review/page.tsx','app/site-review/page.tsx']){
    const source=readFileSync(path,'utf8');
    assert.match(source,/robots:\{index:false,follow:false/);
    assert.match(source,/process\.env\.VERCEL_ENV!=='preview'/);
    assert.match(source,/notFound\(\)/);
    assert.doesNotMatch(source,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=true/);
  }
  const liveBag=readFileSync('app/cart/page.tsx','utf8');
  assert.match(liveBag,/Online checkout is not active yet/);
  assert.match(liveBag,/robots:\{index:false,follow:false\}/);
});
test('review hub gives owner all 10 live landings plus three honest proposals',()=>{
  const source=readFileSync('app/site-review/page.tsx','utf8');
  const routes=[
    'shoulder-armor','festival-outfits','rave-outfits','burning-man-outfits',
    'performance-costumes','bodysuits','costume-masks','costume-headpieces',
    'festival-skirts','costume-belts',
  ];
  for(const slug of routes) assert.match(source,new RegExp('/collections/'+slug));
  for(const href of ['/checkout-review','/shipping-review','/contact-review','/shipping','/contact'])
    assert.match(source,new RegExp(href));
  assert.match(source,/Preview-домене/);
});
test('buyer-facing prototype does not request weight/dimensions, contact info, carrier product or signature',()=>{
  const sample=readFileSync('components/BuyerCheckoutReviewClient.tsx','utf8');
  const shipping=readFileSync('app/shipping-review/page.tsx','utf8');
  assert.match(sample,/BuyerCheckoutReviewClient/);
  assert.match(sample,/One delivery choice|sample-shipping|Delivery preference/);
  assert.match(sample,/Checkout not active/);
  assert.match(sample,/type="button" disabled aria-disabled="true"/);
  assert.match(sample,/reviewServiceBreakdown/);
  assert.match(shipping,/priority in our preparation|Priority in our preparation/i);
  assert.match(shipping,/same trusted courier/i);
  assert.match(shipping,/Customs|Statutory rights|statutory rights/i);
  assert.doesNotMatch(sample,/api\.novaposhta|api\.ukrposhta|Get delivery quote/);
  assert.doesNotMatch(sample,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
});
