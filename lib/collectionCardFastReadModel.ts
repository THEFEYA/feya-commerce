import 'server-only';

/** Phase13 P1: public collections only, after service-only DB migration and
 * exact 207 owner-approved source checks. Does not replace the Home/Shop
 * pinned Product Truth read model, public PDP or checkout price authority.
 */
export const COLLECTION_FAST_VIEW='feya_storefront_collection_cards_fast_v1';
export const COLLECTION_FAST_SELECT=[
  'canonical_product_id','product_slug','matched_etsy_listing_id','source_url',
  'card_title','h1','seo_title','meta_description','product_type','material','color',
  'size_mode','production_profile','shipping_profile','handmade_flag','styled_imagery_flag',
  'primary_image_url','primary_image_alt','secondary_image_url','hover_image_url',
  'video_url','media_count','has_video','min_price','max_price','currency',
  'full_set_display_price_amount','category_label','world_label','canonical_color_label',
  'color_options',
].join(',');
