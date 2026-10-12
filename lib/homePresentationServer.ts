import 'server-only';

import {cacheLife,cacheTag} from 'next/cache';
import {homePresentationProductIds} from '@/config/homePresentation';
import {readCachedApprovedStorefrontCatalogV1} from '@/lib/storefrontCatalogCacheServer';
import {
  STOREFRONT_CACHE_TAGS,
  storefrontCacheTagForProduct,
} from '@/lib/storefrontCacheInvalidation';
import type {StorefrontProduct} from '@/lib/types';

/**
 * Exact approved-corpus data for the frozen homepage presentation.
 * The request/auth review layer remains outside this shared cache.
 */
export async function readCachedHomePresentationProducts():Promise<StorefrontProduct[]>{
  'use cache';

  const ids=homePresentationProductIds();
  cacheLife('max');
  cacheTag(
    STOREFRONT_CACHE_TAGS.site,
    STOREFRONT_CACHE_TAGS.home,
    STOREFRONT_CACHE_TAGS.catalog,
    ...ids.map((id)=>storefrontCacheTagForProduct(id)),
  );

  // Share one approved 207-product SQL result with Shop and discovery hubs.
  // Keep Home-specific selection and existing product-tag invalidation.
  const products=await readCachedApprovedStorefrontCatalogV1();
  const byId=new Map(products.map((product)=>[product.canonical_product_id,product]));

  // Preserve the owner-authored homepage ID order and never substitute a raw,
  // unapproved candidate row. Existing Home fallback logic handles absent IDs.
  return ids
    .map((id)=>byId.get(id))
    .filter((product):product is StorefrontProduct=>Boolean(product));
}
