import type { StorefrontProduct } from '@/lib/types';
import { buildStorefrontFacets, type StorefrontFacetTruthRow } from '@/lib/storefrontFacets';

const TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v4';
const MEMBERSHIP_VIEW = 'feya_search_v_candidate_membership_current_v1';
const FACET_CHUNK_SIZE = 100;

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export async function attachStorefrontFacets(
  supabase: any,
  products: StorefrontProduct[],
): Promise<StorefrontProduct[]> {
  const ids = Array.from(new Set(products.map((product) => product.canonical_product_id).filter(Boolean)));
  if (!ids.length) return products;

  const truthRows: StorefrontFacetTruthRow[] = [];
  const membershipRows: Array<{ canonical_product_id: string; candidate_code: string; eligibility_status: string }> = [];

  for (const idChunk of chunks(ids, FACET_CHUNK_SIZE)) {
    const [truth, memberships] = await Promise.all([
      supabase
        .from(TRUTH_VIEW)
        .select('canonical_product_id,parent_components_json,child_components_json,canonical_color_label')
        .in('canonical_product_id', idChunk),
      supabase
        .from(MEMBERSHIP_VIEW)
        .select('canonical_product_id,candidate_code,eligibility_status')
        .in('canonical_product_id', idChunk)
        .eq('eligibility_status', 'eligible'),
    ]);

    if (!truth.error && truth.data?.length) truthRows.push(...truth.data);
    if (!memberships.error && memberships.data?.length) membershipRows.push(...memberships.data);
  }

  const truthByProduct = new Map(truthRows.map((row) => [row.canonical_product_id, row]));
  const membershipByProduct = new Map<string, Set<string>>();

  membershipRows.forEach((row) => {
    const current = membershipByProduct.get(row.canonical_product_id) || new Set<string>();
    current.add(row.candidate_code);
    membershipByProduct.set(row.canonical_product_id, current);
  });

  return products.map((product) => ({
    ...product,
    facets: buildStorefrontFacets(
      truthByProduct.get(product.canonical_product_id),
      membershipByProduct.get(product.canonical_product_id) || [],
    ),
  }));
}
