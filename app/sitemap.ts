import type {MetadataRoute} from 'next';
import {connection} from 'next/server';
import {closedReviewRequested} from '@/lib/searchReviewPresentation';
import {getSiteUrl, isSearchIndexingEnabled} from '@/lib/siteConfig';
import {readActiveSearchReleaseIndexItems} from '@/lib/searchReleaseIndexationServer';
import {readCachedApprovedStorefrontCatalogV1} from '@/lib/storefrontCatalogCacheServer';
import {sitemapProductImages} from '@/lib/sitemapProductImages';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  // ACTIVE Search Release is mutable governance state; keep the sitemap request-time
  // until the release-activation invalidation path is explicitly cache-bound later.
  await connection();
  if(closedReviewRequested(process.env)||!isSearchIndexingEnabled())return[];

  const {release,items}=await readActiveSearchReleaseIndexItems();
  if(!release||!items.length)return[];

  const origin=getSiteUrl().origin;
  const seen=new Set<string>();
  const entries=items.map((item)=>{
    if(seen.has(item.path))throw new Error('Duplicate path in active search release');
    seen.add(item.path);
    return{url:new URL(item.path,origin).toString()};
  });

  // Reuse the already cached, exact approved card projection: one existing
  // primary photo per product, not a 207-PDP/gallery query fan-out. ACTIVE
  // release membership remains request-time authority for every page URL.
  if(!items.some(item=>item.path.startsWith('/shop/')))return entries;
  try{
    const images=sitemapProductImages(await readCachedApprovedStorefrontCatalogV1());
    return entries.map((entry,index)=>{
      const productImages=images.get(items[index].path);
      return productImages?{...entry,images:productImages}:entry;
    });
  }catch{
    // Images are optional enrichment. Keep the complete governed URL sitemap
    // available if its independent public-card/media source is unavailable.
    console.warn('feya_sitemap_images_unavailable_v1');
    return entries;
  }
}
