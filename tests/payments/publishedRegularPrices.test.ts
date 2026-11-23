import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import release from '../../config/etsyRegularPriceRelease.json' with {type:'json'};
import {applyPublishedCardPrices,applyPublishedProductPrices,publishedRegularEurMinor,usdToEurMinor} from '../../lib/storefrontPublishedPrices.ts';
import {applyOwnerReviewedStorefrontCorrections} from '../../lib/storefrontOwnerReviewedCorrections.ts';
import {restoreSourceProvenPurchaseOptions} from '../../lib/storefrontSourceOptionLabels.ts';
import {colorOptions,fullSetOption,optionKey,optionPrice,sortedOptions} from '../../lib/storefront.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {priceCartLineForQuote} from '../../lib/payments/cartColourRecovery.ts';
import type {StorefrontConfiguration,StorefrontProduct} from '../../lib/types.ts';

const source:StorefrontProduct[]=[1,2].flatMap(part=>JSON.parse(readFileSync(
  new URL(`../fixtures/approved-product-selectors-20261026-part${part}.json`,import.meta.url),'utf8')).products);
const released=Object.entries(release.products);
const silver='7bb70eab-b2f5-4079-96e7-d116484d1466';
const horns='8223ea35-644b-4bd8-bd05-4ba7810b116a';
const spine='31bde143-e483-454b-a397-14bcffa47f20';

function currentProduct(id:string){
  const product=source.find(row=>row.canonical_product_id===id)!;
  return applyPublishedProductPrices(restoreSourceProvenPurchaseOptions(applyOwnerReviewedStorefrontCorrections(product)));
}

test('positive integer price conversion rounds once, including exact half cents',()=>{
  assert.equal(usdToEurMinor(45000,'1.0990'),40946);
  assert.equal(usdToEurMinor(3,'2'),2);
  assert.equal(usdToEurMinor(1,'2'),1);
  for(const rate of ['0','-1','1e3','1.0000001']) assert.throws(()=>usdToEurMinor(100,rate));
  assert.throws(()=>usdToEurMinor(3.5,'1.1'));
  assert.throws(()=>usdToEurMinor(Number.MAX_SAFE_INTEGER,'1.000000'));
});

test('the shop, collection tiles, structured offer and default landing agree',()=>{
  for(const [productId,book] of released){
    const p=currentProduct(productId);
    assert.deepEqual(applyPublishedProductPrices(p),p,'reapplying is safe');
    assert.equal(p.price_contract_version,'etsy_regular_eur_'+release.version);
    const selected=fullSetOption(p)!;
    assert.equal(optionKey(selected),book.cardConfigurationId);
    const amount=optionPrice(selected)!;
    const sku=pdpOfferJsonLd(p,'https://thefeya.com/shop/'+p.product_slug);
    assert.ok(sku?.['@type']==='Offer');assert.equal(sku.sku,book.cardConfigurationId);
    assert.equal(sku.price,amount.toFixed(2));assert.equal(sku.priceCurrency,'EUR');
    const rawCard={canonical_product_id:productId,currency:'EUR',min_price:0,max_price:0};
    assert.equal(applyPublishedCardPrices({...rawCard,card_display_price_amount:0}).card_display_price_amount,amount);
    assert.equal(applyPublishedCardPrices({...rawCard,full_set_display_price_amount:0}).full_set_display_price_amount,amount);
    assert.equal(p.min_price,Math.min(...sortedOptions(p).map(row=>optionPrice(row)!)));
    assert.equal(p.max_price,Math.max(...sortedOptions(p).map(row=>optionPrice(row)!)));
  }
});

