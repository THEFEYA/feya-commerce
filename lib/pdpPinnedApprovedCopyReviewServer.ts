import 'server-only';

import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {readApprovedStorefrontProductDetailV1} from '@/lib/storefrontProductDetailReadModelServer';
import {selectApprovedStorefrontCopy} from '@/lib/seoApprovedStorefrontPolicy';
import {approvedCopyHash,type ApprovedCopyPayload} from '@/lib/seoApprovedContentProjection';
import {pdpCopyReviewSample} from '@/config/pdpCopyReviewSamples';
import type {StorefrontProduct} from '@/lib/types';

const SOURCE_RELEASE='feya-review-207-20260924' as const;
type Row=Record<string,unknown>;

export type PinnedPdpOwnerCopyResult={
  product:StorefrontProduct;
  approvedCopy:ApprovedCopyPayload;
  draftId:string;
  contentSha256:string;
  approvedUpdatedAt:string;
  originalPath:string;
};

function isRow(value:unknown):value is Row{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function validSha(value:unknown):value is string{
  return typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
}

/** This is NOT an open source-select API. A fixed five-product allowlist and
 * protected Vercel deployment precede all DB reads at the calling page.
 * The server resolves the exact current immutable identity pinned in Product
 * Truth; any version/SHA/path/approval drift produces no sample, never a
 * fallback latest draft or AI-generated marketing copy. No public metadata,
 * production PDP, user/cart or Search v12 state is changed by this read.
 */
export async function readPinnedPdpOwnerCopy(slug:string):Promise<PinnedPdpOwnerCopyResult|null>{
  const sample=pdpCopyReviewSample(slug);
  if(!sample)return null;

  const service=getSupabaseServiceRoleClient();
  if(!service)return null;

  const product=await readApprovedStorefrontProductDetailV1(sample.slug).catch(()=>null);
  if(!product||product.canonical_product_id!==sample.canonical_product_id
    ||product.product_slug!==sample.slug)return null;

  const [bindingResult,draftResult,pageResult]=await Promise.all([
    service.from('feya_storefront_approved_product_bindings_v1')
      .select('canonical_product_id,seo_page_id,draft_id,content_sha256,source_release_ref,product_slug_snapshot,draft_updated_at_snapshot,url_path_snapshot')
      .eq('canonical_product_id',sample.canonical_product_id).maybeSingle(),
    service.from('feya_commerce_seo_pack_drafts_v1')
      .select('id,canonical_product_id,status,review_status,archived_at,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot')
      .eq('id',sample.pinned_draft_id).eq('canonical_product_id',sample.canonical_product_id).maybeSingle(),
    service.from('feya_commerce_seo_pages_v1')
      .select('seo_page_id,canonical_product_id,page_type,url_path,portfolio_status,lifecycle_state')
      .eq('canonical_product_id',sample.canonical_product_id).eq('page_type','product').maybeSingle(),
  ]);
  if(bindingResult.error||draftResult.error||pageResult.error)return null;

  const binding=bindingResult.data,draft=draftResult.data,page=pageResult.data;
  if(!isRow(binding)||!isRow(draft)||!isRow(page)
    ||binding.canonical_product_id!==sample.canonical_product_id
    ||binding.draft_id!==sample.pinned_draft_id
    ||binding.source_release_ref!==SOURCE_RELEASE
    ||binding.product_slug_snapshot!==sample.slug
    ||binding.url_path_snapshot!==`/shop/${sample.slug}`
    ||page.seo_page_id!==binding.seo_page_id
    ||page.canonical_product_id!==sample.canonical_product_id
    ||page.page_type!=='product'
    ||page.url_path!==binding.url_path_snapshot
    ||page.portfolio_status!=='active'
    ||['retired','archived','deleted'].includes(String(page.lifecycle_state))
    ||draft.id!==sample.pinned_draft_id
    ||draft.canonical_product_id!==sample.canonical_product_id
    ||draft.status!=='approved_draft'||draft.review_status!=='approved'
    ||draft.archived_at!==null
    ||!validSha(binding.content_sha256)
    ||typeof binding.draft_updated_at_snapshot!=='string'
    ||typeof draft.updated_at!=='string'
  )return null;

  const approvedCopy=selectApprovedStorefrontCopy({
    product:{canonical_product_id:product.canonical_product_id,product_slug:sample.slug},
    page,
    draft,
  },{
    canonical_product_id:sample.canonical_product_id,
    seo_page_id:String(binding.seo_page_id),
    draft_id:sample.pinned_draft_id,
    content_sha256:binding.content_sha256,
    draft_updated_at:binding.draft_updated_at_snapshot,
    url_path:`/shop/${sample.slug}`,
  });

  if(!approvedCopy||approvedCopyHash(approvedCopy)!==binding.content_sha256
    ||approvedCopy.draft.pdp_blocks.length!==4
    ||new Set(approvedCopy.draft.pdp_blocks.map(b=>b.block_key)).size!==4
  )return null;

  return {
    product,approvedCopy,
    draftId:sample.pinned_draft_id,
    contentSha256:binding.content_sha256,
    approvedUpdatedAt:binding.draft_updated_at_snapshot,
    originalPath:`/shop/${sample.slug}`,
  };
}
