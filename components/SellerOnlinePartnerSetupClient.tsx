'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {SELLER_ONLINE_OFFICIAL_LINKS as URLS,sellerOnlineSetupProgress,type SetupMode}
  from '@/lib/sellerOnlineOfficialSetupGuide';

const API='/api/partner/seller-online';
type Status={
 ok:boolean;code?:string;mode?:string;status?:string;
 paypal_email_set?:boolean;personal_key_set?:boolean;
 paypal_client_id_set?:boolean;paypal_client_secret_set?:boolean;
 seller_api_key_set?:boolean;seller_webhook_url_set?:boolean;
 live_payment_enabled?:boolean;updated_at?:string|null;
};
type Field='paypal_email'|'personal_key'|'paypal_client_id'|'paypal_client_secret'|'seller_api_key';
const EMPTY:Record<Field,string>={
 paypal_email:'',personal_key:'',paypal_client_id:'',paypal_client_secret:'',seller_api_key:'',
};
const METHODS=[
 {value:'seller_online_api_v2',label:'Seller Online API v2 · способ, указанный для TheFEYA',
  help:'Seller Online подтвердили API v2 для нашего Next.js. Нужны параметры подключения именно ПЛАТЕЖЕЙ, а не только отправки посылок.'},
 {value:'paypal_standard',label:'PayPal Standard · аналог WooCommerce / OpenCart',
  help:'Выбирать только если техотдел разрешает использовать схему PayPal Standard для самостоятельного сайта TheFEYA.'},
 {value:'paypal_rest',label:'PayPal REST · только при наличии авторизованного приложения',
  help:'Нужны Client ID и Client Secret из PayPal Developer. Не требуются для старого PayPal Standard.'},
] as const;
const FIELDS:Record<Field,{label:string,help:string,secret:boolean}>={
 paypal_email:{
  label:'PayPal email получателя Seller Online',
  help:'Источник: кабинет Seller Online → «Настройки продаж» → PayPal email. НЕ email владельца TheFEYA.',
  secret:false,
 },
 personal_key:{
  label:'Персональный идентификатор Seller Online',
  help:'Источник: кабинет Seller Online → «Данные для настройки CMS, персональных интернет-магазинов». Это НЕ API Secret PayPal.',
  secret:true,
 },
 paypal_client_id:{
  label:'PayPal Client ID',
  help:'Источник: PayPal Developer → Apps & Credentials. Вводит только администратор соответствующего PayPal-приложения.',
  secret:true,
 },
 paypal_client_secret:{
  label:'PayPal Client Secret',
  help:'Источник: то же приложение PayPal Developer. Для PayPal Standard не нужен.',
  secret:true,
 },
 seller_api_key:{
  label:'Seller Online API v2 key',
  help:'Выдаётся техподдержкой Seller Online через email или личный кабинет. Не через Telegram. Не гарантирует наличие платёжного метода в API.',
  secret:true,
 },
};
const CURRENT:Record<SetupMode,Field[]>={
 paypal_standard:['paypal_email','personal_key'],
 paypal_rest:['paypal_client_id','paypal_client_secret'],
 seller_online_api_v2:['seller_api_key'],
 hosted_redirect:[],
};
const FLAGS:Record<Field,keyof Status>={
 paypal_email:'paypal_email_set',
 personal_key:'personal_key_set',
 paypal_client_id:'paypal_client_id_set',
 paypal_client_secret:'paypal_client_secret_set',
 seller_api_key:'seller_api_key_set',
};
const inputClass='mt-2 w-full rounded-lg border border-[rgba(216,214,211,.20)] bg-[#141418] px-4 py-3 text-[14px] text-[#f7f3ec] outline-none focus:border-[#d4b26a]';
const boxClass='rounded-xl border border-[rgba(216,214,211,.16)] bg-white/[.025] p-5 sm:p-7';
const techLink='underline underline-offset-4 text-[#d4b26a] hover:text-[#f6e2b2]';

