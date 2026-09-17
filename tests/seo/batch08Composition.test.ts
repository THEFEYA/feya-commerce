import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOwnerReviewedStorefrontCorrections as correct } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer as offer, sellableOfferIncludedLabels, sellableOfferAvailabilitySentence, sellableOfferCoupleIncludedGroups } from '../../lib/storefrontSellableOffer.ts';
import { partitionListingMasterComponentAxes } from '../../lib/listingMasterSearchAxisContract.ts';
import { resolveThefeyaRightPdpPanel } from '../../lib/thefeyaSeoDoctrine.ts';
import { recommendCatalogKeywords } from '../../lib/seoCatalogKeywordRecommendation.ts';
const products = [
  {
    "canonical_product_id": "057fbd51-52f5-4404-b126-e5d75b8599f4",
    "configurations": [
      {
        "bundle_component_codes": [],
        "bundle_component_labels": [],
        "component_code": null,
        "component_family": null,
        "configuration_id": "aefa2c61-c430-4675-9964-9cd1e3f1658e",
        "display_price_amount": 183.44,
        "is_bundle": false,
        "is_full_set": false,
        "needs_label_review": true,
        "public_label": "Option",
        "sort_order": 1
      },
      {
        "bundle_component_codes": [],
        "bundle_component_labels": [],
        "component_code": null,
        "component_family": null,
        "configuration_id": "5074ad3c-af6a-4cf7-9624-ce351ee9cafc",
        "display_price_amount": 327,
        "is_bundle": false,
        "is_full_set": false,
        "needs_label_review": true,
        "public_label": "Option",
        "sort_order": 2
      }
    ]
  },
  {
    "canonical_product_id": "9400d8af-b6b9-4b4a-b878-b97eba761e10",
    "configurations": [
      {
        "is_bundle": false,
        "sort_order": 1,
        "is_full_set": false,
        "public_label": "Shoulders",
        "component_code": "shoulders",
        "component_family": "Shoulders",
        "configuration_id": "02d389b4-a3b1-44c6-87bb-e18ba2922851",
        "needs_label_review": false,
        "display_price_amount": 130.28,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 2,
        "is_full_set": false,
        "public_label": "Top",
        "component_code": "top",
        "component_family": "Top",
        "configuration_id": "25bb8f41-ae31-4556-ad00-3ad2e5991cb4",
        "needs_label_review": false,
        "display_price_amount": 139.93,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 3,
        "is_full_set": false,
        "public_label": "Skirt",
        "component_code": "skirt",
        "component_family": "Bottom",
        "configuration_id": "4bcd67f8-c251-4a26-afa0-dd370fb784bc",
        "needs_label_review": false,
        "display_price_amount": 159.23,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 4,
        "is_full_set": true,
        "public_label": "Full Set",
        "component_code": "full_set",
        "component_family": "Bundle",
        "configuration_id": "13dccc4f-3571-4b4f-bb20-3cb9e3e3fe1c",
        "needs_label_review": false,
        "display_price_amount": 303.07,
        "bundle_component_codes": [
          "shoulders",
          "top",
          "skirt"
        ],
        "bundle_component_labels": [
          "Shoulders",
          "Top",
          "Skirt"
        ]
      }
    ]
  },
  {
    "canonical_product_id": "d06ab9d9-52c5-4f8c-b583-d9e5316eb69c",
    "configurations": [
      {
        "is_bundle": false,
        "sort_order": 1,
        "is_full_set": false,
        "public_label": "Choker",
        "component_code": "choker",
        "component_family": "Neck",
        "configuration_id": "5118ca0d-eaf8-4f0f-bb7c-50ab151d4fef",
        "needs_label_review": false,
        "display_price_amount": 91.68,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 2,
        "is_full_set": false,
        "public_label": "Skirt",
        "component_code": "skirt",
        "component_family": "Bottom",
        "configuration_id": "7ae2fddc-3479-4fa4-9f0a-5b72c36b9448",
        "needs_label_review": false,
        "display_price_amount": 139.93,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 3,
        "is_full_set": false,
        "public_label": "Option",
        "component_code": null,
        "component_family": null,
        "configuration_id": "e61675cc-689b-416d-953d-3c8faada89c7",
        "needs_label_review": true,
        "display_price_amount": 164.06,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 4,
        "is_full_set": true,
        "public_label": "Full Set",
        "component_code": "full_set",
        "component_family": "Bundle",
        "configuration_id": "ffff32fe-3d63-489b-9bb4-e47b49b97fbe",
        "needs_label_review": false,
        "display_price_amount": 327,
        "bundle_component_codes": [
          "choker",
          "skirt"
        ],
        "bundle_component_labels": [
          "Choker",
          "Skirt"
        ]
      }
    ]
  },
  {
    "canonical_product_id": "df030151-5853-46c1-be89-06f059224a44",
    "configurations": [
      {
        "is_bundle": false,
        "sort_order": 1,
        "is_full_set": false,
        "public_label": "Leg Covers",
        "component_code": "legs",
        "component_family": "Legs",
        "configuration_id": "498929bd-ef47-4d18-8b04-738d95bd1543",
        "needs_label_review": false,
        "display_price_amount": 135.1,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 2,
        "is_full_set": false,
        "public_label": "Bodysuit",
        "component_code": "bodysuit",
        "component_family": "Bodysuit",
        "configuration_id": "696a4f90-7290-4c0c-88bd-3f9ab5c8acd4",
        "needs_label_review": false,
        "display_price_amount": 159.51,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 3,
        "is_full_set": true,
        "public_label": "Full Set",
        "component_code": "full_set",
        "component_family": "Bundle",
        "configuration_id": "873e3347-8dae-413b-bde3-8e6e231913f8",
        "needs_label_review": false,
        "display_price_amount": 239.27,
        "bundle_component_codes": [
          "legs",
          "bodysuit"
        ],
        "bundle_component_labels": [
          "Leg Covers",
          "Bodysuit"
        ]
      }
    ]
  },
  {
    "canonical_product_id": "5255562a-0181-4fe3-bf4f-e5083f5638e5",
    "configurations": [
      {
        "is_bundle": false,
        "sort_order": 1,
        "is_full_set": false,
        "public_label": "Option",
        "component_code": null,
        "component_family": null,
        "configuration_id": "30d69d12-f7bd-40f9-a63b-1e70d843ef0f",
        "needs_label_review": true,
        "display_price_amount": 135.1,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 2,
        "is_full_set": false,
        "public_label": "Shoulders",
        "component_code": "shoulders",
        "component_family": "Shoulders",
        "configuration_id": "6c5b1ae7-297a-473d-ab94-59ef0ab56125",
        "needs_label_review": false,
        "display_price_amount": 139.93,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 3,
        "is_full_set": false,
        "public_label": "Skirt",
        "component_code": "skirt",
        "component_family": "Bottom",
        "configuration_id": "3edd5eef-f30f-4843-ad32-159459c6d928",
        "needs_label_review": false,
        "display_price_amount": 139.93,
        "bundle_component_codes": [],
        "bundle_component_labels": []
      },
      {
        "is_bundle": false,
        "sort_order": 4,
        "is_full_set": true,
        "public_label": "Full Set",
        "component_code": "full_set",
        "component_family": "Bundle",
        "configuration_id": "0511880b-facd-4d52-a000-9da685b62d2d",
        "needs_label_review": false,
        "display_price_amount": 287.12,
        "bundle_component_codes": [
          "shoulders",
          "skirt"
        ],
        "bundle_component_labels": [
          "Shoulders",
          "Skirt"
        ]
      }
    ]
  }
];

