// @ts-nocheck
import Link from 'next/link';
import { AdminProductDetailView } from '@/components/AdminProductDetailView';
import { ADMIN_PRODUCT_BUILDER_DETAIL_SELECT, ADMIN_PRODUCT_BUILDER_DETAIL_VIEW, toBuilderStorefrontProduct } from '@/lib/admin-product-builder-detail';
import { ADMIN_PRODUCT_CATALOG_FALLBACK_SELECT, ADMIN_PRODUCT_CATALOG_FALLBACK_VIEW, toCatalogFallbackStorefrontProduct } from '@/lib/admin-product-catalog-fallback';
import {
  ADMIN_COMPONENT_TRUTH_SELECT,
  CANONICAL_PRODUCT_TRUTH_VIEW,
  getCanonicalComponentTruthDiagnostic,
} from '@/lib/adminComponentTruth';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

const CANONICAL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCanonicalProductId(value: string) {
  return CANONICAL_ID_PATTERN.test(value);
}

async function getCatalogFallbackProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { product: null, error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(ADMIN_PRODUCT_CATALOG_FALLBACK_VIEW)
    .select(ADMIN_PRODUCT_CATALOG_FALLBACK_SELECT)
    .eq('canonical_product_id', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  return { product: data ? toCatalogFallbackStorefrontProduct(data) : null };
}

async function getBuilderProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { product: null, error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(ADMIN_PRODUCT_BUILDER_DETAIL_VIEW)
    .select(ADMIN_PRODUCT_BUILDER_DETAIL_SELECT)
    .eq('canonical_product_id', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (data) return { product: toBuilderStorefrontProduct(data) };
  return getCatalogFallbackProduct(slug);
}

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { product: null, error: getMissingAdminDataEnvMessage() };

  if (isCanonicalProductId(slug)) {
    return getBuilderProduct(slug);
  }

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (data) return { product: data as StorefrontProduct };

  return getBuilderProduct(slug);
}

async function getOwnerProductContext(canonicalProductId?: string | null, productSlugValue?: string | null) {
  if (!canonicalProductId) {
    return { brief: null, cqa: null, seoPage: null, history: [] };
  }

  const supabase = getAdminReadClient();
  if (!supabase) return { brief: null, cqa: null, seoPage: null, history: [] };

  const [briefResult, cqaResult, seoPageResult, historyResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_content_brief_compiler_status_safe_v1')
      .select('compiler_status,can_generate_shadow,can_produce_canonical_brief,product_fact_quality_status,plan_status,primary_keyword,seo_page_id,url_path,page_lifecycle_state,indexation_intent,ownership_count,primary_ownership_count,business_truth_count')
      .eq('canonical_product_id', canonicalProductId)
      .limit(1),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_status,human_review_status,metrics_status,validation_status,similarity_status,image_alt_truth_status,cqa_status,cqa_shadow_state,approval_blocker_count,product_truth_blocker_count,component_claim_truth_status,updated_at')
      .eq('canonical_product_id', canonicalProductId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id,url_path,lifecycle_state,indexation_intent,portfolio_status,protected_winner_flag,ownership_count,primary_ownership_count,updated_at')
      .eq('canonical_product_id', canonicalProductId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('feya_commerce_v_admin_review_events_v1')
      .select('review_event_id,event_type,event_status,admin_note,source_route,created_at,resolved_at')
      .or(`canonical_product_id.eq.${canonicalProductId}${productSlugValue ? `,product_slug.eq.${productSlugValue}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  return {
    brief: Array.isArray(briefResult.data) ? briefResult.data[0] || null : null,
    cqa: Array.isArray(cqaResult.data) ? cqaResult.data[0] || null : null,
    seoPage: Array.isArray(seoPageResult.data) ? seoPageResult.data[0] || null : null,
    history: Array.isArray(historyResult.data) ? historyResult.data : [],
  };
}

async function getComponentTruth(canonicalProductId?: string | null) {
  if (!canonicalProductId) return getCanonicalComponentTruthDiagnostic(null);
  const supabase = getSupabaseServiceClient() || getAdminReadClient();
  if (!supabase) return getCanonicalComponentTruthDiagnostic(null);
  const { data, error } = await supabase
    .from(CANONICAL_PRODUCT_TRUTH_VIEW)
    .select(ADMIN_COMPONENT_TRUTH_SELECT)
    .eq('canonical_product_id', canonicalProductId)
    .maybeSingle();
  if (error) return getCanonicalComponentTruthDiagnostic(null);
  return getCanonicalComponentTruthDiagnostic(data);
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug);

  if (error || !product) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Товар не найден.'}</div><Link href="/admin/products" className="btn-ghost mt-5">Назад к товарам</Link></section></main>;
  }

  const [componentTruth, ownerContext] = await Promise.all([
    getComponentTruth(product.canonical_product_id),
    getOwnerProductContext(product.canonical_product_id, product.product_slug || slug),
  ]);
  return <AdminProductDetailView product={product} componentTruth={componentTruth} ownerContext={ownerContext} />;
}
