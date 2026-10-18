'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  caseId: string;
  enabled: boolean;
  blockers: string[];
};
type Response = {
  ok?: boolean;
  attention_id?: string;
  message?: string;
  code?: string;
  status?: string;
};

/** This is an explicit HUMAN request, not the execution of an independent AI reviewer. */
export function OwnerShadowReviewRequestClient({ caseId, enabled, blockers }: Props) {
  const router=useRouter();
  const requestId=useRef<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Response|null>(null);
  const [error,setError]=useState<string|null>(null);

  async function submit() {
    if (!enabled||busy||result?.ok)return;
    if(!requestId.current)requestId.current=crypto.randomUUID();
    setBusy(true);
    setError(null);
    try{
      const response=await fetch('/api/admin/company/work/shadow-review-request',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({case_id:caseId,request_id:requestId.current}),
      });
      const data=await response.json() as Response;
      if(!response.ok||!data.ok||!data.attention_id) {
        throw new Error(data.code||'owner_review_request_failed');
      }
      setResult(data);
      requestId.current=null;
      router.refresh();
    }catch(e){
      setError(e instanceof Error?e.message:'Не удалось сохранить запрос. Повторите без создания дубликата.');
    }finally{
      setBusy(false);
    }
  }

  return(
    <section className="owner-card" aria-label="Следующий шаг Growth OS">
      <div className="owner-status is-info">Stage D · ручная независимая проверка</div>
      <h2 className="owner-card-title">Передать сохранённый результат на решение владельца</h2>
      <p className="owner-card-copy">
        Система сверит текущий ACTIVE Search Release, завершённый TSEO workflow и сохранённый GMEL L0 handoff,
        затем создаст одну запись Owner Attention. Это не запускает платную AI-модель, не закрывает кейс
        и не изменяет товары, индексацию или оплату.
      </p>
      {result?.ok && result.attention_id ? (
        <div className="owner-actions" role="status">
          <span className="owner-status is-success">Запрос зарегистрирован · кейс остаётся открытым</span>
          <Link className="owner-button primary" href={`/admin/company/owner-attention/${result.attention_id}`}>
            Открыть решение владельца
          </Link>
        </div>
      ) : enabled ? (
        <div className="owner-actions">
          <button type="button" className="owner-button primary" disabled={busy} onClick={submit}>
            {busy ? 'Проверка и запись…' : 'Запросить ручную проверку'}
          </button>
        </div>
      ) : (
        <p className="owner-card-copy">Действие закрыто до защищённой авторизации и флага Growth Shadow.
          {blockers.length ? ` ${blockers.join('; ')}.` : ''}
        </p>
      )}
      {error ? <p className="owner-action-message is-warning" role="status">
        Не удалось записать решение: {error}. Кейс не изменён; можно повторить.
      </p> : null}
    </section>
  );
}
