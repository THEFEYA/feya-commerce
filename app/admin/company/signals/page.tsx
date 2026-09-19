import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentSignal } from '@/lib/owner-ui/presenters';
import { admissionLabel } from '@/lib/owner-ui/terminology';
import { OwnerSignalDrawerClient } from '@/components/admin/OwnerSignalDrawerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getSignals(): Promise<{ rows: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_signal_candidates_safe_v2')
    .select('signal_fingerprint,signal_code,title,summary,next_action,priority,accountable_domain,signal_state,case_admission_recommendation,materiality_score,evidence_json,entity_scope_json,generated_at')
    .order('priority', { ascending: true })
    .order('materiality_score', { ascending: false })
    .order('signal_code', { ascending: true });

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

function routingOrder(value: unknown) {
  const key = String(value || '');
  if (key === 'OWNER_DECISION_REQUIRED') return 0;
  if (key === 'WORK_QUEUE') return 1;
  if (key === 'IMPLEMENTATION_ACTION') return 2;
  if (key === 'MONITOR') return 3;
  return 4;
}

export default async function AdminSignalsPage({ searchParams }: { searchParams: Promise<{ q?: string; route?: string; priority?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getSignals();
  const q = String(params.q || '').trim().toLowerCase();
  const routeFilter = String(params.route || 'all');
  const priorityFilter = String(params.priority || 'all').toUpperCase();
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 50;
  const preparedAll = rows
    .sort((a, b) => routingOrder(a.case_admission_recommendation) - routingOrder(b.case_admission_recommendation))
    .map((row) => ({
      row,
      vm: presentSignal(row),
      routing: admissionLabel(row.case_admission_recommendation),
    }));

  const filtered = preparedAll.filter(({ row, vm, routing }) => {
    const haystack = [vm.title, vm.summary, vm.ownerLabel, routing]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const route = String(row.case_admission_recommendation || '');
    const priority = String(row.priority || '').toUpperCase();
    const matchesRoute = routeFilter === 'all' || route === routeFilter;
    const matchesPriority = priorityFilter === 'ALL' || priority === priorityFilter;
    return matchesQuery && matchesRoute && matchesPriority;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const prepared = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (routeFilter !== 'all') next.set('route', routeFilter);
    if (priorityFilter !== 'ALL') next.set('priority', priorityFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/company/signals?${query}` : '/admin/company/signals';
  };

  const ownerCount = rows.filter((row) => row.case_admission_recommendation === 'OWNER_DECISION_REQUIRED').length;
  const workCount = rows.filter((row) => row.case_admission_recommendation === 'WORK_QUEUE').length;
  const implementationCount = rows.filter((row) => row.case_admission_recommendation === 'IMPLEMENTATION_ACTION').length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Наблюдение</div>
            <h1>Сигналы</h1>
            <p>
              Система показывает понятную бизнес-интерпретацию. Внутренние коды и техническая маршрутизация доступны отдельно.
            </p>
          </div>
          <Link href="/admin/signals" className="owner-button">Технические детали</Link>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '24px' }}>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Всего активных сигналов</span></div>
          <div className="owner-summary-cell"><strong>{ownerCount}</strong><span>Нужно ваше решение</span></div>
          <div className="owner-summary-cell"><strong>{workCount}</strong><span>Можно передать в работу</span></div>
          <div className="owner-summary-cell"><strong>{implementationCount}</strong><span>Требуется изменение системы</span></div>
        </section>

        <form action="/admin/company/signals" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 lg:grid-cols-[1fr_260px_180px_auto] lg:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск сигнала</div>
              <input name="q" defaultValue={q} className="field" placeholder="что произошло, роль, действие…" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Маршрут</div>
              <select name="route" defaultValue={routeFilter} className="field">
                <option value="all">Все маршруты</option>
                <option value="OWNER_DECISION_REQUIRED">Нужно решение владельца</option>
                <option value="WORK_QUEUE">Передать в работу</option>
                <option value="IMPLEMENTATION_ACTION">Изменение системы</option>
                <option value="MONITOR">Наблюдать</option>
              </select>
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Приоритет</div>
              <select name="priority" defaultValue={priorityFilter} className="field">
                <option value="ALL">Все</option>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>После фильтра: {filtered.length}</span>
            <span>Показано: {prepared.length}</span>
            <Link href="/admin/company/signals">Сбросить</Link>
          </div>
        </form>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        <section className="owner-list">
          {prepared.map(({ row, vm, routing }) => (
            <article className="owner-list-row" key={vm.id}>
              <div className="owner-list-row-main">
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(vm.tone)}`}>{vm.priorityLabel}</span>
                  <span>{routing}</span>
                  <span>{vm.ownerLabel}</span>
                  <span>{vm.statusLabel}</span>
                </div>
                <h3>{vm.title}</h3>
                <p>{vm.summary}</p>
              </div>
              <div className="owner-list-row-side">
                <OwnerSignalDrawerClient
                  vm={vm}
                  routing={routing}
                  recommendation={String(row.case_admission_recommendation || '')}
                  evidence={(row.evidence_json || {}) as Record<string, unknown>}
                  generatedAt={row.generated_at ? String(row.generated_at) : null}
                />
              </div>
            </article>
          ))}
        </section>

        {!error && prepared.length === 0 ? (
          <div className="owner-empty">По текущему фильтру активных сигналов нет.</div>
        ) : null}

        {filtered.length > pageSize ? (
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
            <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
            <div className="owner-actions" style={{ marginTop: 0 }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
              {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
