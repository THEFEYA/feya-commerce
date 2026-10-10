import {DELIVERY_COUNTRIES} from './commerceDeliveryWorkspace.ts';
import {isFeyaBlockedExportDestination} from './commerceShippingBlockedDestinations.ts';
import {isOwnerUnifiedStorefrontPreview} from './ownerUnifiedStorefrontPreview.ts';

export const OWNER_CART_REVIEW_CONTRACT='feya_owner_real_cart_review_v1' as const;
export const OWNER_CART_STORAGE_KEY='feya_visual_cart_v1' as const;
export const OWNER_BAG_COUNT_STORAGE_KEY='feya_visual_bag' as const;
export const OWNER_CART_REVIEW_BRANCH='work/m2-real-bag-owner-preview-20261010' as const;
export const OWNER_CART_REVIEW_PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID' as const;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG=/^[a-z0-9-]{1,240}$/;
const CONTROL=/[\u0000-\u001f\u007f]/;
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const short=(v:unknown,max:number):v is string=>typeof v==='string'
  &&v.length>=1&&v.length<=max&&!CONTROL.test(v);
const textOr=(v:unknown,max:number,fallback:string)=>short(v,max)?v.trim():fallback;
const safeImage=(v:unknown)=>{
  if(typeof v!=='string'||v.length>1500)return '';
  try{
    const u=new URL(v);
    return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';
  }catch{return '';}
};

export function isOwnerRealCartReviewDeployment(env:Record<string,string|undefined>):boolean{
  const originalOwnerReview=env.VERCEL==='1'&&env.VERCEL_ENV==='preview'
    &&env.VERCEL_PROJECT_ID===OWNER_CART_REVIEW_PROJECT
    &&env.VERCEL_GIT_COMMIT_REF===OWNER_CART_REVIEW_BRANCH
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
  // A second EXACT Vercel-owner branch consolidates previews on one browser
  // origin. Public Production continues to display disabled nonpayable bag.
  return originalOwnerReview||isOwnerUnifiedStorefrontPreview(env);
}

export type OwnerCartPreviewItem={
  id:string;
  canonical_product_id:string;
  slug:string;title:string;image:string;config:string;
  size:string;color:string;qty:number;price:number;currency:'EUR';
  configuration_id:string|null;
  price_contract_version:string|null;
  price_confidence_status:string|null;
};

export function parseOwnerCartStorage(raw:unknown):{
  items:OwnerCartPreviewItem[];invalid_count:number;
}{
  if(!Array.isArray(raw))return{items:[],invalid_count:raw==null?0:1};
  if(raw.length>40)return{items:[],invalid_count:raw.length};
  const items:OwnerCartPreviewItem[]=[];
  let invalid_count=0;
  const used=new Set<string>();
  for(const v of raw){
    if(!record(v)){invalid_count++;continue;}
    const id=v.id,slug=v.slug,rawPrice=v.price,currency=v.currency;
    const canonicalId=typeof id==='string'?id.slice(0,36):'';
    if(!short(id,450)||!UUID.test(canonicalId)||!id.startsWith(canonicalId+'-')
      ||!short(slug,240)||!SLUG.test(slug)
      ||!short(v.title,250)||!short(v.config,180)
      ||!short(v.size,70)||!short(v.color,100)
      ||typeof rawPrice!=='number'||!Number.isFinite(rawPrice)
      ||rawPrice<0.01||rawPrice>50_000||currency!=='EUR'
      ||typeof v.qty!=='number'||!Number.isSafeInteger(v.qty)||v.qty<1||v.qty>100
      ||(v.configuration_id!=null
        &&(typeof v.configuration_id!=='string'||!UUID.test(v.configuration_id)))
      ||used.has(id)){
      invalid_count++;continue;
    }
    const unitMinor=Math.round(rawPrice*100);
    if(!Number.isSafeInteger(unitMinor)||unitMinor<1||unitMinor>5_000_000){
      invalid_count++;continue;
    }
    if(v.unit_price_amount!=null&&
      (typeof v.unit_price_amount!=='number'||!Number.isFinite(v.unit_price_amount)
      ||Math.round(v.unit_price_amount*100)!==unitMinor)){
      invalid_count++;continue;
    }
    used.add(id);
    items.push({
      id,canonical_product_id:canonicalId,slug,title:v.title.trim(),
      image:safeImage(v.image),config:v.config.trim(),size:v.size.trim(),
      color:v.color.trim(),qty:v.qty,price:unitMinor/100,currency:'EUR',
      configuration_id:v.configuration_id??null,
      price_contract_version:short(v.price_contract_version,80)?v.price_contract_version:null,
      price_confidence_status:short(v.price_confidence_status,80)?v.price_confidence_status:null,
    });
  }
  return{items,invalid_count};
}

