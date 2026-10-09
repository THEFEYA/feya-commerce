'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import styles from './DeliveryWorkspace.module.css';
import type {
  CarrierOwnerContext,CarrierOwnerParcelRequest,CarrierOwnerProfile,
} from '@/lib/commerceCarrierOwnerReview';

const endpoint='/api/admin/company/carrier-review';
type Measurements={
  parcel_class:''|'ordinary'|'oversize';
  weight:string;length:string;width:string;height:string;reference:string;confirmed:boolean;
};
const blank=():Measurements=>({
  parcel_class:'',weight:'',length:'',width:'',height:'',reference:'',confirmed:false,
});
const translation:Record<string,string>={
  authentication_required:'Для проверки требуется вход владельца.',
  owner_not_allowed:'Аккаунт не имеет разрешения на управление доставкой.',
  delivery_workspace_draft_disabled:'Черновики доставки пока выключены в производственной конфигурации.',
  carrier_owner_review_disabled:'Подтверждение габаритов ещё не активировано. Покупателям тарифы не показываются.',
  carrier_owner_review_approval_required:'Сначала сохраните и утвердите версию правил доставки в разделе выше.',
  carrier_owner_review_already_confirmed:'Для этого профиля уже существует неизменяемое подтверждение. Обновите страницу.',
  carrier_owner_review_profile_mismatch:'Вместимость профиля изменилась. Перезагрузите данные.',
  carrier_owner_review_request_conflict:'Эта попытка относится к другим измерениям. Измените данные и отправьте заново.',
  carrier_owner_review_package_invalid:'Проверьте вес, размеры и название физического измерения.',
  carrier_owner_review_workspace_changed:'Действующая версия доставки изменилась. Проверьте актуальную версию.',
  carrier_owner_review_unavailable:'Не удалось получить данные перевозчиков. Повторите позже.',
};
async function requestJSON<T>(url:string,body?:unknown,signal?:AbortSignal):Promise<T>{
  const response=await fetch(url,{
    method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal,
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data||data.ok!==true)throw Error(data?.code||'carrier_owner_review_unavailable');
  return data as T;
}
const whole=(text:string,max:number)=>/^[0-9]+$/.test(text.trim())&&
  Number.isSafeInteger(Number(text))&&Number(text)>=1&&Number(text)<=max;

function EnvelopeReviewForm({
  profile,workspaceVersionId,workspaceRevision,onSaved,
}:{
  profile:CarrierOwnerProfile;
  workspaceVersionId:string;workspaceRevision:number;
  onSaved:(input:CarrierOwnerParcelRequest)=>Promise<void>;
}){
  const [form,setForm]=useState<Measurements>(blank);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const pending=useRef<CarrierOwnerParcelRequest|null>(null);
  const update=(changes:Partial<Measurements>)=>{
    setForm(f=>({...f,...changes}));pending.current=null;setError('');
  };
  const measured=profile.max_units_per_parcel!==null
    &&profile.max_units_per_parcel>=1&&profile.max_units_per_parcel<=100
    &&form.parcel_class!==''&&whole(form.weight,500000)
    &&whole(form.length,5000)&&whole(form.width,5000)&&whole(form.height,5000)
    &&form.reference.trim().length>=12&&form.reference.trim().length<=200
    &&form.confirmed;
  if(profile.owner_review){
    const r=profile.owner_review;
    return <div className={styles.notice} role="status">
      <strong>Измерение подтверждено владельцем</strong>
      <p>{r.parcel_class==='ordinary'?'Обычная':'Крупногабаритная'} посылка · вместимость {r.max_units_per_parcel} шт. · вес до {r.envelope_weight_grams} г · {r.envelope_length_mm} × {r.envelope_width_mm} × {r.envelope_height_mm} мм.</p>
      <p>Акт/основание: {r.packaging_reference}</p>
      <p>Это не подтверждение перевозчика и не разрешение принимать оплату.</p>
    </div>;
  }
  return <form className={styles.stack} onSubmit={async e=>{
    e.preventDefault();
    if(!measured||busy)return;
    setBusy(true);setError('');
    try{
      // Create a stable ID before any network call; exact retries after a
      // timeout reuse it, edits immediately clear the cached request.
      const req=pending.current??{
        request_id:crypto.randomUUID(),
        workspace_version_id:workspaceVersionId,
        workspace_revision:workspaceRevision,
        shipping_profile_id:profile.shipping_profile_id,
        parcel_class:form.parcel_class as 'ordinary'|'oversize',
        max_units_per_parcel:profile.max_units_per_parcel as number,
        envelope_weight_grams:Number(form.weight),
        envelope_length_mm:Number(form.length),
        envelope_width_mm:Number(form.width),
        envelope_height_mm:Number(form.height),
        packaging_reference:form.reference.trim(),
        business_review_confirmed:true as const,
      };
      pending.current=req;
      await onSaved(req);
      pending.current=null;
      setForm(blank());
    }catch(e){
      const code=e instanceof Error?e.message:'carrier_owner_review_unavailable';
      setError(translation[code]||'Не удалось сохранить подтверждение. Попробуйте ещё раз.');
    }finally{setBusy(false);}
  }}>
    <p className={styles.hint}>Укажи результаты фактического измерения упакованного заказа. Значения не создаются автоматически и не означают, что Укрпочта или Nova Post примет коробку.</p>
    <div className={styles.grid}>
      <label className={styles.field}>Класс посылки
        <select value={form.parcel_class} onChange={e=>update({parcel_class:e.target.value as Measurements['parcel_class']})}>
          <option value="">Выбрать после измерения</option>
          <option value="ordinary">Обычная</option><option value="oversize">Крупногабаритная</option>
        </select>
      </label>
      <label className={styles.field}>Товаров в посылке
        <input value={profile.max_units_per_parcel??''} readOnly aria-label="Максимум товаров из утверждённого профиля"/>
      </label>
      {([
        ['weight','Вес упакованной коробки, г'],
        ['length','Длина, мм'],['width','Ширина, мм'],['height','Высота, мм'],
      ] as const).map(([name,label])=><label key={name} className={styles.field}>{label}
        <input type="number" min={1} max={name==='weight'?500000:5000} step={1}
          value={form[name]} onChange={e=>update({[name]:e.target.value})}/>
      </label>)}
    </div>
    <label className={styles.field}>Основание измерения
      <input value={form.reference} maxLength={200}
        placeholder="Дата измерения и внутренний номер упаковочного образца"
        onChange={e=>update({reference:e.target.value})}/>
    </label>
    <label className={styles.check}>
      <input type="checkbox" checked={form.confirmed}
        onChange={e=>update({confirmed:e.target.checked})}/>
      Я лично подтвердил физические измерения; это не подтверждение международного перевозчика.
    </label>
    <div className={styles.row}>
      <button type="submit" className="owner-button" disabled={!measured||busy||profile.max_units_per_parcel===null}
>{busy?'Сохраняю…':'Подтвердить измеренный профиль'}</button>
    </div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </form>;
}
export function CarrierOwnerReviewClient(){
  const [context,setContext]=useState<CarrierOwnerContext|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const reload=useCallback(async(signal?:AbortSignal)=>{
    const out=await requestJSON<{ok:true;context:CarrierOwnerContext}>(endpoint,undefined,signal);
    setContext(out.context);setError('');
  },[]);
  useEffect(()=>{
    const ctrl=new AbortController();
    void reload(ctrl.signal).catch(e=>{
      if(ctrl.signal.aborted)return;
      setError(translation[e instanceof Error?e.message:'']||'Проверка перевозчика пока недоступна.');
    }).finally(()=>{if(!ctrl.signal.aborted)setBusy(false);});
    return ()=>ctrl.abort();
  },[reload]);
  const save=async(req:CarrierOwnerParcelRequest)=>{
    await requestJSON(endpoint,req);await reload();
  };
  return <section className="owner-card" aria-label="Проверка профилей посылок и перевозчиков">
    <h2>Габариты посылок и данные перевозчиков</h2>
    <p>Проверка состоит из двух разных этапов: физический профиль упаковки подтверждается владельцем; международный маршрут и тариф — только по действующим данным перевозчика. Пока оба этапа не закрыты, оплата недоступна.</p>
    {busy&&<p role="status">Проверяю защищённые сведения…</p>}
    {error&&<p role="status" className={styles.notice}>{error}</p>}
    {context&&<>
      <div className={styles.grid} role="status">
        <p>Отзывов по услугам перевозчиков: <strong>{context.mapping_review_count}</strong></p>
        <p>Полученных подтверждений API: <strong>{context.source_observation_count}</strong></p>
      </div>
      {context.status==='awaiting_delivery_approval'
        ?<p className={styles.notice}>Сохранённая версия правил доставки: №{context.saved_draft_revision}. Утверждённой версии ещё нет. Сначала проверь и утверди её в блоке выше; подставлять класс и размеры всем товарам автоматически нельзя.</p>
        :<>
          <p className={styles.hint}>Текущая утверждённая версия: {context.approved_workspace_revision}. Измерения будут навсегда привязаны только к ней; следующая версия требует новой проверки.</p>
          <div className={styles.stack}>
            {context.profiles.map(p=><div key={p.shipping_profile_id} className={styles.fieldset}>
              <h3>{p.name}</h3>
              <EnvelopeReviewForm profile={p} workspaceVersionId={context.approved_workspace_version_id!}
                workspaceRevision={context.approved_workspace_revision!} onSaved={save}/>
            </div>)}
          </div>
        </>}
      <p className={styles.hint}>Проверенные страны, платёжные методы и отправление не активированы этой формой. Личные адреса покупателей и API-ключи здесь не используются.</p>
    </>}
  </section>;
}
