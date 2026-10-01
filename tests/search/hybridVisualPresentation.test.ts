import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { HOME_PRESENTATION, homePresentationProductIds } from '../../config/homePresentation.ts';

test('home visual presentation uses stable real product IDs and governed destinations', () => {
  const ids = homePresentationProductIds();
  assert.ok(ids.length >= 12);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[0-9a-f-]{36}$/i.test(id)));

  assert.deepEqual(
    HOME_PRESENTATION.pieceTiles.map((item) => item.label),
    ['Full Looks','Bodysuits','Shoulders','Headpieces','Masks','Skirts'],
  );
  assert.equal(HOME_PRESENTATION.pieceTiles.find((item) => item.label === 'Shoulders')?.href, '/collections/shoulder-armor');

  assert.deepEqual(
    HOME_PRESENTATION.findTiles.map(({axis,label}) => ({axis,label})),
    [
      {axis:'Style',label:'Futuristic'},
      {axis:'Style',label:'Cyberpunk'},
      {axis:'Performance',label:'Showgirl'},
      {axis:'Persona',label:'Warrior'},
    ],
  );
});

test('hybrid homepage keeps the real ProductCard for Selected Pieces', () => {
  const source = readFileSync('app/page.tsx','utf8');
  assert.match(source,/import \{ ProductCard \}/);
  assert.match(source,/HOME_PRESENTATION\.selectedProductIds/);
  assert.match(source,/<ProductCard key=\{product\.canonical_product_id\}/);
  assert.doesNotMatch(source,/Best Sellers|Most Popular|Recommended Pieces/);
});

test('PDP implementation remains structurally frozen in the visual prototype', () => {
  const manifest = JSON.parse(readFileSync('config/product-os-ui-freeze.json','utf8'));
  assert.ok(manifest.files['components/ProductDetailClient.tsx']);
});
