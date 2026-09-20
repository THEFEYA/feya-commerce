'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ContentQaShadowRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function tone(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key.includes('BLOCK') || key.includes('FAIL') || key.includes('REJECT') || key.includes('REVISION')) return 'is-danger';
  if (key.includes('READY') || key === 'PASS' || key.includes('APPROVED') || key === 'CQA_RECORDED') return 'is-success';
  return 'is-warning';
}

function dateLabel(value: unknown) {
  if (!value) return 'не зафиксировано';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(d);
}

function nextStep(row: ContentQaShadowRow) {
  const state = String(row.cqa_shadow_state || '').toUpperCase();
  if (state === 'BLOCKED_BY_VALIDATION') return 'Исправить детерминированные блокеры. CQA не должна обходить валидатор.';
  if (state === 'REVISION_REQUIRED') return 'Вернуть черновик на исправление и повторить независимую проверку.';
  if (state === 'READY_FOR_HUMAN_AND_CQA_REVIEW') return 'Провести человеческую проверку и независимую CQA как два отдельных шага.';
  if (state === 'READY_FOR_INDEPENDENT_CQA') return 'Запустить независимую CQA. Сам факт готовности не является одобрением.';
  if (state === 'APPROVED_NEEDS_SIMILARITY_CHECK') return 'Завершить проверку сходства перед следующим допуском.';
  if (state.includes('COMPONENT_CLAIM')) return 'Проверить заявления о составе против Product Truth.';
  if (state === 'NEEDS_PRECHECKS') return 'Завершить автоматические предварительные проверки.';
  return 'Открыть текущий контекст и продолжить только по фактическому состоянию проверки.';
}

export function OwnerContentQaDrawerClient({ row }: { row: ContentQaShadowRow }) {
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useOwnerDrawerA11y({open,dialogRef,triggerRef,initialFocusRef:closeRef,close});

  const blockers = Number(row.approval_blocker_count||0)+Number(row.product_truth_blocker_count||0);

  return <>
    <button ref={triggerRef} type="button" className="owner-button" onClick={()=>setOpen(true)}>Подробнее</button>
    {open ? <div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть проверку контента" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`cqa-drawer-${row.draft_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div><div className="owner-eyebrow" style={{marginBottom:'5px'}}>Контроль качества</div><h2 id={`cqa-drawer-${row.draft_id}`} className="m-0 text-[20px] leading-snug">{asText(row.card_title,row.product_slug||'Черновик')}</h2></div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>
        <div className="owner-drawer-body space-y-4 p-5">
          <section className={`owner-card ${tone(row.cqa_shadow_state)}`}>
            <div className="owner-card-meta"><span className={`owner-status ${tone(row.cqa_shadow_state)}`}>{statusLabel(row.cqa_shadow_state)}</span><span>блокеров: {blockers}</span></div>
            <h3 className="owner-card-title">Следующий безопасный шаг</h3>
            <p className="owner-card-copy">{nextStep(row)}</p>
          </section>

          <section className="owner-card">
            <div className="owner-section-kicker">Проверки черновика</div>
            <div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Человек</span><strong>{statusLabel(row.human_review_status)}</strong></div>
              <div><span>Валидация</span><strong>{statusLabel(row.validation_status)}</strong></div>
              <div><span>Сходство</span><strong>{statusLabel(row.similarity_status)}</strong></div>
              <div><span>ALT truth</span><strong>{statusLabel(row.image_alt_truth_status)}</strong></div>
              <div><span>Состав</span><strong>{statusLabel(row.component_claim_truth_status)}</strong></div>
              <div><span>Независимая CQA</span><strong>{statusLabel(row.cqa_status)}</strong></div>
            </div>
          </section>

          <section className={`owner-card ${blockers ? 'is-warning':'is-info'}`}>
            <div className={`owner-status ${blockers ? 'is-warning':'is-info'}`}>{blockers ? 'Есть блокирующие факты':'Блокеры фактов не заявлены'}</div>
            <p className="owner-card-copy">Approval blockers: {row.approval_blocker_count||0}. Product Truth blockers: {row.product_truth_blocker_count||0}. Эти блокеры нельзя компенсировать более красивым текстом.</p>
          </section>

          <div className="owner-actions">
            <Link href={`/admin/products/${row.canonical_product_id}`} className="owner-button">Товар</Link>
            <Link href="/admin/content-briefs" className="owner-button">Контентное задание</Link>
          </div>

          <details className="owner-disclosure owner-disclosure-section">
            <summary><span><strong>Технические детали</strong><small>Версии контракта и источника</small></span><span className="owner-section-kicker">Advanced</span></summary>
            <div className="owner-disclosure-body owner-card-meta" style={{marginBottom:0}}>
              <span title={row.draft_id}>Draft ID</span>
              {row.pack_version ? <span title={row.pack_version}>Pack version</span>:null}
              {row.source_brief_version ? <span title={row.source_brief_version}>Brief version</span>:null}
              {row.output_contract_version ? <span title={row.output_contract_version}>Output contract</span>:null}
              {row.cqa_policy_version ? <span title={row.cqa_policy_version}>CQA policy</span>:null}
              <span>проверено: {dateLabel(row.cqa_reviewed_at)}</span>
              <span>обновлено: {dateLabel(row.updated_at)}</span>
            </div>
          </details>
        </div>
      </aside>
    </div>:null}
  </>;
}
