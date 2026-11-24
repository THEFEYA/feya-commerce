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
import {isSourceConfirmedPairedSet,PAIRED_SET_SIZES} from '../../lib/payments/pairedSetSelection.ts';
import {colorOptions,fullSetOption,optionKey,optionLabel,optionPrice,sortedOptions} from '../../lib/storefront.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {priceCartLine,type CartLineInput} from '../../lib/payments/catalogLinePricing.ts';
import {priceCartLineForQuote} from '../../lib/payments/cartColourRecovery.ts';
import type {StorefrontConfiguration,StorefrontProduct} from '../../lib/types.ts';

const source:StorefrontProduct[]=[1,2].flatMap(part=>JSON.parse(readFileSync(
  new URL(`../fixtures/approved-product-selectors-20261026-part${part}.json`,import.meta.url),'utf8')).products);
const released=Object.entries(release.products);
const silver='7bb70eab-b2f5-4079-96e7-d116484d1466';
const horns='8223ea35-644b-4bd8-bd05-4ba7810b116a';
const spine='31bde143-e483-454b-a397-14bcffa47f20';

function sourceProduct(id:string){
  const product=source.find(row=>row.canonical_product_id===id)!;
  return projectReviewedBonanzaColors(restoreSourceProvenPurchaseOptions(applyOwnerReviewedStorefrontCorrections(product)),'detail');
}

const currentProduct=(id:string)=>applyPublishedProductPrices(sourceProduct(id));

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
    const amount=selectedOptionPrice(selected,p.published_reference_size)!;
    const sku=pdpOfferJsonLd(p,'https://thefeya.com/shop/'+p.product_slug);
    const previous=pdpOfferJsonLd(sourceProduct(productId),'https://thefeya.com/shop/'+p.product_slug);
    if(previous?.['@type']==='AggregateOffer'){
      assert.ok(sku?.['@type']==='AggregateOffer');
      assert.equal(sku.lowPrice,p.min_price!.toFixed(2));assert.equal(sku.highPrice,p.max_price!.toFixed(2));
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
        assert.equal(buy.unit_minor,quote.unit_minor);
        if('publicLabel' in entry)assert.equal(buy.option_label,entry.publicLabel);
        sizes++;
      }
    }
  }
  assert.equal(options,629);assert.equal(sizes,4571);
});

test('bundle comparisons are truthful for single and multiple sets',()=>{
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
});

test('the silver spine full set matches its twin and retains the three component prices', () => {
  const product = currentProduct(spine);
  const sibling = currentProduct('73735bd6-82e7-48fa-8b2e-235a13bbf4b0');
  const full = fullSetOption(product)!;
  const config = optionKey(full);
  assert.equal(config, 'c45dfaca-600d-46ef-b6a7-556de132d0e1');
  assert.equal(full.price_source_mode, 'owner_authorized_full_set_eur');
  assert.equal(product.component_sum_display_price_amount, 343.70);
  assert.equal(product.full_set_savings_amount, 23.41);
  const components = sortedOptions(product).filter(option => optionKey(option) !== config);
  assert.deepEqual(Object.fromEntries(components.map(option => [optionKey(option), optionPrice(option)])), {
    'b6625b12-eb5b-49b6-942b-00570f562381': 141.04,
    '260e1e5f-b933-4315-a216-86bfc840d83e': 96.50,
    '8a01e45a-1278-4215-bbe9-92603659c9b4': 106.16,
  });
  for (const size of PAIRED_SET_SIZES) {
    assert.equal(selectedOptionPrice(fullSetOption(sibling)!, size), 320.29);
    const line:CartLineInput = {
      id:spine + '-' + config, slug:product.product_slug!, configuration_id:config,
      size, color:colorOptions(product)[0], wearer:null, made_to_measure:size === 'Custom',
      quantity:1, client_unit_minor:25522,
    };
    const quote = priceCartLineForQuote(product,line);
    assert.equal(quote.unit_minor, 32029);
    assert.equal(quote.price_changed, true);
    assert.equal(priceCartLine(product,{...line,client_unit_minor:32029}).price_changed, false);
  }
});

