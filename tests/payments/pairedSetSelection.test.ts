import test from 'node:test';
import assert from 'node:assert/strict';
import {isSourceConfirmedPairedSet, parsePairedSetSelection} from '../../lib/payments/pairedSetSelection.ts';
import {verifiedColorChoice} from '../../lib/payments/bonanzaColorAuthority.ts';
import {parseOwnerCartStorage} from '../../lib/commerceOwnerCartReview.ts';

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

test('Bonanza-approved paired colors are source-bound and held/unlisted codes are refused', () => {
  const productId = 'a759b44e-1329-47a6-a444-0c9feabcc0ce';
  assert.deepEqual(verifiedColorChoice(productId, 'gold'), {code:'gold',label:'Gold'});
  assert.deepEqual(verifiedColorChoice(productId, 'silver'), {code:'silver',label:'Silver'});
  assert.equal(verifiedColorChoice(productId, 'holographic'), null);
  assert.equal(verifiedColorChoice('ffbf1db6-6fae-4606-afbe-013415d6421d', 'gold'), null);
});

test('approved color-review basket format becomes a normalized paid-checkout pair', () => {
  const id = 'a759b44e-1329-47a6-a444-0c9feabcc0ce';
  const original = {
    id: `${id}-6a68bce4-4a2c-4419-a3a1-2a85f1aa80af-S-XL-Gold-Silver`,
    slug: 'festival-couple-costume-set-futuristic-outfits-for-men-women-golden-leather-costume-burning-man-wear-metallic-rave-armor-4302158749',
    title:'Festival Couples Set', image:'https://example.com/image.jpg',
    config:'Paired Set', size:"Women's S · Men's XL",
    color:"Women's Gold · Men's Silver", womens_size:'S',mens_size:'XL',
    womens_color_code:'gold',mens_color_code:'silver',
    color_code:null,custom_measurements_selected:false,
    qty:1,price:502.46,currency:'EUR',
    configuration_id:'6a68bce4-4a2c-4419-a3a1-2a85f1aa80af',
  };
  const restored=parseOwnerCartStorage([original]);
  assert.equal(restored.invalid_count, 0);
  assert.deepEqual(restored.items[0].paired_selection,
    {women:{size:'S',color:'gold'},men:{size:'XL',color:'silver'}});
  assert.equal(restored.items[0].price,502.46);
  const missing=parseOwnerCartStorage([{...original,mens_color_code:null}]);
  assert.equal(missing.invalid_count, 1);
  const conflicted=parseOwnerCartStorage([{...original,
    paired_selection:{women:{size:'S',color:'silver'},men:{size:'XL',color:'silver'}}}]);
  assert.equal(conflicted.invalid_count, 1);
});
