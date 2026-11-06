import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('Phase 11 PDP emits truthful Product plus BreadcrumbList; Offer only via governed helper on purchasable pages',async()=>{
  const pdp=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');

  assert.match(pdp,/"@type": 'Product'|\'@type\': 'Product'/);
  assert.match(pdp,/BreadcrumbList/);
  assert.match(pdp,/itemListElement/);
  assert.match(pdp,/canonicalProductUrl\(slug\)/);

  // Checkout is live since the Seller-Online launch: the Offer is attached only
  // through the governed helper (preselected configuration, exact EUR price)
  // and only on purchasable pages; the route never inlines an Offer literal.
  assert.match(pdp,/const offers = purchasable && landing\.status!=='invalid' && landingMedia\.status!=='invalid'\s*\? pdpOfferJsonLd\(product, canonicalProductUrl\(slug\), initialLandingSelection\) : null;/);
  assert.match(pdp,/if \(offers\) jsonLd\.offers = offers;/);
  assert.doesNotMatch(pdp,/['"]@type['"]:\s*['"]Offer['"]/);
  assert.doesNotMatch(pdp,/["']@type["']:\s*["']ProductGroup["']/);
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
