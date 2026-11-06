import 'server-only';

import {projectReviewedBonanzaColors} from './bonanzaReviewedColorProjection';
import type {StorefrontProduct} from './types';

/** Full PDP/checkout requires source-backed price tuples for the three color-priced products. */
export function applyReviewedBonanzaColors(product:StorefrontProduct):StorefrontProduct {
  return projectReviewedBonanzaColors(product,'detail');
}

/** Read-only slim-card color display, no payable configuration or new DB request. */
export function applyReviewedBonanzaCatalogColors(product:StorefrontProduct):StorefrontProduct {
  return projectReviewedBonanzaColors(product,'catalog');
}
