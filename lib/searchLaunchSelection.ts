/** Owner-scoped launch selection; never deletes source products or activates redirects. */
export type LaunchSource = {
  identity: { canonical_product_id: string; seo_page_id: string; draft_id: string; content_sha256: string };
  payload: { metadata: { canonical_path: string } };
};
export type LaunchSelection = {
  decision_id: string;
  action: 'suppress_duplicate_in_future_storefront';
  source: LaunchSource['identity'];
  retained: LaunchSource['identity'];
};

export function selectLaunchSources<T extends LaunchSource>(sources: T[], decisions: LaunchSelection[]) {
  const byId = new Map(sources.map(s => [s.identity.canonical_product_id, s]));
  const pageIds = new Set(sources.map(s => s.identity.seo_page_id));
  const paths = new Set(sources.map(s => s.payload.metadata.canonical_path));
  if (byId.size !== sources.length || pageIds.size !== sources.length || paths.size !== sources.length)
    throw new Error('launch_source_identity_collision');
  const suppressed = new Set<string>(), decisionIds = new Set<string>();
  const matched = (expected: LaunchSource['identity']) => {
    const actual = byId.get(expected.canonical_product_id)?.identity;
    return actual && ['canonical_product_id', 'seo_page_id', 'draft_id', 'content_sha256']
      .every(k => actual[k as keyof typeof actual] === expected[k as keyof typeof expected]);
  };
  for (const d of decisions) {
    if (!d.decision_id || decisionIds.has(d.decision_id) || d.action !== 'suppress_duplicate_in_future_storefront'
      || !matched(d.source) || !matched(d.retained)
      || d.source.canonical_product_id === d.retained.canonical_product_id
      || suppressed.has(d.source.canonical_product_id)) throw new Error('launch_decision_scope_mismatch');
    suppressed.add(d.source.canonical_product_id); decisionIds.add(d.decision_id);
  }
  // Deliberately reject chains, including cycles; redirect destination must survive this release.
  if (decisions.some(d => suppressed.has(d.retained.canonical_product_id)))
    throw new Error('launch_destination_not_visible');
  return {
    visible: sources.filter(s => !suppressed.has(s.identity.canonical_product_id)),
    suppressed: sources.filter(s => suppressed.has(s.identity.canonical_product_id)),
    redirect_candidates: decisions.map(d => ({ decision_id: d.decision_id,
      from_product_id: d.source.canonical_product_id, to_product_id: d.retained.canonical_product_id,
      from_path: byId.get(d.source.canonical_product_id)!.payload.metadata.canonical_path,
      to_path: byId.get(d.retained.canonical_product_id)!.payload.metadata.canonical_path,
      activation_authorized: false as const })),
    can_publish: false as const, can_index: false as const,
  };
}
