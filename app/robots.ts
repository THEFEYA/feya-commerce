import type {MetadataRoute} from 'next';
import {connection} from 'next/server';
import {absoluteSiteUrl, isSearchIndexingEnabled} from '@/lib/siteConfig';
import {closedReviewRequested} from '@/lib/searchReviewPresentation';
import {readActiveSearchReleaseIndexItems} from '@/lib/searchReleaseIndexationServer';

export default async function robots():Promise<MetadataRoute.Robots>{
  // Search-release/closed-review state is runtime governance during Phase 6.
  // Do not freeze robots.txt at build time before the release gate is activated.
  await connection();
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
