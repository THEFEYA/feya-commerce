import {couplePairLabel} from './bonanzaCoupleColorChoices.ts';
import {parseOwnerCartStorage, type OwnerCartPreviewItem} from './commerceOwnerCartReview.ts';
import type {CartColourChoice} from './payments/cartColourRecovery.ts';

type BagRow = Record<string, unknown>;

/** Replace one saved selection. Read the latest bag so a change from another tab is not overwritten. */
export function replaceSavedCartColour(
  raw: unknown, shown: OwnerCartPreviewItem, choice: CartColourChoice, title: string,
  wearer: Record<string, 'men' | 'women'>, menChoice?: CartColourChoice,
) {
  if (!Array.isArray(raw)) return null;
  const parsed = parseOwnerCartStorage(raw);
  const item = parsed.items.find(row => row.id === shown.id);
  if (!item || item.configuration_id !== shown.configuration_id || item.color !== shown.color ||
      item.color_code !== shown.color_code || item.size !== shown.size ||
      JSON.stringify(item.paired_selection) !== JSON.stringify(shown.paired_selection)) return null;
  const pair = item.paired_selection;
  if (Boolean(pair) !== Boolean(menChoice) || (menChoice && menChoice.configuration_id !== choice.configuration_id)) return null;
  const selectedPair = pair && menChoice ? {
    women: {...pair.women, color: choice.code}, men: {...pair.men, color: menChoice.code},
  } : null;
  const color = selectedPair ? couplePairLabel({women: selectedPair.women.color, men: selectedPair.men.color}) : choice.label;
  const size = selectedPair ? "Women's " + selectedPair.women.size + " · Men's " + selectedPair.men.size : item.size;
  const targetId = [item.canonical_product_id, choice.configuration_id, size, color].join('-');
  const existing = parsed.items.find(row => row.id === targetId && row.id !== item.id);
  const merge = existing && existing.configuration_id === choice.configuration_id && existing.size === size
    && (!selectedPair ? !existing.paired_selection && existing.color === color :
      JSON.stringify(existing.paired_selection) === JSON.stringify(selectedPair))
    && Boolean(existing.custom_measurements_selected) === Boolean(item.custom_measurements_selected)
    && wearer[existing.id] === wearer[item.id] && existing.qty + item.qty <= 100;
  // Distinct fit services or wearer choices must remain on separate lines, even with identical colours.
  const id = existing && !merge ? item.id : targetId;
  const update = {id, configuration_id: choice.configuration_id, config: choice.config, public_label: choice.config,
    title: title || item.title, size, color, color_code: selectedPair ? null : choice.code,
    price: choice.unit_minor / 100, unit_price_amount: choice.unit_minor / 100,
    compare_at_price_amount: choice.compare_at_minor == null ? null : choice.compare_at_minor / 100,
    ...(selectedPair ? {paired_selection: selectedPair, womens_size: selectedPair.women.size, mens_size: selectedPair.men.size,
      womens_color_code: selectedPair.women.color,
      mens_color_code: selectedPair.men.color} : {})};
  const next = raw.flatMap((row: BagRow | null) => {
    if (row?.id === item.id) return merge ? [] : [{...row, ...update, qty: item.qty}];
    if (merge && existing && row?.id === existing.id) return [{...row, ...update, qty: existing.qty + item.qty}];
    return [row];
  });
  const result = parseOwnerCartStorage(next);
  if (result.invalid_count !== parsed.invalid_count || !result.items.some(row => row.id === id)) return null;
  return {raw: next, id, count: result.items.reduce((sum, row) => sum + row.qty, 0)};
}
