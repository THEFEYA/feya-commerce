import type {StorefrontConfiguration} from '../types';

/** Two independently selected outfits in one owner-approved paired-set SKU.
 * Stored with the immutable order snapshot. Not a separate price or configuration.
 */
export type PairedSetSelection = {
  women: {size: string; color: string};
  men: {size: string; color: string};
};

export const PAIRED_SET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'] as const;

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

function fit(value: unknown): {size: string; color: string} | null {
  if (!record(value) || Object.keys(value).sort().join(',') !== 'color,size') return null;
  const size = value.size, color = value.color;
  if (typeof size !== 'string' || !(PAIRED_SET_SIZES as readonly string[]).includes(size)) return null;
  if (typeof color !== 'string' || !color.trim() || color.length > 100 || /[\u0000-\u001f\u007f]/.test(color)) return null;
  return {size, color: color.trim()};
}

/** Parse untrusted bag/checkout data without silently losing a partner's fit. */
export function parsePairedSetSelection(value: unknown): PairedSetSelection | null {
  if (!record(value) || Object.keys(value).sort().join(',') !== 'men,women') return null;
  const women = fit(value.women), men = fit(value.men);
  return women && men ? {women, men} : null;
}

/** A genuine paired set must carry explicit, owner-reviewed bundle membership.
 * A "couples" SEO title or an expensive unclassified option is NOT sufficient.
 */
export function isSourceConfirmedPairedSet(option: StorefrontConfiguration | null | undefined): boolean {
  if (!option || option.is_full_set !== true || option.source_confirmed_bundle_members !== true) return false;
  const codes = Array.isArray(option.bundle_component_codes)
    ? option.bundle_component_codes.map(code => String(code).toLowerCase().trim()) : [];
  return codes.some(code => code === 'women_outfit' || code === 'womens_outfit')
    && codes.some(code => code === 'men_outfit' || code === 'mens_outfit');
}
