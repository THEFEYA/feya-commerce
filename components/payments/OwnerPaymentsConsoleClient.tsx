'use client';

import {useCallback, useEffect, useState} from 'react';
import {Check, Copy, Link2, Loader2, Power, RefreshCw} from 'lucide-react';

type Status = {
  engine: string; environment: string; payee_email: string | null; store_key_set: boolean; active: boolean;
  activated_at: string | null; paused_at: string | null; ready_to_activate: boolean; last_error: string | null;
  checks: {credentials: boolean; payee: boolean; webhook: boolean; test_payment: boolean; test_environment: string | null; webhook_last_event_at: string | null};
  paid_orders: number; pending_orders: number;
};
type Line = {title: string; option_label: string; color: string; size: string; quantity: number; line_minor: number; wearer: string | null; made_to_measure: boolean; slug: string};
type Snapshot = {
  lines?: Line[]; extras?: {label: string; quantity: number; amount_minor: number}[];
  delivery?: {label: string; window: string} | null;
  buyer?: {first_name: string; last_name: string; email: string; phone: string} | null;
  address?: {country: string; region: string | null; city: string; postal_code: string; line1: string; line2: string | null} | null;
  gift_message?: string | null; note?: string | null; marketing_opt_in?: boolean;
  amounts?: {merchandise_minor: number; extras_minor: number; shipping_minor: number; remote_minor: number; handling_minor: number; total_minor: number};
};
type Order = {
  order_id: string; order_number: string; kind: string; status: string; environment: string; total_minor: number;
  refunded_minor: number; review_reason: string | null; buyer_name: string | null; buyer_email: string | null;
  country_code: string | null; snapshot: Snapshot; provider_order_id: string | null; capture_id: string | null;
  created_at: string; paid_at: string | null;
};
type Grant = {grant_id: string; role: string; label: string; created_at: string; expires_at: string; last_used_at: string | null; active: boolean};
type Audit = {at: string; actor_role: string; actor: string; action: string};

const STATUS_RU: Record<string, string> = {
  paid: 'Оплачен', pending_payment: 'Ожидает оплаты', payment_pending: 'Оплата подтверждается PayPal',
  payment_failed: 'Оплата не прошла', cancelled: 'Отменён покупателем', refunded: 'Возврат',
  partially_refunded: 'Частичный возврат', reversed: 'Оспорен (chargeback)', needs_review: 'Требует проверки',
};
const ACTION_RU: Record<string, string> = {
  provider_configured: 'Изменены настройки подключения', check_credentials: 'Проверка доступа PayPal', check_payee: 'Проверка получателя',
  check_webhook: 'Установка уведомлений PayPal', payments_activated: 'Оплата включена', payments_paused: 'Оплата приостановлена',
  order_paid: 'Заказ оплачен', payment_mismatch: 'Платёж не совпал с заказом', duplicate_payment: 'Повторный платёж по заказу',
  order_refund: 'Возврат', order_reversal: 'Оспаривание платежа', grant_minted: 'Создана ссылка доступа', grant_revoked: 'Ссылка отозвана',
};
const money = (minor: number) => new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'EUR'}).format(minor / 100);
const date = (value: string | null) => value ? new Date(value).toLocaleString('ru-RU', {dateStyle: 'short', timeStyle: 'short'}) : '—';
const card = 'rounded-[16px] border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-5 sm:p-6';

