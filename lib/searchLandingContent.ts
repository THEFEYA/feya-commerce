import 'server-only';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';
import {SEARCH_MEMBERSHIP_SOURCE_REVISION} from '@/lib/searchLandingMembership';

export type SearchLandingContent = {
  path: string;
  primary_cluster: string;
  secondary_clusters?: string[];
  seo_title: string;
  h1: string;
  meta_description: string;
  intro: string;
  chips: string[];
  modules: Array<{heading:string;body:string}>;
  related_links: Array<{href:string;anchor:string}>;
  faq: Array<{q:string;a:string}>;
  content_status: 'CQA_PASS';
  release_status: 'HOLD';
};

export async function readSearchLandingContent(slug:string):Promise<SearchLandingContent|null>{
  const candidate=getSearchLandingCandidate(slug);
  if(!candidate||candidate.searchStatus!=='business_case_noindex')return null;

  const supabase=getSupabaseServiceRoleClient();
  if(!supabase)throw new Error('SEARCH_LANDING_CONTENT_SERVICE_ROLE_NOT_CONFIGURED');

  const path=`/collections/${candidate.slug}`;
  const {data:page,error:pageError}=await supabase
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,indexation_intent')
    .eq('market_code','US')
    .eq('locale','en-US')
    .eq('url_path',path)
    .maybeSingle();

  if(pageError)throw new Error(`SEARCH_LANDING_CONTENT_PAGE_LOOKUP_FAILED:${pageError.message}`);
  if(!page?.seo_page_id)throw new Error('SEARCH_LANDING_CONTENT_PAGE_NOT_REGISTERED');
  if(page.indexation_intent!=='noindex')throw new Error('SEARCH_LANDING_CONTENT_PREVIEW_MUST_REMAIN_NOINDEX');

  const {data:snapshot,error:snapshotError}=await supabase
    .from('feya_search_membership_snapshots_v1')
    .select('membership_snapshot_id')
    .eq('seo_page_id',page.seo_page_id)
    .eq('source_revision',SEARCH_MEMBERSHIP_SOURCE_REVISION)
    .maybeSingle();
  if(snapshotError)throw new Error(`SEARCH_LANDING_CONTENT_SNAPSHOT_LOOKUP_FAILED:${snapshotError.message}`);
  if(!snapshot?.membership_snapshot_id)throw new Error('SEARCH_LANDING_CONTENT_SNAPSHOT_MISSING');

  const {data:version,error:versionError}=await supabase
    .from('feya_search_page_versions_v1')
    .select('version_number,membership_snapshot_id,content_hash,content_json')
    .eq('seo_page_id',page.seo_page_id)
    .eq('membership_snapshot_id',snapshot.membership_snapshot_id)
    .order('version_number',{ascending:false})
    .limit(1)
    .maybeSingle();
  if(versionError)throw new Error(`SEARCH_LANDING_CONTENT_VERSION_LOOKUP_FAILED:${versionError.message}`);
  if(!version?.content_json)throw new Error('SEARCH_LANDING_CONTENT_VERSION_MISSING');

  const content=version.content_json as SearchLandingContent;
  if(content.path!==path||content.content_status!=='CQA_PASS'||content.release_status!=='HOLD'){
    throw new Error('SEARCH_LANDING_CONTENT_VERSION_NOT_CQA_HELD');
  }
  return content;
}
