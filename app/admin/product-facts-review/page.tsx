import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';
import { OwnerProductFactDrawerClient } from '@/components/admin/OwnerProductFactDrawerClient';
import { isVariantDraftEnabled } from '@/lib/commerceVariantDraftServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_LIMIT = 250;

type ProductFactReviewRow = {
  fact_review_id: string;
  canonical_product_id: string;
  issue_status?: string | null;
  issue_priority?: number | null;
  current_title?: string | null;
  final_primary_part?: string | null;
  final_product_type?: string | null;
  final_material_primary?: string | null;
  final_color_primary?: string | null;
  issue_codes_json?: unknown;
  review_status?: string | null;
  resolution_status?: string | null;
  resolved_primary_part?: string | null;
  resolved_product_type?: string | null;
  resolved_material_primary?: string | null;
  resolved_color_primary?: string | null;
  updated_at?: string | null;
};

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function issueCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

function issueCodeLabel(value: string) {
  const labels: Record<string, string> = {
    PART_UNRESOLVED: 'Не определена часть товара',
    COLOR_UNRESOLVED: 'Не определён цвет',
    MATERIAL_UNRESOLVED: 'Не определён материал',
    PRODUCT_TYPE_UNRESOLVED: 'Не определён тип товара',
    FACT_GUARDRAIL_PRESENT: 'Есть защитное ограничение',
  };
  return labels[value] || value;
}

function priorityLabel(value: number | null | undefined) {
  if (value != null && value <= 10) return 'Высокий';
  if (value != null && value <= 20) return 'Средний';
  return 'Обычный';
}

function priorityClass(value: number | null | undefined) {
  if (value != null && value <= 10) return 'danger';
  if (value != null && value <= 20) return 'warning';
  return 'ok';
}

async function getRows(): Promise<{ rows: ProductFactReviewRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_product_fact_review_queue_safe_v1')
    .select('*')
    .eq('review_status', 'pending')
    .eq('resolution_status', 'unresolved')
    .order('issue_priority', { ascending: true })
    .order('updated_at', { ascending: true })
    .limit(REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ProductFactReviewRow[] };
}

export default async function AdminProductFactsReviewPage({ searchParams }: { searchParams: Promise<{ q?: string; issue?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getRows();
  const q = String(params.q || '').trim().toLowerCase();
  const issueFilter = String(params.issue || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const partUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('PART_UNRESOLVED')).length;
  const colorUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('COLOR_UNRESOLVED')).length;
  const materialUnresolved = rows.filter((row) => issueCodes(row.issue_codes_json).includes('MATERIAL_UNRESOLVED')).length;
  const guardrails = rows.filter((row) => issueCodes(row.issue_codes_json).includes('FACT_GUARDRAIL_PRESENT')).length;

  const issueMap: Record<string, string> = {
    part: 'PART_UNRESOLVED',
    color: 'COLOR_UNRESOLVED',
    material: 'MATERIAL_UNRESOLVED',
    type: 'PRODUCT_TYPE_UNRESOLVED',
    guardrail: 'FACT_GUARDRAIL_PRESENT',
  };

  const filteredRows = rows.filter((row) => {
    const haystack = [row.current_title, row.canonical_product_id, row.final_primary_part, row.final_product_type, row.final_material_primary, row.final_color_primary]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const requiredIssue = issueMap[issueFilter];
    const codes = issueCodes(row.issue_codes_json);
    const matchesIssue = !requiredIssue || codes.includes(requiredIssue);
    return matchesQuery && matchesIssue;
  });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (issueFilter !== 'all') next.set('issue', issueFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/product-facts-review?${query}` : '/admin/product-facts-review';
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Работа · факты о товарах</div>
            <h1>Проверка фактов о товарах</h1>
            <p>Здесь собраны неоднозначности в исходных фактах. Правильный путь — подтвердить или исправить факт в каноническом источнике, а не маскировать проблему SEO-текстом.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/work#operational-queues" className="owner-button">Назад к работе</Link>
            <Link href="/admin" className="owner-button">Товарная админка</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Товаров ждут проверки фактов</span></div>
          <div className="owner-summary-cell"><strong>{partUnresolved}</strong><span>Не определена часть товара</span></div>
          <div className="owner-summary-cell"><strong>{materialUnresolved + colorUnresolved}</strong><span>Не определён материал / цвет</span></div>
          <div className="owner-summary-cell"><strong>{guardrails}</strong><span>Есть защитное ограничение</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Только просмотр. Канонический источник фактов товара уже используется для проверки; изменение фактов останется выключенным до защищённого входа и контролируемого редактирования.
        </div>

        <form action="/admin/product-facts-review" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара / факта</div>
              <input name="q" defaultValue={q} className="field" placeholder="название, материал, цвет, тип…" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Причина проверки</div>
              <select name="issue" defaultValue={issueFilter} className="field">
                <option value="all">Все причины</option>
                <option value="part">Не определена часть товара</option>
                <option value="type">Не определён тип товара</option>
                <option value="material">Не определён материал</option>
                <option value="color">Не определён цвет</option>
                <option value="guardrail">Защитное ограничение</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>После фильтра: {filteredRows.length}</span>
            <span>Показано: {visibleRows.length}</span>
            <Link href="/admin/product-facts-review">Сбросить</Link>
          </div>
          <OwnerSavedViewsClient scope="product-facts-review" />
        </form>

        <section className="owner-section" style={{ marginTop: '18px' }}>
          <div className="owner-section-head"><div><h2>Неоднозначные факты</h2><div className="owner-section-kicker">Приоритет определяется типом и риском неоднозначности, а не коммерческой ценностью товара</div></div></div>
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{top:0}}>Приоритет</th>
                <th style={{top:0}}>Товар</th>
                <th style={{top:0}}>Причины проверки</th>
                <th style={{top:0}}>Текущие факты</th>
                <th style={{top:0}}>Решение</th>
                <th style={{top:0}}></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const codes = issueCodes(row.issue_codes_json);
                return (
                  <tr key={row.fact_review_id}>
                    <td>
                      <span className={`status-pill ${priorityClass(row.issue_priority)}`}>
                        {priorityLabel(row.issue_priority)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {asText(row.current_title, row.canonical_product_id)}
                      </Link>
                      <div className="muted" title={row.canonical_product_id}>Канонический товар</div>
                    </td>
                    <td>
                      {codes.length ? codes.map(issueCodeLabel).join(', ') : '—'}
                    </td>
                    <td>
                      <div>Часть товара: {asText(row.final_primary_part)}</div>
                      <div>Тип: {asText(row.final_product_type)}</div>
                      <div>Материал: {asText(row.final_material_primary)}</div>
                      <div>Цвет: {asText(row.final_color_primary)}</div>
                    </td>
                    <td>
                      <span className="status-pill warning">{row.resolution_status === 'resolved' ? 'Решено' : 'Не решено'}</span>
                    </td>
                    <td><OwnerProductFactDrawerClient row={row} variantDraftEnabled={isVariantDraftEnabled()} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>

        {!error && filteredRows.length === 0 ? (
          <div className="notice">По текущему фильтру фактов для проверки нет.</div>
        ) : null}

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
    </main>
  );
}