export function OwnerPaymentsConsoleClient() {
  const [data, setData] = useState<{status: Status; orders: Order[]; grants: Grant[]; audit: Audit[]} | null>(null);
  const [error, setError] = useState('');
  const [tests, setTests] = useState(false);
  const [busy, setBusy] = useState('');
  const [link, setLink] = useState<{url: string; expires: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/payments${tests ? '?tests=1' : ''}`, {cache: 'no-store'});
    const body = await response.json().catch(() => ({ok: false}));
    if (response.status === 401) { setError('Войдите в админку под учётной записью владельца.'); return; }
    if (!body.ok) { setError('Не удалось загрузить данные оплаты. Обновите страницу.'); return; }
    setError(''); setData(body);
  }, [tests]);
  useEffect(() => { load(); }, [load]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch('/api/admin/payments', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    return response.json().catch(() => ({ok: false}));
  }
  async function mint() {
    setBusy('mint');
    const result = await post({action: 'mint_technician_link', label: 'Seller Online', ttl_days: 14});
    setBusy('');
    if (result.ok) { setLink({url: result.link, expires: result.expires_at}); setCopied(false); load(); }
    else setError('Не удалось создать ссылку.');
  }
  async function revoke(id: string) { setBusy('revoke'); await post({action: 'revoke_grant', grant_id: id}); setBusy(''); load(); }
  async function toggle(active: boolean) {
    setBusy('toggle');
    const result = await post({action: 'set_active', active});
    setBusy('');
    if (!result.ok) setError(result.code === 'live_test_payment_required' ? 'Сначала нужен успешный тестовый платёж в Live (его проводит специалист Seller Online).' : 'Не удалось изменить статус оплаты.');
    load();
  }
  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setCopied(false); }
  }

  if (!data) return <section className="container-feya py-8">{error
    ? <p className="text-[14px] text-amber-100" role="alert">{error}</p>
    : <p className="text-[14px] text-[var(--bone-dim)]" role="status"><Loader2 className="mr-2 inline animate-spin" size={16}/>Загрузка…</p>}</section>;

  const s = data.status;
  const step = (ok: boolean, label: string) => <li className="flex items-center gap-2"><span className={ok ? 'text-[#d4b26a]' : 'text-[#7d7572]'}>{ok ? '●' : '○'}</span>{label}</li>;

  return <section className="container-feya space-y-5 pb-16 pt-4">
    {error && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[13px] text-amber-100" role="alert">{error}</p>}

    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}>
        <p className="text-[12px] uppercase tracking-[.16em] text-[var(--bone-dim)]">Оплата на сайте</p>
        <p className={`mt-2 text-[26px] ${s.active ? 'text-[#e4c87d]' : 'text-bone'}`}>{s.active ? 'Включена' : 'Выключена'}</p>
        <p className="mt-1 text-[13px] text-[var(--bone-dim)]">
          {s.engine === 'paypal_checkout' ? 'PayPal Checkout' : 'PayPal Standard'} · {s.environment === 'live' ? 'Live' : 'Sandbox'}
          {s.payee_email ? ` · деньги поступают на ${s.payee_email}` : ''}
        </p>
        <ul className="mt-4 space-y-1.5 text-[13px] text-[#d8d1c5]">
          {s.engine === 'paypal_checkout' && step(s.checks.credentials && s.checks.payee, 'PayPal REST: приложение проверено и получатель указан (зачисление — после теста €1)')}
          {step(s.store_key_set, 'Ключ магазина Seller Online указан')}
          {s.engine === 'paypal_checkout' && step(s.checks.webhook, 'Уведомления PayPal установлены')}
          {step(s.checks.test_payment && s.checks.test_environment === 'live', 'Тестовый платёж в Live подтверждён')}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          {s.active
            ? <button type="button" onClick={() => toggle(false)} disabled={Boolean(busy)} className="btn-ghost inline-flex items-center gap-2"><Power size={14}/> Приостановить оплату</button>
            : <button type="button" onClick={() => toggle(true)} disabled={Boolean(busy) || !s.ready_to_activate} className="btn-chrome inline-flex items-center gap-2 disabled:opacity-50"><Power size={14}/> Включить оплату</button>}
          <a className="btn-ghost" href="/partner/seller-online">Открыть панель подключения</a>
        </div>
        {s.last_error && <p className="mt-3 text-[12px] text-amber-200">Последняя ошибка проверки: {s.last_error}</p>}
      </div>

      <div className={card}>
        <p className="text-[12px] uppercase tracking-[.16em] text-[var(--bone-dim)]">Доступ для специалиста Seller Online</p>
        <p className="mt-2 text-[14px] leading-6 text-[#d8d1c5]">
          Создайте ссылку и отправьте её специалисту. По ней открывается только подключение оплаты — без доступа к заказам, покупателям и админке.
          Ссылка показывается один раз.
        </p>
        <button type="button" onClick={mint} disabled={Boolean(busy)} className="btn-chrome mt-4 inline-flex items-center gap-2"><Link2 size={14}/> Создать ссылку на 14 дней</button>
        {link && <div className="mt-4 rounded-lg border border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.06)] p-3">
          <p className="break-all font-mono text-[12px] text-[#f1e2bd]">{link.url}</p>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--bone-dim)]">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-[#d4b26a]">{copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? 'Скопировано' : 'Копировать'}</button>
            <span>действует до {date(link.expires)}</span>
          </div>
        </div>}
        <ul className="mt-4 space-y-2 text-[12px] text-[var(--bone-dim)]">
          {data.grants.filter(g => g.active).map(g => <li key={g.grant_id} className="flex items-center justify-between gap-3 border-t border-white/[.06] pt-2">
            <span>{g.label || g.role} · до {date(g.expires_at)}{g.last_used_at ? ` · открывалась ${date(g.last_used_at)}` : ' · ещё не открывалась'}</span>
            <button type="button" onClick={() => revoke(g.grant_id)} className="text-amber-200 underline underline-offset-2">Отозвать</button>
          </li>)}
        </ul>
      </div>
    </div>

    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] text-bone">Заказы</h2>
        <div className="flex items-center gap-4 text-[12px] text-[var(--bone-dim)]">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={tests} onChange={e => setTests(e.target.checked)} className="accent-[#d4b26a]"/> показывать тестовые платежи</label>
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-[#d4b26a]"><RefreshCw size={13}/> Обновить</button>
        </div>
      </div>
      <p className="mt-1 text-[12px] text-[var(--bone-dim)]">Оплачено: {s.paid_orders} · ожидают оплаты: {s.pending_orders}. Статус «Оплачен» ставится только после подтверждения PayPal.</p>
      {data.orders.length === 0 && <p className="mt-6 text-[13px] text-[var(--bone-dim)]">Заказов пока нет.</p>}
      <div className="mt-4 divide-y divide-white/[.07]">
        {data.orders.map(o => {
          const snap = o.snapshot || {};
          const expanded = open === o.order_id;
          return <div key={o.order_id} className="py-3">
            <button type="button" onClick={() => setOpen(expanded ? null : o.order_id)} className="grid w-full grid-cols-[1fr_auto] gap-3 text-left sm:grid-cols-[150px_1fr_160px_110px]">
              <span className="text-[14px] text-bone">{o.order_number}{o.kind === 'test' ? ' · тест' : ''}</span>
              <span className="hidden text-[13px] text-[var(--bone-dim)] sm:block">{o.buyer_name || '—'}{o.country_code ? ` · ${o.country_code}` : ''} · {date(o.created_at)}</span>
              <span className={`text-[13px] ${o.status === 'paid' ? 'text-[#e4c87d]' : o.status === 'needs_review' ? 'text-amber-200' : 'text-[var(--bone-dim)]'}`}>{STATUS_RU[o.status] || o.status}</span>
              <span className="text-right text-[14px] text-bone">{money(o.total_minor)}</span>
            </button>
            {expanded && <div className="mt-3 grid gap-4 rounded-lg bg-white/[.02] p-4 text-[13px] leading-6 text-[#d8d1c5] lg:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[.14em] text-[var(--bone-dim)]">Изделия</p>
                {(snap.lines || []).map((l, i) => <p key={i}>{l.title} — {l.option_label}, {l.color}, размер {l.size}, ×{l.quantity}{l.wearer ? `, ${l.wearer === 'men' ? 'мужское' : 'женское'}` : ''}{l.made_to_measure ? ', по меркам' : ''} · {money(l.line_minor)}</p>)}
                {(snap.extras || []).map((x, i) => <p key={'x' + i} className="text-[var(--bone-dim)]">+ {x.label}{x.quantity > 1 ? ` ×${x.quantity}` : ''} · {money(x.amount_minor)}</p>)}
                {snap.delivery && <p className="mt-2">{snap.delivery.label} ({snap.delivery.window})</p>}
                {snap.gift_message && <p className="mt-2">Текст открытки: «{snap.gift_message}»</p>}
                {snap.note && <p className="mt-2">Комментарий: {snap.note}</p>}
                {o.review_reason && <p className="mt-2 text-amber-200">Причина проверки: {o.review_reason}</p>}
                {o.refunded_minor > 0 && <p className="mt-2">Возвращено: {money(o.refunded_minor)}</p>}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[.14em] text-[var(--bone-dim)]">Покупатель и доставка</p>
                {snap.buyer ? <>
                  <p>{snap.buyer.first_name} {snap.buyer.last_name}</p>
                  <p>{snap.buyer.email} · {snap.buyer.phone}</p>
                </> : <p className="text-[var(--bone-dim)]">—</p>}
                {snap.address && <p className="mt-1">{snap.address.line1}{snap.address.line2 ? `, ${snap.address.line2}` : ''}, {snap.address.city}{snap.address.region ? `, ${snap.address.region}` : ''}, {snap.address.postal_code}, {snap.address.country}</p>}
                {snap.marketing_opt_in && <p className="mt-1 text-[var(--bone-dim)]">Согласие на рассылку: да</p>}
                <p className="mt-2 text-[12px] text-[var(--bone-dim)]">PayPal: заказ {o.provider_order_id || '—'} · платёж {o.capture_id || '—'} · {o.environment === 'live' ? 'Live' : 'Sandbox'}{o.paid_at ? ` · оплачен ${date(o.paid_at)}` : ''}</p>
              </div>
            </div>}
          </div>;
        })}
      </div>
    </div>

    <div className={card}>
      <h2 className="text-[16px] text-bone">Журнал</h2>
      <ul className="mt-3 space-y-1 text-[12px] text-[var(--bone-dim)]">
        {data.audit.map((a, i) => <li key={i}>{date(a.at)} · {ACTION_RU[a.action] || a.action} · {a.actor_role === 'technician' ? 'специалист Seller Online' : a.actor_role === 'owner' ? 'владелец' : a.actor_role === 'provider' ? 'PayPal' : a.actor_role}</li>)}
      </ul>
    </div>
  </section>;
}
