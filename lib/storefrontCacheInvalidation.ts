export const STOREFRONT_CACHE_TAGS = {
  site: 'site',
  home: 'home',
  catalog: 'catalog',
  collections: 'collections',
} as const;

export type StorefrontInvalidationEventType =
  | 'product_changed'
  | 'product_media_changed'
  | 'product_stock_changed'
  | 'product_slug_changed'
  | 'product_unpublished'
  | 'collection_membership_changed'
  | 'collection_content_changed'
  | 'landing_page_changed'
  | 'policy_changed'
  | 'home_content_changed'
  | 'global_content_changed';

export type StorefrontInvalidationInput = {
  event_type: StorefrontInvalidationEventType;
  canonical_product_id?: string | null;
  product_slug?: string | null;
  previous_product_slug?: string | null;
  collection_slugs?: string[] | null;
  page_slug?: string | null;
  policy_name?: string | null;
  source_ref?: string | null;
};

export type StorefrontInvalidationPlan = {
  event_type: StorefrontInvalidationEventType;
  entity_type: 'product' | 'collection' | 'page' | 'policy' | 'home' | 'global';
  entity_id: string;
  tags: string[];
  paths: string[];
  source_ref: string | null;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POLICY=/^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/;
const MAX_TAG_LENGTH=256;
const MAX_SLUG_LENGTH=180;
const MAX_COLLECTIONS=32;

function cleanSlug(value: unknown, field: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`STOREFRONT_INVALIDATION_INVALID_${field.toUpperCase()}`);
  const slug=value.trim().toLowerCase();
  if (!slug || slug.length>MAX_SLUG_LENGTH || !SLUG.test(slug)) {
    throw new Error(`STOREFRONT_INVALIDATION_INVALID_${field.toUpperCase()}`);
  }
  return slug;
}

function cleanProductId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !UUID.test(value.trim())) {
    throw new Error('STOREFRONT_INVALIDATION_INVALID_PRODUCT_ID');
  }
  return value.trim().toLowerCase();
}

function cleanPolicy(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('STOREFRONT_INVALIDATION_INVALID_POLICY');
  const policy=value.trim().toLowerCase();
  if (!policy || policy.length>120 || !POLICY.test(policy)) {
    throw new Error('STOREFRONT_INVALIDATION_INVALID_POLICY');
  }
  return policy;
}

function tag(value: string) {
  if (!value || value.length>MAX_TAG_LENGTH) throw new Error('STOREFRONT_INVALIDATION_TAG_TOO_LONG');
  return value;
}

function path(value: string) {
  if (!value.startsWith('/') || value.length>512) throw new Error('STOREFRONT_INVALIDATION_INVALID_PATH');
  return value;
}

function collectionTags(slugs: string[]) {
  return slugs.map(slug=>tag(`collection:${slug}`));
}

function collectionPaths(slugs: string[]) {
  return slugs.map(slug=>path(`/collections/${slug}`));
}

function normalizeCollections(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length>MAX_COLLECTIONS) {
    throw new Error('STOREFRONT_INVALIDATION_INVALID_COLLECTIONS');
  }
  return [...new Set(value.map(item=>cleanSlug(item,'collection_slug')!).filter(Boolean))].sort();
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

