import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  THEFEYA_CANONICAL_RIGHT_PDP_PANEL,
  buildThefeyaSeoDoctrineUserLines,
  resolveThefeyaRightPdpPanel,
} from '../../lib/thefeyaSeoDoctrine.ts';

function blockBody(productId: string, blockKey: string) {
  return resolveThefeyaRightPdpPanel({ canonical_product_id: productId })
    .find((block) => block.block_key === blockKey)?.body || '';
}

test('arm and leg armor uses current owner-confirmed glossy vegan leather without fixing all variants to one color', () => {
  const id = 'a83b1b51-79be-4cae-a943-661060a34080';
  const material = blockBody(id, 'material');
  assert.match(material, /Glossy vegan-leather armor panels/);
  assert.match(material, /black straps with buckle fastenings/);
  assert.doesNotMatch(material, /acrylic|plastic|gold|silver/i);
  assert.ok(buildThefeyaSeoDoctrineUserLines({ canonical_product_id: id }).join('\n').includes(material));
});

test('storefront panel and writer use the active fulfillment truth with the original day units', () => {
  const capture = JSON.parse(readFileSync('docs/search/fulfillment-truth-capture-20260924.json', 'utf8'));
  const registry = JSON.parse(readFileSync('docs/search/inventory-capture-20260924.json', 'utf8')).business_truth;
  // Includes ordinary products and a product-specific material/fit override.
  for (const id of ['ordinary-product', 'ffa74da5-c2e1-4c3a-b460-50d1aae09f56']) {
    const panel = resolveThefeyaRightPdpPanel({ canonical_product_id: id });
    const prompt = buildThefeyaSeoDoctrineUserLines({ canonical_product_id: id }).join('\n');
    for (const row of capture.rows) {
      const original = registry.find((r: any) => r.truth_code === row.truth_code);
      assert.equal(row.status, 'ACTIVE'); assert.equal(row.valid_to, null);
      assert.equal(row.version_no, original.version_no);
      const block = panel.find(b => b.block_key === (row.truth_type === 'PRODUCTION' ? 'production_timing' : 'shipping_delivery'));
      assert.ok(block?.lines.includes(row.public_copy), row.truth_code);
      assert.ok(prompt.includes(row.public_copy), row.truth_code);
    }
    assert.doesNotMatch(prompt, /3[-–]5 business days|6[-–]9 business days/);
  }
  assert.equal(registry.find((r: any) => r.truth_code === 'STANDARD_MADE_TO_ORDER_PRODUCTION_TIME').value_json.day_type, 'unspecified');
});

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

test('green leather suspenders keep color-neutral real-leather material and care copy', () => {
  const id = 'ce0a2c0a-5a95-4876-a198-70be635ca053';
  assert.match(blockBody(id, 'material'), /made from natural leather/i);
  assert.match(blockBody(id, 'material'), /handmade/i);
  assert.doesNotMatch(blockBody(id, 'material'), /vegan|mirror/i);
  assert.match(blockBody(id, 'care'), /wipe the natural leather gently/i);
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

test('owner-confirmed gold acrylic costume uses precise material and gentle care in preview and writer', () => {
  const id = '27a8243e-e0d9-430c-a83e-6573ef8a48cb';
  const material = blockBody(id, 'material');
  assert.match(material, /acrylic, a type of plastic/i);
  assert.match(material, /glossy gold finish/i);
  assert.doesNotMatch(material, /vegan leather|reflective|catches.*light|soft against/i);
  assert.match(blockBody(id, 'care'), /Avoid abrasive cleaners, alcohol wipes and solvents/i);
  assert.doesNotMatch(blockBody(id, 'care'), /easy to remove with alcohol wipes/i);
  const prompt = buildThefeyaSeoDoctrineUserLines({ canonical_product_id: id }).join('\n');
  assert.ok(prompt.includes(material));
  assert.doesNotMatch(prompt, /We use durable vegan leather with a glossy mirror-like coating/i);
});
