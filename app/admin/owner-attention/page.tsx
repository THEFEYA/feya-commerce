import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentOwnerAttention } from '@/lib/owner-ui/presenters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getRows(): Promise<{ rows: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_owner_attention_safe_v2')
    .select('*')
    .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as Row[] };
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
  const { rows, error } = await getRows();
  const items = rows.map(presentOwnerAttention);

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
          <Link href="/admin/work" className="owner-button">Вернуться к работе</Link>
        </header>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        {items.length ? (
          <div className="owner-grid two">
            {items.map((item) => (
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
                  {item.dueAt ? <span>Срок: {new Date(item.dueAt).toLocaleDateString('ru-RU')}</span> : <span>Жёсткого срока нет</span>}
                </div>

                <div className="owner-actions">
                  <span className="owner-button primary" aria-disabled="true">Решение пока только для просмотра</span>
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
            <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Кнопки решений пока не активны</h2>
            <p className="owner-card-copy">
              Сначала нужно включить защищённый вход владельца и проверить аудит действий. После этого появятся подтверждение, отклонение, отсрочка и другие реальные действия.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
