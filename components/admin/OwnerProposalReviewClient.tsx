'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

type ProposalKind = 'QUERY_CLUSTER' | 'PAGE_OWNERSHIP' | 'INDEXABILITY';

type Props = {
  proposalKind: ProposalKind;
  proposalId: string;
  expectedStatus: string;
  title: string;
  summary: string;
  enabled: boolean;
  blockers: string[];
};

function kindLabel(kind: ProposalKind) {
  if (kind === 'QUERY_CLUSTER') return 'Группа запросов';
  if (kind === 'PAGE_OWNERSHIP') return 'Ответственность страницы';
  return 'Допуск к индексации';
}

export function OwnerProposalReviewClient({
  proposalKind,
  proposalId,
  expectedStatus,
  title,
  summary,
  enabled,
  blockers,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setDecision(null);
    setNote('');
    setError(null);
  }, [busy]);

  useOwnerDrawerA11y({ open, dialogRef, triggerRef, initialFocusRef: closeRef, close });

  async function submit() {
    if (!decision || note.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/company/proposal-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_kind: proposalKind,
          proposal_id: proposalId,
          expected_status: expectedStatus,
          decision,
          review_note: note.trim(),
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Не удалось записать проверку.');

      setMessage(payload?.message || 'Проверка записана.');
      setDecision(null);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать проверку.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Проверить</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть проверку предложения" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`proposal-review-${proposalId}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>{kindLabel(proposalKind)}</div>
                <h2 id={`proposal-review-${proposalId}`} className="m-0 text-[20px] leading-snug">{title}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className="owner-card is-info">
                <div className="owner-status is-info">Предложение, не каноническое состояние</div>
                <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Что предлагается</h3>
                <p className="owner-card-copy">{summary}</p>
              </section>

              {!enabled ? (
                <section className="owner-card is-warning">
                  <div className="owner-status is-warning">Запись проверки заблокирована</div>
                  <p className="owner-card-copy">Protected UI уже подготовлен, но останется read-only до завершения owner-auth cutover и включения отдельного owner-actions switch.</p>
                  {blockers.length ? <ul className="owner-action-blockers">{blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                  <div className="owner-actions"><Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link></div>
                </section>
              ) : (
                <section className="owner-card owner-decision-action-panel">
                  <div className="owner-section-kicker">Human review</div>
                  {!decision ? (
                    <>
                      <p className="owner-card-copy">Одобрение означает только «предложение проверено человеком». Каноническое применение выполняется отдельным action с собственными guardrails.</p>
                      <div className="owner-actions">
                        <button type="button" className="owner-button primary" onClick={() => setDecision('APPROVED')}>Одобрить предложение</button>
                        <button type="button" className="owner-button is-danger" onClick={() => setDecision('REJECTED')}>Отклонить</button>
                      </div>
                    </>
                  ) : (
                    <div className="owner-decision-preview">
                      <div className="owner-section-kicker">Предпросмотр записи</div>
                      <strong>{decision === 'APPROVED' ? 'Одобрить предложение' : 'Отклонить предложение'}</strong>
                      <p>
                        Текущий статус: <b>{expectedStatus}</b> → после записи: <b>{decision}</b>.<br />
                        Это не применит proposal к канонической SEO-структуре.
                      </p>
                      <label className="owner-decision-reason">
                        <span>Почему</span>
                        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1500} rows={4} placeholder="Коротко зафиксируйте причину решения." />
                      </label>
                      <div className="owner-actions">
                        <button type="button" className="owner-button primary" disabled={busy || note.trim().length < 3} onClick={submit}>{busy ? 'Записываю…' : 'Подтвердить запись'}</button>
                        <button type="button" className="owner-button" disabled={busy} onClick={() => { setDecision(null); setNote(''); }}>Назад</button>
                      </div>
                    </div>
                  )}

                  {message ? <p className="owner-action-message is-success">{message}</p> : null}
                  {error ? <p className="owner-action-message is-danger">{error}</p> : null}
                </section>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
