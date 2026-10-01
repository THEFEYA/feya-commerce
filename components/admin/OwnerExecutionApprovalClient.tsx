'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  executionRequestId: string;
  title: string;
  enabled: boolean;
  blockers: string[];
};

export function OwnerExecutionApprovalClient({
  executionRequestId,
  title,
  enabled,
  blockers,
}: Props) {
  const router = useRouter();
  const [confirming,setConfirming]=useState(false);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  if (!enabled) {
    return (
      <section className="owner-card is-warning owner-protected-inline">
        <div className="owner-status is-warning">Approval path подготовлен, но заблокирован</div>
        <p className="owner-card-copy">Одобрение Execution Request доступно только после owner-auth cutover и включения owner-actions switch.</p>
        {blockers.length ? <ul className="owner-action-blockers">{blockers.map(x=><li key={x}>{x}</li>)}</ul> : null}
        <div className="owner-actions"><Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link></div>
      </section>
    );
  }

  async function submit(){
    if(busy || reason.trim().length<3) return;
    setBusy(true); setError(null); setMessage(null);
    try{
      const response=await fetch('/api/admin/company/execution-approval',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          execution_request_id:executionRequestId,
          expected_status:'APPROVAL_REQUIRED',
          reason:reason.trim(),
          idempotency_key:crypto.randomUUID(),
        }),
      });
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error || 'Не удалось одобрить выполнение.');
      setMessage(payload?.message || 'Одобрение записано.');
      setConfirming(false); setReason('');
      router.refresh();
    }catch(err){
      setError(err instanceof Error ? err.message : 'Не удалось одобрить выполнение.');
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="owner-card owner-decision-action-panel owner-protected-inline">
      <div className="owner-status is-warning">Human approval required</div>
      <h3 className="owner-card-title" style={{marginTop:'10px'}}>Одобрить запрос выполнения</h3>
      <p className="owner-card-copy">Запрос: {title}. Approval зафиксирует hash текущего запроса, но не запускает dispatcher и не считается execution receipt.</p>
      {!confirming ? <div className="owner-actions">
        <button type="button" className="owner-button primary" onClick={()=>setConfirming(true)}>Рассмотреть одобрение</button>
      </div> : <div className="owner-decision-preview">
        <div className="owner-section-kicker">Предпросмотр одобрения</div>
        <strong>APPROVAL_REQUIRED → APPROVED</strong>
        <p>После записи запрос сможет перейти к исполнителю только если отдельный dispatcher/capability реально доступен.</p>
        <label className="owner-decision-reason">
          <span>Почему одобряем</span>
          <textarea rows={4} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Коротко зафиксируйте причину одобрения."/>
        </label>
        <div className="owner-actions">
          <button type="button" className="owner-button primary" disabled={busy||reason.trim().length<3} onClick={submit}>{busy?'Записываю…':'Подтвердить одобрение'}</button>
          <button type="button" className="owner-button" disabled={busy} onClick={()=>{setConfirming(false);setReason('')}}>Отмена</button>
        </div>
      </div>}
      {message?<p className="owner-action-message is-success">{message}</p>:null}
      {error?<p className="owner-action-message is-danger">{error}</p>:null}
    </section>
  );
}
