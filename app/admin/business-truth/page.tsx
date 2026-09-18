import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { BusinessTruthStatusRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTruth(): Promise<{ rows: BusinessTruthStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

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
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/content-qa">Контроль качества</Link>
            <Link href="/admin/business-truth">Правила бизнеса</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Канонические правила бизнеса · только просмотр</div>
          <h1>Правила бизнеса</h1>
          <p>
            Только активные записи могут использоваться генерацией контента и контролем качества как факты бизнеса. Записи, требующие проверки, намеренно недоступны AI, пока их публичная формулировка не подтверждена.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Всего записей</span></div>
          <div className="card metric"><strong>{active}</strong><span>Активных правил</span></div>
          <div className="card metric"><strong>{review}</strong><span>Нуждаются в проверке владельца</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Правило</th>
                <th>Тип</th>
                <th>Область</th>
                <th>Статус</th>
                <th>Подтверждённая публичная формулировка</th>
                <th>Версия</th>
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
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td>{asText(row.public_copy, 'Публичная формулировка ещё не подтверждена')}</td>
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
