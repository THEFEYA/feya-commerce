'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  draftId: string;
  expectedReviewStatus: string;
  title: string;
  enabled: boolean;
  blockers: string[];
};

export function OwnerScoDraftReviewClient({
  draftId,
  expectedReviewStatus,
  title,
  enabled,
  blockers,
}: Props) {
  const router=useRouter();
  const [decision,setDecision]=useState<'approved'|'changes_requested'|'rejected'|null>(null);
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  if(!enabled){
    return <section className="owner-card is-warning owner-protected-inline">
      <div className="owner-status is-warning">Human review path подготовлен, но заблокирован</div>
      <p className="owner-card-copy">Черновик можно просматривать, но решение человека не будет записано до owner-auth cutover и включения owner-actions switch.</p>
      {blockers.length?<ul className="owner-action-blockers">{blockers.map(x=><li key={x}>{x}</li>)}</ul>:null}
      <div className="owner-actions"><Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link></div>
    </section>;
  }

  async function submit(){
    if(!decision || busy || note.trim().length<3) return;
    setBusy(true);setError(null);setMessage(null);
    try{
      const response=await fetch('/api/admin/company/content-review',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          draft_id:draftId,
          expected_review_status:expectedReviewStatus,
          decision,
          note:note.trim(),
          idempotency_key:crypto.randomUUID(),
        }),
      });
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error || 'Не удалось записать Human review.');
      setMessage(payload?.message || 'Решение записано.');
      setDecision(null);setNote('');
      router.refresh();
    }catch(err){
      setError(err instanceof Error?err.message:'Не удалось записать Human review.');
    }finally{setBusy(false)}
  }

  return <section className="owner-card owner-decision-action-panel owner-protected-inline">
    <div className="owner-status is-success">Human review</div>
    <h3 className="owner-card-title" style={{marginTop:'10px'}}>{title}</h3>
    <p className="owner-card-copy">Human approval и независимая CQA остаются разными этапами. Даже APPROVED здесь не означает публикацию.</p>

    {!decision?<div className="owner-actions">
      <button type="button" className="owner-button primary" onClick={()=>setDecision('approved')}>Одобрить черновик</button>
      <button type="button" className="owner-button" onClick={()=>setDecision('changes_requested')}>Запросить изменения</button>
      <button type="button" className="owner-button is-danger" onClick={()=>setDecision('rejected')}>Отклонить</button>
    </div>:<div className="owner-decision-preview">
      <div className="owner-section-kicker">Предпросмотр решения</div>
      <strong>{decision==='approved'?'Одобрить':decision==='changes_requested'?'Запросить изменения':'Отклонить'}</strong>
      <p>Сервер повторно проверит допустимость перехода. Для approve дополнительно должны пройти similarity, ALT truth, component truth и validation blockers.</p>
      <label className="owner-decision-reason">
        <span>Комментарий человека</span>
        <textarea rows={4} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Коротко зафиксируйте основание решения."/>
      </label>
      <div className="owner-actions">
        <button type="button" className="owner-button primary" disabled={busy||note.trim().length<3} onClick={submit}>{busy?'Записываю…':'Подтвердить запись'}</button>
        <button type="button" className="owner-button" disabled={busy} onClick={()=>{setDecision(null);setNote('')}}>Назад</button>
      </div>
    </div>}

    {message?<p className="owner-action-message is-success">{message}</p>:null}
    {error?<p className="owner-action-message is-danger">{error}</p>:null}
  </section>;
}
