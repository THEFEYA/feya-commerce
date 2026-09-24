import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { previewMetadataReview } from '../lib/seoMetadataReview.ts';
import { auditExactCatalogCopy } from '../lib/seoCatalogCopyAudit.ts';

const paths = ['docs/search/approved-catalog-content-capture-20260924.json', 'docs/search/approved-catalog-content-bindings-20260924.json',
  'docs/search/metadata-distinction-queue-20260924.json', 'docs/search/metadata-distinction-review-20260924.json'];
const source = paths.map(p => readFileSync(p, 'utf8'));
const [capture, bindings, queue, review] = source.map(s => JSON.parse(s));
const map = new Map<string, any>(review.rows.map((r: any) => [r.canonical_product_id, r]));
assert.equal(map.size, 64);
assert.deepEqual([...map.keys()].sort(), queue.rows.map((r: any) => r.canonical_product_id).sort());
const projected = capture.products.map((draft: any) => {
  const row = map.get(draft.canonical_product_id);
  if (!row) return draft;
  assert.equal(row.owner_approval_asserted, false);
  assert.equal(row.can_publish, false); assert.equal(row.can_index, false);
  assert.equal(row.evidence.approved_intro, draft.intro);
  assert.equal(row.evidence.approved_about_this_piece, draft.agent_output_snapshot.pdp_blocks.find((b: any) => b.block_key === 'about_this_piece').body);
  assert.equal(row.source_record_md5, draft.full_record_md5);
  if (row.status !== 'proposed') { assert.deepEqual(row.proposed, {}); return draft; }
  const binding = bindings.entries.find((e: any) => e.identity.canonical_product_id === draft.canonical_product_id);
  const result = previewMetadataReview(binding.payload, binding.identity, row);
  assert.deepEqual(result.draft.pdp_blocks, binding.payload.draft.pdp_blocks);
  assert.equal(result.draft.intro, binding.payload.draft.intro);
  assert.equal(result.metadata.description, binding.payload.metadata.description);
  return { ...draft, agent_output_snapshot: { ...draft.agent_output_snapshot, seo_title: result.metadata.title, h1: result.draft.h1 } };
});
const comparison = auditExactCatalogCopy(projected);
const residual = new Set<string>();
for (const field of ['seo_title', 'h1']) {
  for (const group of comparison[field].duplicate_groups) for (const id of group.product_ids) {
    residual.add(id); assert.equal(map.get(id)?.status, 'held', `Unexpected unresolved/new collision: ${id}`);
  }
}
const report = { contract_version: 'metadata_review_audit_v1', mode: 'offline_proposal_simulation',
  target_products: projected.length, reviewed_candidates: map.size,
  summary: Object.fromEntries(['proposed', 'retain', 'held'].map(s => [s, review.rows.filter((r: any) => r.status === s).length])),
  title_groups_after_proposals: comparison.seo_title.duplicate_groups,
  h1_groups_after_proposals: comparison.h1.duplicate_groups,
  residual_metadata_collision_products: residual.size,
  preservation: { existing_drafts_written: 0, full_descriptions_changed: 0, meta_descriptions_changed: 0, keywords_changed: 0, prices_changed: 0 },
  source_fingerprints: paths.map((path, i) => ({ path, sha256: createHash('sha256').update(source[i]).digest('hex') })),
  can_publish: false, can_index: false, can_enable_checkout: false };
const output = 'docs/search/metadata-review-audit-20260924.json', text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(output, 'utf8'), text);
else writeFileSync(output, text);
console.log(JSON.stringify({ reviewed: map.size, ...report.summary, residual_metadata_collision_products: residual.size }));