test('every released size charges its verified configuration base and correctly identifies an older bag',()=>{
  let options=0,sizes=0;
  for(const [id,book] of released){
    const p=currentProduct(id);
    for(const [config,entry] of Object.entries(book.offers)){
      const option=sortedOptions(p).find(row=>optionKey(row)===config)!;
      const expected=publishedRegularEurMinor(id,config)!;
      assert.equal(optionPrice(option),expected / 100);
      assert.equal(option.compare_at_price_amount,null);assert.equal(option.sale_price_amount,null);
      assert.equal(option.discount_percent,null);
      assert.equal(new Set(entry.sizes).size,7);options++;
      for(const size of entry.sizes){
        const line={id:`${id}-${config}-${size}`,slug:p.product_slug!,configuration_id:config,size,
          color:colorOptions(p)[0]||'Mirror',quantity:2,wearer:null,made_to_measure:false,client_unit_minor:1};
        const quote=priceCartLineForQuote(p,line);
        const buy=priceCartLine(p,{...line,client_unit_minor:expected});
        assert.equal(quote.unit_minor,expected);assert.equal(quote.line_minor,expected * 2);
        assert.equal(quote.price_changed,true);assert.equal(buy.price_changed,false);
        assert.equal(buy.unit_minor,quote.unit_minor);sizes++;
      }
    }
  }
  assert.equal(options,31);assert.equal(sizes,217);
});

test('bundle comparisons are truthful for single and multiple sets; the unverified spine bundle keeps its original price',()=>{
  const silverProduct=currentProduct(silver);
  const bracelet=sortedOptions(silverProduct).find(o=>o.configuration_id==='04254157-450b-43d7-a820-78696f967966')!;
  assert.equal(bracelet.public_label,'Bracelets');assert.equal(silverProduct.component_sum_display_price_amount,512.48);
  assert.equal(silverProduct.full_set_savings_amount,103.02);
  const hornProduct=currentProduct(horns);
  assert.equal(hornProduct.component_sum_display_price_amount,0);
  assert.equal(hornProduct.full_set_savings_amount,0);
  const hornPrices=new Map(sortedOptions(hornProduct).map(row=>[optionKey(row),optionPrice(row)]));
  assert.equal(hornPrices.get('7265ce35-20ca-41f2-b1c7-0892db93f805'),760.69);
  assert.equal(hornPrices.get('4957f3e1-9fed-4360-a34e-3192bddf9b06'),1201.09);
  const spineSet='c45dfaca-600d-46ef-b6a7-556de132d0e1';
  assert.equal(publishedRegularEurMinor(spine,spineSet),null);
  assert.equal(optionPrice(fullSetOption(currentProduct(spine))),255.22);
});

test('unreleased products pass through with identity intact and missing exact IDs fail closed',()=>{
  const unrelated=source.find(row=>!released.some(([id])=>id===row.canonical_product_id))!;
  assert.equal(applyPublishedProductPrices(unrelated),unrelated);assert.equal(applyPublishedCardPrices(unrelated),unrelated);
  const raw=source.find(p=>p.canonical_product_id===silver)!;
  const original=JSON.stringify(raw);
  const config=raw.configurations as StorefrontConfiguration[];
  assert.throws(()=>applyPublishedProductPrices({...raw,configurations:config.slice(1)}),/missing/);
  assert.throws(()=>applyPublishedProductPrices({...raw,configurations:[...config,config[0]]}),/mismatch/);
  assert.throws(()=>applyPublishedProductPrices({...raw,currency:'USD'}),/mismatch/);
  currentProduct(silver);assert.equal(JSON.stringify(raw),original);
});

test('keeps all catalog option identities, unaffected prices, colors and product media',()=>{
  let selected=0,unchanged=0;
  for(const raw of source){
    const original=restoreSourceProvenPurchaseOptions(applyOwnerReviewedStorefrontCorrections(raw));
    const projected=applyPublishedProductPrices(original);
    const prior=new Map(sortedOptions(original).map(row=>[optionKey(row),optionPrice(row)]));
    const offered=sortedOptions(projected);
    assert.deepEqual(new Set(offered.map(row=>optionKey(row))),new Set(prior.keys()));
    assert.deepEqual(projected.color_options,original.color_options);
    assert.deepEqual(projected.media_gallery,original.media_gallery);
    for(const row of offered){
      const id=optionKey(row);
      const expected=publishedRegularEurMinor(original.canonical_product_id,id);
      if(expected===null){assert.equal(optionPrice(row),prior.get(id));unchanged++;}
      else{assert.equal(optionPrice(row),expected/100);selected++;}
    }
  }
  assert.equal(selected,31);assert.equal(unchanged,825);
});
