import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_LIMIT = 250;

type ProductFactReviewRow = {
  fact_review_id: string;
  canonical_product_id: string;
  issue_status?: string | null;
  issue_priority?: number | null;
  current_title?: string | null;
  final_primary_part?: string | null;
  final_product_type?: string | null;
  final_material_primary?: string | null;
  final_color_primary?: string | null;
  issue_codes_json?: unknown;
  review_status?: string | null;
  resolution_status?: string | null;
  resolved_primary_part?: string | null;
  resolved_product_type?: string | null;
  resolved_material_primary?: string | null;
  resolved_color_primary?: string | null;
  updated_at?: string | null;
};

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function issueCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

function priorityClass(value: number | null | undefined) {
  if (value != null && value <= 10) return 'danger';
  if (value != null && value <= 20) return 'warning';
  return 'ok';
}

async function getRows(): Promise<{ rows: ProductFactReviewRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_product_fact_review_queue_safe_v1')
    .select('*')
    .eq('review_status', 'pending')
    .eq('resolution_status', 'unresolved')
    .order('issue_priority', { ascending: true })
    .order('updated_at', { ascending: true })
    .limit(REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ProductFactReviewRow[] };
}

export default async function AdminProductFactsReviewPage() {
  const { rows, error } = await getRows();

  const partUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('PART_UNRESOLVED')).length;
  const colorUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('COLOR_UNRESOLVED')).length;
  const materialUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('MATERIAL_UNRESOLVED')).length;
  const guardrails = rows.filter((row) => issueCodes(row.issue_codes_json).includes('FACT_GUARDRAIL_PRESENT')).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/review">Проверка</Link>
            <Link href="/admin/content-qa">Качество контента</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Факты о товаре · очередь проверки</div>
          <h1>Проверка фактов о товарах</h1>
          <p>
            Здесь собраны неоднозначности в исходных фактах о товаре. Сначала нужно исправить или подтвердить факт, а не переписывать SEO-текст, чтобы скрыть проблему.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Ожидают проверки</span></div>
          <div className="card metric"><strong>{partUnresolved}</strong><span>Не определена часть товара</span></div>
          <div className="card metric"><strong>{colorUnresolved}</strong><span>Не определён цвет</span></div>
          <div className="card metric"><strong>{materialUnresolved}</strong><span>Не определён материал</span></div>
          <div className="card metric"><strong>{guardrails}</strong><span>Есть защитное ограничение</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Только просмотр. Product Builder используется как источник данных; изменение фактов останется выключенным до защищённого входа и контролируемого редактирования.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Приоритет</th>
                <th>Товар</th>
                <th>Причины проверки</th>
                <th>Текущие факты</th>
                <th>Решение</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const codes = issueCodes(row.issue_codes_json);
                return (
                  <tr key={row.fact_review_id}>
                    <td>
                      <span className={`status-pill ${priorityClass(row.issue_priority)}`}>
                        P{asText(row.issue_priority)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {asText(row.current_title, row.canonical_product_id)}
                      </Link>
                      <div className="muted">{row.canonical_product_id}</div>
                    </td>
                    <td>
                      {codes.length ? codes.join(', ') : '—'}
                    </td>
                    <td>
                      <div>Часть товара: {asText(row.final_primary_part)}</div>
                      <div>Тип: {asText(row.final_product_type)}</div>
                      <div>Материал: {asText(row.final_material_primary)}</div>
                      <div>Цвет: {asText(row.final_color_primary)}</div>
                    </td>
                    <td>
                      <span className="status-pill warning">{row.resolution_status === 'resolved' ? 'Решено' : 'Не решено'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!error && rows.length === 0 ? (
          <div className="notice">Нет фактов о товарах, ожидающих проверки.</div>
        ) : null}
      </div>
    </main>
  );
}
