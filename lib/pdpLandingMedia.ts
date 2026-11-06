import type {StorefrontConfiguration,StorefrontMedia,StorefrontProduct} from './types.ts';
import {getMedia,optionKey,sortedOptions} from './storefront.ts';
import {pdpLandingParams,resolvePdpLandingSelection,type PdpLandingSelection} from './pdpLandingSelection.ts';
import {PDP_LANDING_MEDIA_BINDINGS} from './pdpLandingMediaBindings.ts';

export type PdpLandingMedia = {
  status:'bound';
  imageUrl:string;
  gallery:StorefrontMedia[];
}|{
  status:'absent'|'unreviewed'|'invalid';
  imageUrl:null;
  gallery:StorefrontMedia[];
};

/** A reviewed photograph is chosen by source product + configuration + colors,
 * never by a query image URL, index, model appearance or a client price.
 * Normal visits retain their existing order. On a bound visit the matching
 * existing photo comes first, preserving eager/high-priority main-image loading
 * and every existing gallery control without changing JSX or editing an image.
 */
export function resolvePdpLandingMedia(product:StorefrontProduct,selection:PdpLandingSelection|null=null):PdpLandingMedia {
  const gallery=getMedia(product);
  const result=(status:Exclude<PdpLandingMedia['status'],'bound'>):PdpLandingMedia=>({status,imageUrl:null,gallery});
  if(!selection)return result('absent');
  const landing=resolvePdpLandingSelection(product,pdpLandingParams(selection));
  if(landing.status!=='selected'||!landing.selection)return result('invalid');
  const selected=landing.selection;
  const binding=PDP_LANDING_MEDIA_BINDINGS.find(b=>b.productId===product.canonical_product_id
    &&b.configurationId===selected.configurationId);
  if(!binding)return result('unreviewed');
  // Check the observed public source tuple as well as the owner-reviewed
  // projection. A later source edit cannot inherit photo proof merely because
  // an existing label adapter still recognizes the old configuration UUID.
  const raw=(Array.isArray(product.configurations)?product.configurations as StorefrontConfiguration[]:[])
    .filter(o=>o.configuration_id===selected.configurationId);
  if(raw.length!==1||raw[0].public_label!==binding.sourceOption.label
    ||raw[0].component_code!==binding.sourceOption.componentCode
    ||JSON.stringify((raw[0].bundle_component_codes||[]).map(String).sort())!==JSON.stringify(binding.sourceOption.bundleComponents))return result('invalid');
  const option=sortedOptions(product).find((o,i)=>optionKey(o,i)===selected.configurationId);
  if(!option||option.public_label!==binding.label||option.component_code!==binding.componentCode)return result('invalid');
  const components=(option.bundle_component_codes||[]).map(String).sort();
  if(JSON.stringify(components)!==JSON.stringify(binding.bundleComponents))return result('invalid');
  const colors:Readonly<{color?:string;women?:string;men?:string}>=binding.colors;
  const matchingColors=colors.color
    ? selected.colorCode===colors.color&&!selected.womenColorCode&&!selected.menColorCode
    : !selected.colorCode&&selected.womenColorCode===colors.women&&selected.menColorCode===colors.men;
  if(!matchingColors)return result('invalid');
  const image=gallery.find(m=>m.url===binding.imageUrl&&m.media_type!=='video');
  if(!image)return result('invalid');
  return {status:'bound',imageUrl:binding.imageUrl,
    gallery:[image,...gallery.filter(m=>m.url!==binding.imageUrl)]};
}
