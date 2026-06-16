'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BadgeCheck, ClipboardList, PackageCheck, ShieldCheck, Truck, UserRound } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

type DraftItem = {
  title?: string;
  image?: string;
  config?: string;
  color?: string;
  size?: string;
  qty?: number;
  price?: number;
  currency?: string;
  configuration_id?: string;
  component_code?: string;
  component_family?: string;
  price_confidence_status?: string;
  label_confidence_status?: string;
  is_full_set?: boolean;
  is_bundle?: boolean;
};

type CheckoutDraft = {
  items?: DraftItem[];
  delivery?: 'standard' | 'express';
  shipping?: number;
  subtotal?: number;
  total?: number;
  currency?: string;
  contact?: {
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    note?: string;
  };
  payment_status?: string;
  order_status?: string;
  created_at?: string;
};

const DRAFT_KEY = 'feya_checkout_draft_v1';

const PIPELINE = [
  { label: 'Черновик получен', icon: ClipboardList },
  { label: 'Проверка цены и названия', icon: ShieldCheck },
  { label: 'Очередь производства', icon: PackageCheck },
  { label: 'Доставка и трекинг', icon: Truck },
];

function readDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(DRAFT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function itemWarnings(item: DraftItem) {
  const warnings: string[] = [];
  if (!item.configuration_id) warnings.push('Нет configuration_id');
  if (!item.component_code) warnings.push('Нет component_code');
  if (item.price_confidence_status === 'unverified') warnings.push('Цена не проверена');
  if (item.label_confidence_status === 'unverified') warnings.push('Название не проверено');
  return warnings;
}

export function AtelierOrdersClient() {
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  const items = Array.isArray(draft?.items) ? draft?.items || [] : [];
  const currency = draft?.currency || items[0]?.currency || 'EUR';
  const warnings = useMemo(() => {
    const list = ['Локальный резервный черновик: основная очередь Supabase проверяется выше'];
    if (!draft?.contact?.email) list.push('Нет email клиента');
    if (!draft?.contact?.address) list.push('Нет адреса доставки');
    if (!items.length) list.push('Нет позиций в черновике');
    for (const item of items) list.push(...itemWarnings(item));
    return Array.from(new Set(list));
  }, [draft, items]);

  if (!draft) {
    return (
      <section className="container-feya pt-10 pb-20">
        <div className="glass rounded-2xl p-8">
          <div className="eyebrow-gold mb-3">Локальный резервный черновик</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,68px)' }}>Локального черновика пока нет</h1>
          <p className="mt-4 text-[var(--bone-dim)] max-w-xl">Создай тестовый черновик через checkout, если нужно проверить резервное локальное сохранение. Основная очередь черновиков Supabase находится выше.</p>
          <Link href="/checkout" className="btn-chrome mt-6">Перейти к тестовому checkout <ArrowUpRight size={13} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-feya pt-10 pb-20">
      <div className="border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div className="eyebrow-gold mb-3 flex items-center gap-2"><BadgeCheck size={14} /> Локальный резервный черновик</div>
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.035em]" style={{ fontSize: 'clamp(32px,4.5vw,62px)' }}>Резервная проверка черновика</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренняя проверка checkout-запроса из localStorage. Основной рабочий источник для админки — сохранённые черновики Supabase выше.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-5">
          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><UserRound size={14} /> Данные клиента</div>
            <div className="grid md:grid-cols-2 gap-3 text-[13px] text-[var(--bone-dim)]">
              <Info label="Имя" value={draft.contact?.fullName} />
              <Info label="Email" value={draft.contact?.email} />
              <Info label="Телефон" value={draft.contact?.phone} />
              <Info label="Способ доставки" value={draft.delivery === 'express' ? 'Express DHL' : 'Standard UPS'} />
              <Info label="Адрес доставки" value={draft.contact?.address} wide />
              <Info label="Заметка клиента" value={draft.contact?.note} wide />
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Позиции для производства</div>
            <div className="space-y-3">
              {items.map((item, index) => {
                const itemReview = itemWarnings(item);
                return <div key={`${item.title}-${index}`} className="grid grid-cols-[68px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
                  <div className="relative h-[86px] rounded-md overflow-hidden bg-black/30">{item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                  <div>
                    <div className="text-bone text-[14px] leading-snug">{item.title || 'Изделие TheFEYA'}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.config || 'Опция'} · {item.color || 'Цвет'} · {item.size || 'Размер'} · Кол-во {item.qty || 1}</div>
                    <div className="mt-2 font-price text-gold-grad text-[22px] leading-none">{formatPrice((item.price || 0) * (item.qty || 1), item.currency || currency)}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.component_code ? <Pill>{item.component_code}</Pill> : null}
                      {item.component_family ? <Pill>{item.component_family}</Pill> : null}
                      {item.is_full_set ? <Pill tone="warning">Полный комплект</Pill> : null}
                      {item.is_bundle ? <Pill tone="warning">Комплект</Pill> : null}
                      {itemReview.map((warning) => <Pill key={warning} tone="danger">{warning}</Pill>)}
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </section>
        </div>

        <aside className="col-span-12 lg:col-span-5 space-y-5">
          <section className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
            <div className="eyebrow-gold mb-4">Сводка черновика</div>
            <div className="space-y-2 text-[13px] text-[var(--bone-dim)]">
              <div className="flex justify-between"><span>Товары</span><span>{formatPrice(draft.subtotal || 0, currency)}</span></div>
              <div className="flex justify-between"><span>Доставка</span><span>{draft.shipping ? formatPrice(draft.shipping, currency) : 'Включена'}</span></div>
              <div className="pt-4 border-t border-[rgba(216,214,211,.12)] flex justify-between items-end"><span className="eyebrow">Итого черновик</span><span className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(draft.total || 0, currency)}</span></div>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Предупреждения проверки</div>
            <div className="space-y-2">
              {warnings.map((warning) => <div key={warning} className="rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.055)] px-3 py-2 text-[12px] leading-relaxed text-[var(--gold-warm)]">{warning}</div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Процесс обработки</div>
            <div className="space-y-3">
              {PIPELINE.map(({ label, icon: Icon }, index) => (
                <div key={label} className="flex items-center gap-3 text-[13px] text-[var(--bone-dim)]">
                  <div className="h-8 w-8 rounded-full border border-[rgba(216,214,211,.14)] bg-black/20 flex items-center justify-center text-[var(--gold-warm)]"><Icon size={14} /></div>
                  <span>{index + 1}. {label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return <div className={`rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 ${wide ? 'md:col-span-2' : ''}`}><div className="eyebrow-dim mb-1">{label}</div><div className="text-bone">{value || 'Не указано'}</div></div>;
}

function Pill({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}
