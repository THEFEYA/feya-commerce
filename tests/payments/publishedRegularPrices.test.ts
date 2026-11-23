import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import release from '../../config/etsyRegularPriceRelease.json' with {type:'json'};
import {applyPublishedCardPrices,applyPublishedProductPrices,publishedRegularEurMinor,usdToEurMinor,validateRegularPriceEvidence,publishedPriceNeedsSize} from '../../lib/storefrontPublishedPrices.ts';
import {applyOwnerReviewedStorefrontCorrections} from '../../lib/storefrontOwnerReviewedCorrections.ts';
import {restoreSourceProvenPurchaseOptions} from '../../lib/storefrontSourceOptionLabels.ts';
import {projectReviewedBonanzaColors} from '../../lib/bonanzaReviewedColorProjection.ts';
import {selectedOptionPrice,selectedPriceConfidence} from '../../lib/storefrontSizePrice.ts';
import {colorChoiceLabel} from '../../lib/bonanzaColorChoices.ts';
import {coupleColorSelection} from '../../lib/bonanzaCoupleColorChoices.ts';
import {isSourceConfirmedPairedSet} from '../../lib/payments/pairedSetSelection.ts';
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
  return applyPublishedProductPrices(projectReviewedBonanzaColors(restoreSourceProvenPurchaseOptions(applyOwnerReviewedStorefrontCorrections(product)),'detail'));
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
    const selected=sortedOptions(p).find(row=>optionKey(row)===book.cardConfigurationId)!;
    const amount=selectedOptionPrice(selected,p.published_default_size)!;
    const sku=pdpOfferJsonLd(p,'https://thefeya.com/shop/'+p.product_slug);
    if(productId==='88d4332c-95bc-4859-a31e-33d6ee89fb4d'){
      assert.ok(sku?.['@type']==='AggregateOffer');
      assert.equal(sku.lowPrice,'90.08');assert.equal(sku.highPrice,'130.12');
    }else{
      assert.ok(sku?.['@type']==='Offer');assert.equal(sku.sku,book.cardConfigurationId);
      assert.equal(sku.price,amount.toFixed(2));
    }
    assert.equal(sku.priceCurrency,'EUR');
    const rawCard={canonical_product_id:productId,currency:'EUR',min_price:0,max_price:0};
    assert.equal(applyPublishedCardPrices({...rawCard,card_display_price_amount:0}).card_display_price_amount,amount);
    assert.equal(applyPublishedCardPrices({...rawCard,full_set_display_price_amount:0}).full_set_display_price_amount,amount);
    const amounts=sortedOptions(p).flatMap(row=>['XS','S','M','L','XL','XXL','XXXL'].map(size=>selectedOptionPrice(row,size)!));
    assert.equal(p.min_price,Math.min(...amounts));assert.equal(p.max_price,Math.max(...amounts));
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
      const sizesForQuote=['XS','S','M','L','XL','XXL','XXXL'];
      assert.equal(option.price_confidence_status,validateRegularPriceEvidence(entry,book));options++;
      const pair=isSourceConfirmedPairedSet(option) ? coupleColorSelection(p)?.defaultPair : null;
      for(const size of sizesForQuote)for(const otherSize of pair?sizesForQuote:[size]){
        const expected=publishedRegularEurMinor(id,config,size)!;
        const line={id:`${id}-${config}-${size}`,slug:p.product_slug!,configuration_id:config,size,
          color:option.configuration_color || (pair?colorChoiceLabel(pair.women):colorOptions(p)[0]||'Mirror'),
          paired_selection:pair?{women:{size,color:pair.women},men:{size:otherSize,color:pair.men}}:null,
          quantity:2,wearer:null,made_to_measure:false,client_unit_minor:1};
        const quote=priceCartLineForQuote(p,line);
        const buy=priceCartLine(p,{...line,client_unit_minor:expected});
        assert.equal(quote.unit_minor,expected);assert.equal(quote.line_minor,expected * 2);
        assert.equal(quote.price_changed,true);assert.equal(buy.price_changed,false);
        assert.equal(buy.unit_minor,quote.unit_minor);sizes++;
      }
    }
  }
  assert.equal(options,171);assert.equal(sizes,1281);
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
  assert.equal(selected,171);assert.equal(unchanged,685);
});

