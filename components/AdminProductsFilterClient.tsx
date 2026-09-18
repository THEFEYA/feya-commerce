'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Filter, Search } from 'lucide-react';
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

function readinessLabel(label: string) {
  if (label === 'Draft') return 'Черновик';
  if (label === 'Needs Label Review') return 'Проверить название';
  if (label === 'Needs Price Review') return 'Проверить цену';
  if (label === 'Needs Component Mapping') return 'Проверить компоненты';
  if (label === 'Needs Media QA') return 'Проверить медиа';
  if (label === 'SEO Ready') return 'Проверить SEO';
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

export function AdminProductsFilterClient({ rows }: { rows: AdminProductRow[] }) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [row.title, row.subtitle, row.slug, readinessLabel(row.readinessLabel), row.confidence].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesStatus(row, activeFilter);
    });
  }, [rows, query, activeFilter]);

  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
    <div className="border-b border-[rgba(216,214,211,.10)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по товару, slug или статусу..." className="w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/20 py-3 pl-10 pr-4 text-[13px] text-bone outline-none placeholder:text-[var(--smoke)] focus:border-white/40" />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => <button key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition ${activeFilter === filter.value ? 'border-[rgba(212,178,106,.48)] bg-[rgba(212,178,106,.10)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.12)] bg-black/15 text-[var(--bone-dim)] hover:border-white/30'}`}>{filter.label}</button>)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--smoke)]"><Filter size={12} /> Показано {visibleRows.length} из {rows.length}</div>
    </div>

    <div className="hidden lg:grid grid-cols-[80px_1.6fr_0.9fr_0.7fr_1.2fr_1.2fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
      <div>Медиа</div>
      <div>Товар</div>
      <div>Готовность</div>
      <div>Цена</div>
      <div>Опции</div>
      <div>Проверки</div>
    </div>

    <div className="divide-y divide-[rgba(216,214,211,.08)]">
      {visibleRows.map((row) => <Link key={row.id} href={`/admin/products/${row.slug}`} className="grid gap-4 p-5 hover:bg-[rgba(212,178,106,.045)] transition-colors lg:grid-cols-[80px_1.6fr_0.9fr_0.7fr_1.2fr_1.2fr] lg:items-center">
        <div className="relative h-28 w-24 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)] lg:h-20 lg:w-16">
          {row.imageUrl ? <img src={row.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-bone text-[15px] leading-snug line-clamp-2">{row.title}</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{row.subtitle}</div>
        </div>
        <div><StatusChip tone={row.readinessTone}>{readinessLabel(row.readinessLabel)}</StatusChip></div>
        <div>
          <div className="font-price text-gold-grad text-[21px] leading-none">{row.price}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{row.confidence}</div>
        </div>
        <div>
          <div className="text-bone text-[14px]">{row.configCount}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{row.configNote}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {row.reviewChips.map((chip) => <StatusChip key={`${row.id}-${chip.label}`} tone={chip.tone}>{chip.label}</StatusChip>)}
          <ArrowUpRight size={14} className="text-[var(--smoke)] ml-auto" />
        </div>
      </Link>)}

      {!visibleRows.length ? <div className="p-6 text-[13px] text-[var(--bone-dim)]">Под этот фильтр товары не найдены.</div> : null}
    </div>
  </div>;
}
