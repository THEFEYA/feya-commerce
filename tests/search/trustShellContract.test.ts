import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const trustPages=[
  ['about','About TheFEYA'],
  ['size-guide','Measurements & Size Guide'],
  ['care','Care & Storage'],
  ['shipping','Shipping & Delivery'],
  ['returns','Returns & Exchanges'],
  ['contact','Contact'],
];

test('Phase F trust pages exist and can index only through the active release manifest',async()=>{
  for(const [slug,h1] of trustPages){
    const source=await readFile(new URL('../../app/'+slug+'/page.tsx',import.meta.url),'utf8');
    assert.ok(source.includes("releaseRobotsForPath('/"+slug+"')"),slug+': release-aware robots');
    assert.ok(source.includes(h1),slug+': expected H1');
  }
});

test('public trust shell uses confirmed store contact and does not invent seller identity',async()=>{
  const contact=await readFile(new URL('../../app/contact/page.tsx',import.meta.url),'utf8');
  const about=await readFile(new URL('../../app/about/page.tsx',import.meta.url),'utf8');
  assert.match(contact,/manager\.feya@gmail\.com/);
  assert.doesNotMatch(about,/Seller-Online LLC|contracting seller|legal entity/i);
});

test('collection previews expose crawlable pre-order trust links',async()=>{
  const page=await readFile(new URL('../../app/collections/[slug]/page.tsx',import.meta.url),'utf8');
  for(const href of ['/size-guide','/care','/shipping','/returns','/contact']){
    assert.ok(page.includes('href="'+href+'"'),'missing trust link '+href);
  }
});
