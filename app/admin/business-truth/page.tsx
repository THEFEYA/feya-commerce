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

const TRUTH_LABELS: Record<string, string> = {
  BRAND_NAME: 'Название бренда',
  ORDER_CANCELLATIONS: 'Отмена заказа',
  DELIVERY_DATE_GUARANTEE: 'Гарантия даты доставки',
  CUSTOMS_DUTIES_BUYER_RESPONSIBILITY: 'Таможенные пошлины',
  STANDARD_MADE_TO_ORDER_PRODUCTION_TIME: 'Срок изготовления',
  EXPRESS_SHIPPING_TIME: 'Экспресс-доставка',
  STANDARD_INTERNATIONAL_TRACKED_SHIPPING_TIME: 'Стандартная международная доставка',
  DISCOUNTED_ITEM_RETURN_TREATMENT: 'Возврат товара со скидкой',
  RETURN_POLICY_CURRENT: 'Правила возврата',
};

function truthTypeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    BRAND: 'Бренд',
    CANCELLATION: 'Заказы',
    CLAIM_POLICY: 'Ограничение обещаний',
    CUSTOMS_DUTIES: 'Таможня',
    PRODUCTION: 'Изготовление',
    SHIPPING: 'Доставка',
    RETURNS: 'Возвраты',
  };
  return labels[key] || 'Правило бизнеса';
}

function scopeLabelLocal(value: unknown, keyValue: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'GLOBAL') return 'Для всего магазина';
  if (key === 'PRODUCTION_PROFILE') return 'Профиль изготовления';
  if (key === 'SHIPPING_PROFILE') return 'Профиль доставки';
  return asText(keyValue, 'Специальная область');
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

  const reviewRows = rows.filter((row) => row.status === 'REVIEW_REQUIRED');
  const activeRows = rows.filter((row) => row.status === 'ACTIVE');

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · правила бизнеса</div>
            <h1>Правила бизнеса</h1>
            <p>Только подтверждённые правила могут использоваться контентом и контролем качества как факты. Неподтверждённая формулировка не становится «истиной» только потому, что её видит ИИ.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/owner-attention" className="owner-button primary">Решения владельца</Link>
            <Link href="/admin/company/system" className="owner-button">Назад к системе</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{review}</strong><span>Правил ждут решения владельца</span></div>
          <div className="owner-summary-cell"><strong>{active}</strong><span>Подтверждены и активны</span></div>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Всего записей в реестре</span></div>
        </section>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Нужно подтвердить</h2>
              <div className="owner-section-kicker">Эти записи нельзя использовать как канонические факты, пока владелец не подтвердит формулировку</div>
            </div>
          </div>

          {reviewRows.length ? (
            <div className="owner-grid two">
              {reviewRows.map((row) => (
                <article className="owner-card is-warning" key={`${row.truth_code}-${row.scope_type}-${row.scope_key}-${row.version_no}`}>
                  <div className="owner-card-meta">
                    <span className="owner-status is-warning">Нужно решение</span>
                    <span>{truthTypeLabel(row.truth_type)}</span>
                    <span>{scopeLabelLocal(row.scope_type, row.scope_key)}</span>
                  </div>
                  <h3 className="owner-card-title">{TRUTH_LABELS[row.truth_code] || 'Правило бизнеса'}</h3>
                  <p className="owner-card-copy">{asText(row.public_copy, 'Публичная формулировка ещё не зафиксирована.')}</p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>Версия {row.version_no ?? '—'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Ничего не ждёт подтверждения</div>
              <p className="owner-card-copy">Все текущие правила бизнеса либо активны, либо не входят в owner-очередь.</p>
            </div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Активные правила</strong><small>Скрыты по умолчанию, потому что уже подтверждены</small></span>
              <span className="owner-section-kicker">{activeRows.length}</span>
            </summary>
            <div className="owner-disclosure-body owner-grid two">
              {activeRows.map((row) => (
                <article className="owner-card is-success" key={`${row.truth_code}-${row.scope_type}-${row.scope_key}-${row.version_no}`}>
                  <div className="owner-card-meta">
                    <span className="owner-status is-success">Активно</span>
                    <span>{truthTypeLabel(row.truth_type)}</span>
                  </div>
                  <h3 className="owner-card-title">{TRUTH_LABELS[row.truth_code] || 'Правило бизнеса'}</h3>
                  <p className="owner-card-copy">{asText(row.public_copy)}</p>
                </article>
              ))}
            </div>
          </details>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Технический реестр</strong><small>Коды, области и версии для диагностики</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Правило</th><th>Тип</th><th>Область</th><th>Статус</th><th>Формулировка</th><th>Версия</th></tr></thead>
                  <tbody>
                    {[...rows].sort((a, b) => {
                      const rank = (status: unknown) => asText(status, '').toUpperCase() === 'REVIEW_REQUIRED' ? 0 : 1;
                      return rank(a.status) - rank(b.status) || asText(a.truth_type).localeCompare(asText(b.truth_type));
                    }).map((row) => (
                      <tr key={`${row.truth_code}-${row.scope_type}-${row.scope_key}-${row.version_no}`}>
                        <td><strong title={row.truth_code}>{TRUTH_LABELS[row.truth_code] || 'Правило бизнеса'}</strong></td>
                        <td>{truthTypeLabel(row.truth_type)}</td>
                        <td>{scopeLabelLocal(row.scope_type, row.scope_key)}</td>
                        <td>{statusLabel(row.status)}</td>
                        <td>{asText(row.public_copy)}</td>
                        <td>{row.version_no ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
