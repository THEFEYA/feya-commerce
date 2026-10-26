import ownerColors from '../../config/bonanzaReviewedColors20261011.json' with {type: 'json'};
import displayOverrides from '../../config/bonanzaColorDisplayOverrides.json' with {type: 'json'};
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
  if (!decision || !decision.colors.includes(code)) return null;
  // One Bonanza marketplace HOLD has an exact, separate owner signoff for
  // TheFEYA's web color display. Respect the SAME narrow exception used by
  // bonanzaColorCatalogServer — otherwise the PDP offers colors checkout rejects.
  if (decision.held) {
    const ownerOverride = (displayOverrides.products as Record<string, {
      primary: string; owner_review_hold_color_only?: boolean;
    }>)[productId];
    const siteColorApproved = productId === 'ffbf1db6-6fae-4606-afbe-013415d6421d'
      && ownerOverride?.owner_review_hold_color_only === true
      && ownerOverride.primary === 'gold';
    if (!siteColorApproved) return null;
  }
  return {code, label: colorChoiceLabel(code)};
}
