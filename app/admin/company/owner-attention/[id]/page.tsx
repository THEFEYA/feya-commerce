import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { ownerDecisionPlan } from '@/lib/owner-ui/decisions';
import { formatDueTime, presentOwnerAttention } from '@/lib/owner-ui/presenters';
import { OwnerAttentionDecisionClient } from '@/components/admin/OwnerAttentionDecisionClient';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getAttention(id: string): Promise<{ row?: Row; events: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { events: [], error: getMissingAdminDataEnvMessage() };

  const [attentionResult, eventsResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_attention_safe_v3')
      .select('*')
      .eq('attention_id', id)
      .maybeSingle(),
    supabase
      .from('feya_commerce_v_owner_attention_events_safe_v1')
      .select('*')
      .eq('attention_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const firstError = attentionResult.error || eventsResult.error;
  if (firstError) return { events: [], error: firstError.message };
  if (!attentionResult.data) return { events: (eventsResult.data || []) as Row[] };
  return {
    row: attentionResult.data as Row,
    events: (eventsResult.data || []) as Row[],
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

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '10px 0 0', paddingLeft: '20px', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.65 }}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export default async function OwnerDecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, events, error } = await getAttention(id);

  if (!row && !error) notFound();

  const item = row ? presentOwnerAttention(row) : null;
  const plan = ownerDecisionPlan(row?.source_code);
  const ownerActions = getOwnerActionConfigStatus();

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Решение владельца</div>
            <h1>{item?.title || 'Решение'}</h1>
            <p>{plan.question}</p>
          </div>
          <Link href="/admin/company/owner-attention" className="owner-button">Назад к решениям</Link>
        </header>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        {item ? (
          <>
            <section className={`owner-card ${toneClass(item.tone)}`}>
              <div className="owner-card-meta">
                <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                <span>{item.typeLabel}</span>
                <span>{item.statusLabel}</span>
              </div>
              <h2 className="owner-card-title">Что требуется от вас</h2>
              <p className="owner-card-copy">{item.requiredAction}</p>
              <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                <span>{item.dueAt ? `Срок: ${formatDueTime(item.dueAt)}` : 'Жёсткого срока нет'}</span>
              </div>
            </section>

            <section className="owner-section">
              <div className="owner-grid two">
                <article className="owner-card is-success">
                  <div className="owner-status is-success">Подтверждено данными</div>
                  <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Что мы уже знаем</h2>
                  <List items={plan.confirmedFacts} />
                  <p className="owner-card-copy" style={{ marginTop: '12px' }}>{plan.evidenceLabel}</p>
                </article>

                <article className="owner-card is-warning">
                  <div className="owner-status is-warning">Почему нужен владелец</div>
                  <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Граница полномочий</h2>
                  <p className="owner-card-copy">{plan.whyOwner}</p>
                </article>
              </div>
            </section>

            <section className="owner-section">
              <div className="owner-section-head">
                <div>
                  <h2>Что сейчас блокируется</h2>
                  <div className="owner-section-kicker">Только прямые зависимости от этого решения</div>
                </div>
              </div>
              <div className="owner-card">
                <List items={plan.blockedByDecision} />
              </div>
            </section>

            <section className="owner-section">
              <div className="owner-grid two">
                <article className="owner-card is-info">
                  <div className="owner-status is-info">FEYA предлагает</div>
                  <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Рекомендуемый безопасный шаг</h2>
                  <p className="owner-card-copy">{plan.recommendation}</p>
                  <div style={{ marginTop: '14px' }}>
                    <div className="owner-section-kicker">Если подтвердить</div>
                    <List items={plan.afterApproval} />
                  </div>
                </article>

                <article className="owner-card">
                  <div className="owner-status">Если отложить</div>
                  <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Система не будет додумывать решение</h2>
                  <List items={plan.afterDeferral} />
                </article>
              </div>
            </section>

            <section className="owner-section">
              <OwnerAttentionDecisionClient
                attentionId={item.id}
                currentStatus={String(row?.attention_status || 'OPEN')}
                title={item.title}
                recommendation={plan.recommendation}
                enabled={ownerActions.ready}
                blockers={ownerActions.blockers}
              />
            </section>

            <section className="owner-section">
              <details className="owner-disclosure owner-disclosure-section" open={events.length > 0}>
                <summary>
                  <span><strong>История решения</strong><small>Только реальные действия владельца, без выдуманных событий</small></span>
                  <span className="owner-section-kicker">{events.length}</span>
                </summary>
                <div className="owner-disclosure-body">
                  {events.length ? (
                    <div className="owner-timeline">
                      {events.map((event) => (
                        <div className="owner-timeline-row" key={String(event.attention_event_id)}>
                          <span className="owner-timeline-dot" aria-hidden="true" />
                          <div>
                            <strong>{String(event.to_status || event.event_type || 'Изменение')}</strong>
                            <p>{String(event.reason || event.decision_code || 'Решение записано.')}</p>
                            <small>{event.created_at ? new Date(String(event.created_at)).toLocaleString('ru-RU') : 'время не указано'}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="owner-card-copy">Записанных owner-действий по этому вопросу пока нет.</p>
                  )}
                </div>
              </details>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
