import 'server-only';
import approvedCatalog from '@/config/bonanzaColorReviewCatalog20261020.json';
import {readCachedStorefrontProductPresentation} from '@/lib/storefrontProductPresentationServer';
import {getMedia,optionKey,optionLabel,optionPrice,sortedOptions,isFullSetOption} from '@/lib/storefront';
import {productColorChoices} from '@/lib/bonanzaColorChoices';

export const AI_LOOK_DEFAULT_SLUG='futuristic-cosplay-headpiece-festival-headdress-cyber-punk-wings-holographic-bodysuit-leg-covers-for-rave-festivals-and-burning-man-1890691940';

export type AiLookCatalogEntry={id:string;slug:string;title:string;image:string};
export type AiLookReference={url:string;alt:string};
export type AiLookConfiguration={id:string;label:string;price:number|null;isFullSet:boolean};
export type AiLookView={
 slug:string;canonicalId:string;title:string;image:string;
 gallery:AiLookReference[];colors:{code:string;label:string}[];
 defaultColor:string;configs:AiLookConfiguration[];defaultConfig:string;currency:string;
};
export function aiLookCatalog():AiLookCatalogEntry[]{
 return approvedCatalog.products.map(x=>({id:x.id,slug:x.slug,title:x.title,image:x.image}));
}
export async function aiLookReadApprovedListing(slug:string):Promise<AiLookView|null>{
 if(!/^[a-z0-9-]{5,240}$/.test(slug))return null;
 const row=approvedCatalog.products.find(x=>x.slug===slug);
 if(!row)return null;
 const payload=await readCachedStorefrontProductPresentation(slug);
 const product=payload.product;
 if(!product||product.canonical_product_id!==row.id)return null;
 const options=sortedOptions(product);
 const configs:AiLookConfiguration[]=options.map((option,i)=>({
  id:optionKey(option,i),label:optionLabel(option,i),
  price:optionPrice(option),isFullSet:isFullSetOption(option,i),
 })).filter(x=>x.id&&x.label).slice(0,45);
 const galleries=getMedia(product).filter(image=>typeof image.url==='string'&&image.url.startsWith('https://i.etsystatic.com/'))
   .slice(0,12).map(image=>({url:String(image.url),alt:String(image.alt||'')}));
 const colors=productColorChoices(product);
 return {
  slug,canonicalId:row.id,title:row.title,image:row.image,
  gallery:galleries.length?galleries:[{url:row.image,alt:row.title}],
  colors,defaultColor:colors[0]?.code||'',
  configs,defaultConfig:configs.find(x=>x.isFullSet)?.id||configs[0]?.id||'',
  currency:product.currency||'EUR',
 };
}
