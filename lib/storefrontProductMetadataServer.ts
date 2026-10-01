import 'server-only';

import {cacheLife,cacheTag} from 'next/cache';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {
  STOREFRONT_CACHE_TAGS,
  storefrontCacheTagForProduct,
} from '@/lib/storefrontCacheInvalidation';

export const STOREFRONT_PRODUCT_METADATA_SNAPSHOT_V1='feya_storefront_product_card_snapshots_v1';
export const STOREFRONT_PRODUCT_METADATA_RELEASE_V1='feya-review-207-20260924';

export type StorefrontProductMetadataV1={
  canonicalProductId:string;
  slug:string;
  title:string;
  description:string;
  images:string[];
  contentHash:string;
};

async function readStorefrontProductMetadataV1(slug:string):Promise<StorefrontProductMetadataV1|null>{
  const service=getSupabaseServiceRoleClient();
  if(!service)throw new Error('STOREFRONT_PRODUCT_METADATA_SERVICE_UNAVAILABLE');

  const {data,error}=await service
    .from(STOREFRONT_PRODUCT_METADATA_SNAPSHOT_V1)
    .select('canonical_product_id,seo_page_id,draft_id,content_sha256,source_release_ref,product_slug,seo_title,card_title,h1,meta_description,primary_image_url,secondary_image_url,hover_image_url')
    .eq('product_slug',slug)
    .maybeSingle();

  if(error)throw new Error(`STOREFRONT_PRODUCT_METADATA_READ_FAILED:${error.code||'unknown'}`);
  if(!data)return null;

  const row=data as unknown as {
    canonical_product_id:string;
    product_slug:string;
    seo_title:string|null;
    card_title:string|null;
    h1:string|null;
    meta_description:string|null;
    primary_image_url:string|null;
    secondary_image_url:string|null;
    hover_image_url:string|null;
    seo_page_id:string;
    draft_id:string;
    content_sha256:string;
    source_release_ref:string;
  };

  if(
    !row.canonical_product_id
    || !row.product_slug
    || row.source_release_ref!==STOREFRONT_PRODUCT_METADATA_RELEASE_V1
    || !/^[0-9a-f]{64}$/.test(row.content_sha256||'')
  ){
    throw new Error('STOREFRONT_PRODUCT_METADATA_IDENTITY_INVALID');
  }

  const title=(row.seo_title||row.h1||row.card_title||'TheFEYA Product').trim();
  const description=(row.meta_description||`${title} by TheFEYA.`).trim();
  const images=Array.from(new Set([
    row.primary_image_url,
    row.secondary_image_url,
    row.hover_image_url,
  ].filter((value):value is string=>Boolean(value&&value.trim()))));

  return{
    canonicalProductId:row.canonical_product_id,
    slug:row.product_slug,
    title,
    description,
    images,
    contentHash:row.content_sha256,
  };
}

export async function readCachedStorefrontProductMetadataV1(slug:string):Promise<StorefrontProductMetadataV1|null>{
  'use cache';

  cacheLife('max');
  cacheTag(STOREFRONT_CACHE_TAGS.site,STOREFRONT_CACHE_TAGS.catalog);

  const metadata=await readStorefrontProductMetadataV1(slug);
  if(metadata)cacheTag(storefrontCacheTagForProduct(metadata.canonicalProductId));
  return metadata;
}
