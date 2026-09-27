'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {CheckCircle2,GitBranch} from 'lucide-react';

type State={
  execution?:{execution_request_id:string;request_status?:string};
  evidence?:{
    release_product_count:number;price_row_count:number;configuration_axis_rows:number;
    rebind_rows:number;create_configuration_rows:number;color_price_axis_rows:number;
    evidence_sha256:string;
  };
};

export function AdminReleaseConfigurationRepairClient(){
  const router=useRouter();
  const[state,setState]=useState<State|null>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  async function prepare(){
    setBusy(true);setMessage('Проверяю весь release на точное соответствие price row → configuration identity…');
    try{
      const r=await fetch('/api/admin/review/prices/release-configuration-repair',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'}),
      });
      const p=await r.json();
      if(!r.ok)throw new Error(p?.code||'Release repair request не подготовлен.');
      if(p.state==='already_repaired'){setState(null);setMessage('Release configuration identities уже выровнены.');router.refresh();return;}
      setState({execution:p.execution,evidence:p.evidence});
      setMessage('Exact scope: '+p.evidence.release_product_count+' товаров · '+p.evidence.rebind_rows+' rebinding rows · '+p.evidence.create_configuration_rows+' новых identities. Цены не меняются.');
    }catch(e){setMessage(e instanceof Error?e.message:'Release repair request не подготовлен.');}
    finally{setBusy(false);}
  }

  async function approveAndExecute(){
    if(!state?.execution?.execution_request_id||!state.evidence)return;
    setBusy(true);setMessage('Записываю exact Human Owner approval…');
    try{
      const reason='Подтверждаю catalog-wide configuration identity repair: '+state.evidence.rebind_rows+' configuration-axis price rows; evidence '+state.evidence.evidence_sha256.slice(0,16)+'. Price/currency/manual overrides не менять.';
      const approval=await fetch('/api/admin/review/prices/release-configuration-repair/approval',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({execution_request_id:state.execution.execution_request_id,expected_status:'APPROVAL_REQUIRED',reason,idempotency_key:crypto.randomUUID()}),
      });
      const ap=await approval.json();
      if(!approval.ok&&ap?.code!=='stale_execution_state')throw new Error(ap?.error||ap?.code||'Approval failed.');

      setMessage('Approval записан. Выполняю atomic structural repair…');
      const execution=await fetch('/api/admin/review/prices/release-configuration-repair',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'execute',execution_request_id:state.execution.execution_request_id}),
      });
      const xp=await execution.json();
      if(!execution.ok)throw new Error(xp?.code||'Execution failed.');
      setState(null);
      setMessage('Готово: '+xp.result.rebound_price_rows+' rows перепривязаны, '+xp.result.created_configurations+' configuration identities созданы. Commercial values unchanged; 9 color-price rows остаются отдельным HOLD.');
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:'Structural repair не выполнен.');}
    finally{setBusy(false);}
  }

  return <div id="release-configuration-repair" className="mt-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-bone text-[14px]">Release 207 · configuration identity repair</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">
          Полный аудит обнаружил 631 configuration-axis price rows, привязанных к чужой sellable configuration identity.
          Repair создаёт точные identities и меняет только binding. Price amounts, currency и owner overrides не меняются.
          Три товара с реальной color-price осью остаются отдельным HOLD и не маскируются под configuration.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={prepare} disabled={busy} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50">
          <GitBranch size={13}/>1. Подготовить exact repair
        </button>
        <button type="button" onClick={approveAndExecute} disabled={busy||!state?.execution} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-40">
          <CheckCircle2 size={13}/>2. Подтвердить и применить
        </button>
      </div>
    </div>
    {state?.evidence?<div className="mt-3 text-[11px] text-[var(--gold-warm)]">
      Evidence: {state.evidence.release_product_count} products · {state.evidence.price_row_count} prices · {state.evidence.configuration_axis_rows} configuration-axis · {state.evidence.rebind_rows} rebind · {state.evidence.color_price_axis_rows} color HOLD · {state.evidence.evidence_sha256.slice(0,16)}…
    </div>:null}
    {message?<div className="mt-2 text-[11px] leading-relaxed text-[var(--gold-warm)]">{message}</div>:null}
  </div>;
}
