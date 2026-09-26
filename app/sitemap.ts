import type {MetadataRoute} from 'next';
import {closedReviewRequested} from '@/lib/searchReviewPresentation';
import {getSiteUrl, isSearchIndexingEnabled} from '@/lib/siteConfig';
import {readActiveSearchReleaseIndexItems} from '@/lib/searchReleaseIndexationServer';

export const dynamic='force-dynamic';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  if(closedReviewRequested(process.env)||!isSearchIndexingEnabled())return[];

  const {release,items}=await readActiveSearchReleaseIndexItems();
  if(!release||!items.length)return[];

  const origin=getSiteUrl().origin;
  const seen=new Set<string>();
  return items.map((item)=>{
    if(seen.has(item.path))throw new Error('Duplicate path in active search release');
    seen.add(item.path);
    return{url:new URL(item.path,origin).toString()};
  });
}
