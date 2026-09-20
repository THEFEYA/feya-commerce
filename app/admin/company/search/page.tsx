import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentSignal, presentWorkItem } from '@/lib/owner-ui/presenters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function searchOwnerData(query: string): Promise<{
  products: Row[];
  pages: Row[];
  queries: Row[];
  work: Row[];
  signals: Row[];
  objectives: Row[];
  initiatives: Row[];
  opportunities: Row[];
  experiments: Row[];
  incidents: Row[];
  executions: Row[];
  learnings: Row[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], pages: [], queries: [], work: [], signals: [], objectives: [], initiatives: [], opportunities: [], experiments: [], incidents: [], executions: [], learnings: [], error: getMissingAdminDataEnvMessage() };
  if (!query) return { products: [], pages: [], queries: [], work: [], signals: [], objectives: [], initiatives: [], opportunities: [], experiments: [], incidents: [], executions: [], learnings: [] };

  const escaped = query.replace(/[,%()]/g, ' ').trim();
  const [
    productsResult,
    pagesResult,
    queriesResult,
    workResult,
    signalsResult,
    objectivesResult,
    initiativesResult,
    opportunitiesResult,
    experimentsResult,
    incidentsResult,
    executionsResult,
    learningsResult,
  ] = await Promise.all([
    supabase
      .from('feya_commerce_v_step6_product_catalog_overview')
      .select('canonical_product_id,card_title,draft_site_title,matched_etsy_listing_id')
      .or(`card_title.ilike.%${escaped}%,draft_site_title.ilike.%${escaped}%,matched_etsy_listing_id.ilike.%${escaped}%`)
      .limit(12),
    supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id,canonical_product_id,url_path,card_title,h1,portfolio_status')
      .or(`card_title.ilike.%${escaped}%,h1.ilike.%${escaped}%,url_path.ilike.%${escaped}%`)
      .limit(12),
    supabase
      .from('vw_seo_keyword_bank_v1_for_listing_master')
      .select('keyword,avg_monthly_searches,review_status,bank_bucket')
      .ilike('keyword', `%${escaped}%`)
      .order('avg_monthly_searches', { ascending: false })
      .limit(12),
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('*')
      .or(`title.ilike.%${escaped}%,business_question.ilike.%${escaped}%`)
      .limit(12),
    supabase
      .from('feya_commerce_v_growth_signal_candidates_safe_v2')
      .select('signal_fingerprint,signal_code,title,summary,next_action,priority,accountable_domain,signal_state')
      .limit(50),
    supabase
      .from('feya_commerce_v_growth_objectives_safe_v1')
      .select('objective_id,objective_code,title,objective_status,owner_role,primary_metric_code,feasibility_status')
      .or(`title.ilike.%${escaped}%,objective_code.ilike.%${escaped}%,primary_metric_code.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_growth_initiatives_safe_v1')
      .select('initiative_id,initiative_code,title,initiative_status,owner_role,strategy_code,action_class')
      .or(`title.ilike.%${escaped}%,initiative_code.ilike.%${escaped}%,strategy_code.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_growth_opportunities_safe_v1')
      .select('opportunity_id,opportunity_code,title,event_name,opportunity_status,owner_role')
      .or(`title.ilike.%${escaped}%,opportunity_code.ilike.%${escaped}%,event_name.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_experiment_registry_safe_v1')
      .select('experiment_id,experiment_code,title,experiment_status,contamination_state')
      .or(`title.ilike.%${escaped}%,experiment_code.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_change_freeze_status_safe_v1')
      .select('incident_id,incident_code,title,summary,severity,incident_status,freeze_mutations')
      .or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%,incident_code.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_execution_gateway_safe_v1')
      .select('execution_request_id,request_code,action_code,mutation_domain,request_status')
      .or(`request_code.ilike.%${escaped}%,action_code.ilike.%${escaped}%,mutation_domain.ilike.%${escaped}%`)
      .limit(8),
    supabase
      .from('feya_commerce_v_learning_registry_safe_v2')
      .select('learning_id,learning_code,title,learning_statement,learning_status,domain')
      .or(`title.ilike.%${escaped}%,learning_statement.ilike.%${escaped}%,learning_code.ilike.%${escaped}%`)
      .limit(8),
  ]);

  const firstError =
    productsResult.error ||
    pagesResult.error ||
    queriesResult.error ||
    workResult.error ||
    signalsResult.error ||
    objectivesResult.error ||
    initiativesResult.error ||
    opportunitiesResult.error ||
    experimentsResult.error ||
    incidentsResult.error ||
    executionsResult.error ||
    learningsResult.error;
  if (firstError) return { products: [], pages: [], queries: [], work: [], signals: [], objectives: [], initiatives: [], opportunities: [], experiments: [], incidents: [], executions: [], learnings: [], error: firstError.message };

  const q = query.toLocaleLowerCase('ru-RU');
  const signalRows = ((signalsResult.data || []) as Row[]).filter((row) => {
    const vm = presentSignal(row);
    return [vm.title, vm.summary, vm.recommendedAction, vm.code]
      .some((value) => value.toLocaleLowerCase('ru-RU').includes(q));
  }).slice(0, 12);

  return {
    products: (productsResult.data || []) as Row[],
    pages: (pagesResult.data || []) as Row[],
    queries: (queriesResult.data || []) as Row[],
    work: (workResult.data || []) as Row[],
    signals: signalRows,
    objectives: (objectivesResult.data || []) as Row[],
    initiatives: (initiativesResult.data || []) as Row[],
    opportunities: (opportunitiesResult.data || []) as Row[],
    experiments: (experimentsResult.data || []) as Row[],
    incidents: (incidentsResult.data || []) as Row[],
    executions: (executionsResult.data || []) as Row[],
    learnings: (learningsResult.data || []) as Row[],
  };
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = String(params.q || '').trim();
  const { products, pages, queries, work, signals, objectives, initiatives, opportunities, experiments, incidents, executions, learnings, error } = await searchOwnerData(query);
  const workVM = work.map(presentWorkItem);
  const signalVM = signals.map(presentSignal);
  const total =
    products.length +
    pages.length +
    queries.length +
    workVM.length +
    signalVM.length +
    objectives.length +
    initiatives.length +
    opportunities.length +
    experiments.length +
    incidents.length +
    executions.length +
    learnings.length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Быстрый доступ</div>
            <h1>Поиск</h1>
            <p>Ищет товары, страницы, запросы, работу, сигналы, цели, инициативы, возможности, эксперименты, инциденты, выполнение и выводы. Поиск ничего не изменяет — он только ведёт к каноническому рабочему контексту.</p>
          </div>
        </header>

        <form action="/admin/company/search" method="get" className="owner-card" style={{ marginBottom: '18px' }}>
          <label htmlFor="owner-search" className="owner-card-title">Что найти?</label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" style={{ marginTop: '12px' }}>
            <input id="owner-search" name="q" defaultValue={query} placeholder="Например: silver harness" className="field" autoFocus />
            <button className="owner-button primary" type="submit">Найти</button>
          </div>
        </form>

        {error ? <OwnerDataError error={error} /> : null}
        {query && !error ? <div className="owner-section-kicker" style={{ marginBottom: '14px' }}>Найдено: {total}</div> : null}

        {!query ? (
          <section className="owner-section" style={{ marginTop: 0 }}>
            <div className="owner-section-head"><div><h2>Быстрые переходы</h2><div className="owner-section-kicker">Безопасные команды навигации — без записи данных</div></div></div>
            <div className="owner-grid two">
              <Link href="/admin/company/owner-attention" className="owner-card"><h3 className="owner-card-title">Что ждёт моего решения</h3><p className="owner-card-copy">Открыть только реальные вопросы на границе полномочий владельца.</p></Link>
              <Link href="/admin/company/work#work-list" className="owner-card"><h3 className="owner-card-title">Заблокированная и текущая работа</h3><p className="owner-card-copy">Перейти к рабочим очередям и текущим процессам.</p></Link>
              <Link href="/admin/company/work#team" className="owner-card"><h3 className="owner-card-title">Команда FEYA</h3><p className="owner-card-copy">Посмотреть роли, ограничения и фактическую текущую работу.</p></Link>
              <Link href="/admin/company/system" className="owner-card"><h3 className="owner-card-title">Что сейчас ограничивает систему</h3><p className="owner-card-copy">Источники данных, запуск, права и автоматизация.</p></Link>
              <Link href="/admin/strategy" className="owner-card"><h3 className="owner-card-title">Цели и стратегия</h3><p className="owner-card-copy">Куда идём, какие цели активированы и какие инициативы требуют проверок.</p></Link>
              <Link href="/admin/opportunities" className="owner-card"><h3 className="owner-card-title">Возможности роста</h3><p className="owner-card-copy">Коммерческие окна, события и другие реальные opportunities.</p></Link>
              <Link href="/admin/company/results" className="owner-card"><h3 className="owner-card-title">Результаты и обучение</h3><p className="owner-card-copy">Эксперименты, изменения, доказательства и повторно используемые выводы.</p></Link>
            </div>
          </section>
        ) : null}
        {query && total === 0 ? <div className="owner-empty">Ничего не найдено. Попробуйте более короткий запрос.</div> : null}

        {products.length ? <section className="owner-section"><div className="owner-section-head"><h2>Товары</h2></div><div className="owner-list">
          {products.map((row) => <Link className="owner-list-row" href={`/admin/products/${String(row.canonical_product_id)}`} key={String(row.canonical_product_id)}><div className="owner-list-row-main"><h3>{String(row.card_title || row.draft_site_title || 'Товар')}</h3><p title={row.matched_etsy_listing_id ? `Etsy ID: ${String(row.matched_etsy_listing_id)}` : undefined}>Открыть рабочую карточку товара</p></div></Link>)}
        </div></section> : null}

        {pages.length ? <section className="owner-section"><div className="owner-section-head"><h2>Поисковые страницы</h2></div><div className="owner-list">
          {pages.map((row) => {
            const pageQuery = String(row.url_path || row.card_title || row.h1 || '').trim();
            return <Link className="owner-list-row" href={`/admin/seo-portfolio?q=${encodeURIComponent(pageQuery)}`} key={String(row.seo_page_id)}><div className="owner-list-row-main"><h3>{String(row.card_title || row.h1 || row.url_path || 'Страница')}</h3><p>{String(row.url_path || 'Открыть SEO-страницу')}</p></div></Link>;
          })}
        </div></section> : null}

        {queries.length ? <section className="owner-section"><div className="owner-section-head"><h2>Ключевые запросы</h2></div><div className="owner-list">
          {queries.map((row, index) => {
            const keyword = String(row.keyword || '');
            const demand = Number(row.avg_monthly_searches || 0);
            return <Link className="owner-list-row" href={`/admin/seo-keywords?q=${encodeURIComponent(keyword)}`} key={`${keyword}-${index}`}><div className="owner-list-row-main"><h3>{keyword || 'Ключевой запрос'}</h3><p>{demand ? `Сохранённый спрос: ${new Intl.NumberFormat('ru-RU').format(demand)} / мес.` : 'Открыть запрос в банке ключевых слов'}</p></div></Link>;
          })}
        </div></section> : null}

        {workVM.length ? <section className="owner-section"><div className="owner-section-head"><h2>Работа</h2></div><div className="owner-list">
          {workVM.map((item) => <Link className="owner-list-row" href="/admin/company/work#work-list" key={item.id}><div className="owner-list-row-main"><h3>{item.title}</h3><p>{item.statusLabel} · {item.ownerLabel}</p></div></Link>)}
        </div></section> : null}

        {signalVM.length ? <section className="owner-section"><div className="owner-section-head"><h2>Сигналы</h2></div><div className="owner-list">
          {signalVM.map((item) => <Link className="owner-list-row" href="/admin/company/signals" key={item.id}><div className="owner-list-row-main"><h3>{item.title}</h3><p>{item.summary}</p></div></Link>)}
        </div></section> : null}

        {objectives.length ? <section className="owner-section"><div className="owner-section-head"><h2>Цели роста</h2></div><div className="owner-list">
          {objectives.map((row) => <Link className="owner-list-row" href="/admin/strategy" key={String(row.objective_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.objective_code || 'Цель роста')}</h3><p>{String(row.objective_status || 'Открыть цель')} · метрика: {String(row.primary_metric_code || 'не назначена')}</p></div></Link>)}
        </div></section> : null}

        {initiatives.length ? <section className="owner-section"><div className="owner-section-head"><h2>Инициативы</h2></div><div className="owner-list">
          {initiatives.map((row) => <Link className="owner-list-row" href="/admin/strategy" key={String(row.initiative_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.initiative_code || 'Инициатива')}</h3><p>{String(row.initiative_status || 'Открыть инициативу')} · {String(row.strategy_code || row.action_class || 'стратегический контекст')}</p></div></Link>)}
        </div></section> : null}

        {opportunities.length ? <section className="owner-section"><div className="owner-section-head"><h2>Возможности</h2></div><div className="owner-list">
          {opportunities.map((row) => <Link className="owner-list-row" href="/admin/opportunities" key={String(row.opportunity_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.opportunity_code || 'Возможность роста')}</h3><p>{String(row.event_name || row.opportunity_status || 'Открыть контекст возможности')}</p></div></Link>)}
        </div></section> : null}

        {experiments.length ? <section className="owner-section"><div className="owner-section-head"><h2>Эксперименты</h2></div><div className="owner-list">
          {experiments.map((row) => <Link className="owner-list-row" href="/admin/experiments" key={String(row.experiment_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.experiment_code || 'Эксперимент')}</h3><p>{String(row.experiment_status || 'Открыть эксперимент')} · {String(row.contamination_state || 'состояние влияющих изменений не задано')}</p></div></Link>)}
        </div></section> : null}

        {incidents.length ? <section className="owner-section"><div className="owner-section-head"><h2>Инциденты</h2></div><div className="owner-list">
          {incidents.map((row) => <Link className="owner-list-row" href="/admin/incidents" key={String(row.incident_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.incident_code || 'Инцидент')}</h3><p>{String(row.summary || row.incident_status || 'Открыть инцидент')}</p></div></Link>)}
        </div></section> : null}

        {executions.length ? <section className="owner-section"><div className="owner-section-head"><h2>Выполнение</h2></div><div className="owner-list">
          {executions.map((row) => <Link className="owner-list-row" href="/admin/executions" key={String(row.execution_request_id)}><div className="owner-list-row-main"><h3>{String(row.request_code || row.action_code || 'Запрос на выполнение')}</h3><p>{String(row.request_status || 'Открыть выполнение')} · {String(row.mutation_domain || 'область не указана')}</p></div></Link>)}
        </div></section> : null}

        {learnings.length ? <section className="owner-section"><div className="owner-section-head"><h2>Выводы</h2></div><div className="owner-list">
          {learnings.map((row) => <Link className="owner-list-row" href="/admin/learning" key={String(row.learning_id)}><div className="owner-list-row-main"><h3>{String(row.title || row.learning_code || 'Вывод')}</h3><p>{String(row.learning_statement || row.learning_status || 'Открыть вывод')}</p></div></Link>)}
        </div></section> : null}
      </div>
    </main>
  );
}
