import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CUSTOM_MEASUREMENTS_PREVIEW_EUR_MINOR,
  customMeasurementRequiredCount,customMeasurementUnitsPerPurchase,
  customMeasurementLineMinor,customMeasurementSelectionNeedsReview,
} from '../../lib/commerceCustomMeasurementsPreview.ts';
import {
  OWNER_PREVIEW_EXTRA_EUR_MINOR,
  ownerCartPreviewExtraEstimate,ownerCartVisualTotals,
  parseOwnerCartStorage,isOwnerRealCartReviewDeployment,
} from '../../lib/commerceOwnerCartReview.ts';

const ID='09f51ad4-6b90-4311-aa5a-54f91cf4b7bf';
const CFG='7869ea43-14f0-4ec0-93f3-5e27aeca61d3';
const item=(extra:Record<string,unknown>={})=>({
  id:`${ID}-${CFG}-Custom-Black + Red`,
  slug:'gogo-costume-set-bodysuit-skirt-leg-covers-for-futuristic-dance-fashion-outfit-pj-showgirl-4389332118',
  title:'Black and Red Futuristic Bodysuit',image:'https://example.org/photo.jpg',
  config:'Full Set',size:'Custom',color:'Black + Red',
  configuration_id:CFG,price:334.97,unit_price_amount:334.97,
  currency:'EUR',qty:1,...extra,
});
const extras=(rows:ReturnType<typeof parseOwnerCartStorage>['items'],ids:string[]=rows.filter(x=>x.custom_measurements_selected).map(x=>x.id))=>
  ownerCartPreviewExtraEstimate(rows,{madeToMeasureItemIds:ids,giftCard:false,giftBox:false,destination:'ES'});

test('Owner canonical custom surcharge is exactly €15, unchanged source item price',()=>{
  assert.equal(CUSTOM_MEASUREMENTS_PREVIEW_EUR_MINOR,1500);
  assert.equal(OWNER_PREVIEW_EXTRA_EUR_MINOR.made_to_measure,1500);
  assert.equal(customMeasurementRequiredCount({size:'Custom'}),1);
  assert.equal(customMeasurementRequiredCount({size:'M'}),0);
  assert.equal(customMeasurementSelectionNeedsReview({size:'Custom'},false),true);
  assert.equal(customMeasurementSelectionNeedsReview({size:'Custom'},true),false);
  assert.equal(customMeasurementLineMinor({size:'Custom',qty:2},true),3000);
  assert.equal(customMeasurementLineMinor({size:'Custom',qty:2},false),0);
  assert.throws(()=>customMeasurementLineMinor({size:'Custom',qty:0},true),/quantity_invalid/);
  const raw=item({qty:2,custom_measurements_selected:true});
  const parsed=parseOwnerCartStorage([raw]);
  assert.equal(parsed.invalid_count,0);
  assert.equal(parsed.items[0].price,334.97);
  assert.equal(parsed.items[0].custom_measurements_selected,true);
  assert.equal(ownerCartVisualTotals(parsed.items,'standard').merchandise_subtotal_minor,66994);
  assert.equal(extras(parsed.items).made_to_measure_minor,3000);
  assert.equal(ownerCartVisualTotals(parsed.items,'standard').payable,false);
});

test('PDP Custom selection auto-check survives storage; toggled-off Custom is flagged without free custom checkout',()=>{
  const legacy=parseOwnerCartStorage([item()]);
  assert.equal(legacy.invalid_count,0);
  assert.equal(legacy.items[0].custom_measurements_selected,true,'Old Custom browser items are upgraded safely');
  assert.equal(extras(legacy.items).made_to_measure_minor,1500);
  const changed=parseOwnerCartStorage([item({custom_measurements_selected:false})]);
  assert.equal(changed.invalid_count,0);
  assert.equal(changed.items[0].custom_measurements_selected,false);
  assert.equal(extras(changed.items).made_to_measure_minor,0);
  assert.equal(customMeasurementSelectionNeedsReview(changed.items[0],false),true);
  assert.equal(parseOwnerCartStorage([item({custom_measurements_selected:'true'})]).invalid_count,1);
  const standard=parseOwnerCartStorage([item({size:'M',custom_measurements_selected:false})]);
  assert.equal(extras(standard.items).made_to_measure_minor,0);
  assert.equal(customMeasurementSelectionNeedsReview(standard.items[0],false),false);
});

