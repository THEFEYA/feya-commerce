import test from 'node:test';
import assert from 'node:assert/strict';
import {isSourceConfirmedPairedSet, parsePairedSetSelection} from '../../lib/payments/pairedSetSelection.ts';

const fits = {women: {size: 'S', color: 'Gold'}, men: {size: 'XL', color: 'Silver'}};

test('buyer pair keeps independently specified women and men sizes/colours', () => {
  assert.deepEqual(parsePairedSetSelection(fits), fits);
  assert.notDeepEqual(parsePairedSetSelection(fits)?.women, parsePairedSetSelection(fits)?.men);
});

test('malformed or tampered pairs do not silently become a single size', () => {
  assert.equal(parsePairedSetSelection({women: fits.women}), null);
  assert.equal(parsePairedSetSelection({women: fits.women, men: {size: 'XXXXL', color: 'Silver'}}), null);
  assert.equal(parsePairedSetSelection({...fits, total_minor: 1}), null);
  assert.equal(parsePairedSetSelection({women: {...fits.women, price: 1}, men: fits.men}), null);
  assert.equal(parsePairedSetSelection({women: fits.women, men: {size: 'M', color: '\u0000'}}), null);
});

test('only proven full sets with explicit women+men membership use paired checkout', () => {
  const verified = {
    is_full_set: true, source_confirmed_bundle_members: true,
    bundle_component_codes: ['women_outfit', 'men_outfit'], public_label: 'Paired Set',
  };
  assert.equal(isSourceConfirmedPairedSet(verified), true);
  assert.equal(isSourceConfirmedPairedSet({...verified, bundle_component_codes: ['womens_outfit', 'mens_outfit']}), true);
  assert.equal(isSourceConfirmedPairedSet({...verified, source_confirmed_bundle_members: false}), false);
  assert.equal(isSourceConfirmedPairedSet({...verified, bundle_component_codes: ['top', 'skirt']}), false);
  assert.equal(isSourceConfirmedPairedSet({...verified, is_full_set: false}), false);
  assert.equal(isSourceConfirmedPairedSet({public_label: 'Couples'}), false);
});
