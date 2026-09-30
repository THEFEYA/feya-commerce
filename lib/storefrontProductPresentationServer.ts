import 'server-only';

import {cacheLife, cacheTag} from 'next/cache';
import {readApprovedStorefrontProductDetailV1} from '@/lib/storefrontProductDetailReadModelServer';
import {readProductLandingLinks, type ProductLandingLink} from '@/lib/searchProductLandingLinks';
import {
  STOREFRONT_CACHE_TAGS,
  storefrontCacheTagForProduct,
} from '@/lib/storefrontCacheInvalidation';
import type {StorefrontProduct} from '@/lib/types';

export type CachedStorefrontProductPresentation = {
  product: StorefrontProduct | null;
  related: StorefrontProduct[];
  productCollections: ProductLandingLink[];
  error: null;
};

/**
 * Shared public PDP payload only. No cookies, headers, auth claims, review drafts,
 * owner-preview state or personalized cart data may enter this cache.
 */
export async function readCachedStorefrontProductPresentation(slug:string):Promise<CachedStorefrontProductPresentation>{
  'use cache';

  cacheLife('max');
  cacheTag(
    STOREFRONT_CACHE_TAGS.site,
    STOREFRONT_CACHE_TAGS.catalog,
    STOREFRONT_CACHE_TAGS.collections,
  );

  const product=await readApprovedStorefrontProductDetailV1(slug);
  if(!product)return{product:null,related:[],productCollections:[],error:null};

  cacheTag(storefrontCacheTagForProduct(String(product.canonical_product_id)));
  const productCollections=await readProductLandingLinks(String(product.canonical_product_id));

  return{product,related:[],productCollections,error:null};
}