test('source-backed Batch08 corrections retain prices, row identities and inputs', () => {
 for (const p of products) {
  const before = JSON.stringify(p), revised=correct(p), truth=offer(revised);
  assert.equal(truth.status,'ready',JSON.stringify(truth.blockers));
  assert.deepEqual(revised.configurations.map(r=>[r.configuration_id,r.display_price_amount]),p.configurations.map(r=>[r.configuration_id,r.display_price_amount]));
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(correct(revised),revised);
 }
});
test('couple listing keeps two independently priced outfits and their distinct contents', () => {
 const truth=offer(products[0]);
 assert.equal(truth.atomic_options.length,0);
 assert.equal(truth.aggregate_options.length,2);
 assert.equal(truth.aggregate_options.some(r=>r.code==='full_set'),false);
 assert.deepEqual(sellableOfferIncludedLabels(truth,{configuration_id:'aefa2c61-c430-4675-9964-9cd1e3f1658e'}),['Choker','Shoulders','Bicep Piece','Bracelet']);
 assert.deepEqual(sellableOfferIncludedLabels(truth,{configuration_id:'5074ad3c-af6a-4cf7-9624-ce351ee9cafc'}),['Choker','Top','Skirt','Bracelets']);
 assert.deepEqual(sellableOfferCoupleIncludedGroups(truth),[
  {code:'womens_outfit',heading:"Women's Outfit",lines:['Choker','Top','Skirt','Bracelets']},
  {code:'mens_outfit',heading:"Men's Outfit",lines:['Choker','Shoulders','Bicep Piece','Bracelet']},
 ]);
 assert.deepEqual(partitionListingMasterComponentAxes(['arms'],truth).sellableComponentAxes,['arms']);
 assert.doesNotMatch(sellableOfferAvailabilitySentence(truth),/full set|individual pieces/i);
});
test('couple groups require explicit partner compositions, not a couple title or partial mapping', () => {
 assert.deepEqual(sellableOfferCoupleIncludedGroups(offer({...products[1],card_title:'Matching Couple Outfits'})),[]);
 assert.deepEqual(sellableOfferCoupleIncludedGroups(offer({...products[0],configurations:products[0].configurations.slice(0,1)})),[]);
 const truth=offer(products[0]);
 assert.deepEqual(sellableOfferCoupleIncludedGroups({...truth,aggregate_options:[...truth.aggregate_options,truth.aggregate_options[0]]}),[]);
});
test('red grouped option restores choker without silently selecting its SEO axis', () => {
 const truth=offer(products[1]);
 assert.deepEqual(sellableOfferIncludedLabels(truth,{configuration_id:'02d389b4-a3b1-44c6-87bb-e18ba2922851'}),['Choker','Shoulders']);
 assert.ok(truth.component_codes.includes('choker'));
 assert.deepEqual(partitionListingMasterComponentAxes(['shoulders','top','skirt'],truth).selected,['shoulders','top','skirt']);
});
test('cosmic Full Set can include verified bracelets without inventing a separate sale option', () => {
 const truth=offer(products[2]);
 assert.ok(truth.default_included_components.includes('Bracelets'));
 assert.ok(truth.default_included_components.includes('Top'));
 assert.equal(truth.atomic_options.some(r=>r.code==='arms'),false);
 assert.equal(truth.atomic_options.length,3);
 assert.doesNotMatch(sellableOfferAvailabilitySentence(truth),/each piece can be ordered separately/i);
});
test('unreviewed and incomplete aggregate evidence remains blocked', () => {
 const missing=offer({configurations:[{configuration_id:'full',public_label:'Full Set',is_full_set:true,bundle_component_codes:['arms'],bundle_component_labels:['Bracelets']}]});
 assert.equal(missing.status,'hold');
 const p=products[0],partial={...p,configurations:p.configurations.slice(0,1)};
 assert.equal(correct(partial),partial);
 assert.equal(offer(partial).status,'hold');
 assert.equal(correct({...p,canonical_product_id:'unrelated'}).configurations,p.configurations);
 const malformed=offer({configurations:[{public_label:'Outfit',is_bundle:true,bundle_component_codes:['top','skirt'],bundle_component_labels:['Top']}]});
 assert.equal(malformed.status,'hold');
});
test('chain set repairs Bra Top and preserves owner-deselected physical shoulders', () => {
 const truth=offer(products[4]);
 assert.ok(truth.component_codes.includes('top'));
 assert.ok(truth.component_codes.includes('shoulders'));
 assert.deepEqual(partitionListingMasterComponentAxes(['top','skirt'],truth).selected,['top','skirt']);
});
test('mixed-material bodysuit panel does not call its fabric base vegan leather', () => {
 const blocks=resolveThefeyaRightPdpPanel({canonical_product_id:products[3].canonical_product_id});
 assert.match(blocks.find(b=>b.block_key==='material')!.body,/black fabric base with gold vegan-leather details/);
 assert.doesNotMatch(blocks.find(b=>b.block_key==='care')!.body,/alcohol wipes or a mild cleaning product/);
});

