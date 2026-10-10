import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  OWNER_CART_STORAGE_KEY,OWNER_CART_COUNTRIES,OWNER_CART_REGIONS,
  isOwnerRealCartReviewDeployment,ownerCartAddressRegions,
  ownerCartVisualTotals,parseOwnerCartStorage,
} from '../../lib/commerceOwnerCartReview.ts';

const A='0403df9f-3ff9-498d-b3d9-69ad64b3dd4c';
const B='09f51ad4-6b90-4311-aa5a-54f91cf4b7bf';
const c1='d04a6d88-c5eb-4846-8085-a48b0de869b7';
const c2='fc29dc91-5b12-4afc-8975-bf70564b477b';
const line=(id=A,config=c1,extra:Record<string,unknown>={})=>({
  id:`${id}-${config}-M-Gold`,
  slug:'cosmic-festival-outfit-with-top-skirt-metallic-costume-set-4367470907',
  title:'Cosmic Festival Outfit',
  image:'https://example.com/approved-photo.jpg',
  config:'Top + Skirt',size:'M',color:'Gold',
  qty:1,price:135.50,currency:'EUR',configuration_id:config,
  unit_price_amount:135.5,
  ...extra,
});

test('real PDP local cart parser reads EXACT variant identity, no untrusted contact payload',()=>{
  const raw=line();
  const parsed=parseOwnerCartStorage([raw]);
  assert.equal(parsed.invalid_count,0);
  assert.equal(parsed.items.length,1);
  const saved=parsed.items[0];
  assert.equal(saved.canonical_product_id,A);
  assert.equal(saved.configuration_id,c1);
  assert.equal(saved.config,'Top + Skirt');
  assert.equal(saved.size,'M');assert.equal(saved.color,'Gold');
  assert.equal(saved.qty,1);
  assert.equal(saved.price,135.5);assert.equal(saved.currency,'EUR');
  assert.equal(saved.image,'https://example.com/approved-photo.jpg');
  assert.equal(OWNER_CART_STORAGE_KEY,'feya_visual_cart_v1');
  assert.equal('email' in saved,false);
  assert.equal('address' in saved,false);
});
test('zero extra packaging for one listing regardless of 2 variants or 8 units',()=>{
  const raw=[line(A,c1,{qty:5}),line(A,'2fe12e03-76f0-4143-a9a9-f974f622c5f2',{
    id:`${A}-2fe12e03-76f0-4143-a9a9-f974f622c5f2-L-Silver`,
    color:'Silver',size:'L',config:'Top',price:79,unit_price_amount:79,qty:3,
  })];
  const parsed=parseOwnerCartStorage(raw);
  assert.equal(parsed.invalid_count,0);
  const total=ownerCartVisualTotals(parsed.items,'standard');
  assert.equal(total.distinct_listing_count,1);
  assert.equal(total.handling_minor,0);
  assert.equal(total.show_handling_fee,false);
  assert.equal(total.shipping_minor,1900);
  assert.equal(total.merchandise_subtotal_minor,13550*5+7900*3);
  assert.equal(total.taxes_minor,null);
  assert.equal(total.amount_due_minor,null);
  assert.equal(total.server_price_verified,false);
  assert.equal(total.payable,false);
  assert.equal(total.payment_enabled,false);
});
test('2 different listings => €5, 3 => €10; Express €35 does not require a distinct carrier',()=>{
  const ids=[A,B,'0395cb11-424f-407f-a849-7ee3b617ab57'];
  const lines=parseOwnerCartStorage(ids.map((id,i)=>line(id,i===0?c1:i===1?c2:'7faba4bd-2089-423b-bb29-2e2546fb48e1',{
    id:`${id}-${i}-M-Gold`,configuration_id:null,
  }))).items;
  assert.equal(lines.length,3);
  assert.equal(ownerCartVisualTotals(lines.slice(0,2),'standard').handling_minor,500);
  assert.equal(ownerCartVisualTotals(lines.slice(0,3),'express').handling_minor,1000);
  assert.equal(ownerCartVisualTotals(lines.slice(0,3),'express').shipping_minor,3500);
  assert.equal(ownerCartVisualTotals(lines.slice(0,3),'express').provider_session_enabled,false);
  assert.equal(ownerCartVisualTotals([],'express').shipping_minor,0);
  assert.equal(ownerCartVisualTotals([],'express').show_handling_fee,false);
});
test('invalid/malicious local storage never creates payable money, links or tracking',()=>{
  for(const invalid of [
    line(A,c1,{price:0}),
    line(A,c1,{price:Infinity}),
    line(A,c1,{price:100_000}),
    line(A,c1,{currency:'USD'}),
    line(A,c1,{qty:0}),
    line(A,c1,{qty:200}),
    line(A,c1,{slug:'javascript:alert(1)'}),
    line(A,c1,{configuration_id:'not-uuid'}),
    line(A,c1,{unit_price_amount:0.01}),
    line(A,c1,{id:'just-a-title'}),
    line(A,c1,{title:''}),
  ])assert.equal(parseOwnerCartStorage([invalid]).invalid_count,1);
  const duplicate=line();
  assert.equal(parseOwnerCartStorage([duplicate,duplicate]).invalid_count,1);
  assert.equal(parseOwnerCartStorage({cart:['invalid']}).invalid_count,1);
  assert.deepEqual(parseOwnerCartStorage(null),{items:[],invalid_count:0});
  assert.equal(parseOwnerCartStorage(Array(41).fill(duplicate)).items.length,0);
  assert.equal(parseOwnerCartStorage([line(A,c1,{image:'javascript:alert(1)'})]).items[0].image,'');
});
test('country UI has source ISO labels, hard-blocked exporters omitted, specific USA/CA/AU conditional regions',()=>{
  for(const country of ['US','CA','AU','GB','DE','ES','MX','NZ']){
    assert.ok(OWNER_CART_COUNTRIES.includes(country),country);
  }
  for(const country of ['RU','BY','KP','UA','SY','IR']){
    assert.ok(!OWNER_CART_COUNTRIES.includes(country),country);
  }
  assert.ok(OWNER_CART_COUNTRIES.length>150);
  assert.ok(OWNER_CART_REGIONS.US.length>=50);
  assert.equal(OWNER_CART_REGIONS.CA.length,13);
  assert.equal(OWNER_CART_REGIONS.AU.length,8);
  assert.equal(ownerCartAddressRegions('DE').length,0);
  assert.equal(ownerCartAddressRegions('ES').length,0);
  assert.ok(ownerCartAddressRegions('US').some(([code])=>code==='CA'));
  assert.ok(ownerCartAddressRegions('CA').some(([code])=>code==='ON'));
  assert.ok(ownerCartAddressRegions('AU').some(([code])=>code==='NSW'));
});
test('strict single owner branch; public thefeya.com /cart must remain disabled',()=>{
  const env={
    VERCEL:'1',VERCEL_ENV:'preview',
    VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
    VERCEL_GIT_COMMIT_REF:'work/m2-real-bag-owner-preview-20261010',
  };
  assert.equal(isOwnerRealCartReviewDeployment(env),true);
  assert.equal(isOwnerRealCartReviewDeployment({}),false);
  for(const bad of [
    {VERCEL:'0'},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},
    {VERCEL_PROJECT_ID:'different-project'},
    {VERCEL_GIT_COMMIT_REF:'main'},
    {FEYA_OWNER_PREVIEW_DISABLED:'true'},
  ])assert.equal(isOwnerRealCartReviewDeployment({...env,...bad}),false);
  const cart=readFileSync('app/cart/page.tsx','utf8');
  assert.match(cart,/isOwnerRealCartReviewDeployment\(process\.env\)/);
  assert.match(cart,/<CartOwnerLiveReviewClient\/>/);
  assert.match(cart,/Online checkout is not active yet/);
  assert.match(cart,/robots:\{index:false,follow:false\}/);
  const prodPdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(prodPdp,/feya_visual_cart_v1/);
  assert.match(prodPdp,/addToBag/);
});
test('preview UX never transmits customer PII, real payment or newsletter signup',()=>{
  const src=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  assert.match(src,/parseOwnerCartStorage/);
  assert.match(src,/ownerCartVisualTotals/);
  assert.match(src,/totals\.show_handling_fee&&/);
  assert.match(src,/Additional packaging for multiple items/);
  assert.match(src,/No payments or orders are accepted/);
  assert.match(src,/never saved/);
  assert.match(src,/marketingConsent,setMarketingConsent/);
  assert.match(src,/acceptedTerms,setAcceptedTerms/);
  assert.match(src,/aria-disabled="true" disabled/);
  assert.match(src,/Checkout not active/);
  assert.match(src,/\/privacy/);
  assert.match(src,/Change|Edit options/);
  assert.doesNotMatch(src,/fetch\(|sendBeacon\(|FormData\(|subscribe\(|localStorage\.setItem\([^\n]*email/);
});
