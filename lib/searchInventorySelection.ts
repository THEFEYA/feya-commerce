import { resolveStorefrontSellableOffer } from './storefrontSellableOffer.ts';

/** Offline/review selection only. A match is never a publication decision. */
export type InventoryRule =
  | { kind: 'sellable_component'; codes: string[]; scope: 'standalone' | 'any_configuration' }
  | { kind: 'confirmed_axis'; axis: 'event' | 'material' | 'style'; value: string }
  | { kind: 'all'; rules: InventoryRule[] }
  | { kind: 'any'; rules: InventoryRule[] };
export type AxisAttestation = {
  axis: 'event' | 'material' | 'style'; value: string;
  status: 'confirmed' | 'rejected'; source_ref: string; snapshot_ref: string;
};
export type InventoryInput = {
  canonical_product_id: string; snapshot_ref: string;
  storefront: Record<string, unknown>;
  attestations: AxisAttestation[];
};
export type SelectionResult = {
  state: 'match' | 'no_match' | 'unknown'; reason_codes: string[];
  configuration_ids: string[]; evidence_refs: string[];
  can_publish: false; can_index: false;
};
const token = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const unique = (v: string[]) => [...new Set(v)].sort();
const result = (state: SelectionResult['state'], reasons: string[], ids: string[] = [], refs: string[] = []): SelectionResult => ({
  state, reason_codes: unique(reasons), configuration_ids: unique(ids), evidence_refs: unique(refs), can_publish: false, can_index: false,
});

/** Reject unrecognized/extra operators and bound both nesting and total work. */
export function isInventoryRule(value: unknown): value is InventoryRule {
  let nodes = 0;
  const visit = (r: unknown, depth: number): boolean => {
    if (!record(r) || ++nodes > 64 || depth > 8) return false;
    const keys = Object.keys(r).sort().join(',');
    if (r.kind === 'all' || r.kind === 'any') return keys === 'kind,rules' && Array.isArray(r.rules)
      && r.rules.length > 0 && r.rules.length <= 16 && r.rules.every(child => visit(child, depth + 1));
    if (r.kind === 'sellable_component') return keys === 'codes,kind,scope' && Array.isArray(r.codes)
      && r.codes.length > 0 && r.codes.length <= 16 && r.codes.every(token)
      && new Set(r.codes).size === r.codes.length && ['standalone', 'any_configuration'].includes(String(r.scope));
    return r.kind === 'confirmed_axis' && keys === 'axis,kind,value'
      && ['event', 'material', 'style'].includes(String(r.axis)) && token(r.value);
  };
  return visit(value, 0);
}

export function selectInventoryProduct(input: InventoryInput, rule: unknown): SelectionResult {
  if (!isInventoryRule(rule)) return result('unknown', ['selection_rule_invalid']);
  if (!input.canonical_product_id || !input.snapshot_ref
    || input.storefront.canonical_product_id !== input.canonical_product_id) return result('unknown', ['product_identity_or_snapshot_invalid']);
  if (input.storefront.do_not_publish_flag === true) return result('no_match', ['product_explicitly_excluded']);
  if (input.storefront.storefront_candidate_flag !== true || input.storefront.do_not_publish_flag !== false) {
    return result('unknown', ['storefront_candidate_state_unverified']);
  }
  const offer = resolveStorefrontSellableOffer(input.storefront);
  const evaluate = (r: InventoryRule): SelectionResult => {
    if (r.kind === 'all' || r.kind === 'any') {
      const children = r.rules.map(evaluate);
      const state = r.kind === 'all'
        ? children.some(c => c.state === 'no_match') ? 'no_match' : children.every(c => c.state === 'match') ? 'match' : 'unknown'
        : children.some(c => c.state === 'match') ? 'match' : children.every(c => c.state === 'no_match') ? 'no_match' : 'unknown';
      const support = state === 'match' ? children.filter(c => c.state === 'match') : children;
      return result(state, support.flatMap(c => c.reason_codes), support.flatMap(c => c.configuration_ids), support.flatMap(c => c.evidence_refs));
    }
    if (r.kind === 'confirmed_axis') {
      const scoped = input.attestations.filter(a => a.axis === r.axis && a.value === r.value);
      const current = scoped.filter(a => a.snapshot_ref === input.snapshot_ref && a.source_ref.trim());
      if (!current.length) return result('unknown', [scoped.length ? 'axis_evidence_stale_or_unreferenced' : 'axis_evidence_missing']);
      const statuses = new Set(current.map(a => a.status));
      if (statuses.size !== 1 || !['confirmed', 'rejected'].includes(current[0].status)) return result('unknown', ['axis_evidence_conflict']);
      return result(current[0].status === 'confirmed' ? 'match' : 'no_match', ['axis_attestation'], [], current.map(a => a.source_ref));
    }
    if (offer.status !== 'ready') return result('unknown', ['sellable_offer_unresolved', ...offer.blockers]);
    const atomic = offer.atomic_options.filter(o => r.codes.includes(o.code));
    const grouped = offer.aggregate_options.filter(o => o.member_codes.some(code => r.codes.includes(code)));
    const matches = r.scope === 'standalone' ? atomic : [...atomic, ...grouped];
    if (matches.some(o => !o.configuration_id)) return result('unknown', ['matching_configuration_id_missing']);
    if (matches.length) return result('match', [atomic.length ? 'standalone_configuration_match' : 'grouped_configuration_match'],
      matches.map(o => o.configuration_id!), [input.snapshot_ref]);
    // Numbered choices preserve owner-approved selector identities, but their
    // type cannot be inferred from the product title or the word "Variant".
    if (offer.atomic_options.some(o => /^variant(?:_|\d)/.test(o.code))) return result('unknown', ['numbered_variant_type_unmapped']);
    return result('no_match', [grouped.length ? 'component_only_in_grouped_configuration' : 'no_matching_sellable_component']);
  };
  return evaluate(rule);
}

export function selectInventory(input: InventoryInput[], rule: unknown) {
  const counts = new Map<string, number>();
  input.forEach(p => counts.set(p.canonical_product_id, (counts.get(p.canonical_product_id) || 0) + 1));
  return input.filter((p, i) => input.findIndex(other => other.canonical_product_id === p.canonical_product_id) === i)
    .map(p => ({ canonical_product_id: p.canonical_product_id,
      ...((counts.get(p.canonical_product_id) || 0) > 1 ? result('unknown', ['duplicate_product_identity']) : selectInventoryProduct(p, rule)),
    })).sort((a, b) => a.canonical_product_id.localeCompare(b.canonical_product_id));
}