test('the runway petal Full Set charges its approved EUR price in every fit and reprices a saved bag',()=>{
  const id='a6239781-34bb-42a1-85ae-91a733f7df65';
  const product=currentProduct(id);
  const full=fullSetOption(product)!;
  const config=optionKey(full);
  assert.equal(config,'91834134-2157-4528-b306-163791377970');
  assert.equal(full.price_source_mode,'owner_authorized_full_set_eur');
  assert.equal(full.price_confidence_status,'owner_reviewed');
  assert.equal(product.component_sum_display_price_amount,284.96);
  assert.equal(product.full_set_savings_amount,4.71);
  const original=sourceProduct(id);
  for(const piece of sortedOptions(original).filter(row=>optionKey(row)!==config)){
    assert.deepEqual(sortedOptions(product).find(row=>optionKey(row)===optionKey(piece)),piece);
  }
  for(const size of PAIRED_SET_SIZES){
    const line:CartLineInput={id:id+'-'+config,slug:product.product_slug!,configuration_id:config,size,
      color:colorOptions(product)[0],quantity:1,wearer:null,made_to_measure:size==='Custom',client_unit_minor:23129};
    assert.equal(publishedRegularEurMinor(id,config,size),28025);
    assert.equal(selectedOptionPrice(full,size),280.25);
    const quote=priceCartLineForQuote(product,line);
    assert.equal(quote.unit_minor,28025);
    assert.equal(quote.price_changed,true);
    assert.equal(priceCartLine(product,{...line,client_unit_minor:28025}).price_changed,false);
  }
  assert.equal(optionPrice(fullSetOption(currentProduct('c35b5b75-7e6e-492b-9528-6a126384086e'))),280.25);
  assert.equal(optionPrice(fullSetOption(currentProduct('6a4c1f02-8f02-4aca-b70d-8d9ac66b9b40'))),320.29);
});

test('the two red/black spine-and-tail listings quote the same full set in every fit', () => {
  const productId = 'a9f110dc-4ed4-454f-9e28-f67ca5a042e1';
  const product = currentProduct(productId);
  const sibling = currentProduct('e7238b1d-565c-4c4d-a7ae-a4402de80720');
  const full = fullSetOption(product)!;
  const siblingFull = fullSetOption(sibling)!;
  const configurationId = optionKey(full);
  assert.equal(configurationId, '0901f124-d832-40f4-aa3b-1dc2b20e0b8c');
  assert.equal(full.price_source_mode, 'owner_authorized_full_set_eur');
  assert.equal(product.component_sum_display_price_amount, 547.28);
  assert.equal(product.full_set_savings_amount, 46.83);
  const separate = (row:StorefrontProduct) => sortedOptions(row).filter(option => optionKey(option) !== configurationId);
  assert.deepEqual(separate(product), separate(sourceProduct(productId)));
  for (const size of PAIRED_SET_SIZES) {
    assert.equal(selectedOptionPrice(full, size), 500.45);
    assert.equal(selectedOptionPrice(siblingFull, size), 500.45);
    const line:CartLineInput = {
      id:productId + '-' + configurationId, slug:product.product_slug!, configuration_id:configurationId,
      size, color:colorOptions(product)[0], wearer:null, made_to_measure:size === 'Custom',
      quantity:1, client_unit_minor:39898,
    };
    const quote = priceCartLineForQuote(product, line);
    assert.equal(quote.unit_minor, 50045);
    assert.equal(quote.price_changed, true);
    assert.equal(priceCartLine(product, {...line, client_unit_minor:50045}).price_changed, false);
  }
});

test('Gold Matching Couple charges the owner-approved pair price for both fits and compares against the two actual solo prices',()=>{
  const productId = '057fbd51-52f5-4404-b126-e5d75b8599f4';
  const book = release.products[productId];
  const product = currentProduct(productId);
  const config = book.ownerPricedPair.configurationId;
  const pair = fullSetOption(product)!;
  assert.equal(optionKey(pair),config);
  assert.equal(Object.hasOwn(book.offers,config),false);
  assert.equal(pair.price_source_mode,'owner_authorized_bundle');
  assert.equal(pair.price_confidence_status,'owner_reviewed');
  const separate = book.separateConfigurationIds.map(id=>publishedRegularEurMinor(productId,id));
  assert.deepEqual(separate,[23021,41037]);
  assert.equal(optionPrice(pair),613.28);
  assert.equal(product.component_sum_display_price_amount,640.58);
  assert.equal(product.full_set_savings_amount,27.30);
  assert.equal(pair.sale_price_amount,null);
  assert.equal(pair.compare_at_price_amount,null);
  const colors = coupleColorSelection(product)!.defaultPair;
  for (const women of PAIRED_SET_SIZES) for (const men of PAIRED_SET_SIZES) {
    const line = {id:productId+'-'+config,slug:product.product_slug!,configuration_id:config,size:women,
      color:colorChoiceLabel(colors.women),color_code:colors.women,wearer:null,quantity:1,made_to_measure:false,
      paired_selection:{women:{size:women,color:colors.women},men:{size:men,color:colors.men}},client_unit_minor:46044};
    const quote = priceCartLineForQuote(product,line);
    assert.equal(quote.unit_minor,61328);
    assert.equal(quote.price_changed,true);
    assert.deepEqual(quote.paired_selection,line.paired_selection);
    assert.equal(priceCartLine(product,{...line,client_unit_minor:61328}).price_changed,false);
  }
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
  assert.equal(selected,633);assert.equal(unchanged,223);
});

