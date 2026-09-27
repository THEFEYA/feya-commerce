import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('missing storefront products return a real Next 404 instead of a soft-404 page',async()=>{
  const source=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(source,/if \(error === 'Product not found\.'\) notFound\(\)/);
  assert.match(source,/if \(!product\) notFound\(\)/);
  assert.doesNotMatch(source,/Product not found\. <Link/);
});

test('storefront data-read failures do not masquerade as successful HTML',async()=>{
  const source=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(source,/throw new Error\(\`STOREFRONT_PRODUCT_READ_FAILED:\$\{error\}\`\)/);
});
