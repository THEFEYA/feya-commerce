import ownerColors from '../../config/bonanzaReviewedColors20261011.json' with {type: 'json'};
import {colorChoiceLabel, isBonanzaColorCode} from '../bonanzaColorChoices.ts';

/**
 * Read-only source of exactly the 207 reviewed owner/Bonanza color decisions.
 * This contains purchase *availability candidates* only, never price rows.
 * Three color-priced source exceptions are validated separately at checkout.
 */
type Decision = {colors: string[]; held: boolean};
const decisions = ownerColors.products as Record<string, Decision>;

export function verifiedColorChoice(productId: string, code: string | null | undefined):
  {code: string; label: string} | null {
  if (!code || !isBonanzaColorCode(code)) return null;
  const decision = decisions[productId];
  if (!decision || decision.held || !decision.colors.includes(code)) return null;
  return {code, label: colorChoiceLabel(code)};
}
