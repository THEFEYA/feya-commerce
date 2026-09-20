'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, Database, Route, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { OwnerSignalVM } from '@/lib/owner-ui/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

type Evidence = Record<string, unknown>;

const EVIDENCE_LABELS: Record<string, string> = {
  needs_cleanup: 'Требуют очистки',
  needs_cleanup_review: 'Ждут проверки очистки',
  wait_for_metrics: 'Ждут метрик',
  ready_for_semantic_clustering: 'Готовы к смысловой группировке',
  active_return_truth: 'Активных правил возврата',
  review_required_return_truth: 'Правил возврата ждут подтверждения',
  indexable_pages: 'Разрешённых к индексации страниц',
  primary_ownership_rows: 'Основных назначений запросов страницам',
  ready_for_publish_drafts: 'Черновиков готовы к публикационной проверке',
  capability_state: 'Состояние системной возможности',
  implementation_state: 'Состояние реализации',
};

function toneClass(tone: OwnerSignalVM['tone']) {
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

function dateTimeLabel(value?: string | null) {
  if (!value) return 'Время не указано';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Время не указано';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function ownerEvidenceEntries(evidence: Evidence) {
  return Object.entries(evidence)
    .filter(([key, value]) => EVIDENCE_LABELS[key] && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
    .map(([key, value]) => ({ key, label: EVIDENCE_LABELS[key], value: String(value) }));
}

export function OwnerSignalDrawerClient({
  vm,
  routing,
  recommendation,
  evidence = {},
  generatedAt,
}: {
  vm: OwnerSignalVM;
  routing: string;
  recommendation?: string | null;
  evidence?: Evidence;
  generatedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const entries = useMemo(() => ownerEvidenceEntries(evidence), [evidence]);

  useOwnerDrawerA11y({
    open,
    dialogRef,
    triggerRef,
    initialFocusRef: closeRef,
    close: closeDrawer,
  });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Открыть сигнал</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            aria-label="Закрыть сигнал"
            className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />
          <aside
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`signal-drawer-${vm.id}`}
            className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-[rgba(216,214,211,.14)] bg-[#0c0c11] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"
          >
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(216,214,211,.10)] bg-[#0c0c11]/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Сигнал FEYA</div>
                <h2 id={`signal-drawer-${vm.id}`} className="m-0 text-[20px] leading-snug text-bone">{vm.title}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={() => setOpen(false)}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card owner-signal-fact-card ${toneClass(vm.tone)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(vm.tone)}`}>{vm.priorityLabel}</span>
                  <span>{vm.statusLabel}</span>
                </div>
                <div className="owner-signal-drawer-label"><ShieldCheck size={14} strokeWidth={1.7} aria-hidden="true" />Что зафиксировано</div>
                <h3 className="owner-card-title">{vm.title}</h3>
                <p className="owner-card-copy">{vm.summary}</p>
              </section>

              <section className="owner-card owner-signal-route-card">
                <div className="owner-signal-drawer-label"><Route size={14} strokeWidth={1.7} aria-hidden="true" />Кому дальше</div>
                <div className="owner-signal-route-line">
                  <span>{vm.ownerLabel}</span>
                  <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" />
                  <strong>{routing}</strong>
                </div>
                <p className="owner-card-copy">Маршрут определяется правилами допуска и границами полномочий, а не свободным выбором интерфейса.</p>
              </section>

              <section className="owner-card is-info owner-signal-recommendation-card">
                <div className="owner-signal-drawer-label"><Sparkles size={14} strokeWidth={1.7} aria-hidden="true" />Рекомендованный следующий шаг</div>
                <p className="owner-card-copy">{vm.recommendedAction}</p>
              </section>

              <section className="owner-card">
                <div className="owner-signal-drawer-label"><Database size={14} strokeWidth={1.7} aria-hidden="true" />Подтверждающие данные</div>
                {entries.length ? (
                  <div className="owner-list" style={{ marginTop: '10px' }}>
                    {entries.map((entry) => (
                      <div className="owner-list-row" key={entry.key}>
                        <div className="owner-list-row-main"><h3>{entry.label}</h3></div>
                        <div className="owner-list-row-side"><strong>{entry.value}</strong></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="owner-card-copy">Краткое evidence-представление для этого типа сигнала ещё не определено. FEYA не показывает сырой JSON как основное доказательство.</p>
                )}
                <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                  <span>Сформировано: {dateTimeLabel(generatedAt)}</span>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Доступное действие</div>
                <p className="owner-card-copy">{recommendation || 'Маршрут работы определён правилами допуска.'}</p>
                <div className="owner-actions">
                  {recommendation === 'OWNER_DECISION_REQUIRED' ? (
                    <Link href="/admin/company/owner-attention" className="owner-button primary">Рассмотреть решение</Link>
                  ) : recommendation === 'WORK_QUEUE' ? (
                    <Link href="/admin/company/work" className="owner-button primary">Открыть работу</Link>
                  ) : (
                    <Link href="/admin/company/system" className="owner-button">Открыть контекст системы</Link>
                  )}
                </div>
              </section>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>Raw evidence остаётся диагностикой, а не основным интерфейсом</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body">
                  <div className="owner-card-meta" style={{ marginBottom: 0 }}>
                    <span title={vm.code}>Код сигнала</span>
                    <span title={JSON.stringify(evidence)}>Исходное evidence сохранено</span>
                  </div>
                  <div className="owner-actions">
                    <Link href="/admin/signals" className="owner-button">Открыть технические сигналы</Link>
                  </div>
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
