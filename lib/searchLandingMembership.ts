import 'server-only';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4} from '@/lib/storefront';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';

export const SEARCH_MEMBERSHIP_SOURCE_REVISION =
  'feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926';

type MembershipItem = {
  canonical_product_id: string;
};

export type SearchLandingMembershipResult = {
  candidate: NonNullable<ReturnType<typeof getSearchLandingCandidate>>;
  products: Record<string, unknown>[];
  source: 'immutable_membership_snapshot' | 'hold_noindex';
  snapshotId: string | null;
  membershipCount: number;
};

export async function readSearchLandingMembership(
  slug: string,
): Promise<SearchLandingMembershipResult | null> {
  const candidate = getSearchLandingCandidate(slug);
  if (!candidate) return null;

  if (candidate.searchStatus === 'hold_noindex') {
    return {
      candidate,
      products: [],
      source: 'hold_noindex',
      snapshotId: null,
      membershipCount: 0,
    };
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('SEARCH_LANDING_SERVICE_ROLE_NOT_CONFIGURED');
  }

  const urlPath = `/collections/${candidate.slug}`;
  const {data: page, error: pageError} = await supabase
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,url_path,indexation_intent,portfolio_status')
    .eq('market_code', 'US')
    .eq('locale', 'en-US')
    .eq('url_path', urlPath)
    .maybeSingle();

  if (pageError) throw new Error(`SEARCH_LANDING_PAGE_LOOKUP_FAILED:${pageError.message}`);
  if (!page?.seo_page_id) throw new Error('SEARCH_LANDING_PAGE_NOT_REGISTERED');
  if (page.indexation_intent !== 'noindex') {
    throw new Error('SEARCH_LANDING_PREVIEW_MUST_REMAIN_NOINDEX');
  }

  const {data: snapshot, error: snapshotError} = await supabase
    .from('feya_search_membership_snapshots_v1')
    .select('membership_snapshot_id,expected_item_count,source_revision,captured_at')
    .eq('seo_page_id', page.seo_page_id)
    .eq('source_revision', SEARCH_MEMBERSHIP_SOURCE_REVISION)
    .maybeSingle();

  if (snapshotError) throw new Error(`SEARCH_LANDING_SNAPSHOT_LOOKUP_FAILED:${snapshotError.message}`);
  if (!snapshot?.membership_snapshot_id) throw new Error('SEARCH_LANDING_MEMBERSHIP_SNAPSHOT_MISSING');

  const {data: membership, error: membershipError} = await supabase
    .from('feya_search_membership_items_v1')
    .select('canonical_product_id')
    .eq('membership_snapshot_id', snapshot.membership_snapshot_id)
    .eq('eligibility_status', 'eligible')
    .eq('orderability_status', 'confirmed');

  if (membershipError) throw new Error(`SEARCH_LANDING_MEMBERSHIP_READ_FAILED:${membershipError.message}`);

  const ids = ((membership || []) as MembershipItem[])
    .map((row) => String(row.canonical_product_id))
    .filter(Boolean);

  if (ids.length !== Number(snapshot.expected_item_count || 0)) {
    throw new Error('SEARCH_LANDING_MEMBERSHIP_COUNT_MISMATCH');
  }

  if (!ids.length) {
    return {
      candidate,
      products: [],
      source: 'immutable_membership_snapshot',
      snapshotId: String(snapshot.membership_snapshot_id),
      membershipCount: 0,
    };
  }

  const {data: products, error: productError} = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .in('canonical_product_id', ids)
    .limit(500);

  if (productError) throw new Error(`SEARCH_LANDING_PRODUCT_READ_FAILED:${productError.message}`);

  const byId = new Map(
    (products || []).map((product) => [String(product.canonical_product_id), product as Record<string, unknown>]),
  );

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`SEARCH_LANDING_STOREFRONT_PARITY_FAILED:${missing.length}`);
  }

  const ordered = ids
    .map((id) => byId.get(id))
    .filter((product): product is Record<string, unknown> => Boolean(product))
    .sort((a, b) => String(a.card_title || '').localeCompare(String(b.card_title || ''), 'en'));

  return {
    candidate,
    products: ordered,
    source: 'immutable_membership_snapshot',
    snapshotId: String(snapshot.membership_snapshot_id),
    membershipCount: ids.length,
  };
}
