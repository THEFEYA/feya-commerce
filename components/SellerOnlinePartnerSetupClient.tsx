'use client';

import {useEffect,useRef,useState} from 'react';

const API='/api/partner/seller-online';
const METHODS=[
  {value:'paypal_standard',label:'PayPal Standard · Seller Online',help:'Seller Online WooCommerce/OpenCart pattern: enter the PayPal recipient email and personal store key (if issued).'},
  {value:'paypal_rest',label:'PayPal REST / Checkout',help:'Seller Online technician enters the Client ID and Secret of the authorized payment account.'},
  {value:'seller_online_api_v2',label:'Seller Online API v2',help:'Official API key is entered here by your technical team; never published in website source.'},
  {value:'hosted_redirect',label:'Hosted / payment-link checkout',help:'Use only after the provider confirms a supported hosted payment session protocol.'},
] as const;

type Status={
 ok:boolean;code?:string;mode?:string;status?:string;
 paypal_email_set?:boolean;personal_key_set?:boolean;
 paypal_client_id_set?:boolean;paypal_client_secret_set?:boolean;
 seller_api_key_set?:boolean;seller_webhook_url_set?:boolean;
 live_payment_enabled?:boolean;updated_at?:string|null;
};
type Field='paypal_email'|'personal_key'|'paypal_client_id'|'paypal_client_secret'|'seller_api_key'|'seller_webhook_url';
const EMPTY:Record<Field,string>={
 paypal_email:'',personal_key:'',paypal_client_id:'',paypal_client_secret:'',
 seller_api_key:'',seller_webhook_url:'',
};
const inputClass='mt-2 w-full rounded-lg border border-white/20 bg-[#15151c] px-4 py-3 text-[14px] text-[#f6f1e9] outline-none focus:border-[#d4b26a]';
const fieldLabels:Record<Field,string>={
 paypal_email:'PayPal merchant email · Получатель платежа',
 personal_key:'Seller Online personal store key · Персональный ключ',
 paypal_client_id:'PayPal Client ID',
 paypal_client_secret:'PayPal Client Secret',
 seller_api_key:'Seller Online API key v2',
 seller_webhook_url:'Seller Online order notification URL (optional)',
};
const isSecret=(field:Field)=>field!=='seller_webhook_url'&&field!=='paypal_email';

