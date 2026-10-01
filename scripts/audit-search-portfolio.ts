import { readFile } from 'node:fs/promises';
import { assessSearchPage, auditOwnership } from '../lib/searchPortfolioPolicy.ts';
import type { BasePage, QueryOwnership } from '../lib/searchPortfolioPolicy.ts';

// Offline replay of a read-only DB export. It never connects to or mutates a DB.
const source = JSON.parse(await readFile(process.argv[2] || 'docs/search/portfolio-audit-input.json', 'utf8')) as {
  observed_at: string; pages: BasePage[]; ownership: QueryOwnership[];
};
const now = new Date(source.observed_at);
const ownershipAudit = auditOwnership(source.ownership, now);
const decisions = source.pages.map(page => assessSearchPage({ page, spec: null, memberships: [], ownership: source.ownership, now }));
const reasonCounts: Record<string, number> = {};
for (const decision of decisions) for (const reason of decision.reason_codes) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
process.stdout.write(JSON.stringify({
  report_version: 'search_foundation_replay_v1',
  source_observed_at: source.observed_at,
  mode: 'read_only_offline_replay',
  scope: 'Portfolio structure only. Product Truth, content approvals and live render were not re-evaluated.',
  page_count: decisions.length,
  hold_count: decisions.filter(row => row.decision === 'hold').length,
  ownership_conflict_count: ownershipAudit.conflicts.length,
  invalid_ownership_count: ownershipAudit.invalid.length,
  reason_counts: reasonCounts,
  can_publish: false,
  can_index: false,
  interpretation: 'Missing new search specifications/ownership is a preparation gap, not revocation of existing product approvals.',
}, null, 2) + '\n');
