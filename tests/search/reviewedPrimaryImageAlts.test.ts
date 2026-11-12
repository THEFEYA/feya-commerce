import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {applyReviewedPrimaryImageAlt, REVIEWED_PRIMARY_IMAGE_ALTS} from '../../lib/storefrontReviewedPrimaryImageAlts.ts';

const pin=REVIEWED_PRIMARY_IMAGE_ALTS[0];
const secondary='https://i.etsystatic.com/example/other-angle.jpg';
const product=()=>({
  canonical_product_id:pin.canonicalProductId,product_slug:pin.productSlug,
  primary_image_url:pin.imageUrl,primary_image_alt:'Legacy listing title',
  seo_title:'Frozen SEO title',intro:'Frozen PDP copy',price:123,currency:'EUR',
  media_gallery:[
    {url:pin.imageUrl,media_type:'image',alt:'Legacy listing title',position:1},
    {url:secondary,media_type:'image',alt:'Other angle',position:2},
  ],
});

test('exact source binding projects the reviewed primary ALT without changing files, gallery order, copy or price',()=>{
  const original=product();
  const before=structuredClone(original);
  const result=applyReviewedPrimaryImageAlt(original,pin.sourceDraftId);
  assert.equal(result.primary_image_alt,pin.altText);
  assert.equal(result.media_gallery[0].alt,pin.altText);
  assert.equal(result.media_gallery[1],original.media_gallery[1]);
  const restored={...result,primary_image_alt:original.primary_image_alt,
    media_gallery:result.media_gallery.map((item,i)=>({...item,alt:original.media_gallery[i].alt}))};
  assert.deepEqual(restored,original);
  assert.deepEqual(original,before);
});

test('a new image, draft, product or slug cannot inherit the previous photograph caption',()=>{
  const changes=[{canonical_product_id:'different-product'}, {product_slug:'different-slug'},
    {primary_image_url:secondary}];
  for(const fields of changes){
    const changed={...product(),...fields};
    assert.equal(applyReviewedPrimaryImageAlt(changed,pin.sourceDraftId),changed);
  }
  const original=product();
  assert.equal(applyReviewedPrimaryImageAlt(original,'new-draft'),original);
});

test('card rows need no gallery and selected secondary photographs retain their own ALT',()=>{
  const {media_gallery,...card}=product();
  const result=applyReviewedPrimaryImageAlt(card,pin.sourceDraftId);
  assert.equal(result.primary_image_alt,pin.altText);
  assert.equal(Object.hasOwn(result,'media_gallery'),false);
  const selected={...product(),primary_image_url:secondary};
  assert.equal(applyReviewedPrimaryImageAlt(selected,pin.sourceDraftId),selected);
  assert.equal(media_gallery[1].alt,'Other angle');
});

test('the five existing measurement products bind to exact frozen approved drafts, not latest generated candidates',()=>{
  const frozen=JSON.parse(readFileSync('config/approved-content-review-bindings.json','utf8'));
  assert.equal(REVIEWED_PRIMARY_IMAGE_ALTS.length,5);
  assert.equal(new Set(REVIEWED_PRIMARY_IMAGE_ALTS.map(x=>x.imageUrl)).size,5);
  for(const binding of REVIEWED_PRIMARY_IMAGE_ALTS){
    const matches=frozen.entries.filter((x:{canonical_product_id:string})=>x.canonical_product_id===binding.canonicalProductId);
    assert.equal(matches.length,1);
    assert.equal(matches[0].draft_id,binding.sourceDraftId);
    assert.equal(matches[0].url_path,'/shop/'+binding.productSlug);
    assert.ok(binding.altText.length>20 && binding.altText.length<160);
  }
});