test('reviewed red armor alias needs real demand and still respects selected style and exclusions', () => {
 const product={...correct(products[1]),card_title:'Martian Queen Wear with Choker Shoulders Top Skirt, Futuristic Dress Costume',material:'Vegan leather',sellable_offer:offer(products[1]),sellable_offer_components:offer(products[1]).component_labels};
 const focus={component_focus_contract:'seo_search_axes_v1',component:['shoulders','top','skirt'],material:['red','vegan leather'],event:['photoshoot'],style:['futuristic','glam'],persona:['alien'],audience:['women'],exclude:[] as string[]};
 const metric={keyword:'futuristic armor costume',keyword_norm:'futuristic armor costume',bank_bucket:'product',review_status:'approved_draft',avg_monthly_searches:10,competition:'HIGH',metric_source:'google_keyword_planner',last_checked:'2026-06-29',score:71};
 assert.equal(recommendCatalogKeywords({product,focus,approvedKeywords:[metric]}).keywords[0]?.role,'primary');
 for(const input of [
  {product,focus:{...focus,exclude:['futuristic armor costume']},approvedKeywords:[metric]},
  {product,focus:{...focus,style:['glam']},approvedKeywords:[metric]},
  {product,focus,approvedKeywords:[{...metric,avg_monthly_searches:null,metric_source:null}]},
  {product:{...product,canonical_product_id:'unrelated'},focus,approvedKeywords:[metric]},
 ]) assert.equal(recommendCatalogKeywords(input).keywords.some(r=>r.role==='primary'),false);
});
