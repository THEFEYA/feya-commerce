import 'server-only';
import {cache} from 'react';
import type {StorefrontProduct} from '@/lib/types';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4} from '@/lib/storefront';
import {getSearchLandingCandidate, type SearchLandingCandidate} from '@/config/searchLandingCandidates';

export type SearchLandingContentModule = {
  heading: string;
  body: string;
};

export type SearchLandingRelatedLink = {
  href: string;
  anchor: string;
};

export type SearchLandingFaqItem = {
  q: string;
  a: string;
};

export type SearchLandingContent = {
  path: string;
  primary_cluster: string;
  secondary_clusters?: string[];
  seo_title: string;
  h1: string;
  meta_description: string;
  intro: string;
  chips: string[];
  modules: SearchLandingContentModule[];
  related_links: SearchLandingRelatedLink[];
  faq: SearchLandingFaqItem[];
};

export type SearchLandingBreadcrumb = {
  href: string;
  label: string;
};

export type SearchLandingRelease = {
  candidate: SearchLandingCandidate;
  pageId: string | null;
  version: number | null;
  contentHash: string | null;
  membershipSnapshotId: string | null;
  content: SearchLandingContent | null;
  products: StorefrontProduct[];
  breadcrumbs: SearchLandingBreadcrumb[];
  relatedLinks: SearchLandingRelatedLink[];
  membershipCount: number;
  holdReason: string | null;
  source: 'immutable_page_version' | 'hold_noindex';
};

function assertContent(value: unknown, expectedPath: string): SearchLandingContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('SEARCH_LANDING_CONTENT_INVALID');
  }
  const row = value as Record<string, unknown>;
  const required = ['path','primary_cluster','seo_title','h1','meta_description','intro'];
  for (const key of required) {
    if (typeof row[key] !== 'string' || !String(row[key]).trim()) {
      throw new Error(`SEARCH_LANDING_CONTENT_FIELD_INVALID:${key}`);
    }
  }
  if (row.path !== expectedPath) throw new Error('SEARCH_LANDING_CONTENT_PATH_MISMATCH');
  if (!Array.isArray(row.chips) || !Array.isArray(row.modules) || !Array.isArray(row.related_links) || !Array.isArray(row.faq)) {
    throw new Error('SEARCH_LANDING_CONTENT_COLLECTIONS_INVALID');
  }
  return row as unknown as SearchLandingContent;
}

async function readBreadcrumbs(
  service: ReturnType<typeof getSupabaseServiceRoleClient>,
  pageId: string,
): Promise<SearchLandingBreadcrumb[]> {
  if (!service) return [];

  const chain: SearchLandingBreadcrumb[] = [];
  const seen = new Set<string>();
  let currentId: string | null = pageId;

  for (let depth = 0; depth < 5 && currentId; depth += 1) {
    if (seen.has(currentId)) throw new Error('SEARCH_LANDING_BREADCRUMB_CYCLE');
    seen.add(currentId);

    const {data: page, error: pageError} = await service
      .from('feya_commerce_seo_pages_v1')
      .select('seo_page_id,url_path')
      .eq('seo_page_id', currentId)
      .maybeSingle();
    if (pageError) throw new Error(`SEARCH_LANDING_BREADCRUMB_PAGE_FAILED:${pageError.message}`);
    if (!page) break;

    let label = page.url_path === '/' ? 'Home' : page.url_path === '/shop' ? 'Shop' : page.url_path.split('/').filter(Boolean).pop() || 'Collection';

    if (page.url_path.startsWith('/collections/')) {
      const {data: version} = await service
        .from('feya_search_page_versions_v1')
        .select('content_json,version_number')
        .eq('seo_page_id', currentId)
        .order('version_number', {ascending:false})
        .limit(1)
        .maybeSingle();
      const h1 = (version?.content_json as Record<string, unknown> | null)?.h1;
      if (typeof h1 === 'string' && h1.trim()) label = h1.trim();
    }

    chain.push({href: page.url_path, label});

    const {data: spec, error: specError} = await service
      .from('feya_search_page_specs_v1')
      .select('primary_parent_page_id')
      .eq('seo_page_id', currentId)
      .maybeSingle();
    if (specError) throw new Error(`SEARCH_LANDING_BREADCRUMB_SPEC_FAILED:${specError.message}`);
    currentId = spec?.primary_parent_page_id ? String(spec.primary_parent_page_id) : null;
  }

  return chain.reverse();
}

async function readApprovedRelatedLinks(
  service: ReturnType<typeof getSupabaseServiceRoleClient>,
  pageId: string,
  content: SearchLandingContent,
): Promise<SearchLandingRelatedLink[]> {
  if (!service || !content.related_links.length) return [];

  const {data: edges, error: edgeError} = await service
    .from('feya_search_link_edges_v1')
    .select('to_page_id,status,source_version')
    .eq('from_page_id', pageId)
    .eq('link_kind', 'navigation')
    .eq('source_version', 'phase-e-20260926')
    .eq('status', 'proposed');

  if (edgeError) throw new Error(`SEARCH_LANDING_RELATED_EDGE_FAILED:${edgeError.message}`);

  const targetIds = (edges || []).map((row) => String(row.to_page_id)).filter(Boolean);
  if (!targetIds.length) return [];

  const {data: pages, error: pageError} = await service
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,url_path,indexation_intent')
    .in('seo_page_id', targetIds);

  if (pageError) throw new Error(`SEARCH_LANDING_RELATED_PAGE_FAILED:${pageError.message}`);

  const approvedPaths = new Set((pages || []).map((row) => String(row.url_path)));
  for (const link of content.related_links) {
    if (!approvedPaths.has(link.href)) {
      throw new Error(`SEARCH_LANDING_RELATED_LINK_NOT_IN_GRAPH:${link.href}`);
    }
  }

  return content.related_links;
}

