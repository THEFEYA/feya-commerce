import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withOwnerApprovedComponentReview,OWNER_APPROVED_LEFT_COMPONENT_REVIEW_FLAG} from '../../lib/storefrontDescriptionComponentLabels.ts';
import {storefrontIncludedOptions as purchase} from '../../lib/storefrontIncludedOptions.ts';
import {resolveStorefrontSellableOffer as offer} from '../../lib/storefrontSellableOffer.ts';

const id=(suffix:string)=>'00000000-0000-4000-8000-'+suffix.padStart(12,'0');
const description=(product:any,config?:Record<string,unknown>)=>purchase(withOwnerApprovedComponentReview(product),config);
const atomic=(configuration_id:string,public_label:string,component_code:string)=>({
  configuration_id,public_label,component_code,is_full_set:false,is_bundle:false,
});

test('REAL cosmic silver outfit: Top + Skirt remains ONE selectable purchase unit but TWO left component lines',()=>{
  // Same current live configuration IDs/codes as pinned 4367470907 catalog.
  const product={
    canonical_product_id:'0403df9f-3ff9-498d-b3d9-69ad64b3dd4c',
    configurations:[
      atomic('fe29d785-115e-4520-988f-625f361289ae','Garters','garters'),
      atomic('86ef642d-2dcc-432f-8a0f-eda7e17436f6','Panties','panties'),
      atomic('b3f12ad7-e0b9-4607-a616-01f97363080e','Skirt','skirt'),
      atomic('2fe12e03-76f0-4143-a9a9-f974f622c5f2','Top','top'),
      {configuration_id:'d04a6d88-c5eb-4846-8085-a48b0de869b7',
        public_label:'Top + Skirt',component_code:'bundle',is_bundle:true,is_full_set:false,
        bundle_component_codes:['top','skirt']},
      {configuration_id:'de942fb1-c1b4-42d8-a2f5-6c8fd7240abd',
        public_label:'Full Set',component_code:'full_set',is_full_set:true,
        bundle_component_codes:[]},
    ],
  } as any;
  const snapshot=JSON.stringify(product);
  const whole={configuration_id:'de942fb1-c1b4-42d8-a2f5-6c8fd7240abd'};
  const selectedGroup={configuration_id:'d04a6d88-c5eb-4846-8085-a48b0de869b7'};
  assert.equal(offer(product).status,'ready');
  assert.deepEqual(new Set(description(product,whole)),new Set(['Garters','Panties','Skirt','Top']));
  assert.equal(description(product,whole).length,4);
  assert.ok(purchase(product,whole).includes('Top + Skirt'));
  assert.deepEqual(description(product,selectedGroup),['Top','Skirt']);
  assert.deepEqual(purchase(product,selectedGroup),['Top + Skirt']);
  assert.deepEqual(description(product,{configuration_id:'2fe12e03-76f0-4143-a9a9-f974f622c5f2'}),['Top']);
  assert.equal(JSON.stringify(product),snapshot);
});

test('REAL Gogo bodysuit: Leg Covers, Bodysuit and Skirt separately, while combined right selector remains unchanged',()=>{
  // The owner-reviewed batch 33 correction attaches grouped-member source
  // mapping to this exact pair of current configuration IDs.
  const product={
    canonical_product_id:'09f51ad4-6b90-4311-aa5a-54f91cf4b7bf',
    configurations:[
      atomic('fc29dc91-5b12-4afc-8975-bf70564b477b','Skirt','skirt'),
      atomic('2484dd66-949f-4802-bbd4-98b4ac15038e','Leg Covers','legs'),
      atomic('013bdda3-6988-4cc5-9132-c7be6f6ab0d2','Bodysuit','bodysuit'),
      atomic('b1368ad3-bf47-4b33-85de-075f9e3b59d4','Bodysuit','bodysuit'),
      {configuration_id:'7869ea43-14f0-4ec0-93f3-5e27aeca61d3',
       public_label:'Full Set',component_code:'full_set',is_full_set:true,
       bundle_component_codes:[]},
    ],
  } as any;
  const original=JSON.stringify(product);
  const full={configuration_id:'7869ea43-14f0-4ec0-93f3-5e27aeca61d3'};
  const group={configuration_id:'b1368ad3-bf47-4b33-85de-075f9e3b59d4'};
  assert.equal(offer(product).status,'ready',JSON.stringify(offer(product).blockers));
  assert.deepEqual(description(product,full),['Skirt','Leg Covers','Bodysuit']);
  assert.deepEqual(purchase(product,full),['Skirt','Bodysuit + Leg Covers']);
  assert.deepEqual(description(product,group),['Bodysuit','Leg Covers']);
  assert.deepEqual(purchase(product,group),['Bodysuit + Leg Covers']);
  assert.equal(JSON.stringify(product),original);
});

