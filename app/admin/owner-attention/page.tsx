import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { attentionTypeLabel, priorityLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OwnerAttentionRow = {
  attention_id: string;
  case_id?: string | null;
  attention_type?: string | null;
  priority?: string | null;
  attention_status?: string | null;
  title?: string | null;
  summary?: string | null;
  required_action?: string | null;
  due_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
};

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function priorityClass(value: unknown) {
  const priority = asText(value, '').toUpperCase();
  if (priority === 'P0' || priority === 'P1') return 'danger';
  if (priority === 'P2') return 'warning';
  return 'ok';
}

async function getRows(): Promise<{ rows: OwnerAttentionRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_owner_attention_safe_v1')
    .select('*')
    .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as OwnerAttentionRow[] };
}

export default async function AdminOwnerAttentionPage() {
  const { rows, error } = await getRows();
  const p0 = rows.filter((row) => row.priority === 'P0').length;
  const p1 = rows.filter((row) => row.priority === 'P1').length;
  const p2 = rows.filter((row) => row.priority === 'P2').length;
  const policy = rows.filter((row) => row.attention_type === 'POLICY_DECISION').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/signals">Сигналы</Link>
            <Link href="/admin/launch-readiness">Готовность к запуску</Link>
            <Link href="/admin/business-truth">Правила бизнеса</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Владелец · постоянная очередь решений</div>
          <h1>Решения владельца</h1>
          <p>
            Здесь находятся только решения и действия, которые действительно требуют владельца. Обычное наблюдение и технический шум в эту очередь не попадают.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Открытых решений</span></div>
          <div className="card metric"><strong>{p0}</strong><span>P0</span></div>
          <div className="card metric"><strong>{p1}</strong><span>P1</span></div>
          <div className="card metric"><strong>{p2}</strong><span>P2</span></div>
          <div className="card metric"><strong>{policy}</strong><span>Решений по правилам</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          На текущем этапе это только просмотр. Подтверждение, отклонение и другие действия останутся выключенными до включения защищённого входа и аудитируемых действий владельца.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Приоритет</th>
                <th>Тип</th>
                <th>Решение / действие</th>
                <th>Почему это важно</th>
                <th>Что требуется от владельца</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.attention_id}>
                  <td>
                    <span className={`status-pill ${priorityClass(row.priority)}`}>
                      {priorityLabel(row.priority)}
                    </span>
                  </td>
                  <td>{attentionTypeLabel(row.attention_type)}</td>
                  <td>
                    <strong>{asText(row.title)}</strong>
                    <div className="muted">{statusLabel(row.attention_status)}</div>
                  </td>
                  <td>{asText(row.summary)}</td>
                  <td>{asText(row.required_action)}</td>
                  <td>{asText(row.due_at || row.expires_at, 'Жёсткого срока нет')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!error && rows.length === 0 ? (
          <div className="notice">Сейчас нет открытых решений, требующих владельца.</div>
        ) : null}
      </div>
    </main>
  );
}
