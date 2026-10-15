import 'server-only';

import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';

/**
 * Live, read-only search authority. The legacy launch_readiness_v2 views
 * predate ACTIVE Search Release v12 and must not be treated as indexation truth.
 * Missing or contradictory evidence is UNKNOWN, never 0 or PASS.
 */
export type ActiveSearchEvidence = {
  releaseCode: string;
  releaseVersion: number;
  targetOrigin: string;
  intendedIndex: number;
  intendedNoindex: number;
  approvedProducts: number;
};

export async function getActiveSearchEvidence(): Promise<{ value: ActiveSearchEvidence | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { value: null, error: getMissingAdminDataEnvMessage() };

  const releases = await supabase
    .from('feya_search_releases_v1')
    .select('release_id,release_code,release_version,target_origin')
    .eq('release_status', 'ACTIVE')
    .limit(2);

  if (releases.error) return { value: null, error: releases.error.message };
  if (!releases.data || releases.data.length !== 1)
    return { value: null, error: 'Ожидается ровно один активный Search Release; проверка источника необходима.' };

  const release = releases.data[0];
  if (release.target_origin !== 'https://thefeya.com')
    return { value: null, error: 'Активный Search Release указывает на другой домен; данные не подтверждены.' };

  const [index, noindex, products] = await Promise.all([
    supabase.from('feya_search_release_items_v1')
      .select('release_id', { count: 'exact', head: true })
      .eq('release_id', release.release_id).eq('intended_index_state', 'index'),
    supabase.from('feya_search_release_items_v1')
      .select('release_id', { count: 'exact', head: true })
      .eq('release_id', release.release_id).eq('intended_index_state', 'noindex'),
    supabase.from('feya_storefront_approved_product_bindings_v1')
      .select('canonical_product_id', { count: 'exact', head: true }),
  ]);

  const sourceError = index.error || noindex.error || products.error;
  if (sourceError) return { value: null, error: sourceError.message };
  if (index.count == null || noindex.count == null || products.count == null)
    return { value: null, error: 'Нет достоверного количества страниц или утверждённых товаров.' };

  return { value: {
    releaseCode: String(release.release_code),
    releaseVersion: Number(release.release_version),
    targetOrigin: String(release.target_origin),
    intendedIndex: index.count,
    intendedNoindex: noindex.count,
    approvedProducts: products.count,
  } };
}