export type OwnerCartPreviewMethod='standard'|'express';
export function ownerCartVisualTotals(items:readonly OwnerCartPreviewItem[],method:OwnerCartPreviewMethod){
  if(!['standard','express'].includes(method))throw new Error('owner_cart_method_invalid');
  if(!Array.isArray(items)||items.length>40)throw new Error('owner_cart_lines_invalid');
  let merchandise_subtotal_minor=0;
  const products=new Set<string>();
  for(const item of items){
    if(!UUID.test(item.canonical_product_id)||!Number.isSafeInteger(item.qty)
      ||item.qty<1||item.qty>100||item.currency!=='EUR'
      ||!Number.isFinite(item.price)||item.price<=0)
      throw new Error('owner_cart_line_invalid');
    merchandise_subtotal_minor+=Math.round(item.price*100)*item.qty;
    products.add(item.canonical_product_id);
  }
  if(!Number.isSafeInteger(merchandise_subtotal_minor)||merchandise_subtotal_minor>200_000_000)
    throw new Error('owner_cart_total_overflow');
  const distinct_listing_count=products.size;
  const shipping_minor=items.length?(method==='express'?3500:1900):0;
  const handling_minor=Math.max(0,distinct_listing_count-1)*500;
  const illustrative_before_tax_minor=merchandise_subtotal_minor+shipping_minor+handling_minor;
  return{
    contract_version:OWNER_CART_REVIEW_CONTRACT,
    merchandise_subtotal_minor,shipping_minor,handling_minor,
    distinct_listing_count,
    show_handling_fee:distinct_listing_count>1,
    illustrative_before_tax_minor,
    currency:'EUR' as const,
    taxes_minor:null,amount_due_minor:null,
    carrier_serviceability_verified:false,server_price_verified:false,
    payable:false,payment_enabled:false,provider_session_enabled:false,
  };
}

export const OWNER_CART_COUNTRIES=DELIVERY_COUNTRIES.filter(
  code=>code!=='UA'&&!isFeyaBlockedExportDestination(code)
).sort();

// Only show a state/province control for the owner's explicitly requested
// jurisdictions. This is input UI, NOT a provider postal/route confirmation.
export const OWNER_CART_REGIONS={
  US:[
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],
    ['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],
    ['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],
    ['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
    ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
    ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
    ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],
    ['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],
    ['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
    ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
    ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],
    ['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
    ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
    ['PR','Puerto Rico'],['GU','Guam'],['VI','US Virgin Islands'],
  ],
  CA:[
    ['AB','Alberta'],['BC','British Columbia'],['MB','Manitoba'],['NB','New Brunswick'],
    ['NL','Newfoundland and Labrador'],['NT','Northwest Territories'],['NS','Nova Scotia'],
    ['NU','Nunavut'],['ON','Ontario'],['PE','Prince Edward Island'],['QC','Quebec'],
    ['SK','Saskatchewan'],['YT','Yukon'],
  ],
  AU:[
    ['ACT','Australian Capital Territory'],['NSW','New South Wales'],
    ['NT','Northern Territory'],['QLD','Queensland'],['SA','South Australia'],
    ['TAS','Tasmania'],['VIC','Victoria'],['WA','Western Australia'],
  ],
} as const;

export function ownerCartAddressRegions(country:string):readonly (readonly [string,string])[]{
  return country==='US'?OWNER_CART_REGIONS.US:
    country==='CA'?OWNER_CART_REGIONS.CA:
    country==='AU'?OWNER_CART_REGIONS.AU:[];
}