export function buildStorefrontInvalidationPlan(input: StorefrontInvalidationInput): StorefrontInvalidationPlan {
  if (!input || typeof input!=='object') throw new Error('STOREFRONT_INVALIDATION_INVALID_INPUT');
  const event=input.event_type;
  const productId=cleanProductId(input.canonical_product_id);
  const slug=cleanSlug(input.product_slug,'product_slug');
  const previousSlug=cleanSlug(input.previous_product_slug,'previous_product_slug');
  const collections=normalizeCollections(input.collection_slugs);
  const pageSlug=cleanSlug(input.page_slug,'page_slug');
  const policy=cleanPolicy(input.policy_name);
  const sourceRef=typeof input.source_ref==='string'&&input.source_ref.trim()
    ? input.source_ref.trim().slice(0,240)
    : null;

  const tags: string[]=[];
  const paths: string[]=[];
  let entityType: StorefrontInvalidationPlan['entity_type'];
  let entityId: string;

  switch(event) {
    case 'product_changed':
    case 'product_media_changed':
    case 'product_stock_changed':
    case 'product_unpublished': {
      if (!productId || !slug) throw new Error('STOREFRONT_INVALIDATION_PRODUCT_SCOPE_REQUIRED');
      entityType='product'; entityId=productId;
      tags.push(STOREFRONT_CACHE_TAGS.catalog,tag(`product:${productId}`),...collectionTags(collections));
      paths.push(path('/shop'),path(`/shop/${slug}`),...collectionPaths(collections));
      break;
    }
    case 'product_slug_changed': {
      if (!productId || !slug || !previousSlug || slug===previousSlug) {
        throw new Error('STOREFRONT_INVALIDATION_SLUG_CHANGE_SCOPE_REQUIRED');
      }
      entityType='product'; entityId=productId;
      tags.push(STOREFRONT_CACHE_TAGS.catalog,tag(`product:${productId}`),...collectionTags(collections));
      paths.push(path('/shop'),path(`/shop/${previousSlug}`),path(`/shop/${slug}`),...collectionPaths(collections));
      break;
    }
    case 'collection_membership_changed': {
      if (!collections.length) throw new Error('STOREFRONT_INVALIDATION_COLLECTION_SCOPE_REQUIRED');
      entityType='collection'; entityId=collections.join(',');
      tags.push(STOREFRONT_CACHE_TAGS.catalog,STOREFRONT_CACHE_TAGS.collections,...collectionTags(collections));
      paths.push(path('/shop'),path('/collections'),...collectionPaths(collections));
      break;
    }
    case 'collection_content_changed': {
      if (collections.length!==1) throw new Error('STOREFRONT_INVALIDATION_SINGLE_COLLECTION_REQUIRED');
      entityType='collection'; entityId=collections[0];
      tags.push(STOREFRONT_CACHE_TAGS.collections,...collectionTags(collections));
      paths.push(path('/collections'),...collectionPaths(collections));
      break;
    }
    case 'landing_page_changed': {
      if (!pageSlug) throw new Error('STOREFRONT_INVALIDATION_PAGE_SCOPE_REQUIRED');
      entityType='page'; entityId=pageSlug;
      tags.push(tag(`page:${pageSlug}`));
      paths.push(path(`/${pageSlug}`));
      break;
    }
    case 'policy_changed': {
      if (!policy || !pageSlug) throw new Error('STOREFRONT_INVALIDATION_POLICY_SCOPE_REQUIRED');
      entityType='policy'; entityId=policy;
      tags.push(tag(`policy:${policy}`),tag(`page:${pageSlug}`));
      paths.push(path(`/${pageSlug}`));
      break;
    }
    case 'home_content_changed': {
      entityType='home'; entityId='home';
      tags.push(STOREFRONT_CACHE_TAGS.home);
      paths.push(path('/'));
      break;
    }
    case 'global_content_changed': {
      entityType='global'; entityId='site';
      tags.push(STOREFRONT_CACHE_TAGS.site,STOREFRONT_CACHE_TAGS.home,STOREFRONT_CACHE_TAGS.catalog,STOREFRONT_CACHE_TAGS.collections);
      paths.push(path('/'),path('/shop'),path('/collections'));
      break;
    }
    default:
      throw new Error('STOREFRONT_INVALIDATION_UNKNOWN_EVENT');
  }

  return {
    event_type:event,
    entity_type:entityType,
    entity_id:entityId,
    tags:unique(tags),
    paths:unique(paths),
    source_ref:sourceRef,
  };
}

export function storefrontCacheTagForProduct(canonicalProductId: string) {
  const id=cleanProductId(canonicalProductId);
  if(!id) throw new Error('STOREFRONT_INVALIDATION_PRODUCT_SCOPE_REQUIRED');
  return tag(`product:${id}`);
}

export function storefrontCacheTagForCollection(collectionSlug: string) {
  const slug=cleanSlug(collectionSlug,'collection_slug');
  if(!slug) throw new Error('STOREFRONT_INVALIDATION_COLLECTION_SCOPE_REQUIRED');
  return tag(`collection:${slug}`);
}
