import 'server-only';

import {defaultShopFilters, filterShopProducts} from '@/lib/shopCatalogNavigation';
import {readCachedApprovedStorefrontCatalogV1} from '@/lib/storefrontCatalogCacheServer';
import type {StorefrontProduct} from '@/lib/types';
import {STYLE_HUB_TILES} from '@/config/discoveryHubs';

function dedupe(products:StorefrontProduct[]){
  const seen=new Set<string>();
  return products.filter((product)=>{
    const id=String(product.canonical_product_id||'');
    if(!id||seen.has(id))return false;
    seen.add(id);
    return true;
  });
}

export async function readEventsPerformanceHubProducts(){
  const products=await readCachedApprovedStorefrontCatalogV1();
  return products.filter((product)=>{
    const facets=product.facets;
    return Boolean(
      facets?.events?.length ||
      facets?.performance?.length ||
      facets?.dance?.length
    );
  });
}

export async function readStyleHubProducts(){
  const products=await readCachedApprovedStorefrontCatalogV1();
  const allowed=new Set(STYLE_HUB_TILES.map((tile)=>tile.label));
  return products.filter((product)=>product.facets?.styles?.some((style)=>allowed.has(style)));
}

export async function readStyleTileAvailability(){
  const products=await readCachedApprovedStorefrontCatalogV1();
  return STYLE_HUB_TILES.map((tile)=>{
    const filters=defaultShopFilters();
    filters.style=[tile.label];
    const matched=filterShopProducts(products,filters);
    return {tile,count:matched.length,product:matched[0]||null};
  }).filter((entry)=>entry.count>0);
}

export function mergeHubProducts(...groups:StorefrontProduct[][]){
  return dedupe(groups.flat());
}
