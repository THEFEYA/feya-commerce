import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('public legal identity is explicit, complete and fail-closed',async()=>{
  const identity=await readFile(new URL('../../lib/publicLegalIdentity.ts',import.meta.url),'utf8');
  assert.match(identity,/FEYA_PUBLIC_LEGAL_IDENTITY_CONFIRMED!=='true'/);
  for(const field of [
    'FEYA_PUBLIC_LEGAL_NAME',
    'FEYA_PUBLIC_LEGAL_ADDRESS_LINE1',
    'FEYA_PUBLIC_LEGAL_ADDRESS_CITY',
    'FEYA_PUBLIC_LEGAL_ADDRESS_POSTAL_CODE',
    'FEYA_PUBLIC_LEGAL_ADDRESS_COUNTRY',
  ])assert.match(identity,new RegExp(field));
  assert.match(identity,/if\(!legalName\|\|!line1\|\|!city\|\|!postalCode\|\|!country\)return null/);
  assert.match(identity,/manager\.feya@gmail\.com/);
});

test('Terms and Privacy stay public without inventing a seller identity',async()=>{
  for(const path of ['../../app/terms/page.tsx','../../app/privacy/page.tsx']){
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    assert.match(source,/getPublicLegalIdentity\(\)/);
    assert.doesNotMatch(source,/notFound\(/);
    assert.match(source,/robots:\{index:false,follow:true\}/);
    assert.match(source,/manager\.feya@gmail\.com/);
    assert.doesNotMatch(source,/TODO|PLACEHOLDER|YOUR COMPANY|COMPANY NAME/i);
  }
});

test('Seller Online disclosure requires both payment enablement and confirmed public role',async()=>{
  const terms=await readFile(new URL('../../app/terms/page.tsx',import.meta.url),'utf8');
  const privacy=await readFile(new URL('../../app/privacy/page.tsx',import.meta.url),'utf8');
  const provider=await readFile(new URL('../../lib/sellerOnlineProvider.ts',import.meta.url),'utf8');
  for(const source of [terms,privacy]){
    assert.match(source,/isSellerOnlinePaymentsEnabled\(\)/);
    assert.match(source,/sellerOnlineEnabled\?/);
    assert.match(source,/SELLER_ONLINE_PROVIDER/);
  }
  assert.match(provider,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
  assert.match(provider,/FEYA_SELLER_ONLINE_ROLE_CONFIRMED/);
});

test('legal shell preserves confirmed store policy sources without inventing governing jurisdiction',async()=>{
  const terms=await readFile(new URL('../../app/terms/page.tsx',import.meta.url),'utf8');
  assert.match(terms,/\/returns/);
  assert.match(terms,/\/shipping/);
  assert.match(terms,/mandatory|cannot legally be waived/i);
  assert.doesNotMatch(terms,/governed by the laws of|exclusive jurisdiction|courts of/i);
});
