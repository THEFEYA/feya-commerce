'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {CheckCircle2,ShieldCheck} from 'lucide-react';
type State={execution?:{execution_request_id:string};evidence?:{price_rows:number;configuration_rows:number;strict_ready_rows:number;evidence_sha256:string}};
export function AdminManualPriceGovernanceClient({productCount}:{productCount:number}){
 const router=useRouter();const[state,setState]=useState<State|null>(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 async function prepare(){
  setBusy(true);setMessage('Проверяю post-repair governance evidence…');
  try{
   const r=await fetch('/api/admin/review/prices/manual-price-governance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'})});
   const p=await r.json();if(!r.ok)throw new Error(p?.code||'Governance request не подготовлен.');
   if(p.state==='already_ready'){setState(null);setMessage('Manual lane уже полностью quote-ready.');router.refresh();return}
   setState({execution:p.execution,evidence:p.evidence});
   setMessage(`Подготовлено: ${p.evidence.price_rows} цен / ${p.evidence.configuration_rows} конфигураций. Commercial values не меняются.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Governance request не подготовлен.')}finally{setBusy(false)}
 }
 async function approveAndExecute(){
  if(!state?.execution?.execution_request_id||!state.evidence)return;
  setBusy(true);setMessage('Записываю human approval…');
  try{
   const reason=`Подтверждаю exact post-repair governance двух manual-lane товаров; 6 price rows; evidence ${state.evidence.evidence_sha256.slice(0,16)}. Owner override prices сохранить без изменений.`;
   const a=await fetch('/api/admin/review/prices/manual-price-governance/approval',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({execution_request_id:state.execution.execution_request_id,expected_status:'APPROVAL_REQUIRED',reason,idempotency_key:crypto.randomUUID()})});
   const ap=await a.json();if(!a.ok&&ap?.code!=='stale_execution_state')throw new Error(ap?.error||ap?.code||'Approval failed.');
   setMessage('Approval записан. Выполняю governance adoption…');
   const x=await fetch('/api/admin/review/prices/manual-price-governance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'execute',execution_request_id:state.execution.execution_request_id})});
   const xp=await x.json();if(!x.ok)throw new Error(xp?.code||'Execution failed.');
   setState(null);setMessage(`Готово: strict quote-ready ${xp.result.strict_ready_rows}/6; manual overrides сохранены; payment/indexing OFF.`);router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'Governance adoption не выполнен.')}finally{setBusy(false)}
 }
 if(productCount<1)return null;
 return <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.12)] bg-black/15 p-4">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
   <div><div className="text-bone text-[14px]">Manual lane · final price governance</div><div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">Доступно только после structural repair: 6 truthful configuration identities → 6/6 quote-ready. Две owner prices остаются неизменными.</div></div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={prepare} disabled={busy} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50"><ShieldCheck size={13}/>1. Подготовить governance</button>
    <button type="button" onClick={approveAndExecute} disabled={busy||!state?.execution} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-40"><CheckCircle2 size={13}/>2. Подтвердить и применить</button>
   </div>
  </div>
  {state?.evidence?<div className="mt-3 text-[11px] text-[var(--gold-warm)]">Exact evidence: {state.evidence.price_rows} prices · {state.evidence.configuration_rows} configs · ready {state.evidence.strict_ready_rows}/6 · {state.evidence.evidence_sha256.slice(0,16)}…</div>:null}
  {message?<div className="mt-2 text-[11px] leading-relaxed text-[var(--gold-warm)]">{message}</div>:null}
 </div>;
}
