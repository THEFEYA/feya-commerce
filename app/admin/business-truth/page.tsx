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
            Только активные записи могут использоваться генерацией контента и контролем качества как факты бизнеса. Записи, требующие проверки, намеренно недоступны ИИ, пока их публичная формулировка не подтверждена.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{review}</strong><span>Правил ждут решения владельца</span></div>
          <div className="owner-summary-cell"><strong>{active}</strong><span>Активных подтверждённых правил</span></div>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Всего записей в реестре</span></div>
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
              {[...rows].sort((a, b) => {
                const rank = (status: unknown) => asText(status, '').toUpperCase() === 'REVIEW_REQUIRED' ? 0 : 1;
                return rank(a.status) - rank(b.status) || asText(a.truth_type).localeCompare(asText(b.truth_type));
              }).map((row) => (
                <tr key={`${row.truth_code}-${row.scope_type}-${row.scope_key}-${row.version_no}`}>
                  <td><strong title={row.truth_code}>{TRUTH_LABELS[row.truth_code] || 'Правило бизнеса'}</strong></td>
                  <td>{truthTypeLabel(row.truth_type)}</td>
                  <td title={`${asText(row.scope_type)} · ${asText(row.scope_key)}`}>{scopeLabelLocal(row.scope_type, row.scope_key)}</td>
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
