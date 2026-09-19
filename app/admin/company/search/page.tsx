import Link from 'next/link';
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
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], pages: [], queries: [], work: [], signals: [], error: getMissingAdminDataEnvMessage() };
  if (!query) return { products: [], pages: [], queries: [], work: [], signals: [] };

  const escaped = query.replace(/[,%()]/g, ' ').trim();
  const [productsResult, pagesResult, queriesResult, workResult, signalsResult] = await Promise.all([
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
  ]);

  const firstError = productsResult.error || pagesResult.error || queriesResult.error || workResult.error || signalsResult.error;
  if (firstError) return { products: [], pages: [], queries: [], work: [], signals: [], error: firstError.message };

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
  };
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = String(params.q || '').trim();
  const { products, pages, queries, work, signals, error } = await searchOwnerData(query);
  const workVM = work.map(presentWorkItem);
  const signalVM = signals.map(presentSignal);
  const total = products.length + pages.length + queries.length + workVM.length + signalVM.length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Быстрый доступ</div>
            <h1>Поиск</h1>
            <p>Ищет товары, поисковые страницы, ключевые запросы, работу и сигналы. Поиск ничего не изменяет — он только ведёт к каноническому рабочему контексту.</p>
          </div>
        </header>

        <form action="/admin/company/search" method="get" className="owner-card" style={{ marginBottom: '18px' }}>
          <label htmlFor="owner-search" className="owner-card-title">Что найти?</label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" style={{ marginTop: '12px' }}>
            <input id="owner-search" name="q" defaultValue={query} placeholder="Например: silver harness" className="field" autoFocus />
            <button className="owner-button primary" type="submit">Найти</button>
          </div>
        </form>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}
        {query && !error ? <div className="owner-section-kicker" style={{ marginBottom: '14px' }}>Найдено: {total}</div> : null}

        {!query ? (
          <section className="owner-section" style={{ marginTop: 0 }}>
            <div className="owner-section-head"><div><h2>Быстрые переходы</h2><div className="owner-section-kicker">Безопасные команды навигации — без записи данных</div></div></div>
            <div className="owner-grid two">
              <Link href="/admin/company/owner-attention" className="owner-card"><h3 className="owner-card-title">Что ждёт моего решения</h3><p className="owner-card-copy">Открыть только реальные вопросы на границе полномочий владельца.</p></Link>
              <Link href="/admin/company/work#work-list" className="owner-card"><h3 className="owner-card-title">Заблокированная и текущая работа</h3><p className="owner-card-copy">Перейти к рабочим очередям и текущим процессам.</p></Link>
              <Link href="/admin/company/work#team" className="owner-card"><h3 className="owner-card-title">Команда FEYA</h3><p className="owner-card-copy">Посмотреть роли, ограничения и фактическую текущую работу.</p></Link>
              <Link href="/admin/company/system" className="owner-card"><h3 className="owner-card-title">Что сейчас ограничивает систему</h3><p className="owner-card-copy">Источники данных, запуск, права и автоматизация.</p></Link>
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
      </div>
    </main>
  );
}
