import 'server-only';
import {cache} from 'react';

import manifest from '@/config/approved-content-review-bindings.json';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {selectApprovedStorefrontCopy} from '@/lib/seoApprovedStorefrontPolicy';
import {approvedCopyHash,type ApprovedCopyPayload} from '@/lib/seoApprovedContentProjection';
import {
  phase13PublicPdpCopyEnabled,
  PHASE13_SOURCE_RELEASE,
} from '@/lib/phase13PdpCopyReleaseGate';

type Row=Record<string,unknown>;
const row=(v:unknown):v is Row=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sourcePins=new Map(manifest.entries.map(x=>[x.url_path,x] as const));
const corpus={version:manifest.version,count:manifest.entries.length};

/** READ-ONLY. Reconstruct only a current, exactly pinned and still approved
 * existing four-block original text. Never select a later draft, synthesize
 * text, promote Search v12 indexability or touch Product Truth/option prices.
 * Only the minimal ApprovedCopyPayload is returned to the public RSC.
 *
 * This is a guarded future release path, disabled by default in every
 * deployment and never a GET/HTTP endpoint. React cache is request-only to
 * avoid persisted stale approvals or cross-user data copies.
 */
export const readExactPublicApprovedPdpCopy=cache(async(slug:string):Promise<{
  canonical_product_id:string;
  copy:ApprovedCopyPayload;
}|null>=>{
  if(!phase13PublicPdpCopyEnabled(process.env,corpus))return null;
  if(typeof slug!=='string'||slug.length>240||!/^[a-z0-9-]+$/.test(slug))return null;
  const pin=sourcePins.get(`/shop/${slug}`);
  if(!pin||!UUID.test(pin.canonical_product_id)||!UUID.test(pin.draft_id)
    ||!UUID.test(pin.seo_page_id)||!SHA.test(pin.content_sha256)
    ||pin.url_path!==`/shop/${slug}`)return null;

  const service=getSupabaseServiceRoleClient();
  if(!service)return null;

  try{
    const [bindingResponse,draftResponse,pageResponse]=await Promise.all([
      service.from('feya_storefront_approved_product_bindings_v1')
        .select('canonical_product_id,seo_page_id,draft_id,content_sha256,source_release_ref,product_slug_snapshot,draft_updated_at_snapshot,url_path_snapshot')
        .eq('canonical_product_id',pin.canonical_product_id).maybeSingle(),
      service.from('feya_commerce_seo_pack_drafts_v1')
        .select('id,canonical_product_id,status,review_status,archived_at,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot')
        .eq('id',pin.draft_id).eq('canonical_product_id',pin.canonical_product_id).maybeSingle(),
      service.from('feya_commerce_seo_pages_v1')
        .select('seo_page_id,canonical_product_id,page_type,url_path,portfolio_status,lifecycle_state')
        .eq('seo_page_id',pin.seo_page_id).eq('page_type','product').maybeSingle(),
    ]);
    if(bindingResponse.error||draftResponse.error||pageResponse.error)return null;

    const b=bindingResponse.data,d=draftResponse.data,p=pageResponse.data;
    if(!row(b)||!row(d)||!row(p)
      ||b.canonical_product_id!==pin.canonical_product_id
      ||b.seo_page_id!==pin.seo_page_id
      ||b.draft_id!==pin.draft_id
      ||b.content_sha256!==pin.content_sha256
      ||b.source_release_ref!==PHASE13_SOURCE_RELEASE
      ||b.product_slug_snapshot!==slug
      ||b.url_path_snapshot!==pin.url_path
      ||d.id!==pin.draft_id||d.canonical_product_id!==pin.canonical_product_id
      ||d.status!=='approved_draft'||d.review_status!=='approved'||d.archived_at!==null
      ||p.seo_page_id!==pin.seo_page_id||p.canonical_product_id!==pin.canonical_product_id
      ||p.page_type!=='product'||p.url_path!==pin.url_path
      ||p.portfolio_status!=='active'
      ||['archived','retired','deleted'].includes(String(p.lifecycle_state))
    )return null;

    const copy=selectApprovedStorefrontCopy({
      product:{canonical_product_id:pin.canonical_product_id,product_slug:slug},
      page:p,draft:d,
    },{
      canonical_product_id:pin.canonical_product_id,
      seo_page_id:pin.seo_page_id,draft_id:pin.draft_id,
      content_sha256:pin.content_sha256,
      draft_updated_at:pin.draft_updated_at,
      url_path:pin.url_path,
    });
    if(!copy||approvedCopyHash(copy)!==pin.content_sha256
      ||copy.draft.pdp_blocks.length!==4
      ||new Set(copy.draft.pdp_blocks.map(x=>x.block_key)).size!==4)return null;

    return {canonical_product_id:pin.canonical_product_id,copy};
  }catch{return null;}
});
