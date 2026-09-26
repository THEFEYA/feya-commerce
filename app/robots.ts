import type {MetadataRoute} from 'next';
import {absoluteSiteUrl, isSearchIndexingEnabled} from '@/lib/siteConfig';
import {closedReviewRequested} from '@/lib/searchReviewPresentation';
import {readActiveSearchReleaseIndexItems} from '@/lib/searchReleaseIndexationServer';

export const dynamic='force-dynamic';

export default async function robots():Promise<MetadataRoute.Robots>{
  if(closedReviewRequested(process.env)){
    return{rules:[{userAgent:'*',disallow:'/'}]};
  }

  const indexingEnabled=isSearchIndexingEnabled();
  const {release}=indexingEnabled?await readActiveSearchReleaseIndexItems():{release:null};

  return{
    rules:[{
      userAgent:'*',
      allow:'/',
      disallow:['/admin/','/api/internal/'],
    }],
    ...(indexingEnabled&&release?{sitemap:absoluteSiteUrl('/sitemap.xml')}:{})
  };
}
