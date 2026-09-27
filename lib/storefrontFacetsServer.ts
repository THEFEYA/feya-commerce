import 'server-only';

import type { StorefrontProduct } from '@/lib/types';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { buildStorefrontFacets, type StorefrontFacetTruthRow } from '@/lib/storefrontFacets';

const TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v4';
const MEMBERSHIP_SNAPSHOT_SOURCE = 'feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926';
const FACET_CHUNK_SIZE = 100;

const CANDIDATE_BY_PATH = new Map<string, string>([
  ['/collections/shoulder-armor', 'SHOULDER_ARMOR'],
  ['/collections/festival-outfits', 'FESTIVAL_OUTFITS'],
  ['/collections/rave-outfits', 'RAVE_OUTFITS'],
  ['/collections/burning-man-looks', 'BURNING_MAN_OUTFITS'],
  ['/collections/stage-outfits', 'PERFORMANCE_COSTUMES'],
  ['/collections/bodysuits', 'COSTUME_BODYSUITS'],
  ['/collections/costume-masks', 'COSTUME_MASKS'],
  ['/collections/costume-headpieces', 'COSTUME_HEADPIECES'],
  ['/collections/festival-skirts', 'FESTIVAL_SKIRTS'],
  ['/collections/costume-belts', 'COSTUME_BELTS'],
]);

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

type SnapshotRow = {
  membership_snapshot_id: string;
  seo_page_id: string;
  source_revision: string;
};

type PageRow = {
  seo_page_id: string;
  url_path: string;
};

type MembershipRow = {
  canonical_product_id: string;
  membership_snapshot_id: string;
};

async function readImmutableMembershipCodes(service: any, ids: string[]) {
  const { data: snapshots, error: snapshotError } = await service
    .from('feya_search_membership_snapshots_v1')
    .select('membership_snapshot_id,seo_page_id,source_revision')
    .eq('source_revision', MEMBERSHIP_SNAPSHOT_SOURCE);

  if (snapshotError || !snapshots?.length) return new Map<string, Set<string>>();

  const snapshotRows = snapshots as SnapshotRow[];
  const pageIds = [...new Set(snapshotRows.map((row) => row.seo_page_id).filter(Boolean))];

  const { data: pages, error: pageError } = await service
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,url_path')
    .in('seo_page_id', pageIds);

  if (pageError || !pages?.length) return new Map<string, Set<string>>();

  const pageRows = pages as PageRow[];
  const codeBySnapshot = new Map<string, string>();

  for (const snapshot of snapshotRows) {
    const page = pageRows.find((row) => row.seo_page_id === snapshot.seo_page_id);
    const code = page ? CANDIDATE_BY_PATH.get(page.url_path) : null;
    if (code) codeBySnapshot.set(snapshot.membership_snapshot_id, code);
  }

  const snapshotIds = [...codeBySnapshot.keys()];
  if (!snapshotIds.length) return new Map<string, Set<string>>();

  const membershipByProduct = new Map<string, Set<string>>();

  for (const idChunk of chunks(ids, FACET_CHUNK_SIZE)) {
    const { data: memberships, error: membershipError } = await service
      .from('feya_search_membership_items_v1')
      .select('canonical_product_id,membership_snapshot_id')
      .in('canonical_product_id', idChunk)
      .in('membership_snapshot_id', snapshotIds)
      .eq('eligibility_status', 'eligible')
      .eq('orderability_status', 'confirmed');

    if (membershipError || !memberships?.length) continue;

    for (const row of memberships as MembershipRow[]) {
      const code = codeBySnapshot.get(row.membership_snapshot_id);
      if (!code) continue;
      const current = membershipByProduct.get(row.canonical_product_id) || new Set<string>();
      current.add(code);
      membershipByProduct.set(row.canonical_product_id, current);
    }
  }

  return membershipByProduct;
}

export async function attachStorefrontFacets(products: StorefrontProduct[]): Promise<StorefrontProduct[]> {
  const ids = Array.from(new Set(products.map((product) => product.canonical_product_id).filter(Boolean)));
  if (!ids.length) return products;

  const service = getSupabaseServiceRoleClient();
  if (!service) return products;

  const truthRows: StorefrontFacetTruthRow[] = [];

  for (const idChunk of chunks(ids, FACET_CHUNK_SIZE)) {
    const truth = await service
      .from(TRUTH_VIEW)
      .select('canonical_product_id,parent_components_json,child_components_json,canonical_color_label')
      .in('canonical_product_id', idChunk);

    if (!truth.error && truth.data?.length) truthRows.push(...truth.data);
  }

  const [membershipByProduct] = await Promise.all([
    readImmutableMembershipCodes(service, ids),
  ]);

  const truthByProduct = new Map(truthRows.map((row) => [row.canonical_product_id, row]));

  return products.map((product) => ({
    ...product,
    facets: buildStorefrontFacets(
      truthByProduct.get(product.canonical_product_id),
      membershipByProduct.get(product.canonical_product_id) || [],
    ),
  }));
}

export const STOREFRONT_FACET_MEMBERSHIP_SOURCE = MEMBERSHIP_SNAPSHOT_SOURCE;
