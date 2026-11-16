import {ALL_REVIEWED_PRIMARY_IMAGE_ALTS} from './storefrontReviewedPrimaryImageAlts.ts';
import {REVIEWED_GALLERY_IMAGE_ALT_CATALOG_20261113} from './storefrontReviewedGalleryImageAltCatalog.ts';

/**
 * Reviewed ALT text for the non-primary gallery photographs.
 * A caption applies only to the exact canonical product, its pinned public
 * slug, approved draft, primary photo and exact existing gallery photo URL.
 * It never moves to another product,
 * never touches the primary photo (owned by the primary binding), never
 * renames, re-orders, adds or removes media, and leaves videos untouched.
 */
type GalleryProduct = {
  canonical_product_id: string;
  product_slug?: string | null;
  primary_image_url?: string | null;
  media_gallery?: unknown;
};

const BINDING_BY_PRODUCT = new Map(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.map(item => [item.canonicalProductId, item]));
const ALT_BY_PRODUCT_PHOTO = new Map<string, string>();

for (const row of REVIEWED_GALLERY_IMAGE_ALT_CATALOG_20261113) {
  for (const productId of row.canonicalProductIds) {
    const key = `${productId}\n${row.imageUrl}`;
    if (!BINDING_BY_PRODUCT.has(productId) || ALT_BY_PRODUCT_PHOTO.has(key)) {
      throw new Error('REVIEWED_GALLERY_IMAGE_ALT_BINDING_INVALID');
    }
    ALT_BY_PRODUCT_PHOTO.set(key, row.altText);
  }
}

function boundProduct(product: GalleryProduct, sourceDraftId: string): boolean {
  const binding = BINDING_BY_PRODUCT.get(product.canonical_product_id);
  return Boolean(binding && binding.productSlug === product.product_slug
    && binding.sourceDraftId === sourceDraftId && binding.imageUrl === product.primary_image_url);
}

export function applyReviewedGalleryImageAlts<T extends GalleryProduct>(product: T, sourceDraftId: string): T {
  if (!boundProduct(product, sourceDraftId) || !Array.isArray(product.media_gallery)) {
    return product;
  }
  let changed = false;
  const gallery = product.media_gallery.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || item.media_type !== 'image' || typeof item.url !== 'string'
      || item.url === product.primary_image_url) return item;
    const altText = ALT_BY_PRODUCT_PHOTO.get(`${product.canonical_product_id}\n${item.url}`);
    if (!altText || item.alt === altText) return item;
    changed = true;
    return {...item, alt: altText};
  });
  return changed ? {...product, media_gallery: gallery} : product;
}

/** Intersect reviewed bindings with the CURRENT approved gallery, in its order.
 * A removed/replaced image must not survive in the sitemap's static ALT catalog.
 */
export function reviewedGalleryPhotoUrls(product: GalleryProduct, sourceDraftId: string): readonly string[] {
  if (!boundProduct(product, sourceDraftId) || !Array.isArray(product.media_gallery)) return [];
  return product.media_gallery.flatMap(item => item && typeof item === 'object' && !Array.isArray(item)
    && item.media_type === 'image' && typeof item.url === 'string'
    && item.url !== product.primary_image_url
    && ALT_BY_PRODUCT_PHOTO.has(`${product.canonical_product_id}\n${item.url}`) ? [item.url] : []);
}
