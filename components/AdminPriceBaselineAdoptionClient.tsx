'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

type Prepared={
  execution_request_id:string;
  request_status:string;
  request_hash:string;
};
type State={
  release_ref?:string;
  preview?:{candidate_product_count:number;candidate_price_row_count:number;evidence_sha256:string};
  execution?:Prepared;
};

export function AdminPriceBaselineAdoptionClient({preparedCount}:{preparedCount:number}){
  const router=useRouter();
  const [state,setState]=useState<State|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function prepare(){
    setBusy(true);setMessage('Пересчитываю exact evidence…');
    try{
      const response=await fetch('/api/admin/review/prices/baseline-adoption',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.code||'Не удалось подготовить batch.');
      if(payload.state==='already_adopted'){setState(null);setMessage('Baseline уже подтверждён для clean-source lane.');router.refresh();return;}
      setState({release_ref:payload.release_ref,preview:payload.preview,execution:payload.execution});
      setMessage(`Exact batch: ${payload.preview.candidate_product_count} товаров / ${payload.preview.candidate_price_row_count} цен. Ничего ещё не изменено.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Не удалось подготовить batch.');}
    finally{setBusy(false);}
  }

  async function approveAndApply(){
    if(!state?.execution?.execution_request_id||!state.preview)return;
    setBusy(true);setMessage('Записываю human approval…');
    try{
      const reason=`Подтверждаю unchanged source-price baseline: ${state.preview.candidate_product_count} товаров / ${state.preview.candidate_price_row_count} цен; evidence ${state.preview.evidence_sha256.slice(0,16)}.`;
      const approval=await fetch('/api/admin/company/execution-approval',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          execution_request_id:state.execution.execution_request_id,
          expected_status:'APPROVAL_REQUIRED',reason,idempotency_key:crypto.randomUUID(),
        }),
      });
      const approved=await approval.json();
      if(!approval.ok&&approved?.code!=='stale_execution_state')throw new Error(approved?.error||approved?.code||'Approval failed.');

      setMessage('Approval записан. Выполняю exact baseline adoption…');
      const execution=await fetch('/api/admin/review/prices/baseline-adoption',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'execute',execution_request_id:state.execution.execution_request_id}),
      });
      const result=await execution.json();
      if(!execution.ok)throw new Error(result?.code||'Execution failed.');
      setState(null);
      setMessage(`Готово: ${result.result.product_count} товаров / ${result.result.updated_price_rows} цен подтверждены. Payment и indexing остались OFF.`);
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Не удалось применить baseline.');}
    finally{setBusy(false);}
  }

  return <div className="mt-5 rounded-xl border border-[rgba(212,178,106,.22)] bg-black/15 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-bone text-[14px]">Owner batch review · {preparedCount} clean-source товаров</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">
          Шаг 1 пересчитывает evidence без записи. Шаг 2 фиксирует human approval в Execution Gateway и только затем меняет governance statuses. Manual overrides исключены.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={prepare} disabled={busy} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50">
          <ShieldAlert size={13}/>{busy&&!state?'Проверяю…':'1. Подготовить exact batch'}
        </button>
        <button type="button" onClick={approveAndApply} disabled={busy||!state?.execution} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-40">
          <CheckCircle2 size={13}/>2. Подтвердить и применить
        </button>
      </div>
    </div>
    {state?.preview?<div className="mt-3 text-[11px] text-[var(--gold-warm)]">
      Подготовлено: {state.preview.candidate_product_count} товаров · {state.preview.candidate_price_row_count} цен · evidence {state.preview.evidence_sha256.slice(0,16)}…
    </div>:null}
    {message?<div className="mt-2 text-[11px] leading-relaxed text-[var(--gold-warm)]">{message}</div>:null}
  </div>;
}