export function SellerOnlinePartnerSetupClient(){
 const started=useRef(false);
 const [status,setStatus]=useState<Status|null>(null);
 const [message,setMessage]=useState('Проверяем доступ…');
 const [busy,setBusy]=useState(true);
 const [saving,setSaving]=useState(false);
 const [mode,setMode]=useState<string>('paypal_standard');
 const [fields,setFields]=useState<Record<Field,string>>(EMPTY);

 useEffect(()=>{
   if(started.current)return;started.current=true;
   async function start(){
     try{
       const access=window.location.hash.startsWith('#access=')
         ?window.location.hash.slice('#access='.length):'';
       if(access){
         // The fragment never enters server request logs or Referer headers.
         window.history.replaceState(null,'',window.location.pathname);
         const granted=await fetch(API+'/access',{
           method:'POST',credentials:'same-origin',cache:'no-store',
           headers:{'Content-Type':'application/json'},
           body:JSON.stringify({token:access}),
         });
         if(!granted.ok){setMessage('Ссылка недействительна или срок её действия истёк.');setBusy(false);return;}
       }
       const res=await fetch(API,{credentials:'same-origin',cache:'no-store'});
       const data=await res.json() as Status;
       if(!res.ok||!data.ok){setMessage('Откройте персональную ссылку для подключения, выданную владельцем TheFEYA.');setBusy(false);return;}
       setStatus(data);
       if(data.mode && data.mode!=='unselected')setMode(data.mode);
       setMessage('');
     }catch{setMessage('Не удалось связаться с сервером. Повторите открытие страницы.');}
     setBusy(false);
   }
   void start();
 },[]);

 async function save(){
   if(!status?.ok||saving)return;
   setSaving(true);setMessage('');
   try{
     const payload:Record<string,string>={mode};
     for(const [key,val] of Object.entries(fields))if(val.trim())payload[key]=val.trim();
     const res=await fetch(API,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify(payload),
     });
     const data=await res.json() as Status;
     if(!res.ok||!data.ok){
       setMessage('Не удалось сохранить настройки. Проверьте формат полей и срок действия ссылки.');
     }else{
       setStatus(data);setFields({...EMPTY});
       setMessage('Настройки сохранены на сервере. Секреты зашифрованы. Реальные платежи пока выключены до тестирования.');
     }
   }catch{setMessage('Ошибка соединения. Проверьте сеть и повторите сохранение.');}
   setSaving(false);
 }
 const liveMode=METHODS.find(m=>m.value===mode);
 const visible:Field[]=mode==='paypal_standard'
   ?['paypal_email','personal_key','seller_webhook_url']:
   mode==='paypal_rest'?['paypal_client_id','paypal_client_secret','seller_webhook_url']:
   mode==='seller_online_api_v2'?['seller_api_key','personal_key','seller_webhook_url']:
   ['seller_webhook_url','personal_key'];
 const savedKeys=[
   ['PayPal email','paypal_email_set'],
   ['Personal key','personal_key_set'],
   ['PayPal Client ID','paypal_client_id_set'],
   ['PayPal Client Secret','paypal_client_secret_set'],
   ['Seller Online API key','seller_api_key_set'],
   ['Seller Online webhook URL','seller_webhook_url_set'],
 ] as const;
 return <div className="grid gap-5">
   {busy?<p className="rounded-lg border border-white/15 p-5 text-[#dad1c3]">{message}</p>:
    !status?.ok?
      <div className="rounded-xl border border-[#d4b26a]/30 bg-[#d4b26a]/[.06] p-6 text-[#e7d2ad]">
        <h2 className="text-xl">Доступ по персональной ссылке</h2>
        <p className="mt-3 text-sm leading-6">{message}</p>
        <p className="mt-3 text-sm leading-6">For security, payment configuration is not accessible to anonymous visitors.</p>
      </div>:
    <>
      <div className="rounded-xl border border-[#d4b26a]/25 bg-white/[.025] p-6 lg:p-8">
        <p className="mb-4 text-[11px] uppercase tracking-[.17em] text-[#d4b26a]">Step 1 · Payment provider</p>
        <label className="block text-sm text-[#f7f3ec]" htmlFor="so-provider-mode">Select payment method</label>
        <select id="so-provider-mode" className={inputClass} value={mode} onChange={e=>setMode(e.target.value)}>
          {METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#b8b0a6]">{liveMode?.help}</p>
        <div className="mt-6 grid gap-5">
          {visible.map(field=><label key={field} className="block text-[13px] text-[#e9e2d8]">
            {fieldLabels[field]}
            <input className={inputClass} type={isSecret(field)?'password':'text'}
              value={fields[field]}
              placeholder={status[(field+'_set') as keyof Status]===true?'Previously saved · leave blank to keep existing value':'Enter directly here; nothing is shared in chat'}
              onChange={e=>setFields(old=>({...old,[field]:e.target.value}))}
              autoComplete="off" spellCheck={false}/>
          </label>)}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button disabled={saving} type="button" onClick={()=>void save()}
            className="rounded-full border border-[#d4b26a] bg-[#d4b26a] px-7 py-3 text-sm font-semibold text-[#111015] disabled:opacity-60">
            {saving?'Saving…':'Save payment configuration'}
          </button>
          <span className="text-[12px] text-[#aaa29a]">No activation or real customer charges</span>
        </div>
        {message&&<p role="status" className="mt-4 text-[13px] leading-6 text-[#ead29a]">{message}</p>}
      </div>
      <div className="rounded-xl border border-white/[.13] bg-white/[.025] p-6 lg:p-8">
        <h2 className="text-xl text-[#f7f3ec]">Saved setup status</h2>
        <p className="mt-2 text-[13px] leading-6 text-[#aaa29a]">
          Secret values are never displayed again. A new value replaces the encrypted existing value.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 text-[13px] text-[#dcd4ca] sm:grid-cols-2">
          {savedKeys.map(([label,key])=><div key={key} className="flex items-center justify-between gap-3 border-b border-white/10 py-2">
            <span>{label}</span><span className={status[key]?'text-[#d4b26a]':'text-[#807972]'}>{status[key]?'Stored':'Not set'}</span>
          </div>)}
        </div>
        <p className="mt-5 text-[13px] leading-6 text-[#bcb2a5]">
          Connection: {status.status==='configuration_saved_not_verified'?'Configuration saved; payment tests still required.':'Awaiting configuration.'}
          {' '}Live payments: OFF.
        </p>
      </div>
    </>
   }
   <div className="rounded-xl border border-white/[.13] p-6 text-[13px] leading-7 text-[#aca49c]">
     <h2 className="text-[17px] text-[#f7f3ec]">For the Seller Online technical team</h2>
     <p className="mt-2">This is a self-service configuration screen on the real domain thefeya.com, not a Shopify plugin or a code editor. Provider staff can enter credentials directly without sharing them with the store owner. The saved configuration will be used only after the custom checkout adapter and payment verification are completed.</p>
     <p className="mt-2">Provider checkout details and test confirmation are separate from permission to update GitHub source code. No JavaScript, PHP, HTML or executable plugin is accepted on this screen.</p>
   </div>
 </div>;
}
