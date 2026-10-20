import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  constituentColors, enrichStorefrontProductColors, productAvailableBaseColors,
} from '../../lib/bonanzaColorChoices.ts';
import {defaultShopFilters, filterShopProducts} from '../../lib/shopCatalogNavigation.ts';
import type {StorefrontProduct} from '../../lib/types.ts';

const source=JSON.parse(readFileSync('config/bonanzaReviewedColors20261011.json','utf8')) as {
  products:Record<string,{colors:string[];held:boolean}>;
};
const overrides=JSON.parse(readFileSync('config/bonanzaColorDisplayOverrides.json','utf8')) as {
  products:Record<string,{primary:string;filter_colors:string[]}>;
};
const catalog=JSON.parse(readFileSync('config/bonanzaColorReviewCatalog20261020.json','utf8')) as {
  products:Array<{id:string;title:string;slug:string}>;
};

function make(id:string):StorefrontProduct {
  const detail=catalog.products.find(x=>x.id===id)!;
  assert.ok(detail);
  const initial={canonical_product_id:id,card_title:detail.title,product_slug:detail.slug,
    min_price:100,max_price:100,full_set_display_price_amount:100,
    facets:{colors:[],events:[],materials:[],styles:[],personas:[],parts:[],
      subtypes:[],audience:[],performance:[],dance:[],effects:[],
      mappingVersion:'feya-storefront-facets-v4'}} as unknown as StorefrontProduct;
  return enrichStorefrontProductColors(initial,
    {...source.products[id],...overrides.products[id],held:false});
}
const base=defaultShopFilters();
const match=(product:StorefrontProduct,...colors:string[]) =>
  filterShopProducts([product],{...base,color:colors}).length===1;

test('catalog card exposes every base color available in the owner-confirmed variants',()=>{
  const red=make('09f51ad4-6b90-4311-aa5a-54f91cf4b7bf');
  assert.equal(red.default_color_choice,'black_red');
  assert.deepEqual(productAvailableBaseColors(red),['Black','Red','Gold','Silver','White']);
  assert.deepEqual(red.photo_color_filter_values,['Black','Red']);
  assert.deepEqual(constituentColors(red.color_choices||[]),['Gold','Silver','Black','White','Red']);
  assert.ok(productAvailableBaseColors(red).every(c=>!c.includes(' + ')));
  const card=readFileSync('components/ProductCard.tsx','utf8');
  assert.match(card,/productAvailableBaseColors\(p\)/);
  assert.match(card,/previewColors\.map\(\(c\)/);
  assert.match(card,/Available colors:/);
});

test('default photographed matching requires every visible color, available-mode remains broad OR',()=>{
  const red=make('09f51ad4-6b90-4311-aa5a-54f91cf4b7bf');
  assert.equal(match(red,'Red'),false);
  assert.equal(match(red,'Black'),false);
  assert.equal(match(red,'Gold'),false);
  assert.equal(match(red,'Black','Red'),true);
  assert.equal(match(red,'Gold','Red'),false);
  assert.equal(match(red,'Black','Gold','Red'),true);
  assert.equal(filterShopProducts([red],{...base,color:['Gold'],colorMode:'available'}).length,1);

  const triple=make('c661cd70-55e4-445e-97ab-591e22d02221');
  assert.equal(triple.default_color_choice,'gold_silver_black');
  assert.deepEqual(triple.photo_color_filter_values,['Gold','Silver','Black']);
  assert.equal(match(triple,'Gold'),false);
  assert.equal(match(triple,'Silver','Black'),false);
  assert.equal(match(triple,'Gold','Silver','Black'),true);

  const gold=make('f012a88f-44db-4e17-ba57-7f60bb7b5719');
  assert.deepEqual(gold.photo_color_filter_values,['Gold','Silver'],
    'Photographed mixed pair requires both filter circles');
  assert.equal(match(gold,'Gold'),false);
  assert.equal(match(gold,'Gold','Silver'),true);
});

test('color availability checkbox is compact, and partner picker offers compact sizes',()=>{
  const shop=readFileSync('components/ShopClient.tsx','utf8');
  assert.match(shop,/type="checkbox" checked=\{filters\.colorMode === 'available'\}/);
  assert.match(shop,/Include other available colors/);
  assert.doesNotMatch(shop,/>\s*Shown in photos\s*</);
  const pair=readFileSync('components/CouplePartnerColorSelector.tsx','utf8');
  const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(pair,/grid-cols-\[60px_minmax\(0,1fr\)_128px\]/);
  assert.match(pair,/feya-config-trigger flex h-10/);
  assert.match(pair,/feya-config-menu absolute/);
  assert.match(pair,/feya-config-option-active/);
  assert.match(pair,/text-\[13px\]/);
  assert.match(pair,/role="combobox"/);
  assert.match(pair,/role="listbox"/);
  assert.match(pair,/role="option"/);
  assert.match(pair,/aria-expanded=\{open\}/);
  assert.match(pair,/onChange=\{onSizeChange\}/);
  assert.match(pair,/document.addEventListener\('pointerdown'/);
  assert.match(pair,/event.key === 'Escape'/);
  assert.match(pair,/event.key === 'ArrowDown'/);
  assert.match(pair,/PartnerGlyph partner=\{partner\.id\}/);
  assert.match(pair,/partner === 'women'/);
  assert.match(pair,/text-\[#f7f3ec\]/);
  assert.doesNotMatch(pair,/<select value=/);
  assert.doesNotMatch(pair,/size-pill/);
  // Owner approved the existing jewel DIAMETERS: no enlargement in previews.
  const card=readFileSync('components/ProductCard.tsx','utf8');
  const swatch=readFileSync('components/FeyaColorSwatch.tsx','utf8');
  const colors=readFileSync('lib/bonanzaColorChoices.ts','utf8');
  assert.match(shop,/<FeyaColorSwatch color=\{value\} size=\{28\}/);
  assert.match(pair,/size=\{20\}/);
  assert.match(pdp,/size=\{27\}/);
  assert.match(card,/size=\{12\}/);
  assert.match(swatch,/border-white\/\[\.68\]/);
  assert.match(swatch,/ring-\[1\.5px\] ring-\[#dfc07c\]/);
  assert.match(colors,/HOLO_BLOOM/);
  assert.match(colors,/HOLO_SPECTRUM/);
  assert.match(colors,/spectrum\.forEach\(\(tone,j\)=>stops\.push\(tone\+'/);
  assert.match(pdp,/womenSize=\{womenSize\} menSize=\{menSize\} sizes=\{SIZES\}/);
  assert.match(pdp,/onSizeChange=/);
  assert.match(pdp,/\{!isCoupleSet && <div className="mt-2">/);
  assert.match(pdp,/womens_size: isCoupleSet \? womenSize : null/);
  assert.match(pdp,/mens_size: isCoupleSet \? menSize : null/);
});
