import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { formatDueTime, presentOwnerAttention } from '@/lib/owner-ui/presenters';
import { presentCommerceExecutionApprovals } from '@/lib/owner-ui/commerceApprovals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getRows(): Promise<{ rows: Row[]; commerceRows: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], commerceRows: [], error: getMissingAdminDataEnvMessage() };

  const [attentionResult, commerceResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_attention_safe_v2')
      .select('*')
      .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('feya_growth_execution_requests_v1')
      .select('execution_request_id,action_code,request_status,request_payload_json,created_at,updated_at')
      .eq('request_status', 'APPROVAL_REQUIRED')
      .in('action_code', [
        'ADOPT_SOURCE_PRICE_BASELINE',
        'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
        'REPAIR_MANUAL_CONFIGURATION_BINDINGS',
        'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',
        'ADOPT_COLOR_PRICE_LANE_GOVERNANCE',
      ])
      .order('created_at', { ascending: true }),
  ]);

  const error = attentionResult.error || commerceResult.error;
  if (error) return { rows: [], commerceRows: [], error: error.message };
  return {
    rows: (attentionResult.data || []) as Row[],
    commerceRows: (commerceResult.data || []) as Row[],
  };
}

function toneClass(tone: string) {
  return tone === 'danger'
    ? 'is-danger'
    : tone === 'warning'
      ? 'is-warning'
      : tone === 'success'
        ? 'is-success'
        : tone === 'info'
          ? 'is-info'
          : '';
}

export default async function AdminOwnerAttentionPage() {
  const { rows, commerceRows, error } = await getRows();
  const items = rows.map((row) => ({ ...presentOwnerAttention(row), href: `/admin/company/owner-attention/${String(row.attention_id)}` }));
  const commerceItems = presentCommerceExecutionApprovals(commerceRows);
  const allItems = [...items, ...commerceItems];

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Ваше участие</div>
            <h1>Требует вашего решения</h1>
            <p>
              Здесь только те вопросы, где FEYA не должна продолжать без владельца. Обычные обновления и промежуточные проверки сюда не попадают.
            </p>
          </div>
          <Link href="/admin/company/work" className="owner-button">Вернуться к работе</Link>
        </header>

        {error ? <OwnerDataError error={error} /> : null}

        {allItems.length ? (
          <div className="owner-grid two">
            {allItems.map((item) => (
              <article className={`owner-card ${toneClass(item.tone)}`} key={item.id}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                  <span>{item.typeLabel}</span>
                  <span>{item.statusLabel}</span>
                </div>
                <h2 className="owner-card-title">{item.title}</h2>

                <div style={{ marginTop: '14px' }}>
                  <div className="owner-section-kicker">Почему это важно сейчас</div>
                  <p className="owner-card-copy">{item.whyNow}</p>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <div className="owner-section-kicker">Что требуется от вас</div>
                  <p className="owner-card-copy">{item.requiredAction}</p>
                </div>

                <div className="owner-card-meta" style={{ marginTop: '14px', marginBottom: 0 }}>
                  {item.dueAt ? <span>Срок: {formatDueTime(item.dueAt)}</span> : <span>Жёсткого срока нет</span>}
                </div>

                <div className="owner-actions">
                  <Link href={item.href} className="owner-button primary">Открыть решение</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="owner-empty">Сейчас нет решений, которые требуют вашего участия.</div>
        )}

        <section className="owner-section">
          <div className="owner-card is-info">
            <div className="owner-status is-info">Безопасный режим</div>
            <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Решения исполняются только через защищённый путь</h2>
            <p className="owner-card-copy">
              Там, где точный approval workflow уже реализован, карточка ведёт в соответствующий защищённый экран. Остальные решения остаются read-only до готовности их action path; обход Execution Gateway не допускается.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
