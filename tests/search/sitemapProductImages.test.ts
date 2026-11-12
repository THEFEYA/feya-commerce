import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {sitemapProductImages, type SitemapImageProduct} from '../../lib/sitemapProductImages.ts';

const photo='https://i.etsystatic.com/54033853/r/il/f2f6e3/7139855273/il_fullxfull.7139855273_4lu1.jpg';
const product=(overrides:Partial<SitemapImageProduct>={}):SitemapImageProduct=>({
  canonical_product_id:'approved-product',product_slug:'gold-shoulders-4348580005',primary_image_url:photo,...overrides,
});

test('image enrichment preserves the release corpus and uses only each matching existing primary photo',()=>{
  const products=[product(),product({canonical_product_id:'not-in-release',product_slug:'other-product'})];
  const before=JSON.stringify(products);
  const index=sitemapProductImages(products);
  const paths=['/','/collections/shoulder-armor','/shop/gold-shoulders-4348580005','/shop/retired-product'];
  const entries=paths.map(path=>({url:`https://thefeya.com${path}`,...(index.has(path)?{images:index.get(path)}:{})}));
  assert.deepEqual(entries.map(e=>e.url),paths.map(path=>`https://thefeya.com${path}`));
  assert.deepEqual(entries.map(e=>e.images),[undefined,undefined,[photo],undefined]);
  assert.equal(JSON.stringify(products),before);
});

test('unknown, private, non-image and invalid media gain no invented fallback photograph',()=>{
  for(const source of [null,'','not-a-url','http://i.etsystatic.com/a.jpg',
    'https://private.example/a.jpg','https://i.etsystatic.com.example/a.jpg',
    'https://user:secret@i.etsystatic.com/a.jpg','https://i.etsystatic.com/a.mp4',
    'https://i.etsystatic.com/a.jpg#fragment','data:image/png;base64,eA==']){
    assert.equal(sitemapProductImages([product({primary_image_url:source})]).size,0,source||'missing');
  }
});

test('ambiguous product identities or paths cannot attach a foreign photo to a release URL',()=>{
  assert.throws(()=>sitemapProductImages([product(),product()]),/IDENTITY_INVALID/);
  assert.throws(()=>sitemapProductImages([product(),product({canonical_product_id:'other-id'})]),/PATH_AMBIGUOUS/);
  for(const slug of [null,'','../private','product?configuration=x','product#photo','product\\other',' product']){
    assert.throws(()=>sitemapProductImages([product({product_slug:slug})]),/IDENTITY_INVALID/);
  }
});

test('the pinned Next serializer emits an image namespace and XML-safe original asset URLs',()=>{
  const require=createRequire(import.meta.url);
  const {resolveSitemap}=require('next/dist/build/webpack/loaders/metadata/resolve-route-data.js');
  const source=photo+'?width=1200&format=jpg';
  const images=sitemapProductImages([product({primary_image_url:source})]).get('/shop/gold-shoulders-4348580005');
  const xml=resolveSitemap([{url:'https://thefeya.com/shop/gold-shoulders-4348580005',images}]);
  assert.match(xml,/xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);
  assert.ok(xml.includes(`<image:loc>${photo}?width=1200&amp;format=jpg</image:loc>`));
  assert.doesNotMatch(xml,/&amp;amp;|<lastmod>|<priority>|configuration=/);
});

