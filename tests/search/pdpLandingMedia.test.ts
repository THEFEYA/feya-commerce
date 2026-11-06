import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {StorefrontConfiguration,StorefrontProduct} from '../../lib/types.ts';
import {asConfigurations,getMedia} from '../../lib/storefront.ts';
import {resolvePdpLandingMedia} from '../../lib/pdpLandingMedia.ts';
import {PDP_LANDING_MEDIA_BINDINGS,PDP_LANDING_MEDIA_REVIEW_SHA256} from '../../lib/pdpLandingMediaBindings.ts';
import {pdpLandingHref,pdpLandingParams,resolvePdpLandingSelection,type PdpLandingSelection} from '../../lib/pdpLandingSelection.ts';
import {pdpOfferJsonLd} from '../../lib/storefrontOfferJsonLd.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {colorChoiceLabel} from '../../lib/bonanzaColorChoices.ts';

const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const candidates=json('docs/merchant/variant-landings-20261106/configuration_photo_candidates.json').bindings;
const fixtures=json('tests/fixtures/merchant-landing-products-20261106.json').products as {etsy_tail:string;product:StorefrontProduct}[];
const product=(id:string)=>fixtures.find(p=>p.product.canonical_product_id===id)!.product;

test('all14 reviewed configurations show the matching original photo first with unchanged quote and Offer',()=>{
  assert.equal(candidates.length,14);
  for(const c of candidates){
    const p=product(c.canonical_product_id),before=JSON.stringify(p);
    const s=c.example_selection as PdpLandingSelection;
    const media=resolvePdpLandingMedia(p,s);
    assert.equal(media.status,'bound',c.etsy_tail+':'+c.configuration_label);
    assert.equal(media.imageUrl,c.photo_url);assert.equal(media.gallery[0].url,c.photo_url);
    assert.equal(media.gallery.length,getMedia(p).length);
    assert.deepEqual(media.gallery.map(m=>m.url).sort(),getMedia(p).map(m=>m.url).sort());
    assert.equal(JSON.stringify(p),before,'source product/gallery must not be mutated');
    const paired=c.paired_selection;
    const quote=priceCartLine(p,{id:p.canonical_product_id+'-photo-test',slug:p.product_slug!,configuration_id:s.configurationId,
      size:paired?s.womenSize!:s.size!,color:colorChoiceLabel((paired?s.womenColorCode:s.colorCode)!),
      color_code:paired?s.womenColorCode:s.colorCode,quantity:1,wearer:null,made_to_measure:false,client_unit_minor:null,
      ...(paired?{paired_selection:{women:{size:s.womenSize!,color:s.womenColorCode!},men:{size:s.menSize!,color:s.menColorCode!}}}:{})});
    assert.equal(quote.unit_minor,c.unit_minor);
    const offer=pdpOfferJsonLd(p,c.base_url,s);
    assert.equal(offer?.['@type'],'Offer');
    assert.equal(offer&&'sku' in offer?offer.sku:null,c.configuration_id);
    assert.equal(offer&&'price' in offer?offer.price:null,(quote.unit_minor/100).toFixed(2));
    assert.equal(offer?.url,'https://thefeya.com'+pdpLandingHref(p,s));
  }
});

test('runtime photo bindings retain the exact full-gallery review provenance and exclude charts',()=>{
  const text=readFileSync('docs/merchant/variant-landings-20261106/gallery_review.json','utf8');
  assert.equal(createHash('sha256').update(text).digest('hex'),PDP_LANDING_MEDIA_REVIEW_SHA256);
  const review=JSON.parse(text);
  assert.equal(PDP_LANDING_MEDIA_BINDINGS.length,candidates.length);
  for(const binding of PDP_LANDING_MEDIA_BINDINGS){
    const candidate=candidates.find((c:{canonical_product_id:string;configuration_id:string})=>c.canonical_product_id===binding.productId&&c.configuration_id===binding.configurationId);
    assert.ok(candidate);assert.equal(binding.imageUrl,candidate.photo_url);assert.equal(binding.imageSha256,candidate.photo_sha256);
    const source=review.products.find((p:{canonical_product_id:string})=>p.canonical_product_id===binding.productId);
    const photo=source.media.find((m:{url:string})=>m.url===binding.imageUrl);
    assert.equal(photo.sha256,binding.imageSha256);assert.ok(!photo.classification.startsWith('SIZE_CHART'));
  }
});

