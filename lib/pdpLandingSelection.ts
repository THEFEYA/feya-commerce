import type {StorefrontProduct} from './types.ts';
import {optionKey, optionPrice, sortedOptions} from './storefront.ts';
import {colorChoiceLabel, productColorChoices} from './bonanzaColorChoices.ts';
import {coupleColorSelection} from './bonanzaCoupleColorChoices.ts';
import {verifiedColorPriceRows} from './bonanzaColorPriceExceptions.ts';
import {isSourceConfirmedPairedSet, PAIRED_SET_SIZES} from './payments/pairedSetSelection.ts';

export type PdpLandingQuery = Record<string,string|string[]|undefined>;
export type PdpLandingSelection = {
  configurationId:string;
  colorCode:string|null;
  size:string|null;
  womenColorCode:string|null;
  menColorCode:string|null;
  womenSize:string|null;
  menSize:string|null;
};
export type PdpLandingResolution = {
  status:'absent'|'invalid'|'selected';
  selection:PdpLandingSelection|null;
};
const KEYS=['configuration','color','size','women_color','men_color','women_size','men_size'] as const;
const STANDARD_SIZES=new Set<string>(PAIRED_SET_SIZES.filter(size=>size!=='Custom'));
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const invalid=():PdpLandingResolution=>({status:'invalid',selection:null});

/** Resolve only source-owned choices. No-query pages retain their existing defaults.
 * This first lane intentionally supports only the reviewed photographed color(s).
 * Other colors need matching image evidence before they become Merchant links.
 */
export function resolvePdpLandingSelection(product:StorefrontProduct,query:PdpLandingQuery):PdpLandingResolution {
  if(!KEYS.some(key=>query[key]!==undefined))return {status:'absent',selection:null};
  const values:Record<string,string>={};
  for(const key of KEYS){
    const value=query[key];
    if(value===undefined)continue;
    if(typeof value!=='string'||!value||value.length>100||value.trim()!==value||/[\u0000-\u001f\u007f]/.test(value))return invalid();
    values[key]=value;
  }
  if(!UUID.test(values.configuration||'')||String(product.currency||'EUR')!=='EUR')return invalid();
  const options=sortedOptions(product);
  const option=options.find((o,i)=>optionKey(o,i)===values.configuration);
  const price=optionPrice(option);
  if(!option||price==null||!Number.isFinite(price)||price<=0||String(option.currency||product.currency||'EUR')!=='EUR')return invalid();
  const choices=productColorChoices(product);
  const couple=coupleColorSelection(product);
  const paired=isSourceConfirmedPairedSet(option);
  const audience=String(option.configuration_audience||'').toLowerCase();
  const partner=couple&&(audience==='women'||audience==='men')?audience:null;
  const selection:PdpLandingSelection={configurationId:values.configuration,colorCode:null,size:null,
    womenColorCode:null,menColorCode:null,womenSize:null,menSize:null};
  if(paired){
    if(!couple||values.color||values.size)return invalid();
    if(Boolean(values.women_size)!==Boolean(values.men_size)
      ||Boolean(values.women_color)!==Boolean(values.men_color))return invalid();
    if((values.women_size&&!STANDARD_SIZES.has(values.women_size))
      ||(values.men_size&&!STANDARD_SIZES.has(values.men_size)))return invalid();
    const women=values.women_color||couple.defaultPair.women;
    const men=values.men_color||couple.defaultPair.men;
    if(women!==couple.defaultPair.women||men!==couple.defaultPair.men
      ||!couple.available.includes(women)||!couple.available.includes(men))return invalid();
    selection.womenColorCode=women;selection.menColorCode=men;
    selection.womenSize=values.women_size||null;selection.menSize=values.men_size||null;
  }else{
    if(values.women_color||values.men_color||values.women_size||values.men_size)return invalid();
    if(values.size&&!STANDARD_SIZES.has(values.size))return invalid();
    const photographed=partner?couple!.defaultPair[partner]:product.default_color_choice;
    const color=values.color||photographed;
    if(!color||color!==photographed||!choices.some(c=>c.code===color))return invalid();
    const priced=verifiedColorPriceRows(product.canonical_product_id,options);
    if(priced!==null&&(!priced.some(o=>optionKey(o)===values.configuration)
      ||option.configuration_color!==colorChoiceLabel(color)))return invalid();
    selection.colorCode=color;selection.size=values.size||null;
  }
  return {status:'selected',selection};
}

/** Data fields only; URL prices, currencies, quantity and audience never enter the quote. */
export function pdpLandingParams(selection:PdpLandingSelection):Record<string,string> {
  const params:Record<string,string>={configuration:selection.configurationId};
  for(const [key,value] of [
    ['color',selection.colorCode],['size',selection.size],
    ['women_color',selection.womenColorCode],['men_color',selection.menColorCode],
    ['women_size',selection.womenSize],['men_size',selection.menSize],
  ] as const)if(value)params[key]=value;
  return params;
}

/** No external destination or invented variant identity can be serialized. */
export function pdpLandingHref(product:StorefrontProduct,selection:PdpLandingSelection):string|null {
  const slug=product.product_slug;
  if(!slug||!/^[a-z0-9-]+$/i.test(slug))return null;
  const resolved=resolvePdpLandingSelection(product,pdpLandingParams(selection));
  if(resolved.status!=='selected'||!resolved.selection)return null;
  return '/shop/'+slug+'?'+new URLSearchParams(pdpLandingParams(resolved.selection)).toString();
}
