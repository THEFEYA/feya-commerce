'use client';

import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {Check, CircleAlert, Loader2, Lock, Power, ShieldCheck} from 'lucide-react';

const API = '/api/partner/seller-online';
type PayPalPartnerStatus={
  available:boolean;environment:'sandbox'|'live'|null;
  last:{status:string;environment:'sandbox'|'live';authorizationVerified:boolean;verified_at:string|null}|null;
  checkoutEnabledByThisFlow:false;
};

type Checks = {
  credentials: boolean; payee: boolean; payee_merchant_id: string | null; webhook: boolean;
  webhook_last_event_at: string | null; test_payment: boolean; test_environment: 'sandbox' | 'live' | null; test_paid_at: string | null;
};
type Status = {
  engine: 'paypal_checkout' | 'paypal_standard';
  environment: 'sandbox' | 'live';
  credential_source: 'none' | 'installer' | 'platform';
  client_id_hint: string | null;
  payee_email: string | null;
  store_key_set: boolean;
  store_key_hint: string | null;
  config_version: number;
  checks: Checks;
  active: boolean;
  activated_at: string | null;
  last_error: string | null;
  updated_at: string | null;
  platform_app_available: boolean;
  platform_app_environment: 'sandbox' | 'live' | null;
  ready_to_activate: boolean;
  commerce_release_approved: boolean;
  urls: {webhook: string; ipn: string};
  paid_orders: number;
};
type CheckResult = {check: string; ok: boolean; detail: string; paypal_error?: string | null; debug_id?: string | null};

const CHECK_LABELS: Record<string, string> = {
  store_key: 'Ключ магазина Seller Online',
  payee_email: 'PayPal-аккаунт получателя',
  credentials: 'Авторизация PayPal REST-приложения',
  payee: 'Аккаунт получателя принимает EUR',
  webhook: 'Уведомления PayPal (webhook)',
  ipn_channel: 'Канал подтверждения PayPal Standard (IPN)',
};

const box = 'rounded-[16px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-5 sm:p-7';
const input = 'mt-1.5 w-full rounded-lg border border-[rgba(216,214,211,.22)] bg-[#141418] px-3.5 py-3 text-[14px] text-[#f7f3ec] outline-none placeholder:text-[#7d7572] focus:border-[#d4b26a]';
const label = 'block text-[12px] font-medium text-[#d8d1c5]';
const help = 'mt-1.5 text-[12px] leading-5 text-[#a79e93]';

