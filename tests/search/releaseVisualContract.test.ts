import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

function gitBlobSha(buffer: Buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

test('release storefront surfaces match the owner-approved visual freeze manifest', () => {
  const manifest = JSON.parse(readFileSync('config/product-os-ui-freeze.json', 'utf8'));
  const storefrontSurfaces = [
    'app/page.tsx',
    'app/shop/page.tsx',
    'app/shop/[slug]/page.tsx',
    'components/Header.tsx',
    'components/Footer.tsx',
    'components/ShopClient.tsx',
    'components/ProductCard.tsx',
    'components/ProductDetailClient.tsx',
  ];

  const prototypeBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
  const isVisualPrototype = prototypeBranch === 'design/hybrid-visual-integration-20260928';
  const explicitlyMutablePrototypeSurfaces = new Set([
    'app/page.tsx',
    'components/Header.tsx',
    'components/Footer.tsx',
    'components/ShopClient.tsx',
    'components/ProductDetailClient.tsx',
  ]);

  for (const path of storefrontSurfaces) {
    const expected = manifest.files[path];
    assert.ok(expected, `visual freeze manifest missing ${path}`);

    if (isVisualPrototype && explicitlyMutablePrototypeSurfaces.has(path)) {
      assert.notEqual(gitBlobSha(readFileSync(path)), expected, `${path} should remain a prototype-only visual change until owner approval`);
      continue;
    }

    assert.equal(gitBlobSha(readFileSync(path)), expected, path);
  }

  const pagination = readFileSync('components/ShopPagination.tsx', 'utf8');
  assert.ok(pagination.includes('aria-label="Catalog pages"'));
  assert.equal((pagination.match(/className="btn-ghost"/g) || []).length, 2);
});
