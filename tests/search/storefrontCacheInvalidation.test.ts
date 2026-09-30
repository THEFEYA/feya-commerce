import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStorefrontInvalidationPlan,
  storefrontCacheTagForCollection,
  storefrontCacheTagForProduct,
} from '../../lib/storefrontCacheInvalidation.ts';

const product='0395cb11-424f-407f-a849-7ee3b617ab57';

test('product change invalidates catalog, exact product and affected collections',()=>{
  const plan=buildStorefrontInvalidationPlan({
    event_type:'product_changed',
    canonical_product_id:product,
    product_slug:'gold-futuristic-armor',
    collection_slugs:['rave-outfits','festival-outfits','rave-outfits'],
    source_ref:'fixture',
  });
  assert.equal(plan.entity_type,'product');
  assert.equal(plan.entity_id,product);
  assert.deepEqual(plan.tags,[
    'catalog',
    'collection:festival-outfits',
    'collection:rave-outfits',
    `product:${product}`,
  ]);
  assert.deepEqual(plan.paths,[
    '/collections/festival-outfits',
    '/collections/rave-outfits',
    '/shop',
    '/shop/gold-futuristic-armor',
  ]);
});

test('slug change invalidates both old and new PDP paths without using long slug tags',()=>{
  const plan=buildStorefrontInvalidationPlan({
    event_type:'product_slug_changed',
    canonical_product_id:product,
    previous_product_slug:'old-gold-armor',
    product_slug:'new-gold-armor',
  });
  assert.ok(plan.tags.includes(`product:${product}`));
  assert.ok(!plan.tags.some(tag=>tag.includes('old-gold-armor')||tag.includes('new-gold-armor')));
  assert.ok(plan.paths.includes('/shop/old-gold-armor'));
  assert.ok(plan.paths.includes('/shop/new-gold-armor'));
});

test('collection membership change invalidates catalog and all affected collection owners',()=>{
  const plan=buildStorefrontInvalidationPlan({
    event_type:'collection_membership_changed',
    collection_slugs:['rave-outfits','festival-outfits'],
  });
  assert.deepEqual(plan.tags,[
    'catalog','collection:festival-outfits','collection:rave-outfits','collections',
  ]);
  assert.ok(plan.paths.includes('/shop'));
  assert.ok(plan.paths.includes('/collections'));
});

test('content, policy, home and global events stay bounded to explicit surfaces',()=>{
  assert.deepEqual(buildStorefrontInvalidationPlan({
    event_type:'collection_content_changed',collection_slugs:['rave-outfits'],
  }).tags,['collection:rave-outfits','collections']);
  assert.deepEqual(buildStorefrontInvalidationPlan({
    event_type:'landing_page_changed',page_slug:'about',
  }).tags,['page:about']);
  assert.deepEqual(buildStorefrontInvalidationPlan({
    event_type:'policy_changed',page_slug:'returns',policy_name:'returns',
  }).tags,['page:returns','policy:returns']);
  assert.deepEqual(buildStorefrontInvalidationPlan({
    event_type:'home_content_changed',
  }).tags,['home']);
  assert.deepEqual(buildStorefrontInvalidationPlan({
    event_type:'global_content_changed',
  }).tags,['catalog','collections','home','site']);
});

test('tag grammar rejects ambiguous or oversized user scope',()=>{
  assert.throws(()=>buildStorefrontInvalidationPlan({event_type:'product_changed'}),/PRODUCT_SCOPE_REQUIRED/);
  assert.throws(()=>buildStorefrontInvalidationPlan({
    event_type:'product_slug_changed',canonical_product_id:product,
    product_slug:'same',previous_product_slug:'same',
  }),/SLUG_CHANGE_SCOPE_REQUIRED/);
  assert.throws(()=>buildStorefrontInvalidationPlan({
    event_type:'collection_content_changed',collection_slugs:['one','two'],
  }),/SINGLE_COLLECTION_REQUIRED/);
  assert.throws(()=>buildStorefrontInvalidationPlan({
    event_type:'landing_page_changed',page_slug:'../../etc',
  }),/INVALID_PAGE_SLUG/);
  assert.throws(()=>buildStorefrontInvalidationPlan({
    event_type:'collection_membership_changed',collection_slugs:Array.from({length:33},(_,i)=>`c-${i}`),
  }),/INVALID_COLLECTIONS/);
  assert.equal(storefrontCacheTagForProduct(product),`product:${product}`);
  assert.equal(storefrontCacheTagForCollection('rave-outfits'),'collection:rave-outfits');
});
