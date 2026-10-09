import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('privacy and terms are public trust routes without forcing an inactive seller identity',()=>{
  const privacy=readFileSync('app/privacy/page.tsx','utf8');
  const terms=readFileSync('app/terms/page.tsx','utf8');

  assert.doesNotMatch(privacy,/notFound\(/);
  assert.doesNotMatch(terms,/notFound\(/);
  assert.match(privacy,/robots:\{index:false,follow:true\}/);
  assert.match(terms,/robots:\{index:false,follow:true\}/);
  assert.match(privacy,/Storefront contact & current status/);
  assert.match(terms,/Current storefront status/);
  assert.match(privacy,/manager\.feya@gmail\.com/);
  assert.match(terms,/manager\.feya@gmail\.com/);
  assert.match(privacy,/Google API \/ Google Ads access/);
});

test('analytics stays fail-closed until the actual privacy-controller identity is confirmed',()=>{
  const layout=readFileSync('app/layout.tsx','utf8');
  const privacy=readFileSync('app/privacy/page.tsx','utf8');
  const measurement=readFileSync('app/api/measurement/context/route.ts','utf8');

  assert.match(layout,/getStorefrontAnalyticsState\(\)\.enabled/);
  assert.match(privacy,/getPublicPrivacyController\(\)/);
  assert.match(privacy,/const analyticsReady=getStorefrontAnalyticsState\(\)\.enabled/);
  assert.match(measurement,/const analyticsState=getStorefrontAnalyticsState\(\)/);
  assert.doesNotMatch(layout,/publicLegalIdentityReady/);
});

test('Seller Online disclosure requires explicit role confirmation in addition to the payment switch',()=>{
  const provider=readFileSync('lib/sellerOnlineProvider.ts','utf8');
  assert.match(provider,/FEYA_SELLER_ONLINE_ROLE_CONFIRMED/);
  assert.match(provider,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
  assert.match(provider,/merchantOfRecordConfirmed: false/);
  assert.match(provider,/authorized payment recipient, payment processing and logistics partner/);
  assert.match(provider,/officialConfirmationDate: '2026-10-09'/);
  assert.match(provider,/approvedCheckoutDisclosure:/);
});

test('homepage footer exposes OAuth-required privacy and terms links without reopening checkout',()=>{
  const footer=readFileSync('components/Footer.tsx','utf8');
  assert.match(footer,/href="\/privacy"/);
  assert.match(footer,/href="\/terms"/);
  assert.match(footer,/Checkout not active/);
  assert.doesNotMatch(footer,/Pre-index storefront/);
});
