import 'server-only';

import {cacheLife,cacheTag} from 'next/cache';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {STOREFRONT_CARD_READ_MODEL_V1} from '@/lib/storefrontCardReadModelServer';
import {
  STOREFRONT_CACHE_TAGS,
  storefrontCacheTagForProduct,
} from '@/lib/storefrontCacheInvalidation';

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
    .from(STOREFRONT_CARD_READ_MODEL_V1)
    .select('canonical_product_id,product_slug,seo_title,card_title,h1,meta_description,primary_image_url,secondary_image_url,hover_image_url,approved_content_sha256')
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
    approved_content_sha256:string;
  };

  if(!row.canonical_product_id||!row.product_slug||!/^[0-9a-f]{64}$/.test(row.approved_content_sha256||'')){
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
    contentHash:row.approved_content_sha256,
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
