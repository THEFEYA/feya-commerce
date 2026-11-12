/**
 * Existing primary-alt candidates from the five pinned approved SEO packs.
 * Visually checked against these exact source photographs on 2026-11-12.
 * This pilot publishes no draft text beyond the reviewed ALT, never renames
 * assets, and cannot transfer a caption to another product, draft or photo.
 */
export const REVIEWED_PRIMARY_IMAGE_ALTS = [
  {
    "canonicalProductId": "2973f3ae-6097-49c0-ab91-21a9697560cc",
    "productSlug": "cyberpunk-armor-set-silver-leather-shoulders-arm-bracelets-burning-man-outfit-4456102467",
    "sourceDraftId": "d7e42243-ac23-4a22-ad21-d9469d8c0f73",
    "imageUrl": "https://i.etsystatic.com/54033853/r/il/56eb68/7699191698/il_fullxfull.7699191698_jx35.jpg",
    "altText": "Woman wearing silver sci fi shoulder armor with matching metallic arm bracelets"
  },
  {
    "canonicalProductId": "b524764b-6dba-4c51-be55-f1ec92fc60cf",
    "productSlug": "gold-amazon-armor-set-female-warrior-costume-fantasy-festival-outfit-cosplay-armored-body-plates-4369438053",
    "sourceDraftId": "193b9918-3415-41fc-be09-e39ef3751730",
    "imageUrl": "https://i.etsystatic.com/54033853/r/il/3109e0/7245931359/il_fullxfull.7245931359_y0hx.jpg",
    "altText": "Woman wearing a gold warrior armor costume with fantasy vegan leather details"
  },
  {
    "canonicalProductId": "c52eafde-baaa-44ec-8729-c54e6c2f5706",
    "productSlug": "men-s-outfit-for-burning-man-desert-warrior-costume-rave-festival-fashion-steampunk-leather-shoulder-dune-armor-wear-space-cowboy-4352810754",
    "sourceDraftId": "22817b33-c435-4c41-9874-35e5737a7540",
    "imageUrl": "https://i.etsystatic.com/54033853/r/il/fd9579/7112206868/il_fullxfull.7112206868_ettp.jpg",
    "altText": "Man wearing a desert warrior armor costume with shoulder piece, belt, arm detail and leg covers"
  },
  {
    "canonicalProductId": "1eb4b55c-dedf-4399-92fd-c94c8d962091",
    "productSlug": "desert-warrior-men-s-costume-burning-man-gold-armor-outfit-rave-festival-fashion-steampunk-leather-shoulders-futuristic-dune-wear-4326178885",
    "sourceDraftId": "54f3ea43-fe54-4b18-a49b-bac66129cc15",
    "imageUrl": "https://i.etsystatic.com/54033853/r/il/7ced98/6970053990/il_fullxfull.6970053990_rczv.jpg",
    "altText": "Man wearing a gold desert warrior armor costume with shoulder and arm details"
  },
  {
    "canonicalProductId": "b0b2a75c-f301-45d6-857c-dd6575862619",
    "productSlug": "men-s-sci-fi-armor-outfit-futuristic-white-leather-costume-set-burning-man-wear-1890733162",
    "sourceDraftId": "39997eb3-8044-425d-b9ff-98f01561e203",
    "imageUrl": "https://i.etsystatic.com/54033853/r/il/71687f/7749700392/il_fullxfull.7749700392_8n3s.jpg",
    "altText": "Man wearing a white futuristic armor costume with shoulder and arm pieces, gloves and leg covers"
  }
] as const;

type AltProduct = {
  canonical_product_id: string;
  product_slug?: string | null;
  primary_image_url?: string | null;
  primary_image_alt?: string | null;
  media_gallery?: unknown;
};

export function applyReviewedPrimaryImageAlt<T extends AltProduct>(product: T, sourceDraftId: string): T {
  const binding = REVIEWED_PRIMARY_IMAGE_ALTS.find(item =>
    item.canonicalProductId === product.canonical_product_id
    && item.productSlug === product.product_slug
    && item.sourceDraftId === sourceDraftId
    && item.imageUrl === product.primary_image_url
  );
  if (!binding) return product;

  const gallery = Array.isArray(product.media_gallery)
    ? product.media_gallery.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)
        || item.media_type !== 'image' || item.url !== binding.imageUrl) return item;
      return {...item, alt: binding.altText};
    }) : null;
  return {
    ...product,
    primary_image_alt: binding.altText,
    ...(gallery ? {media_gallery: gallery} : {}),
  };
}
