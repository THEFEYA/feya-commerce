// @ts-nocheck
import Link from 'next/link';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 1000;

type Row = {
  change_set_id: string;
  product_slug: string;
  target_field: string;
  applied_value: string | null;
  status: string;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Нет серверного доступа к базе для админки.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_seo_applied_values_v1')
    .select('change_set_id,product_slug,target_field,applied_value,status')
    .limit(ROW_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function fieldLabel(field: string) {
  if (field === 'seo_title') return 'SEO-заголовок';
  if (field === 'meta_description') return 'Meta description';
  if (field === 'h1') return 'H1';
  if (field === 'primary_image_alt') return 'ALT главного изображения';
  if (field === 'collection_hint') return 'Коллекция';
  if (field === 'description_outline') return 'План описания';
  return 'SEO-поле';
}

function statusLabel(value: string) {
  if (value === 'applied') return 'Применено внутри SEO-процесса';
  if (value === 'approved') return 'Одобрено';
  if (value === 'pending') return 'Ждёт проверки';
  if (value === 'rejected') return 'Отклонено';
  return value || '—';
}

export default async function SeoAppliedValuesPage() {
  const { rows, error } = await loadRows();
  const products = new Set(rows.map((row) => row.product_slug));
  const fields = new Set(rows.map((row) => row.target_field));

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Результаты · SEO-значения</div>
          <h1>Применённые SEO-значения</h1>
          <p>Показываем значения, уже отмеченные как применённые внутри SEO-процесса. Этот экран сам ничего не публикует на витрине.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-change-sets" className="owner-button">Очередь SEO-правок</Link>
          <Link href="/admin/seo-apply" className="owner-button">Создать SEO-правки</Link>
        </div>
      </header>
    {error ? <div className="mb-6 rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
    <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
      <div className="owner-summary-cell"><strong>{products.size}</strong><span>Товаров имеют применённые SEO-значения</span></div>
      <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Значений зафиксировано</span></div>
      <div className="owner-summary-cell"><strong>{fields.size}</strong><span>Типов SEO-полей</span></div>
    </section>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
      <div className="sticky top-[64px] z-10 grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]"><div>Товар</div><div>Статус</div><div>Поле</div><div>Значение</div></div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row) => <div key={`${row.change_set_id}-${row.target_field}`} className="grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-4"><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[13px] hover:text-[var(--gold-warm)]">/{row.product_slug}</Link><div className="text-[12px] text-[var(--bone-dim)]">{statusLabel(row.status)}</div><div className="text-[12px] text-[var(--bone-dim)]" title={row.target_field}>{fieldLabel(row.target_field)}</div><div className="text-[12px] leading-relaxed text-bone line-clamp-4">{row.applied_value || '—'}</div></div>) : <div className="p-6 text-[13px] text-[var(--bone-dim)]">Применённых значений пока нет.</div>}</div>
    </div>
    </div>
  </main>;
}
