import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentSignal, presentWorkItem } from '@/lib/owner-ui/presenters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function searchOwnerData(query: string): Promise<{
  products: Row[];
  pages: Row[];
  work: Row[];
  signals: Row[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], pages: [], work: [], signals: [], error: getMissingAdminDataEnvMessage() };
  if (!query) return { products: [], pages: [], work: [], signals: [] };

  const escaped = query.replace(/[,%()]/g, ' ').trim();
  const [productsResult, pagesResult, workResult, signalsResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_step6_product_catalog_overview')
      .select('canonical_product_id,card_title,h1,matched_etsy_listing_id')
      .or(`card_title.ilike.%${escaped}%,h1.ilike.%${escaped}%`)
      .limit(12),
    supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id,canonical_product_id,url_path,card_title,h1,portfolio_status')
      .or(`card_title.ilike.%${escaped}%,h1.ilike.%${escaped}%,url_path.ilike.%${escaped}%`)
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

  const firstError = productsResult.error || pagesResult.error || workResult.error || signalsResult.error;
  if (firstError) return { products: [], pages: [], work: [], signals: [], error: firstError.message };

  const q = query.toLocaleLowerCase('ru-RU');
  const signalRows = ((signalsResult.data || []) as Row[]).filter((row) => {
    const vm = presentSignal(row);
    return [vm.title, vm.summary, vm.recommendedAction, vm.code]
      .some((value) => value.toLocaleLowerCase('ru-RU').includes(q));
  }).slice(0, 12);

  return {
    products: (productsResult.data || []) as Row[],
    pages: (pagesResult.data || []) as Row[],
    work: (workResult.data || []) as Row[],
    signals: signalRows,
  };
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = String(params.q || '').trim();
  const { products, pages, work, signals, error } = await searchOwnerData(query);
  const workVM = work.map(presentWorkItem);
  const signalVM = signals.map(presentSignal);
  const total = products.length + pages.length + workVM.length + signalVM.length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Быстрый доступ</div>
            <h1>Поиск</h1>
            <p>Ищет товары, поисковые страницы, работу и сигналы. Никаких изменений из поиска сейчас не выполняется.</p>
          </div>
        </header>

        <form action="/admin/company/search" method="get" className="owner-card" style={{ marginBottom: '18px' }}>
          <label htmlFor="owner-search" className="owner-card-title">Что найти?</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input id="owner-search" name="q" defaultValue={query} placeholder="Например: silver harness" style={{ flex: 1, minHeight: '40px', border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--panel-soft)', color: 'var(--text)', padding: '8px 10px' }} />
            <button className="owner-button primary" type="submit">Найти</button>
          </div>
        </form>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}
        {query && !error ? <div className="owner-section-kicker" style={{ marginBottom: '14px' }}>Найдено: {total}</div> : null}

        {!query ? <div className="owner-empty">Введите название товара, путь страницы, задачу или понятное описание сигнала.</div> : null}
        {query && total === 0 ? <div className="owner-empty">Ничего не найдено. Попробуйте более короткий запрос.</div> : null}

        {products.length ? <section className="owner-section"><div className="owner-section-head"><h2>Товары</h2></div><div className="owner-list">
          {products.map((row) => <Link className="owner-list-row" href={`/admin/products/${String(row.canonical_product_id)}`} key={String(row.canonical_product_id)}><div className="owner-list-row-main"><h3>{String(row.card_title || row.h1 || 'Товар')}</h3><p>Открыть товар</p></div></Link>)}
        </div></section> : null}

        {pages.length ? <section className="owner-section"><div className="owner-section-head"><h2>Поисковые страницы</h2></div><div className="owner-list">
          {pages.map((row) => <Link className="owner-list-row" href="/admin/seo-portfolio" key={String(row.seo_page_id)}><div className="owner-list-row-main"><h3>{String(row.card_title || row.h1 || row.url_path || 'Страница')}</h3><p>{String(row.url_path || '')}</p></div></Link>)}
        </div></section> : null}

        {workVM.length ? <section className="owner-section"><div className="owner-section-head"><h2>Работа</h2></div><div className="owner-list">
          {workVM.map((item) => <Link className="owner-list-row" href="/admin/company/work" key={item.id}><div className="owner-list-row-main"><h3>{item.title}</h3><p>{item.statusLabel} · {item.ownerLabel}</p></div></Link>)}
        </div></section> : null}

        {signalVM.length ? <section className="owner-section"><div className="owner-section-head"><h2>Сигналы</h2></div><div className="owner-list">
          {signalVM.map((item) => <Link className="owner-list-row" href="/admin/company/signals" key={item.id}><div className="owner-list-row-main"><h3>{item.title}</h3><p>{item.summary}</p></div></Link>)}
        </div></section> : null}
      </div>
    </main>
  );
}
