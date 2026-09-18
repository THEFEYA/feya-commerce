import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthInitiativeRow, GrowthStrategyRow } from '@/lib/types';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  strategies: GrowthStrategyRow[];
  initiatives: GrowthInitiativeRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { strategies: [], initiatives: [], error: getMissingAdminDataEnvMessage() };

  const [strategyResult, initiativeResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_strategy_safe_v1')
      .select('*')
      .order('strategy_code', { ascending: true })
      .order('version_no', { ascending: false }),
    supabase
      .from('feya_commerce_v_growth_initiatives_safe_v1')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);

  if (strategyResult.error) return { strategies: [], initiatives: [], error: strategyResult.error.message };
  if (initiativeResult.error) return { strategies: [], initiatives: [], error: initiativeResult.error.message };

  return {
    strategies: (strategyResult.data || []) as GrowthStrategyRow[],
    initiatives: (initiativeResult.data || []) as GrowthInitiativeRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'ACTIVE' || status === 'APPROVED' || status === 'VALID' || status === 'COMPLETED') return 'ok';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'REQUIRED' || status === 'BLOCKED') return 'danger';
  return 'warning';
}

export default async function AdminStrategyPage() {
  const { strategies, initiatives, error } = await getData();

  const activeStrategies = strategies.filter((row) => row.strategy_status === 'ACTIVE').length;
  const revalidation = initiatives.filter((row) => row.strategy_revalidation_status === 'REQUIRED').length;
  const directorPending = initiatives.filter((row) => row.director_gate_status === 'PENDING').length;
  const humanPending = initiatives.filter((row) => row.human_approval_status === 'PENDING').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/strategy">Стратегия</Link>
            <Link href="/admin/signals">Сигналы</Link>
            <Link href="/admin/executions">Выполнение</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Стратегия и инициативы · только просмотр</div>
          <h1>Стратегия и инициативы</h1>
          <p>
            Активировать стратегию может только человек. Проверка директора и подтверждение владельца остаются отдельными этапами, а незавершённые инициативы повторно проверяются при смене активной стратегии.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{strategies.length}</strong><span>Версий стратегии</span></div>
          <div className="card metric"><strong>{activeStrategies}</strong><span>Активных стратегий</span></div>
          <div className="card metric"><strong>{initiatives.length}</strong><span>Инициатив</span></div>
          <div className="card metric"><strong>{directorPending}</strong><span>Ждут проверки директора</span></div>
          <div className="card metric"><strong>{humanPending}</strong><span>Ждут подтверждения человека</span></div>
          <div className="card metric"><strong>{revalidation}</strong><span>Нужна повторная проверка стратегии</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="section-head">
          <div>
            <h2>Версии стратегии</h2>
            <p className="muted">Режим маржинальности нельзя включать, пока нет достоверных данных по переменным затратам.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Стратегия</th>
                <th>Версия</th>
                <th>Статус</th>
                <th>Экономический режим</th>
                <th>Период действия</th>
              </tr>
            </thead>
            <tbody>
              {strategies.length ? strategies.map((row) => (
                <tr key={row.strategy_version_id}>
                  <td>
                    <strong>{asText(row.title, row.strategy_code || '—')}</strong>
                    <div className="muted">{asText(row.strategy_code)}</div>
                  </td>
                  <td>v{row.version_no ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.strategy_status)}`}>
                      {statusLabel(row.strategy_status)}
                    </span>
                  </td>
                  <td>{asText(row.economic_mode)}</td>
                  <td>
                    {asText(row.active_from)}
                    <div className="muted">→ {asText(row.active_to)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>Реальная версия стратегии пока не создана.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Инициативы</h2>
            <p className="muted">Переход к выполнению блокируется, пока стратегия, проверка директора и требуемое подтверждение человека не станут действительными.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Инициатива</th>
                <th>Ответственный</th>
                <th>Класс действия</th>
                <th>Status</th>
                <th>Проверка директора</th>
                <th>Подтверждение человека</th>
                <th>Strategy</th>
                <th>Срок / окончание</th>
              </tr>
            </thead>
            <tbody>
              {initiatives.length ? initiatives.map((row) => (
                <tr key={row.initiative_id}>
                  <td>
                    <strong>{asText(row.title, row.initiative_code || '—')}</strong>
                    <div className="muted">{asText(row.initiative_code)}</div>
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>{asText(row.action_class)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.initiative_status)}`}>
                      {statusLabel(row.initiative_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.director_gate_status)}`}>
                      {statusLabel(row.director_gate_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.human_approval_status)}`}>
                      {statusLabel(row.human_approval_status)}
                    </span>
                  </td>
                  <td>
                    {asText(row.strategy_code)} v{row.strategy_version_no ?? '—'}
                    <div className="muted">
                      <span className={`status-pill ${statusClass(row.strategy_revalidation_status)}`}>
                        {statusLabel(row.strategy_revalidation_status)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {asText(row.due_at)}
                    <div className="muted">истекает {asText(row.expires_at)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}>Реальных инициатив пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
