'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Filter, Search, SlidersHorizontal } from 'lucide-react';
import type { AdminProductTableRow, ReadinessTone } from '@/lib/admin-readiness';

type AdminProductRow = AdminProductTableRow;
type Tone = ReadinessTone;

const filters = [
  { label: 'Все', value: 'all' },
  { label: 'Черновики', value: 'Draft' },
  { label: 'Нужна проверка', value: 'needs-review' },
  { label: 'Готово', value: 'Ready for Storefront' },
  { label: 'Заблокировано', value: 'Blocked' },
];

const SORTS = [
  { label: 'Сначала требующие внимания', value: 'priority' },
  { label: 'Название А–Я', value: 'title-asc' },
  { label: 'Название Я–А', value: 'title-desc' },
  { label: 'Больше вариантов', value: 'configs-desc' },
  { label: 'Меньше вариантов', value: 'configs-asc' },
  { label: 'Цена: выше', value: 'price-desc' },
  { label: 'Цена: ниже', value: 'price-asc' },
];

const READINESS_ORDER: Record<string, number> = {
  Blocked: 0,
  'Needs Label Review': 1,
  'Needs Price Review': 2,
  'Needs Component Mapping': 3,
  'Needs Media QA': 4,
  'SEO Ready': 5,
  Draft: 6,
  'Ready for Storefront': 7,
};

function readinessLabel(label: string) {
  if (label === 'Draft') return 'Черновик';
  if (label === 'Needs Label Review') return 'Проверить название';
  if (label === 'Needs Price Review') return 'Проверить цену';
  if (label === 'Needs Component Mapping') return 'Проверить компоненты';
  if (label === 'Needs Media QA') return 'Проверить медиа';
  if (label === 'SEO Ready') return 'SEO готово к финальной проверке';
  if (label === 'Ready for Storefront') return 'Готово для витрины';
  if (label === 'Blocked') return 'Заблокировано';
  return label;
}

function StatusChip({ children, tone = 'neutral' }: { children: string; tone?: Tone }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.36)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function matchesStatus(row: AdminProductRow, activeFilter: string) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'needs-review') return row.readinessLabel.startsWith('Needs ') || row.readinessLabel === 'SEO Ready';
  return row.readinessLabel === activeFilter;
}

function numericPrice(value: string) {
  const normalized = String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : -1;
}

function sortRows(rows: AdminProductRow[], sort: string) {
  return [...rows].sort((a, b) => {
    if (sort === 'title-asc') return a.title.localeCompare(b.title, 'en');
    if (sort === 'title-desc') return b.title.localeCompare(a.title, 'en');
    if (sort === 'configs-desc') return b.configCount - a.configCount || a.title.localeCompare(b.title, 'en');
    if (sort === 'configs-asc') return a.configCount - b.configCount || a.title.localeCompare(b.title, 'en');
    if (sort === 'price-desc') return numericPrice(b.price) - numericPrice(a.price) || a.title.localeCompare(b.title, 'en');
    if (sort === 'price-asc') return numericPrice(a.price) - numericPrice(b.price) || a.title.localeCompare(b.title, 'en');

    const readinessDelta = (READINESS_ORDER[a.readinessLabel] ?? 99) - (READINESS_ORDER[b.readinessLabel] ?? 99);
    return readinessDelta || a.title.localeCompare(b.title, 'en');
  });
}

export function AdminProductsFilterClient({ rows }: { rows: AdminProductRow[] }) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [row.title, row.subtitle, row.slug, readinessLabel(row.readinessLabel), row.confidence].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesStatus(row, activeFilter);
    });
    return sortRows(filtered, sort);
  }, [rows, query, activeFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
    <div className="border-b border-[rgba(216,214,211,.10)] p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-center">
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Найти товар, slug или статус..."
            className="w-full rounded-lg border border-[rgba(216,214,211,.12)] bg-black/20 py-3 pl-10 pr-4 text-[13px] text-bone outline-none placeholder:text-[var(--smoke)] focus:border-white/40"
          />
        </label>

        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(216,214,211,.12)] bg-black/15 px-3">
          <SlidersHorizontal size={14} className="text-[var(--smoke)]" />
          <span className="text-[11px] text-[var(--bone-dim)]">Сортировка</span>
          <select
            value={sort}
            onChange={(event) => { setSort(event.target.value); setPage(1); }}
            className="min-h-9 bg-transparent text-[12px] text-bone outline-none"
          >
            {SORTS.map((item) => <option key={item.value} value={item.value} className="bg-[#111117]">{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => { setActiveFilter(filter.value); setPage(1); }}
            className={`rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition ${activeFilter === filter.value ? 'border-[rgba(212,178,106,.48)] bg-[rgba(212,178,106,.10)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.12)] bg-black/15 text-[var(--bone-dim)] hover:border-white/30'}`}
          >
            {filter.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-[var(--smoke)]">
          <Filter size={12} /> Показано {visibleRows.length} из {rows.length}
        </div>
      </div>
    </div>

    <div className="sticky top-[64px] z-10 hidden lg:grid grid-cols-[72px_1.6fr_0.95fr_0.65fr_0.75fr_1.2fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
      <div>Медиа</div>
      <div>Товар</div>
      <div>Готовность</div>
      <div>Цена</div>
      <div>Опции</div>
      <div>Проверки</div>
    </div>

    <div className="divide-y divide-[rgba(216,214,211,.08)]">
      {pageRows.map((row) => (
        <Link
          key={row.id}
          href={`/admin/products/${row.slug}`}
          className="grid gap-4 p-4 hover:bg-[rgba(212,178,106,.045)] transition-colors lg:grid-cols-[72px_1.6fr_0.95fr_0.65fr_0.75fr_1.2fr] lg:items-center"
        >
          <div className="relative h-24 w-20 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)] lg:h-16 lg:w-14">
            {row.imageUrl ? <img src={row.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          </div>
          <div>
            <div className="text-bone text-[14px] leading-snug line-clamp-2">{row.title}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">{row.subtitle}</div>
          </div>
          <div><StatusChip tone={row.readinessTone}>{readinessLabel(row.readinessLabel)}</StatusChip></div>
          <div>
            <div className="font-price text-gold-grad text-[19px] leading-none">{row.price}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">{row.confidence}</div>
          </div>
          <div>
            <div className="text-bone text-[14px]">{row.configCount}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">{row.configNote}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {row.reviewChips.map((chip) => <StatusChip key={`${row.id}-${chip.label}`} tone={chip.tone}>{chip.label}</StatusChip>)}
            <ArrowUpRight size={14} className="text-[var(--smoke)] ml-auto" />
          </div>
        </Link>
      ))}

      {!visibleRows.length ? <div className="p-6 text-[13px] text-[var(--bone-dim)]">Под этот фильтр товары не найдены.</div> : null}
    </div>

    {visibleRows.length > pageSize ? (
      <div className="flex flex-col gap-3 border-t border-[rgba(216,214,211,.10)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-[var(--smoke)]">
          Страница {currentPage} из {pageCount} · показано {pageRows.length} · всего {visibleRows.length}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="owner-button"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Назад
          </button>
          <button
            type="button"
            className="owner-button"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Дальше
          </button>
        </div>
      </div>
    ) : null}
  </div>;
}
