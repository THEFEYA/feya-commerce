'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ContentBriefCompilerStatusRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SHADOW_READY: 'Можно готовить безопасный черновик',
    CANONICAL_READY: 'Готово канонически',
    BLOCKED_KEYWORD_REVIEW: 'Блокирует проверка ключевых слов',
    BLOCKED_PRODUCT_FACT_REVIEW: 'Блокирует проверка фактов товара',
    BLOCKED_GENERATION_GATE: 'Блокирует генерация',
    BLOCKED_NO_SEO_PAGE: 'Нет SEO-страницы',
  };
  return labels[key] || asText(value);
}

function toneClass(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'SHADOW_READY' || key === 'CANONICAL_READY') return 'is-success';
  if (key.includes('BLOCKED')) return 'is-warning';
  return 'is-info';
}

function qualityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key.includes('READY') || key.includes('PASS') || key.includes('APPROVED')) return 'Готово';
  if (key.includes('BLOCK') || key.includes('FAIL') || key.includes('REVIEW')) return 'Нужно проверить';
  if (key.includes('MISSING')) return 'Нет данных';
  return key ? 'Частично готово' : '—';
}

export function OwnerContentBriefDrawerClient({ row }: { row: ContentBriefCompilerStatusRow }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({ open, dialogRef, triggerRef, initialFocusRef: closeRef, close: closeDrawer });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Подробнее</button>
      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть контентное задание" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`brief-drawer-${row.brief_queue_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Контентное задание</div>
                <h2 id={`brief-drawer-${row.brief_queue_id}`} className="m-0 text-[20px] leading-snug">{asText(row.url_path, row.canonical_product_id)}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>
            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${toneClass(row.compiler_status)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(row.compiler_status)}`}>{statusLabel(row.compiler_status)}</span>
                  {row.can_generate_shadow ? <span>shadow draft разрешён</span> : null}
                  {row.can_produce_canonical_brief ? <span>canonical brief разрешён</span> : null}
                </div>
                <h3 className="owner-card-title">Готовность задания</h3>
                <p className="owner-card-copy">Основной ключ: <strong>{asText(row.primary_keyword, 'не назначен')}</strong>.</p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Что должно быть готово до генерации</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Факты товара</span><strong>{qualityLabel(row.product_fact_quality_status)}</strong></div>
                  <div><span>Generation gate</span><strong>{qualityLabel(row.generation_gate_status)}</strong></div>
                  <div><span>План ключей</span><strong>{qualityLabel(row.plan_status)}</strong></div>
                  <div><span>Business Truth</span><strong>{row.business_truth_count || 0} правил</strong></div>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Поисковая страница</div>
                <p className="owner-card-copy">{row.seo_page_id ? 'SEO-страница назначена.' : 'SEO-страница ещё не назначена.'}</p>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Primary ownership</span><strong>{row.primary_ownership_count || 0}</strong></div>
                  <div><span>Ownership всего</span><strong>{row.ownership_count || 0}</strong></div>
                  <div><span>Indexation intent</span><strong>{asText(row.indexation_intent)}</strong></div>
                  <div><span>Lifecycle</span><strong>{asText(row.page_lifecycle_state)}</strong></div>
                </div>
              </section>

              <div className="owner-actions">
                <Link href={`/admin/products/${row.canonical_product_id}`} className="owner-button">Товар</Link>
                <Link href="/admin/seo-portfolio" className="owner-button">SEO-страницы</Link>
                <Link href="/admin/content-qa" className="owner-button">Контроль качества</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>IDs и page goal</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.brief_queue_id}>Brief queue ID</span>
                  <span title={row.canonical_product_id}>Product ID</span>
                  {row.seo_page_id ? <span title={row.seo_page_id}>SEO page ID</span> : null}
                  {row.page_goal_code ? <span title={row.page_goal_code}>Page goal code</span> : null}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
