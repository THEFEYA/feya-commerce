'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, SplitSquareVertical } from 'lucide-react';

type Prepared={
  execution_request_id:string;
  request_status:string;
  request_hash:string;
};
type State={
  execution?:Prepared;
  evidence?:{price_rows:number;configuration_rows:number;evidence_sha256:string};
};

export function AdminManualConfigurationRepairClient({productCount}:{productCount:number}){
  const router=useRouter();
  const [state,setState]=useState<State|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function prepare(){
    setBusy(true);setMessage('Проверяю exact configuration evidence…');
    try{
      const response=await fetch('/api/admin/review/prices/manual-configuration-repair',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.code||'Не удалось подготовить repair request.');
      setState({execution:payload.execution,evidence:payload.evidence});
      setMessage(`Подготовлено: ${payload.evidence.price_rows} price rows · ${payload.evidence.configuration_rows} текущих configuration identities. Данные ещё не изменены.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Не удалось подготовить repair request.');}
    finally{setBusy(false);}
  }

  async function approveAndExecute(){
    if(!state?.execution?.execution_request_id||!state.evidence)return;
    setBusy(true);setMessage('Записываю human approval для structural repair…');
    try{
      const reason=`Подтверждаю exact configuration identity repair двух manual-lane товаров; 6 price rows; evidence ${state.evidence.evidence_sha256.slice(0,16)}. Суммы цен не меняются.`;
      const approval=await fetch('/api/admin/review/prices/manual-configuration-repair/approval',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          execution_request_id:state.execution.execution_request_id,
          expected_status:'APPROVAL_REQUIRED',
          reason,
          idempotency_key:crypto.randomUUID(),
        }),
      });
      const approved=await approval.json();
      if(!approval.ok&&approved?.code!=='stale_execution_state')throw new Error(approved?.error||approved?.code||'Approval failed.');

      setMessage('Approval записан. Выполняю exact structural repair…');
      const execution=await fetch('/api/admin/review/prices/manual-configuration-repair',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'execute',execution_request_id:state.execution.execution_request_id}),
      });
      const result=await execution.json();
      if(!execution.ok)throw new Error(result?.code||'Execution failed.');
      setState(null);
      setMessage(`Готово: ${result.result.price_rows} price rows разведены по ${result.result.configuration_rows_after} configuration identities. Price amounts не менялись.`);
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Structural repair не выполнен.');}
    finally{setBusy(false);}
  }

  if(productCount<1)return null;

  return <div id="manual-configuration-repair" className="mt-4 rounded-xl border border-[rgba(216,214,211,.12)] bg-black/15 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-bone text-[14px]">Manual lane · structural configuration repair</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">
          {productCount} товара с owner/manual price evidence. Repair разделяет option identities; суммы, currency и price review state не меняются.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={prepare} disabled={busy} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50">
          <SplitSquareVertical size={13}/>1. Подготовить repair
        </button>
        <button type="button" onClick={approveAndExecute} disabled={busy||!state?.execution} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-40">
          <CheckCircle2 size={13}/>2. Подтвердить и применить
        </button>
      </div>
    </div>
    {state?.evidence?<div className="mt-3 text-[11px] text-[var(--gold-warm)]">
      Exact evidence: {state.evidence.price_rows} price rows · {state.evidence.configuration_rows} current configurations · {state.evidence.evidence_sha256.slice(0,16)}…
    </div>:null}
    {message?<div className="mt-2 text-[11px] leading-relaxed text-[var(--gold-warm)]">{message}</div>:null}
  </div>;
}