async function api<T>(path: string, body?: unknown): Promise<{status: number; data: T}> {
  const response = await fetch(API + path, body === undefined
    ? {cache: 'no-store', credentials: 'same-origin'}
    : {method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json().catch(() => ({ok: false, code: 'unavailable'}));
  return {status: response.status, data: data as T};
}

function Step({n, title, done, children}: {n: number; title: string; done: boolean; children: ReactNode}) {
  return <section className={box} aria-labelledby={`step-${n}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ${done ? 'bg-[#d4b26a] text-[#151318]' : 'border border-[rgba(216,214,211,.3)] text-[#d8d1c5]'}`}>
        {done ? <Check size={16}/> : n}
      </span>
      <h2 id={`step-${n}`} className="text-[19px] font-medium text-[#f7f3ec]">{title}</h2>
    </div>
    <div className="mt-5">{children}</div>
  </section>;
}

function Choice({active, onClick, title, note}: {active: boolean; onClick: () => void; title: string; note: string}) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={`rounded-xl border p-4 text-left ${active ? 'border-[#d4b26a] bg-[rgba(212,178,106,.08)]' : 'border-[rgba(216,214,211,.18)] hover:border-[rgba(212,178,106,.45)]'}`}>
    <span className="block text-[14px] font-medium text-[#f7f3ec]">{title}</span>
    <span className="mt-1 block text-[12px] leading-5 text-[#a79e93]">{note}</span>
  </button>;
}

export function SellerOnlineInstallClient() {
  const [phase, setPhase] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [role, setRole] = useState<'technician' | 'owner'>('technician');
  const [status, setStatus] = useState<Status | null>(null);
  const [engine, setEngine] = useState<Status['engine']>('paypal_checkout');
  const [environment, setEnvironment] = useState<Status['environment']>('live');
  const [usePlatform, setUsePlatform] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [payeeEmail, setPayeeEmail] = useState('');
  const [storeKey, setStoreKey] = useState('');
  const [busy, setBusy] = useState<'' | 'install' | 'test' | 'activate'>('');
  const [message, setMessage] = useState<{tone: 'ok' | 'warn'; text: string} | null>(null);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [partnerConnect, setPartnerConnect] = useState<PayPalPartnerStatus | null>(null);
  const [partnerBusy,setPartnerBusy] = useState(false);
  const [partnerNotice,setPartnerNotice] = useState<string | null>(null);
  const started = useRef(false);

  const applyStatus = useCallback((next: Status) => {
    setStatus(next);
    setEngine(next.engine);
    setEnvironment(next.environment);
    setUsePlatform(next.credential_source === 'platform');
    setPayeeEmail(current => current || next.payee_email || '');
  }, []);

  const load = useCallback(async () => {
    const {status: http, data} = await api<{ok: boolean; status?: Status; actor?: {role: 'technician' | 'owner'}}>('');
    if (http === 401) { setPhase('denied'); return null; }
    if (!data.ok || !data.status) { setPhase('ready'); setMessage({tone: 'warn', text: 'Не удалось загрузить состояние. Обновите страницу.'}); return null; }
    applyStatus(data.status);
    if (data.actor) setRole(data.actor.role);
    setPhase('ready');
    return data.status;
  }, [applyStatus]);

  const loadPartner = useCallback(async()=>{
    try{
      const {data}=await api<{ok:boolean}&PayPalPartnerStatus>('/paypal-connect');
      if(data.ok)setPartnerConnect(data);
    }catch{/* optional approved-partner integration may be unavailable */}
  },[]);

  async function startPayPalPartnerAuthorization(){
    setPartnerBusy(true);setPartnerNotice(null);
    try{
      const {data}=await api<{ok:boolean;action_url?:string;code?:string}>(
        '/paypal-connect',{action:'start'});
      if(!data.ok||!data.action_url){
        setPartnerNotice(data.code==='partner_not_approved'
          ?'PayPal не активировал для TheFEYA партнёрскую процедуру. Требуется одобрение PayPal Partner Referrals.'
          :'PayPal не смог начать официальное подключение.');return;
      }
      const url=new URL(data.action_url);
      if(url.protocol!=='https:'||!['www.paypal.com','www.sandbox.paypal.com'].includes(url.hostname)){
        setPartnerNotice('Недостоверный адрес PayPal. Переход отменён.');return;
      }
      window.location.assign(url.href);
    }catch{setPartnerNotice('Не удалось открыть авторизацию PayPal.');}
    finally{setPartnerBusy(false);}
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#access=')) {
        const token = hash.slice('#access='.length);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        await api('/access', {token});
      }
      const current = await load();
      if(current)await loadPartner();
      const params = new URLSearchParams(window.location.search);
      const referralTracking=params.get('merchantId');
      const referralMerchant=params.get('merchantIdInPayPal');
      if(referralTracking){
        window.history.replaceState(null,'',window.location.pathname);
        if(referralMerchant&&current){
          setPartnerBusy(true);
          const {data}=await api<{ok:boolean;verified?:boolean;code?:string}>(
            '/paypal-connect',{action:'complete',tracking_id:referralTracking,merchant_id:referralMerchant});
          setPartnerNotice(data.ok&&data.verified
            ?'PayPal подтвердил разрешения продавца. Это ещё не включает приём денег: нужна проверка платёжного адаптера и Seller Online.'
            :'PayPal не подтвердил подключение. Проверьте разрешения или действительность партнёрской лицензии.');
          setPartnerBusy(false);
          await loadPartner();
        }
      }
      const test = params.get('test');
      const token = params.get('token');
      if (test) window.history.replaceState(null, '', window.location.pathname);
      if (test === 'cancelled') setMessage({tone: 'warn', text: 'Тестовый платёж отменён на странице PayPal. Деньги не списаны.'});
      if (test === 'return' && current) {
        if (token) {
          setBusy('test');
          const {data} = await api<{ok: boolean; status?: string; message?: string}>('/test-payment', {action: 'complete', provider_order_id: token});
          setBusy('');
          setMessage(data.ok && data.status === 'paid'
            ? {tone: 'ok', text: 'Тестовый платёж €1,00 получен и подтверждён PayPal. Сумма, валюта, получатель и ключ магазина совпали.'}
            : {tone: 'warn', text: data.message || `Тестовый платёж не подтверждён (статус: ${data.status || 'неизвестен'}).`});
          await load();
        } else {
          // PayPal Standard: confirmation comes via IPN; poll briefly.
          setMessage({tone: 'ok', text: 'Ожидаем подтверждение PayPal (IPN)…'});
          for (let i = 0; i < 15; i++) {
            const next = await load();
            if (next?.checks.test_payment) { setMessage({tone: 'ok', text: 'Тестовый платёж подтверждён PayPal (IPN).'}); break; }
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }
    })();
  }, [load,loadPartner]);

  async function install() {
    if (!status) return;
    setBusy('install'); setMessage(null); setResults(null);
    const payload: Record<string, unknown> = {engine, environment};
    if (engine === 'paypal_checkout') {
      if (usePlatform) payload.use_platform_credentials = true;
      else {
        if (clientId.trim()) payload.client_id = clientId.trim();
        if (clientSecret.trim()) payload.client_secret = clientSecret.trim();
      }
    }
    if (payeeEmail.trim() && payeeEmail.trim().toLowerCase() !== status.payee_email) payload.payee_email = payeeEmail.trim();
    if (storeKey.trim()) payload.store_key = storeKey.trim();
    const saved = await api<{ok: boolean; status?: Status; message?: string}>('', payload);
    if (!saved.data.ok) {
      setBusy(''); setMessage({tone: 'warn', text: saved.data.message || 'Не удалось сохранить.'});
      return;
    }
    setClientId(''); setClientSecret(''); setStoreKey('');
    if (saved.data.status) applyStatus(saved.data.status);
    const verified = await api<{ok: boolean; results?: CheckResult[]; status?: Status; message?: string}>('/verify', {});
    setBusy('');
    if (verified.data.results) setResults(verified.data.results);
    if (verified.data.status) applyStatus(verified.data.status);
    if (!verified.data.ok) setMessage({tone: 'warn', text: verified.data.message || 'Проверка не выполнена.'});
  }

  async function testPayment() {
    setBusy('test'); setMessage(null);
    const {data} = await api<{ok: boolean; message?: string; session?: {kind: 'redirect'; url: string} | {kind: 'form'; form: {action: string; fields: Record<string, string>}}}>('/test-payment', {action: 'start'});
    if (!data.ok || !data.session) { setBusy(''); setMessage({tone: 'warn', text: data.message || 'Не удалось начать тестовый платёж.'}); return; }
    if (data.session.kind === 'redirect') { window.location.assign(data.session.url); return; }
    const form = document.createElement('form');
    form.method = 'POST'; form.action = data.session.form.action;
    for (const [name, value] of Object.entries(data.session.form.fields)) {
      const el = document.createElement('input'); el.type = 'hidden'; el.name = name; el.value = value; form.appendChild(el);
    }
    document.body.appendChild(form); form.submit();
  }

  async function setActive(active: boolean) {
    setBusy('activate'); setMessage(null);
    const {data} = await api<{ok: boolean; message?: string; status?: Status}>('/activate', {active});
    setBusy('');
    if (data.status) applyStatus(data.status);
    setMessage(data.ok
      ? {tone: 'ok', text: active ? 'Оплата включена на thefeya.com. Покупатели видят кнопку «Pay securely with PayPal».' : 'Оплата приостановлена. Новые заказы не принимаются.'}
      : {tone: 'warn', text: data.message || 'Не удалось изменить статус.'});
  }

  if (phase === 'loading') return <p className="text-[14px] text-[#a79e93]" role="status"><Loader2 className="mr-2 inline animate-spin" size={16}/>Загрузка…</p>;
  if (phase === 'denied') return <div className={box}>
    <Lock className="text-[#d4b26a]" size={26}/>
    <h2 className="mt-3 text-[20px] text-[#f7f3ec]">Доступ по приглашению</h2>
    <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#a79e93]">
      Откройте персональную ссылку, которую прислал владелец TheFEYA. Ссылка действует ограниченное время и даёт доступ только к подключению оплаты —
      без доступа к заказам, покупателям и администрированию сайта.
    </p>
    <a href="/admin/login?next=/partner/seller-online" className="mt-4 inline-block text-[13px] text-[#d4b26a] underline underline-offset-4">Вход для владельца TheFEYA</a>
  </div>;
  if (!status) return <p className="text-[14px] text-amber-100">{message?.text}</p>;

  const c = status.checks;
  const rest = engine === 'paypal_checkout';
  const engineChanged = engine !== status.engine || environment !== status.environment;
  const accountDone = rest ? c.credentials && c.payee : Boolean(status.payee_email);
  const installDone = rest ? c.credentials && c.payee && c.webhook && status.store_key_set : status.store_key_set && Boolean(status.payee_email);
  const testLive = c.test_payment && c.test_environment === 'live';

  return <div className="space-y-5">
    <div className={`${box} flex flex-wrap items-center justify-between gap-4 ${status.active ? 'border-[rgba(212,178,106,.45)]' : ''}`}>
      <div>
        <p className="text-[12px] uppercase tracking-[.18em] text-[#a79e93]">Статус оплаты на thefeya.com</p>
        <p className={`mt-1 text-[20px] ${status.active ? 'text-[#e4c87d]' : 'text-[#f7f3ec]'}`}>
          {status.active ? 'Включена — покупатели могут платить' : 'Выключена'}
        </p>
        <p className="mt-1 text-[12px] text-[#a79e93]">
          {status.engine === 'paypal_checkout' ? 'PayPal Checkout (REST)' : 'PayPal Standard'} · {status.environment === 'live' ? 'Live' : 'Sandbox'}
          {status.payee_email ? ` · получатель ${status.payee_email}` : ''}{status.paid_orders ? ` · оплаченных заказов: ${status.paid_orders}` : ''}
        </p>
      </div>
      <p className="text-[12px] text-[#a79e93]">Вы вошли как: {role === 'owner' ? 'владелец TheFEYA' : 'специалист Seller Online'}</p>
    </div>

    {message && <p role="status" className={`rounded-xl border p-4 text-[13px] leading-6 ${message.tone === 'ok' ? 'border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.07)] text-[#f1e2bd]' : 'border-amber-500/30 bg-amber-500/5 text-amber-100'}`}>{message.text}</p>}

    <Step n={1} title="PayPal-аккаунт Seller Online, который принимает оплату" done={accountDone && !engineChanged}>
      {partnerConnect?.available && <div className="mb-5 rounded-xl border border-[rgba(212,178,106,.3)] bg-[rgba(212,178,106,.04)] p-4>
        <h3 className="text-[15px] font-medium text-[#f7f3ec]">Официальная авторизация непосредственно в PayPal</h3>
        {partnerConnect?.available
          ?<>
            <p className={help}>
              PayPal Partner Referrals ({partnerConnect.environment}): сотрудник входит на paypal.com,
              подтверждает разрешения для магазина и возвращается сюда. Его пароль и Client Secret не вводятся на TheFEYA.
            </p>
            <button type="button" disabled={partnerBusy||Boolean(busy)}
              onClick={()=>void startPayPalPartnerAuthorization()}
              className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#d4b26a] px-5 text-[13px] text-[#e8d1a4] disabled:opacity-50">
              {partnerBusy?'Проверяем…':'Войти в PayPal и подтвердить подключение ↗'}
            </button>
          </>
          :<p className={help}>
            Этот официальный способ требует одобренной партнёрской интеграции PayPal.
            Пока партнёрское приложение TheFEYA не настроено, авторизацию запускать нельзя.
            Обычный Client ID от PayPal не даёт таких разрешений.
          </p>}
        {partnerConnect?.last?.authorizationVerified&&<p className="mt-3 text-[12px] text-[#d4b26a]">
          Последняя проверка PayPal: согласие подтверждено.
          Активация реальной оплаты производится только отдельно после проверки Seller Online и заказа.
        </p>}
        {partnerNotice&&<p role="status" className="mt-3 text-[13px] text-[#e2c690]">{partnerNotice}</p>}
      </div>}
      <p className="mb-4 text-[13px] leading-6 text-[#d8d1c5]">Для технического сотрудника Seller Online: разработка и доступ к GitHub / Supabase не требуются. Выберите вариант подключения, который ваш PayPal-аккаунт поддерживает; внесите данные самостоятельно, проверьте соединение, затем проведите тест €1. Если провайдер отклонит платёж — передайте только код ошибки.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice active={rest} onClick={() => setEngine('paypal_checkout')} title="PayPal Checkout (REST API) — рекомендуется"
          note="Если Seller Online использует своё REST-приложение PayPal: их специалист вводит Live Client ID / Secret. Проверка приложения и уведомлений автоматическая; зачисление денег проверяется тестовым платежом."/>
        <Choice active={!rest} onClick={() => setEngine('paypal_standard')} title="PayPal Standard — как в WooCommerce / OpenCart"
          note="Запасной способ из старых инструкций Seller Online: email получателя и идентификатор магазина, без REST API. PayPal Standard устаревает — только если Seller Online разрешит."/>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Среда PayPal">
        {(['live', 'sandbox'] as const).map(env => <button key={env} type="button" onClick={() => setEnvironment(env)} aria-pressed={environment === env}
          className={`min-h-10 rounded-lg border px-4 text-[13px] ${environment === env ? 'border-[#d4b26a] text-[#f7f3ec]' : 'border-[rgba(216,214,211,.2)] text-[#a79e93]'}`}>
          {env === 'live' ? 'Live (рабочие платежи)' : 'Sandbox (тестовая среда PayPal)'}
        </button>)}
      </div>
      {rest && status.platform_app_available && <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Choice active={!usePlatform} onClick={() => setUsePlatform(false)} title="Своё REST-приложение Seller Online" note="Client ID и Secret из PayPal Developer вашего аккаунта."/>
        <Choice active={usePlatform} onClick={() => setUsePlatform(true)} title="Приложение PayPal TheFEYA" note={`Нужен только email получателя (${status.platform_app_environment === 'live' ? 'Live' : 'Sandbox'}).`}/>
      </div>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {rest && !usePlatform && <>
          <label className={label}>PayPal REST Client ID
            <input className={input} value={clientId} onChange={e => setClientId(e.target.value)} autoComplete="off" spellCheck={false}
              placeholder={status.client_id_hint ? `сохранён (${status.client_id_hint})` : 'Client ID'}/>
          </label>
          <label className={label}>PayPal REST Secret
            <input className={input} type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} autoComplete="new-password"
              placeholder={status.client_id_hint ? 'сохранён — введите, чтобы заменить' : 'Secret'}/>
          </label>
          <p className={help + ' sm:col-span-2'}>PayPal Developer → Apps &amp; Credentials → {environment === 'live' ? 'Live' : 'Sandbox'} → приложение аккаунта Seller Online.
            Значения уходят прямо в зашифрованное хранилище сервера, больше не показываются и недоступны владельцу сайта.</p>
        </>}
        <label className={label + ' sm:col-span-2'}>PayPal email получателя (аккаунт Seller Online)
          <input className={input} type="email" value={payeeEmail} onChange={e => setPayeeEmail(e.target.value)} autoComplete="off" placeholder="payments@…"/>
          <span className={help + ' block'}>На этот PayPal-аккаунт поступают деньги покупателей TheFEYA — как «PayPal email» в настройках продаж Seller Online.</span>
        </label>
      </div>
    </Step>

    <Step n={2} title="Магазин в Seller Online" done={status.store_key_set}>
      <label className={label}>Персональный ключ магазина
        <input className={input} value={storeKey} onChange={e => setStoreKey(e.target.value)} autoComplete="off" spellCheck={false}
          placeholder={status.store_key_set ? `сохранён (${status.store_key_hint || '…'})` : 'ключ из раздела «CMS и персональные интернет-магазины»'}/>
      </label>
      <p className={help}>Тот же ключ, что используется для CMS и персональных магазинов (my.seller-online.com → personal_link.php).
        TheFEYA передаёт его в каждом платеже в поле custom в формате <code className="text-[#e7dcc7]">FEYA-100001;opencart:ключ</code>,
        поле invoice — номер заказа. По ним вы сопоставляете платежи с магазином.</p>
    </Step>

    <Step n={3} title="Установка и проверка подключения" done={installDone && !engineChanged}>
      <button type="button" onClick={install} disabled={Boolean(busy)}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#d4b26a] px-6 text-[14px] font-medium text-[#151318] hover:bg-[#e4c87d] disabled:opacity-60">
        {busy === 'install' ? <Loader2 className="animate-spin" size={16}/> : <ShieldCheck size={16}/>} Сохранить и проверить подключение
      </button>
      <p className={help}>
        {rest ? 'Система авторизуется в PayPal, создаёт неоплачиваемый проверочный заказ на аккаунт получателя (деньги не списываются) и сама регистрирует уведомления PayPal для thefeya.com.'
          : 'Система проверит канал подтверждения PayPal. Получателя без платежа проверить нельзя — его подтвердит тестовый платёж.'}
        {' '}Любое изменение настроек автоматически ставит оплату на паузу до повторной проверки.
      </p>
      <ul className="mt-4 space-y-2">
        {(results || []).map(r => <li key={r.check} className="flex gap-3 rounded-lg border border-white/[.08] p-3 text-[13px] leading-6">
          {r.ok ? <Check className="mt-1 shrink-0 text-[#d4b26a]" size={16}/> : <CircleAlert className="mt-1 shrink-0 text-amber-300" size={16}/>}
          <span><strong className="font-medium text-[#f7f3ec]">{CHECK_LABELS[r.check] || r.check}.</strong> <span className="text-[#cfc6b9]">{r.detail}</span>
            {r.paypal_error && <span className="block text-[12px] text-amber-200">PayPal: {r.paypal_error}{r.debug_id ? ` · debug_id ${r.debug_id}` : ''}</span>}</span>
        </li>)}
        {!results && <>
          {rest && <li className="text-[13px] text-[#a79e93]">{c.credentials ? '✓' : '○'} авторизация приложения · {c.payee ? '✓' : '○'} аккаунт получателя{c.payee_merchant_id ? ` (${c.payee_merchant_id})` : ''} · {c.webhook ? '✓' : '○'} уведомления PayPal{c.webhook_last_event_at ? ' · последнее уведомление получено' : ''}</li>}
          {status.last_error && <li className="text-[12px] text-amber-200">Последняя ошибка: {status.last_error}</li>}
        </>}
      </ul>
    </Step>

    <Step n={4} title="Тестовый платёж €1,00" done={c.test_payment}>
      <p className="text-[13px] leading-6 text-[#cfc6b9]">
        Настоящий платёж через PayPal по текущим настройкам: создаётся заказ TheFEYA, вы оплачиваете его на странице PayPal, сервер подтверждает
        платёж напрямую у PayPal и сверяет сумму, валюту, получателя и ключ магазина.
        {environment === 'live' ? ' В среде Live списывается реальный €1,00 с плательщика на аккаунт получателя — его можно вернуть в PayPal. После оплаты специалист должен убедиться, что Seller Online зачислил платёж именно магазину TheFEYA в своём кабинете.' : ' В Sandbox используйте тестового покупателя PayPal.'}
      </p>
      <button type="button" onClick={testPayment} disabled={Boolean(busy) || !installDone || engineChanged || status.active}
        className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#d4b26a] px-6 text-[14px] text-[#f1e2bd] hover:bg-[rgba(212,178,106,.08)] disabled:opacity-50">
        {busy === 'test' ? <Loader2 className="animate-spin" size={16}/> : null} Провести тестовый платёж €1,00
      </button>
      <p className={help}>
        {status.active ? 'Оплата сейчас включена — для нового теста сначала приостановите её (шаг 5).'
          : !installDone || engineChanged ? 'Станет доступно после успешной проверки подключения (шаг 3).'
          : c.test_payment ? `Подтверждён тестовый платёж в среде ${c.test_environment === 'live' ? 'Live' : 'Sandbox'}.` : 'Ещё не проводился для текущих настроек.'}
      </p>
    </Step>

    <Step n={5} title="Активация оплаты на thefeya.com" done={status.active}>
      {status.active
        ? <button type="button" onClick={() => setActive(false)} disabled={Boolean(busy)}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[rgba(216,214,211,.35)] px-6 text-[14px] text-[#f7f3ec] disabled:opacity-50">
            <Power size={16}/> Приостановить оплату
          </button>
        : <button type="button" onClick={() => setActive(true)} disabled={Boolean(busy) || !status.ready_to_activate}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#d4b26a] px-6 text-[14px] font-medium text-[#151318] hover:bg-[#e4c87d] disabled:opacity-50">
            <Power size={16}/> Включить оплату для покупателей
          </button>}
      <p className={help}>
        {status.active ? 'Покупатели оплачивают заказы через PayPal; каждый платёж подтверждается сервером и записывается в заказ.'
          : status.ready_to_activate ? 'Все проверки пройдены, тестовый платёж в Live подтверждён.'
          : !testLive ? 'Требуется успешный тестовый платёж в среде Live для текущих настроек. База данных не позволит включить оплату раньше.'
          : !status.commerce_release_approved ? 'Платёжный провайдер можно проверить, но продажи откроются только после отдельного подтверждения доставки, налогообложения и условий продажи.' : 'Требуется пройти все проверки для текущих настроек.'}
      </p>
    </Step>

    <details className={box}>
      <summary className="cursor-pointer text-[14px] text-[#f7f3ec]">Технические данные интеграции</summary>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[12px] leading-6 text-[#cfc6b9] sm:grid-cols-[220px_1fr]">
        <dt className="text-[#a79e93]">Webhook URL (регистрируется автоматически)</dt><dd className="break-all">{status.urls.webhook}</dd>
        <dt className="text-[#a79e93]">IPN / notify_url (PayPal Standard)</dt><dd className="break-all">{status.urls.ipn}</dd>
        <dt className="text-[#a79e93]">Возврат покупателя</dt><dd className="break-all">https://thefeya.com/checkout/return</dd>
        <dt className="text-[#a79e93]">invoice_id</dt><dd>номер заказа TheFEYA, например FEYA-100001</dd>
        <dt className="text-[#a79e93]">custom_id</dt><dd>FEYA-100001;opencart:&lt;ключ магазина&gt;</dd>
        <dt className="text-[#a79e93]">Валюта</dt><dd>EUR, сумма с разбивкой: товары, доставка, упаковка</dd>
        <dt className="text-[#a79e93]">События webhook</dt><dd>CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED / PENDING / DENIED / DECLINED / REFUNDED / REVERSED</dd>
        <dt className="text-[#a79e93]">Версия конфигурации</dt><dd>{status.config_version}{status.updated_at ? ` · изменена ${new Date(status.updated_at).toLocaleString('ru-RU')}` : ''}</dd>
      </dl>
    </details>
  </div>;
}
