import 'server-only';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';

const SOURCE_REVISION='feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926';

export type ProductLandingLink={
  href:string;
  slug:string;
  title:string;
  seoPageId:string;
  membershipSnapshotId:string;
};

export async function readProductLandingLinks(canonicalProductId:string):Promise<ProductLandingLink[]>{
  if(!canonicalProductId)return[];
  const service=getSupabaseServiceRoleClient();
  if(!service)return[];

  const {data:items,error:itemError}=await service
    .from('feya_search_membership_items_v1')
    .select('membership_snapshot_id')
    .eq('canonical_product_id',canonicalProductId)
    .eq('eligibility_status','eligible')
    .eq('orderability_status','confirmed');

  if(itemError)throw new Error(`PRODUCT_LANDING_MEMBERSHIP_READ_FAILED:${itemError.message}`);
  const membershipRows=(items||[]) as unknown as Array<{membership_snapshot_id:string}>;
  const snapshotIds=Array.from(new Set(membershipRows.map((row)=>String(row.membership_snapshot_id)).filter(Boolean)));
  if(!snapshotIds.length)return[];

  const {data:snapshots,error:snapshotError}=await service
    .from('feya_search_membership_snapshots_v1')
    .select('membership_snapshot_id,seo_page_id,source_revision')
    .in('membership_snapshot_id',snapshotIds)
    .eq('source_revision',SOURCE_REVISION);

  if(snapshotError)throw new Error(`PRODUCT_LANDING_SNAPSHOT_READ_FAILED:${snapshotError.message}`);
  const snapshotRows=(snapshots||[]) as unknown as Array<{membership_snapshot_id:string;seo_page_id:string;source_revision:string}>;
  const pageIds=Array.from(new Set(snapshotRows.map((row)=>String(row.seo_page_id)).filter(Boolean)));
  if(!pageIds.length)return[];

  const {data:pages,error:pageError}=await service
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,url_path,indexation_intent,portfolio_status')
    .in('seo_page_id',pageIds)
    .eq('page_type','landing');

  if(pageError)throw new Error(`PRODUCT_LANDING_PAGE_READ_FAILED:${pageError.message}`);

  const snapshotByPage=new Map(snapshotRows.map((row)=>[
    String(row.seo_page_id),
    String(row.membership_snapshot_id),
  ]));
  const pageRows=(pages||[]) as unknown as Array<{seo_page_id:string;url_path:string;indexation_intent:string;portfolio_status:string}>;

  return pageRows
    .map((page)=>{
      const path=String(page.url_path||'');
      if(!path.startsWith('/collections/'))return null;
      const slug=path.split('/').filter(Boolean).pop()||'';
      const candidate=getSearchLandingCandidate(slug);
      if(!candidate||candidate.searchStatus!=='business_case_noindex')return null;
      return{
        href:path,
        slug,
        title:candidate.title,
        seoPageId:String(page.seo_page_id),
        membershipSnapshotId:snapshotByPage.get(String(page.seo_page_id))||'',
      };
    })
    .filter((row):row is ProductLandingLink=>Boolean(row&&row.membershipSnapshotId))
    .sort((a,b)=>a.title.localeCompare(b.title,'en'));
}
