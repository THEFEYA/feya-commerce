'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

type Props = {
  cleanupId: number;
  expectedStatus: string;
  keyword: string;
  suggestedKeyword?: string | null;
  recommendation?: string | null;
  recommendationReason?: string | null;
  riskLabel: string;
  enabled: boolean;
  blockers: string[];
};

export function OwnerKeywordReviewClient({
  cleanupId,
  expectedStatus,
  keyword,
  suggestedKeyword,
  recommendation,
  recommendationReason,
  riskLabel,
  enabled,
  blockers,
}: Props) {
  const router = useRouter();
  const [open,setOpen]=useState(false);
  const [decision,setDecision]=useState<'approved'|'rejected'|'needs_review'|null>(null);
  const [approvedKeyword,setApprovedKeyword]=useState(suggestedKeyword || keyword);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const close=useCallback(()=>{if(!busy){setOpen(false);setDecision(null);setReason('');setError(null)}},[busy]);

  useOwnerDrawerA11y({open,dialogRef,triggerRef,initialFocusRef:closeRef,close});

  async function submit(){
    if(!decision || busy || reason.trim().length<3) return;
    if(decision==='approved' && !approvedKeyword.trim()) return;
    setBusy(true);setError(null);setMessage(null);
    try{
      const response=await fetch('/api/admin/company/keyword-review',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          cleanup_id:cleanupId,
          expected_review_status:expectedStatus,
          decision,
          approved_keyword:decision==='approved'?approvedKeyword.trim():null,
          reason:reason.trim(),
          idempotency_key:crypto.randomUUID(),
        }),
      });
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error || 'Не удалось записать решение.');
      setMessage(payload?.message || 'Решение записано.');
      setDecision(null);setReason('');
      router.refresh();
    }catch(err){
      setError(err instanceof Error?err.message:'Не удалось записать решение.');
    }finally{
      setBusy(false);
    }
  }

  return <>
    <button ref={triggerRef} type="button" className="owner-button" onClick={()=>setOpen(true)}>Проверить</button>
    {open?<div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть проверку ключа" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`keyword-review-${cleanupId}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div><div className="owner-eyebrow" style={{marginBottom:'5px'}}>Human keyword review</div><h2 id={`keyword-review-${cleanupId}`} className="m-0 text-[20px] leading-snug">{keyword}</h2></div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>
        <div className="owner-drawer-body space-y-4 p-5">
          <section className="owner-card is-info">
            <div className="owner-card-meta"><span className="owner-status is-info">Сложность: {riskLabel}</span><span>статус: {expectedStatus}</span></div>
            <h3 className="owner-card-title">Независимая рекомендация</h3>
            <p className="owner-card-copy">{recommendation || 'Рекомендация не запускалась.'}</p>
            {suggestedKeyword?<p className="owner-card-copy"><strong>Предлагаемый вариант:</strong> {suggestedKeyword}</p>:null}
            {recommendationReason?<p className="owner-card-copy">{recommendationReason}</p>:null}
          </section>

          {!enabled?<section className="owner-card is-warning">
            <div className="owner-status is-warning">Human review заблокирован</div>
            <p className="owner-card-copy">Protected review path уже подготовлен, но останется read-only до owner-auth cutover и отдельного owner-actions switch.</p>
            {blockers.length?<ul className="owner-action-blockers">{blockers.map(x=><li key={x}>{x}</li>)}</ul>:null}
            <div className="owner-actions"><Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link></div>
          </section>:<section className="owner-card owner-decision-action-panel">
            {!decision?<>
              <div className="owner-section-kicker">Ваше решение</div>
              <p className="owner-card-copy">Решение меняет только human review status ключа. Оно не создаёт кластер, страницу или публикацию автоматически.</p>
              <div className="owner-actions">
                <button type="button" className="owner-button primary" onClick={()=>setDecision('approved')}>Одобрить</button>
                <button type="button" className="owner-button is-danger" onClick={()=>setDecision('rejected')}>Отклонить</button>
                <button type="button" className="owner-button" onClick={()=>setDecision('needs_review')}>Нужна доп. проверка</button>
              </div>
            </>:<div className="owner-decision-preview">
              <div className="owner-section-kicker">Предпросмотр решения</div>
              <strong>{decision==='approved'?'Одобрить ключ':decision==='rejected'?'Отклонить ключ':'Оставить на дополнительной проверке'}</strong>
              {decision==='approved'?<label className="owner-decision-reason">
                <span>Утверждённый ключ</span>
                <textarea rows={2} maxLength={240} value={approvedKeyword} onChange={e=>setApprovedKeyword(e.target.value)}/>
              </label>:null}
              <label className="owner-decision-reason">
                <span>Почему</span>
                <textarea rows={4} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Коротко зафиксируйте причину решения."/>
              </label>
              <div className="owner-actions">
                <button type="button" className="owner-button primary" disabled={busy||reason.trim().length<3||(decision==='approved'&&!approvedKeyword.trim())} onClick={submit}>{busy?'Записываю…':'Подтвердить запись'}</button>
                <button type="button" className="owner-button" disabled={busy} onClick={()=>{setDecision(null);setReason('')}}>Назад</button>
              </div>
            </div>}
            {message?<p className="owner-action-message is-success">{message}</p>:null}
            {error?<p className="owner-action-message is-danger">{error}</p>:null}
          </section>}
        </div>
      </aside>
    </div>:null}
  </>;
}