test('size selection, saved bags, site-only fit and Merchant landings agree on the corset prices',()=>{
  const productId='665296a0-f5ad-422c-837c-868f611c45c6';
  const config='bc5d078e-6a54-4270-9f17-52c0b55a3dd8';
  const p=currentProduct(productId);
  const option=sortedOptions(p).find(row=>optionKey(row)===config)!;
  assert.equal(p.published_default_size,'M');
  assert.equal(publishedPriceNeedsSize(productId,config),true);
  const title=p.default_color_choice!;
  const price=usdToEurMinor(25300,release.fx.usdPerEur);
  for(const [size,amount] of [['XS',price],['S',price],['M',price],['L',price],['XL',price],['XXL',18344],['XXXL',18344],['Custom',18344]] as const){
    assert.equal(selectedOptionPrice(option,size),amount/100);
    const expectedConfidence=amount===18344?'website_only_size_price':'verified_selected_size';
    assert.equal(selectedPriceConfidence(option,size),expectedConfidence);
    const saved={id:`${productId}-${config}-${size}`,slug:p.product_slug!,configuration_id:config,size,
      color:colorChoiceLabel(title),color_code:title,quantity:1,wearer:null,made_to_measure:size==='Custom',client_unit_minor:18344};
    const quote=priceCartLineForQuote(p,saved);
    assert.equal(quote.unit_minor,amount);assert.equal(quote.price_changed,amount!==18344);
    assert.equal(priceCartLine(p,{...saved,client_unit_minor:amount}).price_changed,false);
    if(size==='Custom')continue;
    const landing={configurationId:config,colorCode:title,size,womenColorCode:null,menColorCode:null,womenSize:null,menSize:null};
    const offer=pdpOfferJsonLd(p,'https://thefeya.com/shop/'+p.product_slug,landing);
    assert.ok(offer?.['@type']==='Offer');assert.equal(offer.price,(amount/100).toFixed(2));
    assert.equal(new URL(offer.url).searchParams.get('size'),size);
  }
});

test('each release distinguishes observed standard sizes, one-size price axes, house policy and partial observations',()=>{
  const counts: Record<string,number> = {};
  for (const [,product] of released) {
    for (const offer of Object.values(product.offers)) {
      const status = validateRegularPriceEvidence(offer,product);
      counts[status] = (counts[status] ?? 0) + 1;
    }
  }
  assert.deepEqual(counts,{
    verified_standard_sizes:33,owner_configuration_base:126,verified_price_option:9,verified_selected_sizes:3,
  });
  const partial = release.products['665296a0-f5ad-422c-837c-868f611c45c6'];
  const full = partial.offers['bc5d078e-6a54-4270-9f17-52c0b55a3dd8'];
  const rows = full.observedPricesBySize;
  assert.throws(()=>validateRegularPriceEvidence({...full,observedPricesBySize:{XS:rows.XS}},partial),/reference size/);
  assert.throws(()=>validateRegularPriceEvidence({...full,observedPricesBySize:{M:rows.M,XS:rows.S}},partial),/Wrong Etsy size/);
  const relisted = release.products['453ffb2e-2ed9-4e8d-b74c-e891604f9644'];
  const gold = relisted.offers[relisted.cardConfigurationId as keyof typeof relisted.offers];
  assert.equal(relisted.originalEtsyListingId,'4324575912');assert.equal(relisted.etsyListingId,'4324592783');
  assert.match(currentProduct('453ffb2e-2ed9-4e8d-b74c-e891604f9644').product_slug!,/4324575912$/);
  assert.throws(()=>validateRegularPriceEvidence(gold,{...relisted,etsyListingId:relisted.originalEtsyListingId}),/Wrong source listing/);
  assert.throws(()=>validateRegularPriceEvidence({...gold,evidence:{...gold.evidence,observedSize:'XS'}},relisted),/approved configuration/);
});
