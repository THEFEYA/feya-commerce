/** Narrow comparisons of saved customer copy. No metrics-based regeneration. */
type Row = Record<string, unknown>;
const record = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
export const normalizeCatalogCopy = (v: unknown) => typeof v === 'string'
  ? v.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim() : '';
export function customerFields(draft: Row) {
  const output = record(draft.agent_output_snapshot);
  const blocks = Array.isArray(output.pdp_blocks) ? output.pdp_blocks.map(record) : [];
  return { seo_title: output.seo_title, h1: output.h1, meta_description: output.meta_description, intro: output.intro,
    description: blocks.map(b => b.body).join('\n'),
    about_this_piece: blocks.find(b => b.block_key === 'about_this_piece')?.body,
    why_youll_love_it: blocks.find(b => b.block_key === 'why_youll_love_it')?.body,
    ideal_for: blocks.find(b => b.block_key === 'ideal_for')?.body,
    main_description: blocks.find(b => b.block_key === 'main_description')?.body };
}
export function auditExactCatalogCopy(drafts: Row[]) {
  const ids = drafts.map(d => String(d.canonical_product_id || ''));
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('One exact current draft per product is required');
  const projected = drafts.map(d => ({ id: String(d.canonical_product_id), fields: customerFields(d) }));
  return Object.fromEntries(Object.keys(customerFields({})).map(field => {
    const groups = new Map<string, string[]>();
    for (const p of projected) {
      const value = normalizeCatalogCopy(p.fields[field as keyof typeof p.fields]);
      groups.set(value, [...(groups.get(value) || []), p.id]);
    }
    const duplicates = [...groups].filter(([value, members]) => value && members.length > 1)
      .map(([normalized_text, product_ids]) => ({ normalized_text, product_ids: product_ids.sort() }))
      .sort((a, b) => a.normalized_text.localeCompare(b.normalized_text));
    return [field, { missing_product_ids: groups.get('') || [], duplicate_groups: duplicates,
      affected_products: duplicates.reduce((n, g) => n + g.product_ids.length, 0) }];
  }));
}

/** Repeated phrasing is a review hint, not a Google duplication threshold. */
export function findNearDescriptionPairs(drafts: Row[], minimumJaccard = 0.8) {
  if (!Number.isFinite(minimumJaccard) || minimumJaccard < 0 || minimumJaccard > 1) throw new Error('Invalid review threshold');
  const entries = drafts.map(d => {
    const words = normalizeCatalogCopy(customerFields(d).description).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/u).filter(Boolean);
    return { id: String(d.canonical_product_id), shingles: new Set(words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(' '))) };
  });
  const pairs = [];
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (!a.shingles.size || !b.shingles.size) continue;
    const intersection = [...a.shingles].filter(w => b.shingles.has(w)).length;
    const similarity = intersection / (a.shingles.size + b.shingles.size - intersection);
    if (similarity >= minimumJaccard) pairs.push({ product_ids: [a.id, b.id], five_word_shingle_jaccard: Number(similarity.toFixed(4)) });
  }
  return pairs.sort((a, b) => b.five_word_shingle_jaccard - a.five_word_shingle_jaccard);
}
