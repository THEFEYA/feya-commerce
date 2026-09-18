import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { capabilityOwnerSummary, ownerToneForStatus, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getData(): Promise<{ capabilities: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { capabilities: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_capability_status_safe_v1')
    .select('capability_code,capability_state,limitations_summary')
    .in('capability_code', ['MEASUREMENT_ENGINE', 'MEASUREMENT_SPEC_REGISTRY', 'EXPERIMENT_REGISTRY', 'LEARNING_REGISTRY', 'CHANGE_EVENT_REGISTRY']);

  if (error) return { capabilities: [], error: error.message };
  return { capabilities: (data || []) as Row[] };
}

function toneClass(tone: string) {
  return tone === 'danger' ? 'is-danger' : tone === 'warning' ? 'is-warning' : tone === 'success' ? 'is-success' : tone === 'info' ? 'is-info' : '';
}

export default async function AdminResultsPage() {
  const { capabilities, error } = await getData();
  const map = new Map(capabilities.map((row) => [String(row.capability_code), row]));
  const measurementState = String(map.get('MEASUREMENT_ENGINE')?.capability_state || 'UNAVAILABLE');
  const tone = ownerToneForStatus(measurementState);

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Эффект и обучение</div>
            <h1>Результаты</h1>
            <p>Выполнение работы и бизнес-результат здесь разделены. FEYA не объявляет изменение успешным, пока его нельзя измерить на реальных данных.</p>
          </div>
        </header>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className={`owner-card ${toneClass(tone)}`}>
          <div className={`owner-status ${toneClass(tone)}`}>{statusLabel(measurementState)}</div>
          <h2 className="owner-card-title" style={{ marginTop: '12px' }}>Измерение реальных результатов</h2>
          <p className="owner-card-copy">
            {capabilityOwnerSummary('MEASUREMENT_ENGINE')}
          </p>
        </section>

        <section className="owner-section">
          <div className="owner-grid three">
            <Link href="/admin/experiments" className="owner-card">
              <div className="owner-status is-info">Эксперименты</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Проверка гипотез</h3>
              <p className="owner-card-copy">Дизайн эксперимента, ограничения и окно измерения. Сейчас — инженерная подготовка без фальшивых результатов.</p>
            </Link>
            <Link href="/admin/learning" className="owner-card">
              <div className="owner-status is-success">Выводы</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Что FEYA уже узнала</h3>
              <p className="owner-card-copy">Повторно используемые выводы появляются только после достаточных доказательств, а не после одного удачного случая.</p>
            </Link>
            <Link href="/admin/company/advanced" className="owner-card">
              <div className="owner-status">История</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Изменения и измерения</h3>
              <p className="owner-card-copy">Техническая история изменений и детали измерений пока остаются в диагностическом слое.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