test('no-query and UTM-only visits preserve original gallery order; unreviewed variants gain no photo claim',()=>{
  for(const {product:p} of fixtures){
    assert.equal(resolvePdpLandingMedia(p).status,'absent');
    assert.deepEqual(resolvePdpLandingMedia(p).gallery,getMedia(p));
    const utm=resolvePdpLandingSelection(p,{utm_source:'google'});
    assert.equal(utm.status,'absent');assert.deepEqual(resolvePdpLandingMedia(p,utm.selection).gallery,getMedia(p));
  }
  const p=fixtures.find(f=>f.etsy_tail==='1824045326')!.product;
  const option=asConfigurations(p).find(o=>o.public_label==="Men's Outfit")!;
  const s=resolvePdpLandingSelection(p,{configuration:option.configuration_id!,size:'M'}).selection;
  assert.ok(s);assert.equal(resolvePdpLandingMedia(p,s).status,'unreviewed');
  assert.deepEqual(resolvePdpLandingMedia(p,s).gallery,getMedia(p));
});

test('a missing or non-image reviewed frame suppresses the selected Offer instead of silently using the primary image',()=>{
  for(const c of candidates){
    const p=structuredClone(product(c.canonical_product_id));
    p.media_gallery=getMedia(p).filter(m=>m.url!==c.photo_url);
    for(const key of ['primary_image_url','secondary_image_url','hover_image_url'] as const){
      if(p[key]===c.photo_url)p[key]=null;
    }
    const s=c.example_selection as PdpLandingSelection;
    assert.equal(resolvePdpLandingMedia(p,s).status,'invalid',c.etsy_tail+':'+c.configuration_label);assert.equal(pdpOfferJsonLd(p,c.base_url,s),null);
  }
  const c=candidates.find((c:{etsy_tail:string;photo_position:number})=>c.etsy_tail==='4348580005'&&c.photo_position===7);
  const p=structuredClone(product(c.canonical_product_id));
  p.media_gallery=getMedia(p).map(m=>m.url===c.photo_url?{...m,media_type:'video'}:m);
  assert.equal(resolvePdpLandingMedia(p,c.example_selection).status,'invalid');
});

test('foreign selections, changed source composition/color and image-query overrides cannot choose another photo',()=>{
  const c=candidates.find((c:{etsy_tail:string;photo_position:number})=>c.etsy_tail==='4348580005'&&c.photo_position===7);
  const p=product(c.canonical_product_id),s=c.example_selection as PdpLandingSelection;
  for(const field of ['public_label','component_code'] as const){
    const changed=structuredClone(p);(changed.configurations as StorefrontConfiguration[]).find(o=>o.configuration_id===s.configurationId)![field]='changed source';
    assert.equal(resolvePdpLandingMedia(changed,s).status,'invalid');assert.equal(pdpOfferJsonLd(changed,c.base_url,s),null);
  }
  const changed=structuredClone(p);changed.default_color_choice='silver';
  assert.equal(resolvePdpLandingMedia(changed,{...s,colorCode:'silver'}).status,'invalid');
  assert.equal(resolvePdpLandingMedia(p,{...s,configurationId:'00000000-0000-4000-8000-000000000999'}).status,'invalid');
  const query={...pdpLandingParams(s),image_url:'https://example.invalid/unreviewed.jpg',image:'1',photo_position:'8'};
  const resolved=resolvePdpLandingSelection(p,query);assert.equal(resolved.status,'selected');
  assert.equal(resolvePdpLandingMedia(p,resolved.selection).imageUrl,c.photo_url);
  assert.doesNotMatch(pdpLandingHref(p,resolved.selection!)!,/image|photo|example/);
});
