/** Existing public card photographs, keyed by the exact canonical PDP path.
 * This index enriches release-owned URLs; it never creates sitemap entries.
 */
export type SitemapImageProduct = {
  canonical_product_id: string;
  product_slug: string | null;
  primary_image_url: string | null;
};

export function sitemapProductImages(products: readonly SitemapImageProduct[]): Map<string, string[]> {
  const images = new Map<string, string[]>();
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const product of products) {
    const slug = product.product_slug;
    if (!product.canonical_product_id || ids.has(product.canonical_product_id)
      || !slug || slug.trim() !== slug || /[/?#\\\s]/.test(slug)) {
      throw new Error('SITEMAP_IMAGE_PRODUCT_IDENTITY_INVALID');
    }
    ids.add(product.canonical_product_id);
    const path = `/shop/${slug}`;
    if (paths.has(path)) throw new Error('SITEMAP_IMAGE_PRODUCT_PATH_AMBIGUOUS');
    paths.add(path);

    const source = product.primary_image_url;
    if (!source || source.trim() !== source) continue;
    try {
      const url = new URL(source);
      // Match the storefront's existing public image host. No signed/private
      // storage URLs, video URLs, invented images or optimizer URL replacement.
      if (url.protocol !== 'https:' || url.hostname !== 'i.etsystatic.com'
        || url.port || url.username || url.password || url.hash
        || !/\.(?:bmp|gif|jpe?g|png|webp|svg|avif)$/i.test(url.pathname)) continue;
      // Next 16.3.8's sitemap serializer interpolates image strings verbatim.
      // Escape XML text, preserving the decoded original asset URL exactly.
      const image = source.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      images.set(path, [image]);
    } catch {
      // Invalid optional media must not remove a canonical page from discovery.
    }
  }
  return images;
}
