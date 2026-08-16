import assert from 'node:assert/strict';
import test from 'node:test';
import { colorLabel, colorOptions } from '../../lib/storefront.ts';

test('brown leather title remains Brown when imported color is empty', () => {
  const product = {
    card_title: 'Deluxe Leather Harness for Men – Vintage Brown Leather Harness',
    material: 'Natural Leather',
    color: null,
    canonical_color_label: null,
    color_options: null,
  } as any;

  assert.equal(colorLabel(product), 'Brown');
  assert.deepEqual(colorOptions(product), ['Brown']);
});