test('size selection, saved bags, site-only fit and Merchant landings agree on the corset prices',()=>{
  const productId='665296a0-f5ad-422c-837c-868f611c45c6';
  const config='bc5d078e-6a54-4270-9f17-52c0b55a3dd8';
  const p=currentProduct(productId);
  const option=sortedOptions(p).find(row=>optionKey(row)===config)!;
  assert.equal(p.published_reference_size,'M');
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
    verified_standard_sizes:33,owner_configuration_base:584,verified_price_option:9,verified_selected_sizes:3,
  });
  const quantityNeutral = released.flatMap(([,product])=>Object.values(product.offers).filter(offer=>'publicLabelMode' in offer));
  assert.equal(quantityNeutral.length,2);
  for(const offer of quantityNeutral){
    assert.ok('evidence' in offer && 'matchedOption' in offer.evidence && 'publicLabel' in offer);
    assert.equal(offer.evidence.matchedOption,'Bracelets *2');
    assert.equal(offer.publicLabel,'Bracelets');
  }
  const silverRelease = release.products[silver];
  const silverFull = silverRelease.offers['41e7d07b-761b-4edb-bdc3-ed4258c1aa4a'];
  assert.throws(()=>validateRegularPriceEvidence(silverFull,{...silverRelease,etsySizeValues:{M:silverRelease.etsySizeValues.M}}),/Incomplete/);
  const partial = release.products['665296a0-f5ad-422c-837c-868f611c45c6'];
  const full = partial.offers['bc5d078e-6a54-4270-9f17-52c0b55a3dd8'];
  const rows = full.observedPricesBySize;
  assert.throws(()=>validateRegularPriceEvidence({...full,observedPricesBySize:{XS:rows.XS}},partial),/reference size/);
  assert.throws(()=>validateRegularPriceEvidence({...full,observedPricesBySize:{M:rows.M,XS:rows.S}},partial),/Wrong Etsy size/);
  const relisted = release.products['453ffb2e-2ed9-4e8d-b74c-e891604f9644'];
  const gold = relisted.offers[relisted.cardConfigurationId as keyof typeof relisted.offers];
  const goldenShoulder=relisted.offers['ffe4a60b-fb7f-41bf-b3d5-68d21e5dc0fa'];
  assert.equal(goldenShoulder.publicLabel,goldenShoulder.evidence.matchedOption);
  assert.ok(goldenShoulder.evidence.sourceOptionRowId);
  const retainedShoulder=sortedOptions(currentProduct('ce899f23-b983-4ede-ae81-3348757b1c15')).find(row=>optionKey(row)==='9ecc5baf-5028-407e-923c-cf216033364d');
  assert.equal(retainedShoulder?.public_label,'Shoulders');
  const retainedGloves=sortedOptions(currentProduct('b0b2a75c-f301-45d6-857c-dd6575862619')).find(row=>optionKey(row)==='86121b07-a7c8-4836-bf2b-2c5528ddaca5');
  assert.equal(retainedGloves?.public_label,'Gloves');
  assert.equal(relisted.originalEtsyListingId,'4324575912');assert.equal(relisted.etsyListingId,'4324592783');
  assert.match(currentProduct('453ffb2e-2ed9-4e8d-b74c-e891604f9644').product_slug!,/4324575912$/);
  assert.throws(()=>validateRegularPriceEvidence(gold,{...relisted,etsyListingId:relisted.originalEtsyListingId}),/Wrong source listing/);
  assert.throws(()=>validateRegularPriceEvidence({...gold,evidence:{...gold.evidence,observedSize:'XS'}},relisted),/approved configuration/);
  assert.throws(()=>validateRegularPriceEvidence(gold,{...relisted,etsyListedSizes:['XS','S','M','L','XL']}),/Website size missing/);
});

test('six color-priced suspender options use their exact existing public names once in the selector and the checkout receipt',()=>{
  let checked=0;
  for(const [id,book] of released.filter(([,p])=>['1855580162','1867996009'].includes(p.etsyListingId))){
    const p=currentProduct(id);
    for(const config of Object.keys(book.offers)){
      const option=sortedOptions(p).find(row=>optionKey(row)===config)!;
      const expected=option.configuration_color+' Suspenders';
      assert.equal(option.public_label,expected);
      assert.equal(optionLabel(option),expected);
      const quote=priceCartLine(p,{id:id+'-'+config,slug:p.product_slug!,configuration_id:config,size:'M',
        color:option.configuration_color!,quantity:1,wearer:null,made_to_measure:false,client_unit_minor:null});
      assert.equal(quote.option_label,expected);checked++;
    }
  }
  assert.equal(checked,6);
});