function External({href,children}:{href:string;children:ReactNode}){
 return <a className={techLink} href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>;
}
function Check({label,complete,detail}:{label:string;complete:boolean;detail:string}){
 return <div className="flex items-start justify-between gap-4 border-b border-white/[.08] py-3">
   <div><p className="text-[13px] text-[#eae3d8]">{label}</p>
   <p className="mt-1 text-[12px] leading-5 text-[#a79e93]">{detail}</p></div>
   <span className={'shrink-0 text-[12px] '+(complete?'text-[#dfbc78]':'text-[#ada49b]')}>
     {complete?'Записано':'Не готово'}
   </span>
 </div>;
}

export function SellerOnlinePartnerSetupClient(){
 const started=useRef(false);
 const [status,setStatus]=useState<Status|null>(null);
 const [message,setMessage]=useState('Проверяем персональный доступ…');
 const [busy,setBusy]=useState(true);
 const [saving,setSaving]=useState(false);
 const [mode,setMode]=useState<SetupMode>('seller_online_api_v2');
 const [fields,setFields]=useState<Record<Field,string>>(EMPTY);
 const [copied,setCopied]=useState(false);
 const [advanced,setAdvanced]=useState(false);

 useEffect(()=>{
  if(started.current)return;started.current=true;
  async function start(){
   try{
    const access=window.location.hash.startsWith('#access=')
      ?window.location.hash.slice('#access='.length):'';
    if(access){
     window.history.replaceState(null,'',window.location.pathname);
     const granted=await fetch(API+'/access',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({token:access}),
     });
     if(!granted.ok){
      setMessage('Персональная ссылка недействительна или срок её действия истёк.');
      setBusy(false);return;
     }
    }
    const res=await fetch(API,{credentials:'same-origin',cache:'no-store'});
    const data=await res.json() as Status;
    if(!res.ok||!data.ok){
     setMessage('Откройте персональную ссылку, выданную владельцем TheFEYA. Публичный просмотр настроек закрыт.');
     setBusy(false);return;
    }
    setStatus(data);
    if(data.mode==='paypal_standard'||data.mode==='paypal_rest'||data.mode==='seller_online_api_v2'){
     setMode(data.mode);
     if(data.mode==='paypal_rest')setAdvanced(true);
    }
    setMessage('');
   }catch{setMessage('Не удалось проверить соединение с сервером. Попробуйте обновить страницу.');}
   setBusy(false);
  }
  void start();
 },[]);

 const needed=CURRENT[mode];
 const canSave=needed.length>0&&needed.every(key=>status?.[FLAGS[key]]===true||fields[key].trim().length>0);
 const progress=sellerOnlineSetupProgress(mode,status||{});

 async function copyIpn(){
  try{await navigator.clipboard.writeText(URLS.paypalIpn);setCopied(true);}
  catch{setCopied(false);}
 }
 async function save(){
  if(!status?.ok||saving)return;
  if(!canSave){
   setMessage('Не хватает обязательных параметров текущего способа. Откройте указанные ссылки Seller Online и заполните поля.');
   return;
  }
  setSaving(true);setMessage('');
  try{
   const payload:Record<string,string>={mode};
   for(const field of needed)if(fields[field].trim())payload[field]=fields[field].trim();
   const res=await fetch(API,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
   });
   const data=await res.json() as Status;
   if(!res.ok||!data.ok){
    setMessage('Настройки не сохранены. Проверьте формат, заполненность и срок действия персональной ссылки.');
   }else{
    setStatus(data);setFields({...EMPTY});
    setMessage('Данные сохранены в зашифрованном хранилище. Это НЕ подтверждение PayPal и НЕ активация оплаты.');
   }
  }catch{setMessage('Нет ответа сервера. Повторите попытку без публикации данных в переписке.');}
  setSaving(false);
 }

 return <div className="grid gap-5">
  <section className={boxClass}>
   <h2 className="text-[22px] font-medium text-[#f7f3ec]">Для технического отдела Seller Online</h2>
   <p className="mt-3 max-w-4xl text-[14px] leading-7 text-[#c8bfb3]">
    TheFEYA — собственный сайт Next.js, а не WordPress/Shopify/OpenCart.
    Вы входите по персональной ссылке; пароль TheFEYA и доступ к заказам не нужен.
    Определите поддерживаемый платёжный способ, заполните его параметры в этой форме
    и проверьте перечень дальнейших технических действий.
    Данные банковских карт покупателей, CVV и пароли от банков сюда вводить нельзя.
   </p>
   <p className="mt-3 text-[12px] leading-6 text-[#b7ad9f]">
    Официальная инструкция: <External href={URLS.cmsGuide}>Seller Online · интеграция с CMS</External>.
    Заявка нашего custom-сайта: <External href={URLS.sellerStoreApplication}>Подключение Other</External>.
   </p>
  </section>
  {busy?<div className={boxClass}><p className="text-[#e0d6c7]">{message}</p></div>:
  !status?.ok?<div className={boxClass}>
   <h2 className="text-xl text-[#f7f3ec]">Требуется персональная ссылка</h2>
   <p className="mt-3 text-[14px] leading-6 text-[#d4b26a]">{message}</p>
  </div>:<>
   <section className={boxClass}>
    <p className="text-[11px] tracking-[.15em] text-[#d4b26a]">ШАГ 1 · ОПРЕДЕЛИТЬ ТЕХНИЧЕСКИЙ СПОСОБ</p>
    <h2 className="mt-3 text-[21px] text-[#f7f3ec]">Как Seller Online будет принимать платежи TheFEYA?</h2>
    <p className="mt-3 text-[13px] leading-6 text-[#c1b7aa]">
     В письме поддержки #738609 для Next.js указан API v2. Но их инструкция
     WooCommerce/OpenCart описывает PayPal Standard — это другая схема.
     Выбор должен делать специалист, который знает, что включено в аккаунте Seller Online.
    </p>
    <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Поддерживаемый метод интеграции">
     {METHODS.filter(m=>advanced||m.value!=='paypal_rest').map(m=>
      <label key={m.value} className={'flex cursor-pointer items-start gap-3 rounded-lg border p-4 '+(mode===m.value?'border-[#d4b26a] bg-[#d4b26a]/[.06]':'border-white/[.15]')}>
       <input type="radio" className="mt-1 h-4 w-4 accent-[#d4b26a]" name="partner-mode"
        value={m.value} checked={mode===m.value} onChange={()=>{setMode(m.value);setMessage('');}}/>
       <span className="block">
        <strong className="block text-[13px] text-[#f7f3ec]">{m.label}</strong>
        <span className="mt-1 block text-[12px] leading-6 text-[#bdb3a8]">{m.help}</span>
       </span>
      </label>)}
    </div>
    {!advanced&&<button className="mt-4 text-[12px] underline underline-offset-4 text-[#b6ad9e]"
      type="button" onClick={()=>setAdvanced(true)}>
      Показать вариант PayPal REST (если у техотдела есть приложение)
    </button>}
    <p className="mt-4 text-[12px] leading-6 text-[#c9b998]">
     Не выбирайте PayPal Standard только из-за наличия этой кнопки.
     Для custom Next.js этот способ требует отдельного подтверждения Seller Online.
    </p>
   </section>
   <section className={boxClass}>
    <p className="text-[11px] tracking-[.15em] text-[#d4b26a]">ШАГ 2 · ВНЕСТИ ПАРАМЕТРЫ ВЫБРАННОГО СПОСОБА</p>
    <h2 className="mt-3 text-[21px] text-[#f7f3ec]">Источники данных и инструкция для специалиста</h2>
    {mode==='paypal_standard'&&<div className="mt-4 text-[13px] leading-7 text-[#bdb4aa]">
      <p>1. Войдите в <External href={URLS.sellerAccount}>кабинет Seller Online</External> и откройте
        «Настройки продаж». Скопируйте PayPal email, который Seller Online используют для получения платежей.</p>
      <p className="mt-3">2. Откройте <External href={URLS.sellerPersonalKey}>Данные для настройки CMS и персональных магазинов</External>.
        Скопируйте персональный ключ. В их примере OpenCart этот ключ используется
        для сопоставления платежа с магазином; в WooCommerce он обычно не нужен.</p>
      <p className="mt-3">3. Для этой Next.js-интеграции техотдел должен подтвердить совместимость
        схемы OpenCart и порядок передачи информации о заказе. Пока это не подтверждено,
        настройка остаётся предварительной.</p>
    </div>}
    {mode==='seller_online_api_v2'&&<div className="mt-4 text-[13px] leading-7 text-[#bdb4aa]">
      <p>1. Откройте <External href={URLS.sellerApiGuide}>инструкцию Seller Online по API</External>
        и <External href={URLS.sellerApiSpecification}>официальную Swagger-спецификацию API v2</External>.</p>
      <p className="mt-3">2. API-ключ запрашивается через кабинет Seller Online
        (не Telegram). Пожалуйста, используйте выданный для этого магазина ключ.
        <External href="https://my.seller-online.com/contact.php"> Запрос ключа через кабинет</External>.</p>
      <p className="mt-3">3. Важное условие: доступный API v2 должен содержать
        подтверждённые методы создания и проверки именно платежей.
        Методы отправки посылок сами по себе не подключают онлайн-кассу.</p>
    </div>}
    {mode==='paypal_rest'&&<div className="mt-4 text-[13px] leading-7 text-[#bdb4aa]">
      <p>1. Только авторизованный владелец приложения открывает <External href="https://developer.paypal.com/dashboard/applications">PayPal Developer → Apps &amp; Credentials</External>.</p>
      <p className="mt-3">2. Выберите соответствующее Live или Sandbox приложение,
        введите его Client ID и Secret. Это нужно для PayPal REST, но не для PayPal Standard.</p>
      <p className="mt-3">3. Для магазина с третьим лицом-получателем платежа
        необходимо подтверждение разрешённой схемы и требований PayPal к партнёрскому подключению.</p>
    </div>}
    <div className="mt-5 grid gap-5">
     {CURRENT[mode].map(field=><label key={field} className="block text-[13px] text-[#e6ddd0]">
       <strong className="font-medium">{FIELDS[field].label}</strong>
       <p className="mt-1 text-[12px] leading-5 text-[#a59a8d]">{FIELDS[field].help}</p>
       <input className={inputClass} type={FIELDS[field].secret?'password':'text'}
        value={fields[field]} autoComplete="off" spellCheck={false}
        placeholder={status[FLAGS[field]]===true?'Уже сохранено; оставьте пустым, чтобы сохранить прежнее значение':'Вводит специалист Seller Online прямо на этой странице'}
        onChange={e=>setFields(prev=>({...prev,[field]:e.target.value}))}/>
      </label>)}
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-4">
     <button type="button" onClick={()=>void save()} disabled={saving||!canSave}
       className="min-h-12 rounded-full border border-[#d4b26a] bg-[#d4b26a] px-7 text-[13px] font-semibold text-[#171414] disabled:cursor-not-allowed disabled:opacity-45">
      {saving?'Сохраняем…':'Сохранить параметры · оплату не включает'}
     </button>
     <span className="text-[12px] leading-5 text-[#b4a99e]">
      Недостающие обязательные поля должны быть заполнены.
     </span>
    </div>
    {message&&<p className="mt-4 text-[13px] leading-6 text-[#e1c38b]" role="status">{message}</p>}
   </section>
   <section className={boxClass}>
    <p className="text-[11px] tracking-[.15em] text-[#d4b26a]">ШАГ 3 · АДРЕСА ПОДКЛЮЧЕНИЯ</p>
    <h2 className="mt-3 text-[21px] text-[#f7f3ec]">Адреса, которые уже подготовлены на сайте</h2>
    <p className="mt-4 text-[13px] leading-6 text-[#c5bcb0]">
      <strong>PayPal IPN</strong> — входящее уведомление PayPal о статусе платежа.
      Этот адрес создан сайтом и не должен вводиться как произвольный URL.
      Сейчас приём событий для покупателей выключен до проверенного заказа.
    </p>
    <div className="mt-2 flex flex-wrap gap-2">
     <input className={inputClass+' min-w-[210px] flex-1'} value={URLS.paypalIpn}
       aria-label="PayPal IPN endpoint" readOnly onFocus={e=>e.currentTarget.select()}/>
     <button type="button" className="rounded-lg border border-[#d4b26a]/50 px-4 py-2 text-[12px] text-[#d4b26a]"
       onClick={()=>void copyIpn()}>{copied?'Скопировано':'Копировать URL'}</button>
    </div>
    <p className="mt-4 text-[13px] leading-6 text-[#c5bcb0]">
      <strong>Order Created webhook Seller Online</strong> — отдельное уведомление о
      создании заказа. Для WooCommerce адрес приёма Seller Online выдаётся в
      «Настройки продаж → Данные для WooCommerce». Это НЕ PayPal IPN.
      Отправка такого уведомления из Next.js пока не реализована, поэтому
      ввода произвольного webhook URL в этой форме больше нет.
    </p>
    <p className="mt-3 text-[12px] leading-6 text-[#ad9f91]">
      Исходный код для доработки: <External href={URLS.github}>GitHub TheFEYA</External>.
      Чтобы изменять код, нужен Pull Request или отдельный GitHub-доступ;
      форма настроек не выполняет программные скрипты.
    </p>
   </section>
   <section className={boxClass}>
    <p className="text-[11px] tracking-[.15em] text-[#d4b26a]">ШАГ 4 · РЕЗУЛЬТАТ И НЕЗАВЕРШЁННЫЕ ДЕЙСТВИЯ</p>
    <h2 className="mt-3 text-[21px] text-[#f7f3ec]">Состояние подключения</h2>
    {CURRENT[mode].map(field=><Check key={field} label={FIELDS[field].label}
      complete={status[FLAGS[field]]===true}
      detail={status[FLAGS[field]]===true?'Зашифрованно сохранено на сервере. Значение в браузер не возвращается.':'Технический отдел должен заполнить поле и нажать сохранение.'}/>)}
    <Check label="Подтверждение протокола для custom Next.js"
      complete={false} detail="В официальной документации описаны CMS и API, но способ платежа TheFEYA не подтверждён успешным тестом."/>
    <Check label="Проверка подключения к платёжному провайдеру"
      complete={false} detail="Сохранение параметров не проверяет возможность создания и списания платежа."/>
    <Check label="Заказ с окончательной серверной суммой"
      complete={false} detail="Расчёт заказа, доставка и применимые налоги должны быть подтверждены сервером до списания."/>
    <Check label="Тестовая транзакция и подтверждение возврата статуса"
      complete={false} detail="Нет доказательства оплаты, подтверждённого обработчиком PayPal и связанного с заказом."/>
    <p className="mt-5 text-[13px] font-medium leading-6 text-[#e3c78d]">
      {progress.configurationSaved?'Параметры выбранной схемы сохранены.':'Параметры выбранной схемы ещё не полностью сохранены.'}
      {' '}Live payments: OFF. Сайт не принимает деньги.
    </p>
    <p className="mt-3 text-[12px] leading-6 text-[#c7bdaf]">
      После настройки сообщите владельцу лишь о результате и выбранном способе интеграции.
      Не присылайте значения секретных ключей, номера карт или пароли в Telegram.
    </p>
   </section>
  </>}
 </div>;
}