test('Paired set charges per Custom-selected partner, multiplied by quantity without editing source prices',()=>{
  assert.equal(customMeasurementRequiredCount({size:'',womens_size:'Custom',mens_size:'S'}),1);
  assert.equal(customMeasurementRequiredCount({size:'',womens_size:'Custom',mens_size:'Custom'}),2);
  assert.equal(customMeasurementUnitsPerPurchase({womens_size:'M',mens_size:'L'}),2);
  assert.equal(customMeasurementLineMinor({size:'',womens_size:'Custom',mens_size:'M',qty:2},true),3000);
  assert.equal(customMeasurementLineMinor({size:'',womens_size:'Custom',mens_size:'Custom',qty:2},true),6000);
  const pair=parseOwnerCartStorage([item({
    id:`${ID}-${CFG}-Women's Custom · Men's Custom-Gold-Silver`,
    size:"Women's Custom · Men's Custom",
    womens_size:'Custom',mens_size:'Custom',custom_measurements_selected:true,qty:2,price:427.78,unit_price_amount:427.78,
  })]);
  assert.equal(pair.invalid_count,0);
  assert.equal(pair.items[0].womens_size,'Custom');
  assert.equal(pair.items[0].mens_size,'Custom');
  assert.equal(extras(pair.items).made_to_measure_minor,6000);
  assert.equal(ownerCartVisualTotals(pair.items,'standard').merchandise_subtotal_minor,85556);
  assert.equal(parseOwnerCartStorage([item({womens_size:123})]).invalid_count,1);
});

test('Only protected Bonanza preview can open owner cart; Production and public still disabled',()=>{
  const env={
    VERCEL:'1',VERCEL_ENV:'preview',
    VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
    VERCEL_GIT_COMMIT_REF:'work/bonanza-color-variants-20261020',
  };
  assert.equal(isOwnerRealCartReviewDeployment(env),true);
  assert.equal(isOwnerRealCartReviewDeployment({...env,VERCEL_ENV:'production'}),false);
  assert.equal(isOwnerRealCartReviewDeployment({...env,VERCEL_GIT_COMMIT_REF:'main'}),false);
  assert.equal(isOwnerRealCartReviewDeployment({...env,FEYA_OWNER_PREVIEW_DISABLED:'true'}),false);
  const pdp=readFileSync('components/ProductDetailClient.tsx','utf8');
  const cart=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  assert.match(pdp,/custom_measurements_selected:customOutfits>0 && customMeasurementsEnabled/);
  assert.match(pdp,/customMeasurementSelectionNeedsReview\(sizingSelection,customMeasurementsEnabled\)/);
  assert.match(pdp,/Custom size requires this service/);
  assert.match(pdp,/const total=Math\.round\(sale\*100\)\*qty\/100 \+ customFitMinor\/100/);
  assert.match(pdp,/unit_price_amount: sale/);
  assert.match(cart,/item\.custom_measurements_selected/);
  assert.match(cart,/customMeasurementSelectionNeedsReview\(item,item\.custom_measurements_selected\)/);
  assert.match(cart,/ownerCartPreviewExtraEstimate/);
  assert.match(cart,/Checkout not active/);
  assert.doesNotMatch(cart,/fetch\(|sendBeacon\(|\.upsert\(|\.insert\(/);
});

test('High-contrast holographic finish is present in base selector, card and mixed colorways',()=>{
  const colors=readFileSync('lib/bonanzaColorChoices.ts','utf8');
  const fallback=readFileSync('components/colors.ts','utf8');
  const swatch=readFileSync('components/FeyaColorSwatch.tsx','utf8');
  const pair=readFileSync('components/CouplePartnerColorSelector.tsx','utf8');
  // Bright seamless holographic palette: the selected colors and smooth bloom
  // are shared by catalog filters, cards, PDP and the partner color selector.
  assert.match(colors,/HOLO_SPECTRUM/);
  assert.match(colors,/HOLO_BLOOM/);
  assert.match(colors,/#18cce0/);
  assert.match(colors,/#f450b9/);
  assert.match(colors,/if\(part==='Holographic'\)/);
  assert.match(fallback,/#b044ef/);
  assert.match(swatch,/holographic\|iridescent/);
  // Couple sizes must use the styled FEYA popup, never an OS-native white menu.
  assert.match(pair,/feya-config-trigger flex h-10/);
  assert.match(pair,/role="combobox"/);
  assert.match(pair,/role="listbox"/);
  assert.match(pair,/PartnerGlyph partner=\{partner\.id\}/);
  assert.match(pair,/text-\[13px\]/);
  assert.match(pair,/<ChevronDown size=\{15\} aria-hidden="true"/);
  assert.doesNotMatch(pair,/<select value=/);
});
