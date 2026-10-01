import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('Phase 11 PDP emits truthful Product plus BreadcrumbList without premature merchant variant markup',async()=>{
  const pdp=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');

  assert.match(pdp,/"@type": 'Product'|\'@type\': 'Product'/);
  assert.match(pdp,/BreadcrumbList/);
  assert.match(pdp,/itemListElement/);
  assert.match(pdp,/canonicalProductUrl\(slug\)/);

  assert.doesNotMatch(pdp,/jsonLd\.offers\s*=/);
  assert.doesNotMatch(pdp,/['"]@type['"]:\s*['"]Offer['"]/);
  assert.doesNotMatch(pdp,/ProductGroup/);
  assert.doesNotMatch(pdp,/mainRegularPrice/);
});

test('Phase 11 collection pages stay list-focused and do not impersonate a single product',async()=>{
  const collection=await readFile(new URL('../../app/collections/[slug]/page.tsx',import.meta.url),'utf8');

  assert.match(collection,/BreadcrumbList/);
  assert.match(collection,/CollectionPage/);
  assert.match(collection,/ItemList/);
  assert.doesNotMatch(collection,/['"]@type['"]:\s*['"]Product['"]/);
  assert.doesNotMatch(collection,/['"]@type['"]:\s*['"]Offer['"]/);
});

test('Phase 11 retains governed homepage and trust metadata surfaces',async()=>{
  const paths=['../../app/page.tsx','../../app/about/page.tsx','../../app/shipping/page.tsx','../../app/returns/page.tsx','../../app/contact/page.tsx','../../app/size-guide/page.tsx','../../app/care/page.tsx'];
  const sources=await Promise.all(paths.map((path)=>readFile(new URL(path,import.meta.url),'utf8')));
  for(const source of sources){
    assert.match(source,/generateMetadata/);
    assert.match(source,/alternates:\s*\{\s*canonical:/);
    assert.match(source,/releaseRobotsForPath/);
    assert.match(source,/<h1\b/);
  }
});
