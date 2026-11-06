import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';

const URL = 'https://thefeya.com/shop/example';
const cfg = (id: string, label: string, price: number, extra: Record<string, unknown> = {}) => ({
  configuration_id: id, public_label: label, display_price_amount: price, ...extra,
});
const product = (configurations: unknown[], extra: Record<string, unknown> = {}) => ({
  canonical_product_id: '11111111-1111-4111-8111-111111111111', currency: 'EUR', configurations, ...extra,
}) as never;

test('a PDP that preselects the Full Set gets one Offer at the exact Full Set price', () => {
  const offer = pdpOfferJsonLd(product([
    cfg('c-bracelet', 'Bracelet', 96.5),
    cfg('aead53be-a274-40be-be01-fde8716f02f2', 'Full Set', 195.4, {is_full_set: true}),
    cfg('c-skirt', 'Skirt', 131.6),
  ]), URL);
  assert.deepEqual(offer, {
    '@type': 'Offer', url: URL, price: '195.40', priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
    sku: 'aead53be-a274-40be-be01-fde8716f02f2',
  });
});

test('a single-option PDP gets an Offer for that option', () => {
  const offer = pdpOfferJsonLd(product([cfg('only', 'Headpiece', 89)]), URL);
  assert.equal(offer?.['@type'], 'Offer');
  assert.equal(offer && 'price' in offer ? offer.price : null, '89.00');
});

test('a PDP that asks the buyer to choose first claims only a price range', () => {
  const offer = pdpOfferJsonLd(product([cfg('a', 'Top', 120.1), cfg('b', 'Skirt', 99.99)]), URL);
  assert.deepEqual(offer, {
    '@type': 'AggregateOffer', url: URL, lowPrice: '99.99', highPrice: '120.10', offerCount: 2,
    priceCurrency: 'EUR', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
  });
});

test('color-priced products without a verified default claim only the known price range', () => {
  const offer = pdpOfferJsonLd(product([
    cfg('br', 'Full Set', 210, {is_full_set: true, configuration_color: 'Brown'}),
    cfg('bl', 'Full Set Black', 220, {configuration_color: 'Black'}),
    cfg('gr', 'Full Set Green', 230, {configuration_color: 'Green'}),
  ], {canonical_product_id: 'de38a842-37c4-40a7-86b4-393341c4c9aa'}), URL);
  assert.equal(offer?.['@type'], 'AggregateOffer');
});

test('each color-priced product emits the exact photographed color price already selected in the UI', () => {
  for(const id of ['de38a842-37c4-40a7-86b4-393341c4c9aa','882793f6-15ca-4617-a579-5cd47290ce72','7cf4ea37-cd11-4203-860c-7eed4ae965ba']){
    for(const [color,expectedId,expectedPrice] of [['brown','br','159.31'],['black','bl','130.35'],['green','gr','140.01']]){
      const offer=pdpOfferJsonLd(product([
        cfg('bl','Harness',130.35,{configuration_color:'Black'}),
        cfg('br','Harness',159.31,{configuration_color:'Brown'}),
        cfg('gr','Harness',140.01,{configuration_color:'Green'}),
      ],{canonical_product_id:id,default_color_choice:color}),URL);
      assert.equal(offer?.['@type'],'Offer');
      assert.equal(offer && 'sku' in offer ? offer.sku:null,expectedId);
      assert.equal(offer && 'price' in offer ? offer.price:null,expectedPrice);
    }
  }
});

test('unpriced White and malformed color-price sources cannot inherit another color quote',()=>{
  const options=[
    cfg('br','Harness',159.31,{configuration_color:'Brown'}),
    cfg('bl','Harness',130.35,{configuration_color:'Black'}),
    cfg('gr','Harness',140.01,{configuration_color:'Green'}),
  ];
  const base={canonical_product_id:'de38a842-37c4-40a7-86b4-393341c4c9aa',default_color_choice:'white'};
  assert.equal(pdpOfferJsonLd(product(options,base),URL)?.['@type'],'AggregateOffer');
  assert.equal(pdpOfferJsonLd(product([...options,cfg('wh','Harness',1,{configuration_color:'White'})],base),URL),null);
  assert.equal(pdpOfferJsonLd(product(options.slice(0,2),{...base,default_color_choice:'brown'}),URL),null);
  assert.equal(pdpOfferJsonLd(product([options[0],options[0],options[2]],{...base,default_color_choice:'brown'}),URL),null);
});

test('no price or non-EUR data emits no offer instead of inventing one', () => {
  assert.equal(pdpOfferJsonLd(product([]), URL), null);
  assert.equal(pdpOfferJsonLd(product([cfg('a', 'Full Set', 100, {is_full_set: true})], {currency: 'USD'}), URL), null);
});

test('PDP route embeds the offer only on purchasable (non-preview) pages', () => {
  const page = readFileSync('app/shop/[slug]/page.tsx', 'utf8');
  assert.match(page, /const purchasable = !\(Boolean\(approvedCopy\) && !allowHybridPreviewCommerce && !approvedPublicCopy\)/);
  assert.match(page, /const jsonLd = productJsonLd\(product, slug, approvedCopy\);/);
  assert.match(page, /const offers = purchasable && landing\.status!=='invalid'\s*\? pdpOfferJsonLd\(product, canonicalProductUrl\(slug\), initialLandingSelection\) : null;/);
  assert.match(page, /if \(offers\) jsonLd\.offers = offers;/);
});
