'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const REASON =
  'Принимаю внутреннюю L0-сверку TSEO как основание для TRIAGED. '+
  'Независимая QA, индексация Google и коммерческий результат этим действием не подтверждаются.';

export function OwnerCaseTriageClient({
  caseId, expectedEpoch, lastCaseEventId,
}:{
  caseId: string;
  expectedEpoch: number;
  lastCaseEventId: string;
}) {
  const router=useRouter();
  const requestId=useRef<string|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function submit() {
    if (!confirmed||busy||done) return;
    if (!requestId.current) requestId.current=crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const response=await fetch('/api/admin/company/work/owner-case-triage',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({
          action:'TRIAGE_TSEO_L0_V1',
          case_id:caseId,
          expected_case_event_id:lastCaseEventId,
          expected_status:'OPEN',
          expected_ownership_epoch:expectedEpoch,
          reason:REASON,
          request_id:requestId.current,
          confirm_l0_limits:true,
        }),
      });
      const result=await response.json() as {
        ok?:boolean;code?:string;message?:string;case_status?:string;
      };
      if (!response.ok||result.ok!==true||result.case_status!=='TRIAGED')
        throw new Error(result.code||'case_triage_not_verified');
      setDone(true);
      requestId.current=null;
      router.refresh();
    } catch (cause) {
      // Reuse EXACT intent and request_id if the network failed after commit.
      setError(cause instanceof Error?cause.message:'Не удалось проверить запись.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="owner-card" aria-label="Решение владельца: этап TRIAGED">
    <div className="owner-status is-info">Решение владельца · G2b</div>
    <h2 className="owner-card-title">Принять технический кейс к дальнейшей проверке</h2>
    <p className="owner-card-copy">
      Переводит только текущий кейс из OPEN в TRIAGED и записывает ваше решение в историю.
      Не исправляет сайт, не закрывает кейс, не запускает AI-модель и не считает изменения успешными.
    </p>
    {done ? (
      <p className="owner-card-copy" role="status">
        Переход подтверждён журналом. Перезагружаем актуальный маршрут кейса.
      </p>
    ) : (
      <>
        <label className="owner-card-copy" style={{display:'flex',alignItems:'flex-start',gap:'9px'}}>
          <input
            type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}
            disabled={busy} style={{marginTop:'3px'}}
          />
          <span>
            Я подтверждаю, что это только внутренняя L0-сверка.
            Индексация Google, независимая экспертиза и рост продаж не доказаны.
          </span>
        </label>
        <div className="owner-actions" style={{marginTop:'12px'}}>
          <button
            type="button" className="owner-button primary"
            disabled={!confirmed||busy} onClick={submit}
          >
            {busy?'Проверка и запись…':'Подтвердить переход в TRIAGED'}
          </button>
        </div>
      </>
    )}
    {error ? <p className="owner-action-message is-warning" role="status">
      Действие не подтверждено: {error}. Проверьте актуальный статус кейса.
      При повторе используется тот же идентификатор, дубликат не создаётся.
    </p> : null}
  </section>;
}
