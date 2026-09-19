import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { ownerDecisionPlan } from '@/lib/owner-ui/decisions';
import { presentOwnerAttention } from '@/lib/owner-ui/presenters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getAttention(id: string): Promise<{ row?: Row; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_owner_attention_safe_v2')
    .select('*')
    .eq('attention_id', id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return {};
  return { row: data as Row };
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
  const { row, error } = await getAttention(id);

  if (!row && !error) notFound();

  const item = row ? presentOwnerAttention(row) : null;
  const plan = ownerDecisionPlan(row?.source_code);

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
              <div className="owner-card is-warning">
                <div className="owner-status is-warning">Действия пока выключены</div>
                <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Это только экран принятия решения</h2>
                <p className="owner-card-copy">
                  Кнопки «Подтвердить», «Отклонить» и «Отложить» появятся только после проверки защищённого входа владельца и аудитируемого пути записи. Просмотр этого экрана ничего не меняет.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
