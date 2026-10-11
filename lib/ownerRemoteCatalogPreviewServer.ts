import 'server-only';

import {cacheLife,cacheTag} from 'next/cache';
import {readApprovedStorefrontCardProductsV1} from '@/lib/storefrontCardReadModelServer';
import {STOREFRONT_CACHE_TAGS} from '@/lib/storefrontCacheInvalidation';

/** Experimental, exact-branch private Preview only.
 * On cache miss reads the same pinned, approved 207-card contract. The
 * remote entry is shared between regional functions, unlike in-memory
 * 'use cache' during cold starts. Reuses existing invalidation tags.
 * This is raw public catalog data: NO user/session/review projection.
 */
export async function readOwnerRemoteCatalogPreviewV1(){
  'use cache: remote';
  cacheLife('max');
  cacheTag(STOREFRONT_CACHE_TAGS.site,STOREFRONT_CACHE_TAGS.catalog);
  return readApprovedStorefrontCardProductsV1();
}
