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
  assert.match(about,/lg:grid-cols-\[minmax\(0,1.08fr\)_minmax\(0,.92fr\)\]/);
  assert.match(about,/<Icon size=\{36\}/);
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
