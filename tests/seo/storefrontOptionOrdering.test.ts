import assert from 'node:assert/strict';
import test from 'node:test';
import { sortedOptions } from '../../lib/storefront.ts';

test('puts Full Set first while preserving source order for remaining PDP options', () => {
  const product = {
    configurations: [
      { configuration_id: 'skirt', sort_order: 1, public_label: 'Skirt', component_code: 'skirt', display_price_amount: 135.10 },
      { configuration_id: 'top-shoulders', sort_order: 2, public_label: 'Top + Shoulders', component_code: 'bundle', is_bundle: true, display_price_amount: 154.41 },
      { configuration_id: 'full-set', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', is_full_set: true, display_price_amount: 164.06 },
    ],
  } as any;

  assert.deepEqual(
    sortedOptions(product).map((option) => option.public_label),
    ['Full Set', 'Skirt', 'Top + Shoulders'],
  );
});