test('multiple current shop groups split into physical items without inventing option rows or prices',()=>{
  const product={
    canonical_product_id:id('123'),
    configurations:[
      atomic(id('1'),'Shoulders','shoulders'),
      atomic(id('2'),'Panties','panties'),
      {configuration_id:id('3'),public_label:'Top + Skirt',component_code:'bundle',
        is_bundle:true,bundle_component_codes:['top','skirt'],
        bundle_component_labels:['Top','Skirt']},
      {configuration_id:id('4'),public_label:'Full Set',component_code:'full_set',
        is_full_set:true,source_confirmed_bundle_members:true,
        bundle_component_codes:['shoulders','top','skirt','panties'],
        bundle_component_labels:['Shoulders','Top','Skirt','Panties']},
    ],
  } as any;
  const cfg=product.configurations[3];
  assert.equal(offer(product).status,'ready');
  assert.deepEqual(description(product,cfg),['Shoulders','Top','Skirt','Panties']);
  assert.deepEqual(purchase(product,cfg),['Shoulders','Top + Skirt','Panties']);
  assert.equal(product.configurations.length,4);
});

test('unknown or held composition never invents a split from title or sales marketing',()=>{
  const held={configurations:[
    {configuration_id:id('2'),public_label:'Top + Something',component_code:'mystery',
      is_bundle:true,bundle_component_codes:[]},
  ]} as any;
  assert.deepEqual(description(held),purchase(held));
  assert.deepEqual(description(held),[]);
  const noCurrentOffer={
    canonical_source_variations:[
      {raw_variation_name:'Choose Your Set',values:['Full Set','Top + Skirt']},
    ],
  } as any;
  // Legacy labels stay legacy: do not guess that an unknown combo
  // means two independently grounded pieces.
  assert.deepEqual(description(noCurrentOffer),purchase(noCurrentOffer));
});

test('frozen PDP source and public SKU defaults are untouched; only owner after-preview opts in',()=>{
  const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  const helper=readFileSync('lib/storefrontIncludedOptions.ts','utf8');
  const route=readFileSync('app/pdp-copy-review/[slug]/page.tsx','utf8');
  assert.match(pdp,/const includedLines = storefrontIncludedOptions\(p, activeConfig\)/);
  assert.doesNotMatch(pdp,/storefrontDescriptionComponentLabels/);
  assert.match(pdp,/rightPdpPanel\.map/);
  assert.match(pdp,/sortedOptions\(p\)/);
  assert.match(helper,/sellableOfferIncludedLabels\(currentOffer,activeConfiguration\)/);
  assert.match(helper,/OWNER_APPROVED_LEFT_COMPONENT_REVIEW_FLAG/);
  assert.match(route,/withOwnerApprovedComponentReview\(source\.product\)/);
  assert.match(route,/comparisonMode\?withOwnerApprovedComponentReview/);
  assert.equal(OWNER_APPROVED_LEFT_COMPONENT_REVIEW_FLAG,'__feya_owner_approved_pdp_components_preview_v1');
  assert.doesNotMatch(helper,/\.update\(|\.insert\(|\.upsert\(/);
});
