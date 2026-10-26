import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyOwnerReviewedStorefrontCorrections} from '../../lib/storefrontOwnerReviewedCorrections.ts';
import {enrichStorefrontProductColors, colorChoiceLabel, productColorChoices, type OwnerColorChoices} from '../../lib/bonanzaColorChoices.ts';
import {coupleColorSelection} from '../../lib/bonanzaCoupleColorChoices.ts';
import {isSourceConfirmedPairedSet} from '../../lib/payments/pairedSetSelection.ts';
import {colorOptions, isFullSetOption} from '../../lib/storefront.ts';
import {buildExtraLines, computeCheckoutAmounts} from '../../lib/payments/pricing.ts';
import {sortedOptions, optionLabel, optionPrice} from '../../lib/storefront.ts';
import {configurationIdentity, priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import ownerColors from '../../config/bonanzaReviewedColors20261011.json' with {type:'json'};
import ownerOverrides from '../../config/bonanzaColorDisplayOverrides.json' with {type:'json'};
import type {StorefrontProduct} from '../../lib/types.ts';

type RawProduct = Partial<StorefrontProduct> & {
  canonical_product_id: string; product_slug: string;
  configurations: Array<{configuration_id: string; display_price_amount: number; public_label?: string}>;
};
const files=['tests/fixtures/approved-product-selectors-20261026-part1.json',
             'tests/fixtures/approved-product-selectors-20261026-part2.json'];
const snapshots=files.map(path=>JSON.parse(readFileSync(path,'utf8')));
const products:RawProduct[]=snapshots.flatMap(snapshot=>snapshot.products);

function effective(raw:RawProduct):StorefrontProduct {
  const corrected=applyOwnerReviewedStorefrontCorrections(raw as Record<string, unknown>) as StorefrontProduct;
  const original=(ownerColors.products as Record<string, OwnerColorChoices>)[raw.canonical_product_id];
  const override=(ownerOverrides.products as Record<string,{primary:string;filter_colors:string[];owner_review_hold_color_only?:boolean}>)[raw.canonical_product_id];
  if(!original || (original.held && !(
    raw.canonical_product_id==='ffbf1db6-6fae-4606-afbe-013415d6421d' &&
    override?.owner_review_hold_color_only && override.primary==='gold'
  ))) return corrected;
  return enrichStorefrontProductColors(corrected, override?{...original,...override,held:false}:original);
}

test('the same exact 207 products and 856 immutable source SKUs remain in the checkout audit',()=>{
  assert.equal(products.length,207);
  assert.equal(new Set(products.map(p=>p.canonical_product_id)).size,207);
  assert.equal(products.reduce((n,p)=>n+p.configurations.length,0),856);
  assert.equal(new Set(products.flatMap(p=>p.configurations.map(c=>c.configuration_id))).size,856);
  for(const p of products) {
    assert.match(p.product_slug,/^[a-z0-9-]+$/);
    for(const c of p.configurations) assert.ok(Number(c.display_price_amount)>0,`${p.product_slug}: ${c.configuration_id} missing price`);
  }
});

test('every approved source option is selectable after ALL owner corrections, never silently collapsed',()=>{
  const failures:string[]=[];
  let selectable=0;
  for(const raw of products) {
    const product=effective(raw);
    const expected=new Set(raw.configurations.map(c=>c.configuration_id));
    const options=sortedOptions(product);
    const visible=new Set(options.map(configurationIdentity));
    selectable+=visible.size;
    for(const option of options) {
      const id=configurationIdentity(option);
      if(!expected.has(id)) failures.push(`${raw.product_slug}: invented option ${id}`);
      if(!Number.isFinite(optionPrice(option)) || Number(optionPrice(option))<=0)
        failures.push(`${raw.product_slug}: option ${id} has no payable amount`);
      if(/^option(?:\s+\d+)?$/i.test(optionLabel(option).trim()))
        failures.push(`${raw.product_slug}: ambiguous buyer label for ${id}`);
    }
    const hidden=[...expected].filter(id=>!visible.has(id));
    if(hidden.length) failures.push(`${raw.product_slug}: ${hidden.length} source SKUs hidden: ${hidden.join(', ')}`);
  }
  assert.equal(failures.length,0,`${selectable}/856 visible; ${failures.length} unresolved buyer choices:\n${failures.join('\n')}`);
});

test('every visible owner-approved option prices with original source amount and no browser-money authority',()=>{
  const errors:string[]=[];
  let checked=0;
  for(const raw of products) {
    const product=effective(raw);
    const source=new Map(raw.configurations.map(c=>[c.configuration_id,Math.round(Number(c.display_price_amount)*100)]));
    for(const option of sortedOptions(product)) {
      const id=configurationIdentity(option);
      const actual=Math.round(Number(optionPrice(option))*100);
      if(source.get(id)!==actual){errors.push(`${raw.product_slug}: price drift ${id} ${source.get(id)} -> ${actual}`);continue;}
      checked++;
    }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(checked>=809,`Only ${checked} source options were testable`);
});

test('all 856 actual buyer-visible configuration selections can obtain a trustworthy server quote',()=>{
  const failures:string[]=[];
  let quoted=0,paired=0;
  for(const raw of products){
    const product=effective(raw);
    const colors=productColorChoices(product);
    const pairChoice=coupleColorSelection(product);
    for(const [index,option] of sortedOptions(product).entries()){
      const optionId=configurationIdentity(option);
      const showPair=Boolean(pairChoice && isFullSetOption(option,index));
      const recognized=isSourceConfirmedPairedSet(option);
      if(showPair!==recognized){
        failures.push(`${raw.product_slug} ${optionId}: UI pair=${showPair}, payment pair=${recognized}`);
        continue;
      }
      const optionColor=String(option.configuration_color||'');
      const matched=optionColor ? colors.find(c=>c.label.toLowerCase()===optionColor.toLowerCase()) : null;
      const code=matched?.code||colors[0]?.code||null;
      const selectedColor=optionColor|| (code?colorChoiceLabel(code):(colorOptions(product)[0]||'Mirror'));
      const pair=showPair && code ? {
        women:{size:'M',color:code},
        men:{size:'L',color:colors.length>1?colors[1].code:code},
      } : null;
      try{
        const line=priceCartLine(product,{
          id:`${raw.canonical_product_id}-${optionId}-M-${selectedColor}`,
          slug:raw.product_slug,configuration_id:optionId,size:'M',
          color:selectedColor,color_code:code,paired_selection:pair,wearer:null,
          quantity:1,made_to_measure:false,client_unit_minor:Math.round(Number(optionPrice(option))*100),
        });
        if(line.unit_minor!==Math.round(Number(optionPrice(option))*100))
          failures.push(`${raw.product_slug} ${optionId}: server reprice drift`);
        const amount=computeCheckoutAmounts({lines:[line],extras:buildExtraLines([line],{giftCard:false,giftBox:false}),
          method:'standard',country:'DE'});
        if(amount.total_minor!==line.unit_minor+1900)
          failures.push(`${raw.product_slug} ${optionId}: incorrect all-in total ${amount.total_minor}`);
        if(showPair)paired++;
        quoted++;
      }catch(error){
        failures.push(`${raw.product_slug} ${optionId} [${selectedColor}, ${code||'-'}]: ${String((error as Error).message)}`);
      }
    }
  }
  assert.equal(failures.length,0,`${quoted} quotes/${paired} paired. ${failures.length} failures:\n${failures.join('\n')}`);
  assert.equal(quoted,856);
});
