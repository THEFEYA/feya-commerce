import Link from 'next/link';

export function OwnerDataError({
  error,
  title = 'Не удалось загрузить данные раздела',
}: {
  error: string;
  title?: string;
}) {
  return (
    <div className="owner-card is-danger">
      <div className="owner-status is-danger">Ошибка данных</div>
      <h2 className="owner-card-title" style={{ marginTop: '10px' }}>{title}</h2>
      <p className="owner-card-copy">
        FEYA не подставляет нули или догадки вместо недоступных данных. Можно продолжать пользоваться другими разделами, а техническую причину открыть отдельно.
      </p>
      <div className="owner-actions">
        <Link href="/admin/company/system" className="owner-button">Состояние системы</Link>
        <Link href="/admin/company/advanced" className="owner-button">Технические детали</Link>
      </div>
      <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '12px' }}>
        <summary>
          <span><strong>Техническая причина</strong><small>Не нужна для обычной работы владельца</small></span>
          <span className="owner-section-kicker">Подробнее</span>
        </summary>
        <div className="owner-disclosure-body">
          <code className="owner-error-code">{error}</code>
        </div>
      </details>
    </div>
  );
}
