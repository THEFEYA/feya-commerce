import 'server-only';

import {defaultShopFilters, filterShopProducts} from '@/lib/shopCatalogNavigation';
import {readCachedApprovedStorefrontCatalogV1} from '@/lib/storefrontCatalogCacheServer';
import {readOwnerRemoteCatalogPreviewV1} from '@/lib/ownerRemoteCatalogPreviewServer';
import {isOwnerUnifiedStorefrontPreview,OWNER_VISUAL_V2_REVIEW_BRANCH} from '@/lib/ownerUnifiedStorefrontPreview';
import type {StorefrontProduct} from '@/lib/types';
import {STYLE_HUB_TILES} from '@/config/discoveryHubs';
import {readClosedReviewPresentation} from '@/lib/searchReviewPresentationServer';

function dedupe(products:StorefrontProduct[]){
  const seen=new Set<string>();
  return products.filter((product)=>{
    const id=String(product.canonical_product_id||'');
    if(!id||seen.has(id))return false;
    seen.add(id);
    return true;
  });
}

async function readDiscoveryHubCatalog(){
  const review=await readClosedReviewPresentation();
  if(review.status==='blocked')return null;
  // Remote shared cache is permitted ONLY after the request-scoped closed
  // review gate says disabled AND the exact SSO-protected owner V2 branch.
  // Any closed review still uses the original projection and authorization.
  const ownerV2=isOwnerUnifiedStorefrontPreview(process.env)
    &&process.env.VERCEL_GIT_COMMIT_REF===OWNER_VISUAL_V2_REVIEW_BRANCH;
  const products=review.status==='disabled'&&ownerV2
    ? await readOwnerRemoteCatalogPreviewV1()
    : await readCachedApprovedStorefrontCatalogV1();
  if(review.status!=='review')return products;
  const allowed=new Set(review.release.entries.map((entry)=>entry.identity.canonical_product_id));
  return products.filter((product)=>allowed.has(product.canonical_product_id));
}

export async function readEventsPerformanceHubProducts(){
  const products=await readDiscoveryHubCatalog();
  if(!products)return null;
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
  const products=await readDiscoveryHubCatalog();
  if(!products)return null;
  const allowed=new Set(STYLE_HUB_TILES.map((tile)=>tile.label));
  return products.filter((product)=>product.facets?.styles?.some((style)=>allowed.has(style)));
}

export async function readStyleTileAvailability(){
  const products=await readDiscoveryHubCatalog();
  if(!products)return null;
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
