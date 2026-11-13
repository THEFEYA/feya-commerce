import {ALL_REVIEWED_PRIMARY_IMAGE_ALTS} from './storefrontReviewedPrimaryImageAlts.ts';
import {REVIEWED_GALLERY_IMAGE_ALT_CATALOG_20261113} from './storefrontReviewedGalleryImageAltCatalog.ts';

/**
 * Reviewed ALT text for the non-primary gallery photographs.
 * A caption applies only to the exact canonical product, its pinned public
 * slug and the exact existing photo URL. It never moves to another product,
 * never touches the primary photo (owned by the primary binding), never
 * renames, re-orders, adds or removes media, and leaves videos untouched.
 */
type GalleryProduct = {
  canonical_product_id: string;
  product_slug?: string | null;
  primary_image_url?: string | null;
  media_gallery?: unknown;
};

const SLUG_BY_PRODUCT = new Map(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.map(item => [item.canonicalProductId, item.productSlug]));
const ALT_BY_PRODUCT_PHOTO = new Map<string, string>();
const PHOTOS_BY_PRODUCT = new Map<string, string[]>();

for (const row of REVIEWED_GALLERY_IMAGE_ALT_CATALOG_20261113) {
  for (const productId of row.canonicalProductIds) {
    const key = `${productId}\n${row.imageUrl}`;
    if (!SLUG_BY_PRODUCT.has(productId) || ALT_BY_PRODUCT_PHOTO.has(key)) {
      throw new Error('REVIEWED_GALLERY_IMAGE_ALT_BINDING_INVALID');
    }
    ALT_BY_PRODUCT_PHOTO.set(key, row.altText);
    const photos = PHOTOS_BY_PRODUCT.get(productId) ?? [];
    photos.push(row.imageUrl);
    PHOTOS_BY_PRODUCT.set(productId, photos);
  }
}

function boundProduct(canonicalProductId: string, productSlug: string | null | undefined): boolean {
  return Boolean(productSlug) && SLUG_BY_PRODUCT.get(canonicalProductId) === productSlug;
}

export function applyReviewedGalleryImageAlts<T extends GalleryProduct>(product: T): T {
  if (!boundProduct(product.canonical_product_id, product.product_slug) || !Array.isArray(product.media_gallery)) {
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

/** Reviewed existing gallery photo URLs for one exact product + slug (sitemap enrichment). */
export function reviewedGalleryPhotoUrls(canonicalProductId: string, productSlug: string | null | undefined): readonly string[] {
  return boundProduct(canonicalProductId, productSlug) ? PHOTOS_BY_PRODUCT.get(canonicalProductId) ?? [] : [];
}
