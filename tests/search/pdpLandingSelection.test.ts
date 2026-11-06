import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {StorefrontConfiguration,StorefrontProduct} from '../../lib/types.ts';
import {resolvePdpLandingSelection,pdpLandingHref,pdpLandingParams,type PdpLandingSelection} from '../../lib/pdpLandingSelection.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {optionKey,optionPrice,sortedOptions} from '../../lib/storefront.ts';
import {coupleColorSelection} from '../../lib/bonanzaCoupleColorChoices.ts';
import {colorChoiceLabel} from '../../lib/bonanzaColorChoices.ts';
import {verifiedColorPriceRows} from '../../lib/bonanzaColorPriceExceptions.ts';
import {priceCartLine,PDP_SIZES} from '../../lib/payments/catalogLinePricing.ts';
import {isSourceConfirmedPairedSet} from '../../lib/payments/pairedSetSelection.ts';

const fixtures=JSON.parse(readFileSync('tests/fixtures/merchant-landing-products-20261106.json','utf8')).products as {etsy_tail:string;product:StorefrontProduct}[];
const product=(tail:string)=>fixtures.find(f=>f.etsy_tail===tail)!.product;
const sizes=PDP_SIZES.filter(s=>s!=='Custom');
const base='https://thefeya.com';
function selected(p:StorefrontProduct,query:Record<string,string>):PdpLandingSelection {
  const result=resolvePdpLandingSelection(p,query);
  assert.equal(result.status,'selected',JSON.stringify({id:p.canonical_product_id,query}));
  assert.ok(result.selection);return result.selection;
}
function quote(p:StorefrontProduct,s:PdpLandingSelection){
  const paired=Boolean(s.womenColorCode);
  return priceCartLine(p,{id:p.canonical_product_id+'-landing-test',slug:p.product_slug!,configuration_id:s.configurationId,
    size:paired?s.womenSize!:s.size!,color:colorChoiceLabel((paired?s.womenColorCode:s.colorCode)!),
    color_code:paired?s.womenColorCode:s.colorCode,quantity:1,wearer:null,made_to_measure:false,client_unit_minor:null,
    ...(paired?{paired_selection:{women:{size:s.womenSize!,color:s.womenColorCode!},men:{size:s.menSize!,color:s.menColorCode!}}}:{}),
  });
}

test('five choose-first pages resolve their actual options and standard sizes at the checkout price',()=>{
  for(const tail of ['4348580005','1824045326','1899282209','4463955343','1888669170']){
    const p=product(tail);
    assert.equal(pdpOfferJsonLd(p,base+'/shop/'+p.product_slug)?.['@type'],'AggregateOffer');
    for(const [index,option] of sortedOptions(p).entries())for(const size of sizes){
      const s=selected(p,{configuration:optionKey(option,index),color:p.default_color_choice!,size});
      const href=pdpLandingHref(p,s)!;assert.ok(href.startsWith('/shop/'+p.product_slug+'?'));
      const roundTrip=resolvePdpLandingSelection(p,Object.fromEntries(new URL(base+href).searchParams));
      assert.deepEqual(roundTrip.selection,s);
      const offer=pdpOfferJsonLd(p,base+'/shop/'+p.product_slug,s);
      assert.equal(offer?.['@type'],'Offer');assert.equal(offer&&'sku' in offer?offer.sku:null,optionKey(option,index));
      assert.equal(offer?.url,base+href);
      const charged=quote(p,s);assert.equal(charged.unit_minor,Math.round(optionPrice(option)!*100));
      assert.equal(offer&&'price' in offer?offer.price:null,(charged.unit_minor/100).toFixed(2));
    }
  }
});

test('all five genuine pairs preserve independent partner sizes and the photographed mixed colors',()=>{
  const pairs=fixtures.filter(f=>coupleColorSelection(f.product));assert.equal(pairs.length,5);
  for(const {product:p} of pairs){
    const couple=coupleColorSelection(p)!;
    const option=sortedOptions(p).find(o=>isSourceConfirmedPairedSet(o));assert.ok(option);
    for(const womenSize of sizes)for(const menSize of sizes){
      const s=selected(p,{configuration:optionKey(option),women_color:couple.defaultPair.women,men_color:couple.defaultPair.men,
        women_size:womenSize,men_size:menSize});
      assert.equal(s.womenSize,womenSize);assert.equal(s.menSize,menSize);assert.equal(s.size,null);
      assert.equal(s.colorCode,null);assert.equal(s.womenColorCode,couple.defaultPair.women);assert.equal(s.menColorCode,couple.defaultPair.men);
      assert.equal(quote(p,s).unit_minor,Math.round(optionPrice(option)!*100));
      assert.deepEqual(resolvePdpLandingSelection(p,Object.fromEntries(new URL(base+pdpLandingHref(p,s)).searchParams)).selection,s);
    }
    const configuration=optionKey(option);
    for(const invalid of [{size:'L'},{women_size:'S'},{women_size:'S',men_size:'Custom'},{color:p.default_color_choice!},
      {women_color:couple.defaultPair.women}]){
      assert.equal(resolvePdpLandingSelection(p,{configuration,...invalid}).status,'invalid');
    }
  }
});

