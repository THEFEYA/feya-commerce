import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOwnerReviewedStorefrontCorrections as correct } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { resolveStorefrontSellableOffer as offer } from '../../lib/storefrontSellableOffer.ts';
import { partitionListingMasterComponentAxes } from '../../lib/listingMasterSearchAxisContract.ts';
import { resolveSelectedComponentFamilies } from '../../lib/listingMasterComponentTruth.ts';
import { recommendCatalogKeywords } from '../../lib/seoCatalogKeywordRecommendation.ts';

const shoulderBelt = {
  canonical_product_id: '95d6c9f0-4437-4730-b772-f10f9c82321d',
  configurations: [
    { configuration_id: '4b355387-e0bf-48c6-bea7-0c7757707998', public_label: 'Belt + Skirt', component_code: 'bundle', is_bundle: true, bundle_component_codes: ['shoulders', 'top'], display_price_amount: 157.92 },
    { configuration_id: '38366d5b-9424-48f3-b9d7-65116841bcaf', public_label: 'Top + Shoulders', component_code: 'bundle', is_bundle: true, bundle_component_codes: ['shoulders', 'top'], display_price_amount: 159.23 },
    { configuration_id: 'c528ae08-b6ec-4538-b46b-48927b29bf5d', public_label: 'Full Set', component_code: 'full_set', is_full_set: true, bundle_component_codes: ['shoulders', 'top', 'skirt', 'belt'], display_price_amount: 263.19 },
  ],
};

test('owner correction keeps exact prices and makes top search-only for the shoulder/belt offer', () => {
  const before = JSON.stringify(shoulderBelt);
  const revised = correct(shoulderBelt);
  const truth = offer(revised);
  assert.equal(truth.status, 'ready');
  assert.deepEqual(truth.component_codes, ['belt', 'shoulders']);
  assert.deepEqual(truth.default_included_components, ['Shoulder Armor', 'Belt']);
  assert.deepEqual(partitionListingMasterComponentAxes(['shoulders', 'top', 'belt'], truth), {
    selected: ['shoulders', 'top', 'belt'], sellableComponentAxes: ['shoulders', 'belt'], searchOnlyComponentAxes: ['top'],
  });
  assert.deepEqual(revised.configurations.map(r=>[r.configuration_id,r.display_price_amount]), shoulderBelt.configurations.map(r=>[r.configuration_id,r.display_price_amount]));
  assert.equal(JSON.stringify(shoulderBelt), before);
  assert.deepEqual(correct(revised), revised);
  assert.equal(correct({...shoulderBelt, canonical_product_id:'unrelated'}).configurations, shoulderBelt.configurations);
  const incomplete={...shoulderBelt,configurations:shoulderBelt.configurations.slice(1)};
  assert.equal(correct(incomplete),incomplete);
});

test('cosmic grouped options keep distinct members instead of leaking belt/legs into the upper option', () => {
  const source={canonical_product_id:'8655f3ce-c4e8-4982-8a75-dce413e26674',configurations:[
    {configuration_id:'choker',public_label:'Choker',component_code:'choker',component_family:'Neck'},
    {configuration_id:'b76e941b-be1d-465f-8d73-041b329989de',public_label:'Bra + Shoulders',component_code:'bundle',is_bundle:true,bundle_component_codes:['belt','legs']},
    {configuration_id:'da462a0b-721b-4027-8b3c-f6e612415ba6',public_label:'Belt + Garters',component_code:'bundle',is_bundle:true,bundle_component_codes:['belt','legs']},
    {configuration_id:'8b84057c-012a-41a3-9523-32a3e97b38f7',public_label:'Full Set',component_code:'full_set',is_full_set:true,bundle_component_codes:['choker','top','shoulders','belt','legs']},
  ]};
  const truth=offer(source);
  assert.equal(truth.status,'ready');
  assert.deepEqual(truth.aggregate_options.find(r=>r.label==='Bra + Shoulders')?.member_codes,['top','shoulders']);
  assert.deepEqual(truth.aggregate_options.find(r=>r.label==='Belt + Garters')?.member_codes,['belt','legs']);
  assert.deepEqual(truth.component_codes,['belt','choker','legs','shoulders','top']);
});

const metric={review_status:'approved_draft',competition:'LOW',competition_index:10,metric_source:'google_keyword_planner',last_checked:'2026-07-08',score:70,avg_monthly_searches:10,bank_bucket:'product'};
test('belt candidates need the selected axis and real metrics; selecting an axis never fabricates rows', () => {
  const input={product:{card_title:'Silver Belt',sellable_offer_components:['Belt'],canonical_color_label:'Silver',material:'Vegan leather'},focus:{component_focus_contract:'seo_search_axes_v1',component:['belt'],sellable_component_axes:['belt'],material:['silver','vegan leather']},approvedKeywords:[{...metric,keyword:'silver belt'}]};
  assert.equal(recommendCatalogKeywords(input).keywords[0]?.keyword,'silver belt');
  assert.equal(recommendCatalogKeywords({...input,focus:{...input.focus,component:['top'],sellable_component_axes:[],search_only_component_axes:['top']}}).keywords.length,0);
  assert.equal(recommendCatalogKeywords({...input,approvedKeywords:[]}).keywords.length,0);
  assert.equal(resolveSelectedComponentFamilies(['belt'],[{component_family_id:'existing-belt',canonical_name:'Belt',normalized_name:'belt'}])[0].family?.component_family_id,'existing-belt');
});

test('winged angel costume keeps measured whole-costume intent and respects a deselected angel persona', () => {
  const input={product:{canonical_product_id:'e7c214cd-a825-49c6-9759-12318d1464fe',card_title:'Futuristic Angel Costume Set',source_category_label:'Headpiece / Accessory',canonical_color_label:'Holographic',sellable_offer_components:['Bodysuit','Wings','Headpiece','Hand Bracelets','Leg Bracelets'],material:'Vegan leather'},focus:{component_focus_contract:'seo_search_axes_v1',component:['bodysuit','wings','headpiece','arms'],sellable_component_axes:['bodysuit','wings','headpiece','arms'],material:['white','vegan leather','holographic'],event:['rave','festival','stage'],persona:['angel','robot']},approvedKeywords:[{...metric,keyword:'angel bodysuit costume',avg_monthly_searches:20},{...metric,keyword:'holographic bodysuit rave',avg_monthly_searches:30}]};
  assert.equal(recommendCatalogKeywords(input).keywords.find(r=>r.role==='primary')?.keyword,'angel bodysuit costume');
  assert.equal(recommendCatalogKeywords({...input,focus:{...input.focus,persona:['robot']}}).keywords.some(r=>String(r.keyword).includes('angel')),false);
});

test('equal-price hand and leg bracelets retain separate selector identities without selecting new SEO axes', () => {
  const source={canonical_product_id:'e7c214cd-a825-49c6-9759-12318d1464fe',configurations:[
    {configuration_id:'59135d19-b2e1-4943-8bd8-b9154216f3be',public_label:'Bracelet',component_code:'arms',component_family:'Arms',display_price_amount:77.2},
    {configuration_id:'cf47bc88-456d-467f-8cb3-393e1f5bf7a8',public_label:'Bracelet',component_code:'arms',component_family:'Arms',display_price_amount:77.2},
  ]};
  const truth=offer(source);
  assert.deepEqual(truth.component_codes,['arms','legs']);
  assert.deepEqual(truth.component_labels,['Hand Bracelets','Leg Bracelets']);
  assert.deepEqual(partitionListingMasterComponentAxes(['arms'],truth).selected,['arms']);
  assert.deepEqual(correct(correct(source)),correct(source));
});
