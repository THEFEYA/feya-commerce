'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

type Props = {
  proposalKind: 'PAGE_OWNERSHIP' | 'INDEXABILITY';
  proposalId: string;
  title: string;
  consequence: string;
  enabled: boolean;
  blockers: string[];
};

function label(kind: Props['proposalKind']) {
  return kind === 'PAGE_OWNERSHIP' ? 'Применить ownership' : 'Применить решение индексации';
}

export function OwnerProposalApplyClient({
  proposalKind,
  proposalId,
  title,
  consequence,
  enabled,
  blockers,
}: Props) {
  const router = useRouter();
  const [open,setOpen]=useState(false);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const close=useCallback(()=>{ if(!busy){ setOpen(false); setReason(''); setError(null); } },[busy]);
  useOwnerDrawerA11y({open,dialogRef,triggerRef,initialFocusRef:closeRef,close});

  async function submit(){
    if(busy || reason.trim().length<3) return;
    setBusy(true); setError(null); setMessage(null);
    try{
      const response=await fetch('/api/admin/company/proposal-apply',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          proposal_kind:proposalKind,
          proposal_id:proposalId,
          expected_status:'APPROVED',
          reason:reason.trim(),
          idempotency_key:crypto.randomUUID(),
        }),
      });
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error || 'Не удалось применить предложение.');
      setMessage(payload?.message || 'Предложение применено.');
      setReason('');
      router.refresh();
    }catch(err){
      setError(err instanceof Error ? err.message : 'Не удалось применить предложение.');
    }finally{
      setBusy(false);
    }
  }

  return <>
    <button ref={triggerRef} type="button" className="owner-button primary" onClick={()=>setOpen(true)}>{label(proposalKind)}</button>
    {open?<div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть применение" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`proposal-apply-${proposalId}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div><div className="owner-eyebrow" style={{marginBottom:'5px'}}>Каноническое применение</div><h2 id={`proposal-apply-${proposalId}`} className="m-0 text-[20px] leading-snug">{title}</h2></div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>
        <div className="owner-drawer-body space-y-4 p-5">
          <section className="owner-card is-warning">
            <div className="owner-status is-warning">APPROVED ≠ APPLIED</div>
            <p className="owner-card-copy">{consequence}</p>
          </section>

          {!enabled ? <section className="owner-card is-warning">
            <div className="owner-status is-warning">Применение заблокировано</div>
            <p className="owner-card-copy">Канонический apply path подготовлен, но остаётся выключенным до owner-auth cutover и отдельного owner-actions switch.</p>
            {blockers.length?<ul className="owner-action-blockers">{blockers.map(x=><li key={x}>{x}</li>)}</ul>:null}
            <div className="owner-actions"><Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link></div>
          </section>:<section className="owner-card owner-decision-action-panel">
            <div className="owner-section-kicker">Предпросмотр применения</div>
            <p className="owner-card-copy">После подтверждения будет изменено каноническое внутреннее SEO-состояние. Это не равно storefront publication и не запускает внешний deployment.</p>
            <label className="owner-decision-reason">
              <span>Почему применяем</span>
              <textarea rows={4} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Коротко зафиксируйте причину канонического применения."/>
            </label>
            <div className="owner-actions">
              <button type="button" className="owner-button primary" disabled={busy||reason.trim().length<3} onClick={submit}>{busy?'Применяю…':'Подтвердить применение'}</button>
              <button type="button" className="owner-button" disabled={busy} onClick={close}>Отмена</button>
            </div>
            {message?<p className="owner-action-message is-success">{message}</p>:null}
            {error?<p className="owner-action-message is-danger">{error}</p>:null}
          </section>}
        </div>
      </aside>
    </div>:null}
  </>;
}
