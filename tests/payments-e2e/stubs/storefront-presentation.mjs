// Published product read model used by the checkout price authority.
export const PRODUCTS = new Map();
export async function readCachedStorefrontProductPresentation(slug) {
  return {product: PRODUCTS.get(slug) ?? null, related: [], productCollections: [], error: null};
}
