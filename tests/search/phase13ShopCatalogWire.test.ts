import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { packStorefrontCatalog, unpackStorefrontCatalog } from '../../lib/storefrontCatalogWire.ts';
import { defaultShopFilters, filterShopProducts } from '../../lib/shopCatalogNavigation.ts';
import type { StorefrontProduct } from '../../lib/types.ts';

function example(index: number): StorefrontProduct {
  const id = String(index).padStart(12,'0');
  return {
    canonical_product_id: '00000000-0000-4000-8000-'+id,
    product_slug: 'stage-mirror-costume-'+index,
    matched_etsy_listing_id: null,
    source_url: null,
    card_title: index % 2 ? 'Silver Stage Skirt '+index : 'Gold Mirror Shoulder '+index,
    h1: 'Original FEYA design '+index,
    seo_title: 'Stage accessory '+index,
    meta_description: 'Approved original content no changes '+index,
    product_type: index % 2 ? 'Skirt' : 'Shoulders',
    material: 'Vegan Leather',
    color: index % 2 ? 'Silver' : 'Gold',
    size_mode: null, production_profile: null, shipping_profile: null,
    handmade_flag: null, styled_imagery_flag: null,
    primary_image_url: 'https://example.test/approved-image-'+index+'.webp',
    primary_image_alt: 'Approved original FEYA design',
    secondary_image_url: null, hover_image_url: null, video_url: null,
    media_gallery: [], media_count: 1, has_video: false,
    min_price: 90, max_price: 180, currency: 'EUR',
    has_fallback_price: null, has_sampler_excluded_price: null,
    public_configuration_count: null, public_price_row_count: null,
    configurations: [], storefront_candidate_flag: true,
    full_set_display_price_amount: 140,
    category_label: 'Stage Costumes', world_label: 'Festival',
    canonical_color_label: index % 2 ? 'Silver' : 'Gold',
    color_options: [index % 2 ? 'Silver' : 'Gold'],
    facets: {
      audience: ['Women'], parts: [index % 2 ? 'Lower Body' : 'Arms'],
      subtypes: [index % 2 ? 'Skirt' : 'Shoulder'],
      events: ['Festival'], performance: ['Stage & Fashion'],
      dance: [], styles: ['Futuristic'], personas: [],
      materials: ['Vegan Leather'], effects: ['Metallic'],
      colors: [index % 2 ? 'Silver' : 'Gold'],
      mappingVersion: 'feya-storefront-facets-v4',
    },
  } as StorefrontProduct;
}

test('all 207 exact identities, rich facet structures, prices and nulls survive wire roundtrip', () => {
  const products = Array.from({length:207},(_,index)=>example(index));
  const wire = packStorefrontCatalog(products);
  assert.equal(wire.format,'columns-v1');
  assert.deepEqual(unpackStorefrontCatalog(wire),products);
  const a=JSON.stringify(products).length;
  const b=JSON.stringify(wire).length;
  assert.ok(b < a * 0.85, 'lossless wire format must reduce repeated field names');
  for(const config of [
    {color:'Gold'}, {color:'Silver'}, {piece:['Skirt']},
    {search:'stage'}, {part:['Arms']},
    {priceMax:120}, {sort:'Price · low to high'},
  ]) {
    const filters={...defaultShopFilters(),...config};
    assert.deepEqual(
      filterShopProducts(unpackStorefrontCatalog(wire),filters).map(x=>x.canonical_product_id),
      filterShopProducts(products,filters).map(x=>x.canonical_product_id),
    );
  }
});

test('any non-uniform row or missing optional field triggers original raw lossless fallback', () => {
  const first=example(1),second=example(2);
  const hetero=[first,{...second,seasonal_only:'not in first'}] as StorefrontProduct[];
  const wire=packStorefrontCatalog(hetero);
  assert.equal(wire.format,'raw-v1');
  assert.deepEqual(unpackStorefrontCatalog(wire),hetero);
  const missing=[first,{...second,meta_description:undefined}];
  const wireMissing=packStorefrontCatalog(missing as StorefrontProduct[]);
  assert.equal(wireMissing.format,'raw-v1');
  assert.deepEqual(unpackStorefrontCatalog(wireMissing),missing);
  const empty=packStorefrontCatalog([]);
  assert.deepEqual(unpackStorefrontCatalog(empty),[]);
});

test('wire only affects the server/client transport, never the frozen ShopClient or approved product model', () => {
  const route=readFileSync('app/shop/page.tsx','utf8');
  const adapter=readFileSync('components/ShopCatalogWireClient.tsx','utf8');
  assert.match(route,/catalog=\{packStorefrontCatalog\(products\)\}/);
  assert.match(adapter,/return <ShopClient/);
  assert.match(adapter,/products=\{products\}/);
  assert.doesNotMatch(route,/\.update\(|\.insert\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(adapter,/\.update\(|\.insert\(|\.upsert\(|\.delete\(/);
});
