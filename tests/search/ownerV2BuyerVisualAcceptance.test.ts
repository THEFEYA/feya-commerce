import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('Contact puts direct contact and question form alongside, then maps and newsletter, then subdued operator',()=>{
  const src=read('components/ContactExperience2026.tsx');
  assert.match(src,/grid-cols-\[minmax\(0,.85fr\)_minmax\(0,1.15fr\)\]/);
  assert.match(src,/OwnerContactFormPreview/);
  assert.match(src,/CopySupportEmailButton email=\{contactEmail\}/);
  assert.match(src,/CopySupportEmailButton email=\{supportPhone\} label="phone number"/);
  assert.match(src,/href="https:\/\/wa.me\/380636556288"/);
  assert.match(src,/OwnerNewsletterSignupPreview/);
  assert.ok(src.indexOf('<OwnerContactFormPreview/>')<src.indexOf('OwnerLocationMapPreview location="kyiv"'));
  assert.ok(src.indexOf('OwnerLocationMapPreview location="us-warehouse"')<src.lastIndexOf('<OwnerNewsletterSignupPreview/>'));
  assert.ok(src.indexOf('<OwnerNewsletterSignupPreview/>')<src.indexOf('payment-operator-heading'));
  assert.match(src,/op\.contactAddress\.postalCode/);
  assert.match(src,/Online payments on thefeya.com are not active yet/);
});

test('Newsletter is honest: independent opt-in, no pretend subscription or data transmission',()=>{
  const src=read('components/OwnerNewsletterSignupPreview.tsx');
  assert.match(src,/type="email" required/);
  assert.match(src,/type="checkbox" checked=\{consent\}/);
  assert.match(src,/Subscribe/);
  assert.match(src,/Nothing has been stored or sent yet/);
  assert.doesNotMatch(src,/fetch\(|localStorage|subscribeEmail\(|sessionStorage/);
});

test('About combines actual studio story with mission, modern consistent 36px icons, no inline studio link',()=>{
  const src=read('components/OwnerEditorialReviewPages.tsx');
  const start=src.indexOf('export function OwnerAboutReview()');
  const end=src.indexOf('const policySections=[',start);
  assert.ok(start>=0&&end>start);
  const about=src.slice(start,end);
  assert.match(about,/About TheFEYA/);
  assert.match(about,/Our mission/);
  assert.match(about,/creative team specializing in handmade/);
  assert.match(about,/Our mission/);
  assert.doesNotMatch(about,/lg:grid-cols-\[minmax\(0,1.08fr\)_minmax\(0,.92fr\)\]/);
  assert.match(about,/<Icon size=\{29\}/);
  assert.doesNotMatch(about,/>Ask our studio<\/Link>/);
});

test('Style and Events hub SEO is responsive continuous SSR text, one arrow disclosure, no boxed keywords',()=>{
  const src=read('components/OwnerHubSeoText.tsx');
  assert.match(src,/<details className="group/);
  assert.match(src,/<summary aria-label=/);
  assert.match(src,/<ChevronDown size=\{23\}/);
  assert.match(src,/max-w-\[1100px\]/);
  assert.doesNotMatch(src,/rounded-xl border/);
  assert.doesNotMatch(src,/Read more about/);
  for(const path of ['app/style-review/page.tsx','app/events-performance-review/page.tsx']){
    const page=read(path);
    assert.match(page,/owner-hub-products/);
    assert.match(page,/pb-0 pt-2/);
    assert.match(page,/<OwnerHubSeoText kind=/);
    assert.match(page,/index:false,follow:false/);
  }
});

test('owner cart is compact and photos larger without losing multiple-item lists',()=>{
  const source=read('components/CartOwnerLiveReviewClient.tsx');
  assert.match(source,/lg:pt-28/);
  assert.match(source,/sm:h-\\[172px\\] sm:w-\\[136px\\]/);
  assert.match(source,/aria-labelledby="owner-cart-extras-title"/);
  assert.match(source,/sm:grid-cols-2/);
  assert.match(source,/customFitIds.includes\\(item.id\\)/);
  assert.match(source,/Gift message card/);
  assert.match(source,/Gift box/);
});

test('only the protected owner style sheet compacts collection whitespace and expands collection intro',()=>{
  const css=read('app/ownerVisualPreviewV2.css');
  assert.match(css,/column-count: 2/);
  assert.match(css,/nav\\[aria-label="Breadcrumb"\\]/);
  assert.match(css,/section:nth-of-type\\(5\\)/);
  assert.match(css,/section:nth-of-type\\(6\\)/);
});

test('owner visual About and Shipping headings align with compact icons instead of stacked spacers',()=>{
  const about=read('components/OwnerEditorialReviewPages.tsx');
  const shipping=read('app/shipping-review/page.tsx');
  assert.match(about,/flex items-center gap-4/);
  assert.match(about,/h-14 w-14/);
  assert.doesNotMatch(about,/mt-6 text-\[clamp\(20px,2.1vw,25px\)\]/);
  assert.match(shipping,/Handmade for you/);
  assert.match(shipping,/flex items-center gap-4/);
  assert.doesNotMatch(shipping,/eyebrow-gold mt-6">Handmade for you/);
  assert.match(shipping,/6–9 working days/);
});

test('PDP recovery only engages on the authenticated owner visual branch and never changes public SEO pins',()=>{
 const page=read('app/shop/[slug]/page.tsx');
 const card=read('components/ProductCard.tsx');
 const error=read('app/shop/[slug]/error.tsx');
 assert.match(page,/isOwnerUnifiedStorefrontPreview\(process\.env\)/);
 assert.match(page,/ownerV2RequestPresentation/);
 assert.match(page,/readCachedStorefrontProductMetadataV1/);
 assert.match(card,/NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW !== '1'/);
 assert.match(error,/window\.sessionStorage\.getItem/);
 assert.match(error,/15000/);
 assert.match(error,/reset\(\)/);
 assert.match(error,/We couldn’t open this item/);
});
