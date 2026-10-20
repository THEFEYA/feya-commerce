import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  isApprovedV13Presentation,isOwnerColorV13Preview,OWNER_COLOR_V13_PREVIEW_BRANCH,PUBLIC_V13_PROJECT,
} from '../../lib/approvedV13Presentation.ts';

const file=(path:string)=>readFileSync(path,'utf8');
const base={VERCEL:'1',VERCEL_PROJECT_ID:PUBLIC_V13_PROJECT,VERCEL_ENV:'preview'};

test('color preview inherits EXACT approved V13 shell, and neither public nor unrelated preview can borrow it',()=>{
  const allowed={...base,VERCEL_GIT_COMMIT_REF:OWNER_COLOR_V13_PREVIEW_BRANCH};
  assert.equal(isApprovedV13Presentation(allowed),true);
  assert.equal(isOwnerColorV13Preview(allowed),true);
  assert.equal(isOwnerColorV13Preview({...allowed,VERCEL_ENV:'production'}),false);
  assert.equal(isOwnerColorV13Preview({...allowed,FEYA_OWNER_PREVIEW_DISABLED:'true'}),false);
  assert.equal(isApprovedV13Presentation({...base,VERCEL_GIT_COMMIT_REF:'random-preview'}),false);
  const config=file('next.config.ts');
  assert.match(config,/work\/bonanza-color-variants-20261020/);
  assert.match(config,/NEXT_PUBLIC_FEYA_V13_PUBLIC_DESIGN/);
  assert.match(file('app/template.tsx'),/isApprovedV13Presentation\(process\.env\)/);
  assert.match(file('app/v13Public.css'),/thefeya-approved-logo-transparent\.webp/);
  assert.match(file('components/OwnerV13StyleHub.tsx'),/<OwnerDiscoveryTileStrip tiles=\{OWNER_STYLE_HUB_TILES\}/);
  assert.match(file('components/OwnerV13EventsHub.tsx'),/<OwnerDiscoveryTileStrip tiles=\{OWNER_EVENTS_HUB_TILES\}/);
  assert.match(file('app/about/layout.tsx'),/OwnerAboutReview/);
});

test('complete approved Contact remains preview-only and retains both original location pins',()=>{
  const layout=file('app/contact/layout.tsx');
  const approved=file('components/ApprovedOwnerContactPreview.tsx');
  const maps=file('components/ApprovedOwnerLocationMapPreview.tsx');
  const publicContact=file('components/ContactExperienceV13Public.tsx');
  assert.match(layout,/isOwnerColorV13Preview\(process\.env\)/);
  assert.match(layout,/<ApprovedOwnerContactPreview\/>/);
  assert.match(layout,/<ContactExperienceV13Public\/>/);
  assert.match(approved,/Explore our locations/);
  assert.match(approved,/OwnerContactFormPreview/);
  assert.match(approved,/OwnerNewsletterSignupPreview/);
  assert.match(approved,/location="kyiv"/);
  assert.match(approved,/location="us-warehouse"/);
  assert.match(approved,/Partner fulfillment address, not a TheFEYA showroom/);
  assert.match(maps,/IntersectionObserver/);
  assert.match(maps,/loading="lazy"/);
  assert.match(maps,/onLoad=\{\(\)=>setReady\(true\)\}/);
  assert.match(maps,/query_place_id/);
  assert.ok(!publicContact.includes('635 Somers'), 'Unconfirmed partner address stays out of public Contact');
  assert.match(file('app/shipping-public-v13/page.tsx'),/Standard Shipping/);
});

test('paired configuration and consent display follow approved V13 visual sizing without payment activation',()=>{
  const pair=file('components/CouplePartnerColorSelector.tsx');
  const cart=file('components/CartOwnerLiveReviewClient.tsx');
  const pdp=file('components/ProductDetailClient.tsx');
  const shop=file('components/ShopClient.tsx');
  assert.match(pair,/size=\{20\}/);
  assert.match(pair,/width=\{16\} height=\{16\}/);
  assert.match(pair,/const summary=/);
  assert.match(pair,/role="listbox"/);
  assert.match(pair,/min-h-\[27px\]/);
  assert.match(pair,/text-\[#e4c17a\]/);
  assert.doesNotMatch(pair,/<select value=/);
  assert.match(pdp,/setCustomMeasurementsEnabled\(nextWomen==='Custom'\|\|nextMen==='Custom'\)/);
  assert.match(cart,/function RequiredMark\(\)/);
  assert.match(cart,/className="sr-only">Required:/);
  assert.match(cart,/I have read the/);
  assert.match(cart,/I would like to receive TheFEYA news/);
  assert.doesNotMatch(cart,/Necessary contact details are not stored/);
  assert.doesNotMatch(cart,/Optional: I would like/);
  assert.match(cart,/required checked=\{acceptedTerms\}/);
  assert.match(cart,/Checkout not active/);
  assert.match(shop,/main preview/);
  assert.match(shop,/Include other available colors/);
});