test('a single partner outfit retains its own photographed color rather than the whole-pair label',()=>{
  for(const {product:p} of fixtures.filter(f=>coupleColorSelection(f.product))){
    const couple=coupleColorSelection(p)!;
    for(const option of sortedOptions(p).filter(o=>!isSourceConfirmedPairedSet(o))){
      const audience=String(option.configuration_audience||'').toLowerCase();
      if(audience!=='women'&&audience!=='men')continue;
      const s=selected(p,{configuration:optionKey(option),size:'M'});
      assert.equal(s.colorCode,couple.defaultPair[audience]);assert.equal(s.womenSize,null);assert.equal(s.menSize,null);
      assert.equal(quote(p,s).unit_minor,Math.round(optionPrice(option)!*100));
    }
  }
});

test('an unproven replacement Full Set cannot make the paired UI accept one shared size',()=>{
  for(const {product:p} of fixtures.filter(f=>coupleColorSelection(f.product))){
    const changed=structuredClone(p),o=(changed.configurations as StorefrontConfiguration[]).find(o=>isSourceConfirmedPairedSet(o))!;
    // A changed source identity cannot inherit the old tuple's explicit source
    // proof from either the payload or the exact owner-reviewed adapters.
    o.configuration_id='00000000-0000-4000-8000-000000000999';
    o.source_confirmed_bundle_members=false;o.source_confirmed_paired_outfits=false;
    assert.equal(resolvePdpLandingSelection(changed,{configuration:optionKey(o),size:'M'}).status,'invalid');
    assert.equal(resolvePdpLandingSelection(changed,{configuration:optionKey(o),women_size:'S',men_size:'XL'}).status,'invalid');
  }
});

test('three color-priced harnesses cannot use another color price or unpriced White',()=>{
  for(const tail of ['1871310023','1855580162','1867996009']){
    const p=product(tail),options=sortedOptions(p),priced=verifiedColorPriceRows(p.canonical_product_id,options)!;
    const photo=priced.find(o=>o.configuration_color===colorChoiceLabel(p.default_color_choice!))!;
    for(const size of sizes)assert.equal(quote(p,selected(p,{configuration:optionKey(photo),color:p.default_color_choice!,size})).unit_minor,Math.round(optionPrice(photo)!*100));
    for(const o of priced.filter(o=>o!==photo))assert.equal(resolvePdpLandingSelection(p,{configuration:optionKey(o),color:p.default_color_choice!,size:'M'}).status,'invalid');
    assert.equal(resolvePdpLandingSelection(p,{configuration:optionKey(photo),color:'white',size:'M'}).status,'invalid');
  }
});

test('UTM-only and no-query visits retain defaults; invalid, foreign and repeated choices fail closed',()=>{
  const p=product('4348580005'),configuration=optionKey(sortedOptions(p)[0]);
  assert.equal(resolvePdpLandingSelection(p,{}).status,'absent');
  assert.equal(resolvePdpLandingSelection(p,{utm_source:'google'}).status,'absent');
  for(const query of [{configuration:'00000000-0000-0000-0000-000000000000'},
    {configuration:[configuration,configuration]},{configuration,size:['S','M']},{configuration,size:'Custom'},
    {configuration,size:'S\n'},{configuration,color:'silver'}, {configuration,women_size:'M'},
    {size:'M'}, {configuration:''}, {configuration:configuration+' '}]){
    assert.equal(resolvePdpLandingSelection(p,query).status,'invalid',JSON.stringify(query));
  }
  const s=selected(p,{configuration,size:'M',price:'0.01',currency:'USD',gender:'unisex'});
  assert.equal(quote(p,s).unit_minor,Math.round(optionPrice(sortedOptions(p)[0])!*100));
  assert.equal(pdpLandingHref(p,{...s,colorCode:'silver'}),null);
  assert.equal(pdpOfferJsonLd(p,base+'/shop/'+p.product_slug,{...s,colorCode:'silver'}),null);
});
