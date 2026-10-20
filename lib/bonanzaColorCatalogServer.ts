import 'server-only';

import reviewed from '@/config/bonanzaReviewedColors20261011.json';
import { enrichStorefrontProductColors, type OwnerColorChoices } from '@/lib/bonanzaColorChoices';
import type { StorefrontProduct } from '@/lib/types';

/**
 * Exact 207-row owner decision snapshot, not runtime Bonanza/owner-auth reads.
 * Embedding it in the server read model adds no source network trip, no
 * exposure of owner decisions, and no mutation of frozen product snapshots.
 * A held product uses its prior source until individually approved.
 */
const source = reviewed.products as Record<string, OwnerColorChoices>;

export function applyReviewedBonanzaColors(product: StorefrontProduct): StorefrontProduct {
  return enrichStorefrontProductColors(product, source[product.canonical_product_id]);
}
