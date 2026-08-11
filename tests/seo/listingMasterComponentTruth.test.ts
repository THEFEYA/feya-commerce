import assert from 'node:assert/strict';
import test from 'node:test';
import {
  productComponentAssertionScope,
  resolveSelectedComponentFamilies,
} from '../../lib/listingMasterComponentTruth.ts';

const families = [
  { component_family_id: '1', canonical_name: 'Shoulder', normalized_name: 'shoulder' },
  { component_family_id: '2', canonical_name: 'Shoulders', normalized_name: 'shoulders' },
  { component_family_id: '3', canonical_name: 'Harness Top', normalized_name: 'harness top' },
  { component_family_id: '4', canonical_name: 'Skirt', normalized_name: 'skirt' },
  { component_family_id: '5', canonical_name: 'Arm Set', normalized_name: 'arm set' },
  { component_family_id: '6', canonical_name: 'Bracelet / Cuff', normalized_name: 'bracelet / cuff' },
  { component_family_id: '7', canonical_name: 'Glove', normalized_name: 'glove' },
];

test('configuration products store selected chips as canonical listing composition', () => {
  assert.equal(productComponentAssertionScope([
    { detected_canonical_axis: 'configuration', raw_value: 'Full Set' },
  ]), 'canonical_listing');
});

test('size-only products store selected chips as fixed base composition', () => {
  assert.equal(productComponentAssertionScope([
    { detected_canonical_axis: 'size', raw_value: 'M' },
  ]), 'fixed_base');
});

test('raw source set choices fail closed as canonical listing composition', () => {
  assert.equal(productComponentAssertionScope([], [
    {
      raw_variation_name: 'Choose Your Set',
      values: ['Shoulders', 'Skirt', 'Shoulders & Skirt', 'Full Set'],
    },
  ]), 'canonical_listing');
});

test('size and color source choices do not manufacture listing composition', () => {
  assert.equal(productComponentAssertionScope([], [
    { raw_variation_name: 'Size', values: ['XS', 'S', 'M'] },
    { raw_variation_name: 'Color', values: ['Gold', 'Silver'] },
  ]), 'fixed_base');
});

test('component family resolution follows existing Product Truth grammar', () => {
  const result = resolveSelectedComponentFamilies(
    ['shoulders', 'harness', 'skirt'],
    families,
    ['Shoulders', 'Skirt'],
  );

  assert.deepEqual(
    result.map((item) => item.family?.canonical_name),
    ['Shoulders', 'Harness Top', 'Skirt'],
  );
  assert.ok(result.every((item) => item.error === null));
});

test('ambiguous shoulder grammar fails closed without product evidence', () => {
  const [result] = resolveSelectedComponentFamilies(['shoulders'], families);
  assert.equal(result.family, null);
  assert.match(result.error || '', /неоднозначен/);
});

test('mapped bracelet leaf resolves Arms focus to Bracelet / Cuff', () => {
  const [result] = resolveSelectedComponentFamilies(
    ['arms'],
    families,
    ['Arms', 'bracelet'],
  );

  assert.equal(result.family?.canonical_name, 'Bracelet / Cuff');
  assert.equal(result.error, null);
});

test('generic Arms evidence remains ambiguous and never invents a leaf family', () => {
  const [result] = resolveSelectedComponentFamilies(['arms'], families, ['Arms']);

  assert.equal(result.family, null);
  assert.match(result.error || '', /неоднозначен/);
});

test('unsupported focus chips never invent a component family', () => {
  const [result] = resolveSelectedComponentFamilies(['bra'], families);
  assert.equal(result.family, null);
  assert.match(result.error || '', /нет однозначного/);
});
