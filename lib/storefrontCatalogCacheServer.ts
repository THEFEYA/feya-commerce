import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { readApprovedStorefrontCardProductsV1 } from '@/lib/storefrontCardReadModelServer';
import { STOREFRONT_CACHE_TAGS } from '@/lib/storefrontCacheInvalidation';
import type { StorefrontProduct } from '@/lib/types';

export async function readCachedApprovedStorefrontCatalogV1(): Promise<StorefrontProduct[]> {
  'use cache';
  cacheLife('max');
  cacheTag(STOREFRONT_CACHE_TAGS.site, STOREFRONT_CACHE_TAGS.catalog);
  return readApprovedStorefrontCardProductsV1();
}
