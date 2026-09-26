'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {CheckCircle2,Palette} from 'lucide-react';

type State={
  execution?:{execution_request_id:string;request_status?:string};
  evidence?:{
    product_count:number;price_rows:number;color_axis_rows:number;target_aligned_rows:number;
    target_create_rows:number;strict_ready_rows:number;evidence_sha256:string;
  };
};

export function AdminColorPriceGovernanceClient(){
  const router=useRouter();
  const[state,setState]=useState<State|null>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  async function prepare(){
    setBusy(true);setMessage('Проверяю exact source color-price evidence и зависимость от structural repair…');
    try{
      const r=await fetch('/api/admin/review/prices/color-price-governance',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'}),
      });
      const p=await r.json();
      if(!r.ok)throw new Error(p?.code||'Color-price governance request не подготовлен.');
      if(p.state==='already_ready'){setState(null);setMessage('Color-price lane уже полностью quote-ready.');router.refresh();return;}
      setState({execution:p.execution,evidence:p.evidence});
      setMessage('Exact scope: '+p.evidence.product_count+' товара · '+p.evidence.price_rows+' color-price rows · '+p.evidence.target_create_rows+' новых price-scope identities. Commercial values не меняются.');
    }catch(e){setMessage(e instanceof Error?e.message:'Color-price governance request не подготовлен.');}
    finally{setBusy(false);}
  }

  async function approveAndExecute(){
    if(!state?.execution?.execution_request_id||!state.evidence)return;
    setBusy(true);setMessage('Записываю exact Human Owner approval…');
    try{
      const reason='Подтверждаю exact color-price exception lane: 3 товара / 9 source-observed color prices; evidence '+state.evidence.evidence_sha256.slice(0,16)+'. Не менять суммы/currency; не создавать Cartesian variants.';
      const approval=await fetch('/api/admin/review/prices/color-price-governance/approval',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({execution_request_id:state.execution.execution_request_id,expected_status:'APPROVAL_REQUIRED',reason,idempotency_key:crypto.randomUUID()}),
      });
      const ap=await approval.json();
      if(!approval.ok&&ap?.code!=='stale_execution_state')throw new Error(ap?.error||ap?.code||'Approval failed.');

      setMessage('Approval записан. Выполняю exact color-price governance…');
      const execution=await fetch('/api/admin/review/prices/color-price-governance',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'execute',execution_request_id:state.execution.execution_request_id}),
      });
      const xp=await execution.json();
      if(!execution.ok)throw new Error(xp?.code||'Execution failed.');
      setState(null);
      setMessage('Готово: 9/9 color-price rows quote-ready, '+xp.result.created_configurations+' identities созданы, '+xp.result.rebound_price_rows+' bindings исправлены. Суммы не менялись; payment/indexing OFF.');
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:'Color-price governance не выполнен.');}
    finally{setBusy(false);}
  }

  return <div className="mt-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-bone text-[14px]">3 products · exact color-price exception lane</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">
          Source evidence содержит разные цены для Black / Green / Brown. Эти три товара являются подтверждённым исключением
          из default price-neutral color rule. Каждая source price row сохраняет свой ID и сумму; будущий variant обязан
          связать её с соответствующим color attribute без Cartesian expansion.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={prepare} disabled={busy} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50">
          <Palette size={13}/>1. Подготовить exact lane
        </button>
        <button type="button" onClick={approveAndExecute} disabled={busy||!state?.execution} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-40">
          <CheckCircle2 size={13}/>2. Подтвердить и применить
        </button>
      </div>
    </div>
    {state?.evidence?<div className="mt-3 text-[11px] text-[var(--gold-warm)]">
      Evidence: {state.evidence.product_count} products · {state.evidence.price_rows} prices · {state.evidence.target_aligned_rows} already aligned · {state.evidence.target_create_rows} new identities · ready {state.evidence.strict_ready_rows}/9 · {state.evidence.evidence_sha256.slice(0,16)}…
    </div>:null}
    {message?<div className="mt-2 text-[11px] leading-relaxed text-[var(--gold-warm)]">{message}</div>:null}
  </div>;
}
