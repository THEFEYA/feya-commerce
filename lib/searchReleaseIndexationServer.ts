import 'server-only';
import {cache} from 'react';
import type {Metadata} from 'next';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {getSiteUrl, isSearchIndexingEnabled} from '@/lib/siteConfig';

export type ActiveSearchRelease = {
  releaseId:string;
  releaseCode:string;
  releaseVersion:number;
  releaseHash:string;
  targetOrigin:string;
};

export type SearchReleasePathState = {
  release:ActiveSearchRelease|null;
  path:string;
  included:boolean;
  intendedIndexState:'index'|'noindex'|null;
  itemRole:'INDEX_CANDIDATE'|'NOINDEX_DEPENDENCY'|null;
};

const readActiveRelease=cache(async():Promise<ActiveSearchRelease|null>=>{
  if(!isSearchIndexingEnabled())return null;

  const service=getSupabaseServiceRoleClient();
  if(!service)return null;

  const origin=getSiteUrl().origin;
  const result=await service
    .from('feya_search_releases_v1')
    .select('release_id,release_code,release_version,release_hash,target_origin,release_status')
    .eq('release_status','ACTIVE')
    .eq('target_origin',origin)
    .order('release_version',{ascending:false})
    .limit(1)
    .maybeSingle();

  if(result.error||!result.data?.release_id||!result.data?.release_hash)return null;
  const row=result.data as unknown as {
    release_id:string;
    release_code:string;
    release_version:number;
    release_hash:string;
    target_origin:string;
  };

  return{
    releaseId:String(row.release_id),
    releaseCode:String(row.release_code),
    releaseVersion:Number(row.release_version),
    releaseHash:String(row.release_hash),
    targetOrigin:String(row.target_origin),
  };
});

export const readSearchReleasePathState=cache(async(path:string):Promise<SearchReleasePathState>=>{
  const release=await readActiveRelease();
  if(!release)return{release:null,path,included:false,intendedIndexState:null,itemRole:null};

  const service=getSupabaseServiceRoleClient();
  if(!service)return{release:null,path,included:false,intendedIndexState:null,itemRole:null};

  const result=await service
    .from('feya_search_release_items_v1')
    .select('item_role,intended_index_state,url_path_snapshot')
    .eq('release_id',release.releaseId)
    .eq('url_path_snapshot',path)
    .maybeSingle();

  if(result.error||!result.data)return{release,path,included:false,intendedIndexState:null,itemRole:null};
  const row=result.data as unknown as {
    item_role:'INDEX_CANDIDATE'|'NOINDEX_DEPENDENCY';
    intended_index_state:'index'|'noindex';
    url_path_snapshot:string;
  };
  return{
    release,
    path,
    included:true,
    intendedIndexState:row.intended_index_state,
    itemRole:row.item_role,
  };
});

export async function releaseRobotsForPath(path:string):Promise<Metadata['robots']>{
  const state=await readSearchReleasePathState(path);
  if(state.included&&state.intendedIndexState==='index'){
    return{index:true,follow:true};
  }
  return{index:false,follow:true,nocache:true};
}

export const readActiveSearchReleaseIndexItems=cache(async()=>{
  const release=await readActiveRelease();
  if(!release)return{release:null,items:[] as Array<{seoPageId:string;path:string}>};

  const service=getSupabaseServiceRoleClient();
  if(!service)return{release:null,items:[] as Array<{seoPageId:string;path:string}>};

  const result=await service
    .from('feya_search_release_items_v1')
    .select('seo_page_id,url_path_snapshot,item_role,intended_index_state')
    .eq('release_id',release.releaseId)
    .eq('item_role','INDEX_CANDIDATE')
    .eq('intended_index_state','index')
    .order('url_path_snapshot',{ascending:true});

  if(result.error||!Array.isArray(result.data))return{release:null,items:[] as Array<{seoPageId:string;path:string}>};

  const rows=result.data as unknown as Array<{seo_page_id:string;url_path_snapshot:string}>;
  return{
    release,
    items:rows.map((row)=>({seoPageId:String(row.seo_page_id),path:String(row.url_path_snapshot)})),
  };
});