async function readSearchLandingReleaseInner(slug: string): Promise<SearchLandingRelease | null> {
  const candidate = getSearchLandingCandidate(slug);
  if (!candidate) return null;

  if (candidate.searchStatus === 'hold_noindex') {
    return {
      candidate,
      pageId: null,
      version: null,
      contentHash: null,
      membershipSnapshotId: null,
      content: null,
      products: [],
      breadcrumbs: [
        {href:'/',label:'Home'},
        {href:'/shop',label:'Shop'},
        {href:`/collections/${candidate.slug}`,label:candidate.title},
      ],
      relatedLinks: [],
      membershipCount: 0,
      holdReason: candidate.holdReason || 'SEARCH_BUSINESS_CASE_HOLD',
      source: 'hold_noindex',
    };
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) throw new Error('SEARCH_LANDING_SERVICE_ROLE_NOT_CONFIGURED');

  const urlPath = `/collections/${candidate.slug}`;

  const {data: page, error: pageError} = await service
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,url_path,indexation_intent,portfolio_status')
    .eq('market_code','US')
    .eq('locale','en-US')
    .eq('url_path',urlPath)
    .maybeSingle();

  if (pageError) throw new Error(`SEARCH_LANDING_PAGE_LOOKUP_FAILED:${pageError.message}`);
  if (!page?.seo_page_id) throw new Error('SEARCH_LANDING_PAGE_NOT_REGISTERED');
  if (page.indexation_intent !== 'noindex') throw new Error('SEARCH_LANDING_PREVIEW_MUST_REMAIN_NOINDEX');

  const pageId = String(page.seo_page_id);
  const {data: version, error: versionError} = await service
    .from('feya_search_page_versions_v1')
    .select('version_number,membership_snapshot_id,content_hash,content_json')
    .eq('seo_page_id',pageId)
    .order('version_number',{ascending:false})
    .limit(1)
    .maybeSingle();

  if (versionError) throw new Error(`SEARCH_LANDING_VERSION_LOOKUP_FAILED:${versionError.message}`);
  if (!version?.membership_snapshot_id || !version?.content_hash) throw new Error('SEARCH_LANDING_VERSION_MISSING');

  const content = assertContent(version.content_json,urlPath);
  if (content.primary_cluster !== candidate.primaryCluster) {
    throw new Error('SEARCH_LANDING_PRIMARY_CLUSTER_MISMATCH');
  }

  const snapshotId = String(version.membership_snapshot_id);
  const {data: snapshot, error: snapshotError} = await service
    .from('feya_search_membership_snapshots_v1')
    .select('membership_snapshot_id,expected_item_count,source_revision')
    .eq('membership_snapshot_id',snapshotId)
    .maybeSingle();

  if (snapshotError) throw new Error(`SEARCH_LANDING_SNAPSHOT_LOOKUP_FAILED:${snapshotError.message}`);
  if (!snapshot) throw new Error('SEARCH_LANDING_MEMBERSHIP_SNAPSHOT_MISSING');

  const {data: membership, error: membershipError} = await service
    .from('feya_search_membership_items_v1')
    .select('canonical_product_id')
    .eq('membership_snapshot_id',snapshotId)
    .eq('eligibility_status','eligible')
    .eq('orderability_status','confirmed');

  if (membershipError) throw new Error(`SEARCH_LANDING_MEMBERSHIP_READ_FAILED:${membershipError.message}`);

  const ids = (membership || []).map((row) => String(row.canonical_product_id)).filter(Boolean);
  if (ids.length !== Number(snapshot.expected_item_count || 0)) {
    throw new Error('SEARCH_LANDING_MEMBERSHIP_COUNT_MISMATCH');
  }

  let products: StorefrontProduct[] = [];
  if (ids.length) {
    const {data: rows, error: productError} = await service
      .from(STOREFRONT_VIEW_V4)
      .select(STOREFRONT_V4_CARD_SELECT)
      .in('canonical_product_id',ids)
      .limit(500);
    if (productError) throw new Error(`SEARCH_LANDING_PRODUCT_READ_FAILED:${productError.message}`);

    const byId = new Map((rows || []).map((row) => [String(row.canonical_product_id), row as StorefrontProduct]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) throw new Error(`SEARCH_LANDING_STOREFRONT_PARITY_FAILED:${missing.length}`);

    products = ids
      .map((id) => byId.get(id))
      .filter((row): row is StorefrontProduct => Boolean(row))
      .sort((a,b) => String(a.card_title || '').localeCompare(String(b.card_title || ''),'en'));
  }

  const [breadcrumbs,relatedLinks] = await Promise.all([
    readBreadcrumbs(service,pageId),
    readApprovedRelatedLinks(service,pageId,content),
  ]);

  return {
    candidate,
    pageId,
    version:Number(version.version_number),
    contentHash:String(version.content_hash),
    membershipSnapshotId:snapshotId,
    content,
    products,
    breadcrumbs,
    relatedLinks,
    membershipCount:ids.length,
    holdReason:null,
    source:'immutable_page_version',
  };
}

export const readSearchLandingRelease = cache(readSearchLandingReleaseInner);
