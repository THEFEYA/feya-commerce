import 'server-only';
import {getSupabaseServiceRoleClient} from '../supabaseAdmin';
import type {OwnerSearchGateState} from './ownerLaunchSummary';

/** Owner console only. Reads release gates; never accesses credentials or
 * mutates Production indexing, checkout or the 207 immutable PDP versions.
 * Data access failure is UNKNOWN, never a false green launch signal.
 */
export async function readOwnerSearchGateState():Promise<OwnerSearchGateState|null>{
  const db=getSupabaseServiceRoleClient();
  if(!db)return null;
  try{
    const [active,candidate]=await Promise.all([
      db.from('feya_search_releases_v1')
        .select('release_id,release_version,release_status')
        .eq('release_status','ACTIVE').limit(2),
      db.from('feya_search_releases_v1')
        .select('release_id,release_version,release_status')
        .eq('release_code','organic-wave-a-20260926')
        .eq('release_version',13).maybeSingle(),
    ]);
    if(active.error||candidate.error||active.data?.length!==1
       ||!active.data[0]?.release_id||!candidate.data?.release_id)return null;
    const a=active.data[0],c=candidate.data;
    const [activeNoindex,candidateIndexed,candidateFailures]=await Promise.all([
      db.from('feya_search_release_items_v1').select('seo_page_id',{count:'exact',head:true})
        .eq('release_id',a.release_id).eq('page_type_snapshot','product').eq('intended_index_state','noindex'),
      db.from('feya_search_release_items_v1').select('seo_page_id',{count:'exact',head:true})
        .eq('release_id',c.release_id).eq('page_type_snapshot','product').eq('intended_index_state','index')
        .eq('item_role','INDEX_CANDIDATE'),
      db.from('feya_search_release_gate_results_v1').select('gate_code',{count:'exact',head:true})
        .eq('release_id',c.release_id).eq('gate_status','FAIL'),
    ]);
    if(activeNoindex.error||candidateIndexed.error||candidateFailures.error
      ||activeNoindex.count===null||candidateIndexed.count===null||candidateFailures.count===null)return null;
    return{
      activeVersion:a.release_version,
      activeProductNoindex:activeNoindex.count,
      candidateVersion:c.release_version,
      candidateStatus:c.release_status,
      candidateIndexedProducts:candidateIndexed.count,
      candidateFailedGates:candidateFailures.count,
    };
  }catch{return null;}
}
