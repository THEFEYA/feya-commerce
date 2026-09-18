import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { capabilityOwnerSummary, ownerToneForStatus, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

type ResultsData = {
  capabilities: Row[];
  experiments: number;
  activeExperiments: number;
  changeEvents: number;
  learnings: number;
  error?: string;
};

async function getData(): Promise<ResultsData> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return {
      capabilities: [],
      experiments: 0,
      activeExperiments: 0,
      changeEvents: 0,
      learnings: 0,
      error: getMissingAdminDataEnvMessage(),
    };
  }

  const [capabilityResult, experimentResult, activeExperimentResult, changeResult, learningResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_capability_status_safe_v1')
      .select('capability_code,capability_state,limitations_summary')
      .in('capability_code', ['MEASUREMENT_ENGINE', 'MEASUREMENT_SPEC_REGISTRY', 'EXPERIMENT_REGISTRY', 'LEARNING_REGISTRY', 'CHANGE_EVENT_REGISTRY']),
    supabase
      .from('feya_commerce_v_experiment_registry_safe_v1')
      .select('experiment_id', { count: 'exact', head: true }),
    supabase
      .from('feya_commerce_v_experiment_registry_safe_v1')
      .select('experiment_id', { count: 'exact', head: true })
      .in('experiment_status', ['RUNNING', 'ACTIVE', 'MEASURING']),
    supabase
      .from('feya_commerce_v_change_events_safe_v1')
      .select('change_event_id', { count: 'exact', head: true }),
    supabase
      .from('feya_commerce_v_learning_registry_safe_v2')
      .select('learning_id', { count: 'exact', head: true }),
  ]);

  const firstError =
    capabilityResult.error ||
    experimentResult.error ||
    activeExperimentResult.error ||
    changeResult.error ||
    learningResult.error;

  return {
    capabilities: (capabilityResult.data || []) as Row[],
    experiments: experimentResult.count || 0,
    activeExperiments: activeExperimentResult.count || 0,
    changeEvents: changeResult.count || 0,
    learnings: learningResult.count || 0,
    ...(firstError ? { error: firstError.message } : {}),
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

export default async function AdminResultsPage() {
  const data = await getData();
  const map = new Map(data.capabilities.map((row) => [String(row.capability_code), row]));
  const measurementState = String(map.get('MEASUREMENT_ENGINE')?.capability_state || 'UNAVAILABLE');
  const tone = ownerToneForStatus(measurementState);

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Эффект и обучение</div>
            <h1>Результаты</h1>
            <p>
              Выполненная работа и доказанный бизнес-результат — разные вещи. FEYA не объявляет изменение успешным, пока его нельзя измерить на реальных данных.
            </p>
          </div>
        </header>

        <nav className="owner-subnav" aria-label="Разделы результатов">
          <a href="#results-summary">Результаты</a>
          <Link href="/admin/experiments">Эксперименты</Link>
          <Link href="/admin/company/advanced">Изменения</Link>
          <Link href="/admin/learning">Выводы</Link>
        </nav>

        {data.error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{data.error}</p>
          </div>
        ) : null}

        <section className={'owner-card ' + toneClass(tone)}>
          <div className={'owner-status ' + toneClass(tone)}>{statusLabel(measurementState)}</div>
          <h2 className="owner-card-title" style={{ marginTop: '12px' }}>Измерение реальных результатов</h2>
          <p className="owner-card-copy">{capabilityOwnerSummary('MEASUREMENT_ENGINE')}</p>
        </section>

        <section className="owner-section" id="results-summary">
          <div className="owner-section-head">
            <div>
              <h2>Что уже зафиксировано</h2>
              <div className="owner-section-kicker">Только реальные записи из реестров, без имитации активности</div>
            </div>
          </div>

          <div className="owner-summary-strip">
            <div className="owner-summary-cell">
              <strong>{data.activeExperiments}</strong>
              <span>Активных экспериментов</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.experiments}</strong>
              <span>Экспериментов всего</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.changeEvents}</strong>
              <span>Изменений с измеримой историей</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.learnings}</strong>
              <span>Подтверждённых выводов</span>
            </div>
          </div>

          {!data.experiments && !data.changeEvents && !data.learnings ? (
            <div className="owner-card is-info" style={{ marginTop: '10px' }}>
              <div className="owner-status is-info">Ожидаемое состояние до запуска</div>
              <p className="owner-card-copy">
                Нулевые значения здесь правильны: система не создаёт фиктивные эксперименты, результаты или «выводы» только ради заполнения панели. Они появятся после реальных изменений и доступных измерительных данных.
              </p>
            </div>
          ) : null}
        </section>

        <section className="owner-section">
          <div className="owner-grid three">
            <Link href="/admin/experiments" className="owner-card">
              <div className="owner-status is-info">Эксперименты</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Проверка гипотез</h3>
              <p className="owner-card-copy">
                Что проверяем, когда начинается измерение, какие данные нужны и что может испортить эксперимент.
              </p>
            </Link>

            <Link href="/admin/learning" className="owner-card">
              <div className="owner-status is-success">Выводы</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Что FEYA действительно узнала</h3>
              <p className="owner-card-copy">
                Повторно используемый вывод появляется только после достаточных доказательств, а не после одного удачного случая.
              </p>
            </Link>

            <Link href="/admin/company/advanced" className="owner-card">
              <div className="owner-status">История</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Изменения и измерения</h3>
              <p className="owner-card-copy">
                Техническая история изменений, спецификации измерения и доказательства остаются доступными на более глубоком уровне.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
