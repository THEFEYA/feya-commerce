// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminSeoChangeSetStatusClient } from '@/components/AdminSeoChangeSetStatusClient';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_CHANGE_SETS_LIMIT = 1000;

type Row = {
  change_set_id: string;
  product_slug: string;
  target_field: string;
  current_value: string | null;
  proposed_value: string;
  status: string;
  created_at: string;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Нет серверного доступа к базе для админки.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_seo_change_sets_v1')
    .select('change_set_id,product_slug,target_field,current_value,proposed_value,status,created_at')
    .limit(SEO_CHANGE_SETS_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function statusLabel(status: string) {
  if (status === 'pending') return 'Ждёт проверки';
  if (status === 'approved') return 'Одобрено';
  if (status === 'rejected') return 'Отклонено';
  if (status === 'applied') return 'Применено';
  if (status === 'superseded') return 'Заменено новой версией';
  return status;
}

function fieldLabel(field: string) {
  if (field === 'seo_title') return 'SEO-заголовок';
  if (field === 'meta_description') return 'Meta description';
  if (field === 'h1') return 'H1';
  if (field === 'primary_image_alt') return 'ALT главного изображения';
  if (field === 'collection_hint') return 'Коллекция';
  if (field === 'description_outline') return 'План описания';
  return field;
}

function Chip({ children }) {
  return <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{children}</span>;
}

export default async function SeoChangeSetsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadRows();
  const q = String(params.q || '').trim().toLowerCase();
  const statusFilter = String(params.status || 'pending');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const pending = rows.filter((row) => row.status === 'pending');
  const approved = rows.filter((row) => row.status === 'approved');
  const rejected = rows.filter((row) => row.status === 'rejected');
  const applied = rows.filter((row) => row.status === 'applied');

  const filteredRows = rows
    .filter((row) => {
      const haystack = [row.product_slug, row.target_field, row.current_value, row.proposed_value]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => {
      const rank = (value: string) => value === 'pending' ? 0 : value === 'approved' ? 1 : value === 'rejected' ? 2 : value === 'applied' ? 3 : 4;
      return rank(a.status) - rank(b.status) || String(a.product_slug).localeCompare(String(b.product_slug));
    });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (statusFilter !== 'pending') next.set('status', statusFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-change-sets?${query}` : '/admin/seo-change-sets';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · очередь изменений</div>
          <h1>SEO-правки</h1>
          <p>Сохранённые изменения SEO-полей проходят ручную проверку отдельно от публикации. Одобрение строки здесь не меняет витрину автоматически.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-apply" className="owner-button primary">Создать SEO-правки <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-export" className="owner-button">SEO-экспорт <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)] mb-7">Очередь SEO-правок недоступна: {error}</div> : null}
    <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
      <div className="owner-summary-cell"><strong>{pending.length}</strong><span>Ждут проверки</span></div>
      <div className="owner-summary-cell"><strong>{approved.length}</strong><span>Одобрено</span></div>
      <div className="owner-summary-cell"><strong>{rejected.length}</strong><span>Отклонено</span></div>
      <div className="owner-summary-cell"><strong>{applied.length}</strong><span>Отмечено применённым внутри процесса</span></div>
    </section>
    <form action="/admin/seo-change-sets" className="owner-card" style={{ marginBottom: '14px' }}>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
        <label>
          <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск</div>
          <input name="q" defaultValue={q} className="field" placeholder="товар, поле или текст" />
        </label>
        <label>
          <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Статус</div>
          <select name="status" defaultValue={statusFilter} className="field">
            <option value="pending">Ждут проверки</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
            <option value="applied">Применено внутри процесса</option>
            <option value="all">Все</option>
          </select>
        </label>
        <button type="submit" className="owner-button primary">Применить</button>
      </div>
      <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
        <span>После фильтра: {filteredRows.length}</span>
        <span>Показано: {visibleRows.length}</span>
        <Link href="/admin/seo-change-sets">Сбросить</Link>
      </div>
    </form>

    <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
      <div className="sticky top-[64px] z-10 grid grid-cols-[1fr_.65fr_.8fr_1fr_1fr_1.2fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
        <div>Товар</div><div>Статус</div><div>Поле</div><div>Сейчас</div><div>Предлагается</div><div>Действие</div>
      </div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">
        {visibleRows.length ? visibleRows.map((row) => (
          <div key={row.change_set_id} className="grid grid-cols-[1fr_.65fr_.8fr_1fr_1fr_1.2fr] gap-4 px-5 py-4">
            <div>
              <Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[14px] leading-snug hover:text-[var(--gold-warm)]">/{row.product_slug}</Link>
              <div className="mt-2 text-[10px] text-[var(--smoke)]" title={row.change_set_id}>сохранённая SEO-правка</div>
            </div>
            <div><Chip>{statusLabel(row.status)}</Chip></div>
            <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{fieldLabel(row.target_field)}</div>
            <div className="text-[12px] leading-relaxed text-[var(--bone-dim)] line-clamp-3">{row.current_value || '—'}</div>
            <div className="text-[12px] leading-relaxed text-bone line-clamp-3">{row.proposed_value || '—'}</div>
            <AdminSeoChangeSetStatusClient changeSetId={row.change_set_id} currentStatus={row.status} />
          </div>
        )) : (
          <div className="p-6 text-[13px] leading-relaxed text-[var(--bone-dim)]">По текущему фильтру SEO-правок нет.</div>
        )}
      </div>
    </div>

    {filteredRows.length > pageSize ? (
      <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
        <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
          {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
        </div>
      </div>
    ) : null}
    </div>
  </main>;
}
