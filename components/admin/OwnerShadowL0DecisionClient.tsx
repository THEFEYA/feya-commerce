'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Decision='CONFIRM_INTERNAL_L0'|'REQUEST_INDEPENDENT_QA'|'ACKNOWLEDGE_FOR_LATER';
type Option={
  code:Decision;label:string;details:string;reason:string;
};
const options:Option[]=[
  {
    code:'CONFIRM_INTERNAL_L0',
    label:'Подтвердить внутреннюю L0-сверку',
    details:'Принимаю только правильность внутреннего Search Release; это НЕ независимый AI-аудит и НЕ подтверждение Google или продаж.',
    reason:'Подтверждаю внутреннюю техническую L0-сверку Search Release. Независимый AI-аудит, фактическая индексация Google и коммерческий результат не подтверждены.',
  },
  {
    code:'REQUEST_INDEPENDENT_QA',
    label:'Нужна отдельная независимая QA',
    details:'Записать необходимость дальнейшей проверки. Это не запустит AI-модель и не создаст фиктивный выполненный аудит.',
    reason:'Внутренней L0-сверки недостаточно. Требуется отдельно организованная независимая QA до завершения кейса.',
  },
  {
    code:'ACKNOWLEDGE_FOR_LATER',
    label:'Отложить решение',
    details:'Оставить решение открытым как принятое к рассмотрению, без каких-либо изменений в сайте.',
    reason:'',
  },
];

export function OwnerShadowL0DecisionClient({
  attentionId,currentStatus,enabled,blockers,
}:{
  attentionId:string;
  currentStatus:string;
  enabled:boolean;
  blockers:string[];
}) {
  const router=useRouter();
  const retryKey=useRef<string|null>(null);
  const [pending,setPending]=useState<Option|null>(null);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [done,setDone]=useState(false);

  const terminal=currentStatus==='RESOLVED'||currentStatus==='CANCELLED';
  if(terminal||done) {
    return <section className="owner-card" role="status">
      <div className="owner-status is-success">Решение зафиксировано</div>
      <h2 className="owner-card-title">Выбор владельца записан</h2>
      <p className="owner-card-copy">
        Запись решения не закрывает Growth Case и не запускает AI, SEO-публикацию или оплату.
      </p>
      <div className="owner-actions">
        <Link className="owner-button" href="/admin/company/work">Перейти к работе команды</Link>
      </div>
    </section>;
  }

  if(!enabled)return <section className="owner-card is-warning">
    <div className="owner-status is-warning">Защищённое решение пока недоступно</div>
    <h2 className="owner-card-title">Доступ не подтверждён</h2>
    <p className="owner-card-copy">
      Для этого отдельного L0-решения нужна авторизация владельца и режим Growth Shadow.
      Общий переключатель всех owner actions не требуется.
      {blockers.length ? ' '+blockers.join('; ')+'.' : ''}
    </p>
  </section>;

  async function submit() {
    if(!pending||busy)return;
    if(pending.code==='ACKNOWLEDGE_FOR_LATER'&&currentStatus!=='OPEN')return;
    if(pending.code!=='ACKNOWLEDGE_FOR_LATER'&&reason.trim().length<3)return;
    if(!retryKey.current)retryKey.current=crypto.randomUUID();
    setBusy(true);setError(null);
    try {
      const response=await fetch('/api/admin/company/owner-attention/shadow-l0-decision',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          attention_id:attentionId,
          expected_status:currentStatus,
          decision:pending.code,
          reason:pending.code==='ACKNOWLEDGE_FOR_LATER'?null:reason.trim(),
          request_id:retryKey.current,
        }),
      });
      const data=await response.json() as {ok?:boolean;code?:string;error?:string};
      if(!response.ok||data.ok!==true)throw new Error(data.code||data.error||'decision_failed');
      retryKey.current=null;
      setDone(true);
      setPending(null);
      router.refresh();
    } catch(err) {
      setError(err instanceof Error?err.message:'Решение не записано. Повторите.');
      // Keep the identical idempotency key for a safe retry.
    }finally{setBusy(false)}
  }

  const canConfirm=Boolean(pending&&!busy&&
    (pending.code==='ACKNOWLEDGE_FOR_LATER'||reason.trim().length>=3));
  return <section className="owner-card owner-decision-action-panel">
    <div className="owner-status is-info">Защищённое решение Growth OS · L0</div>
    <h2 className="owner-card-title">Выбрать дальнейший шаг</h2>
    <p className="owner-card-copy">
      Можно подтвердить лишь внутреннюю сверку или запросить отдельный аудит. Любое решение
      записывается в Owner Attention, но кейс останется открытым до отдельной проверки.
    </p>
    {!pending?(
      <div className="owner-actions">
        {options.filter(o=>o.code!=='ACKNOWLEDGE_FOR_LATER'||currentStatus==='OPEN').map(o=>
          <button type="button" key={o.code} className="owner-button"
            onClick={()=>{setPending(o);setReason(o.reason);setError(null);retryKey.current=null;}}>
            {o.label}
          </button>)}
      </div>
    ):(
      <div className="owner-decision-preview">
        <div className="owner-section-kicker">Подтверждение решения владельца</div>
        <h3>{pending.label}</h3>
        <p>{pending.details}</p>
        {pending.code!=='ACKNOWLEDGE_FOR_LATER'?(
          <label className="owner-decision-reason">
            <span>Причина решения (можно уточнить)</span>
            <textarea rows={3} value={reason} maxLength={500}
              onChange={e=>setReason(e.target.value)}/>
          </label>
        ):null}
        <div className="owner-actions">
          <button className="owner-button primary" type="button"
            disabled={!canConfirm} onClick={submit}>
            {busy?'Записываю…':'Подтвердить и записать'}
          </button>
          <button className="owner-button" type="button" disabled={busy}
            onClick={()=>{setPending(null);setReason('');setError(null);retryKey.current=null;}}>
            Отмена
          </button>
        </div>
      </div>
    )}
    {error?<p className="owner-action-message is-warning" role="status">
      Результат не подтверждён: {error}. Можно повторить без создания дубликата.
    </p>:null}
  </section>;
}
