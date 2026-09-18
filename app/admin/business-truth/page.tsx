import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { BusinessTruthStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTruth(): Promise<{ rows: BusinessTruthStatusRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_business_truth_status_safe_v1')
    .select('*')
    .order('status', { ascending: true })
    .order('truth_type', { ascending: true })
    .order('truth_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as BusinessTruthStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'ACTIVE') return 'ok';
  if (normalized === 'REVIEW_REQUIRED' || normalized === 'DRAFT') return 'warning';
  return 'danger';
}

export default async function AdminBusinessTruthPage() {
  const { rows, error } = await getTruth();
  const active = rows.filter((row) => row.status === 'ACTIVE').length;
  const review = rows.filter((row) => row.status === 'REVIEW_REQUIRED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/content-qa">Content QA</Link>
            <Link href="/admin/business-truth">Business Truth</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Canonical operational facts · read-only</div>
          <h1>Business Truth</h1>
          <p>
            Only ACTIVE rows may be treated as business facts by content generation or CQA. REVIEW_REQUIRED rows remain intentionally unavailable to AI until their storefront wording is confirmed.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Truth records</span></div>
          <div className="card metric"><strong>{active}</strong><span>Active facts</span></div>
          <div className="card metric"><strong>{review}</strong><span>Need owner review</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Truth</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Approved public wording</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.truth_code}-${row.scope_type}-${row.scope_key}-${row.version_no}`}>
                  <td><strong>{row.truth_code}</strong></td>
                  <td>{asText(row.truth_type)}</td>
                  <td>
                    {asText(row.scope_type)}
                    <div className="muted">{asText(row.scope_key)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.status)}`}>
                      {asText(row.status)}
                    </span>
                  </td>
                  <td>{asText(row.public_copy, 'Not approved for public copy')}</td>
                  <td>v{row.version_no ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
