import assert from 'node:assert/strict';
import test from 'node:test';
import {
  THEFEYA_CANONICAL_RIGHT_PDP_PANEL,
  buildThefeyaSeoDoctrineUserLines,
  resolveThefeyaRightPdpPanel,
} from '../../lib/thefeyaSeoDoctrine.ts';

function blockBody(productId: string, blockKey: string) {
  return resolveThefeyaRightPdpPanel({ canonical_product_id: productId })
    .find((block) => block.block_key === blockKey)?.body || '';
}

test('ordinary products keep the canonical right-panel order and copy', () => {
  const resolved = resolveThefeyaRightPdpPanel({ canonical_product_id: 'ordinary-product' });
  assert.deepEqual(
    resolved.map((block) => block.block_key),
    THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => block.block_key),
  );
  assert.deepEqual(
    resolved.map((block) => block.body),
    THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => block.body),
  );
  assert.match(resolved[0].body, /Where the design uses straps/i);
});

test('brown leather harness never receives mirror vegan-leather care copy', () => {
  const id = 'de38a842-37c4-40a7-86b4-393341c4c9aa';
  assert.match(blockBody(id, 'material'), /made from brown leather/i);
  assert.doesNotMatch(blockBody(id, 'material'), /vegan|mirror/i);
  assert.match(blockBody(id, 'care'), /Do not use alcohol wipes/i);
});

test('green leather suspenders keep real-leather material and care copy', () => {
  const id = 'ce0a2c0a-5a95-4876-a198-70be635ca053';
  assert.match(blockBody(id, 'material'), /made from green leather/i);
  assert.match(blockBody(id, 'material'), /handmade/i);
  assert.doesNotMatch(blockBody(id, 'material'), /vegan|mirror/i);
  assert.match(blockBody(id, 'care'), /Do not use alcohol wipes/i);
});

test('dance costume keeps fabric base and coated details separate in the fixed panel', () => {
  const id = 'ffa74da5-c2e1-4c3a-b460-50d1aae09f56';
  const material = blockBody(id, 'material');
  assert.match(material, /stretch-fabric base/i);
  assert.match(material, /gold mirror-finish vegan leather details/i);
  assert.match(blockBody(id, 'sizing_fit'), /stretch-fabric base follows the selected size/i);
  assert.doesNotMatch(blockBody(id, 'care'), /alcohol wipes or a mild cleaning product/i);
});

test('witch costume names the fabric cape instead of calling every piece vegan leather', () => {
  const id = '2a39f8ec-b5c3-403c-8f1a-7e10bb0ab829';
  assert.match(blockBody(id, 'material'), /vegan leather pieces with a fabric cape/i);
  assert.match(blockBody(id, 'care'), /Clean the fabric cape separately/i);
});

test('feathered carnival costume keeps its stretch-fabric base separate from vegan-leather details', () => {
  const id = '7bc4e89c-155d-45b8-982f-46253b7ed18d';
  const material = blockBody(id, 'material');
  assert.match(material, /stretch-fabric base/i);
  assert.match(material, /feather-shaped vegan-leather details/i);
  assert.doesNotMatch(material, /We use durable vegan leather/i);
  assert.match(blockBody(id, 'care'), /paying separate attention to the stretch fabric/i);
  assert.doesNotMatch(blockBody(id, 'care'), /alcohol wipes or a mild cleaning product/i);
});

test('writer no-copy reference receives the same resolved product panel as storefront preview', () => {
  const id = 'ffa74da5-c2e1-4c3a-b460-50d1aae09f56';
  const prompt = buildThefeyaSeoDoctrineUserLines({ canonical_product_id: id }).join('\n');
  assert.match(prompt, /stretch-fabric base with selected gold mirror-finish vegan leather details/i);
  assert.doesNotMatch(prompt, /We use durable vegan leather with a glossy mirror-like coating/i);
});
