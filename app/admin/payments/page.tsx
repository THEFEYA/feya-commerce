export const instant = false;

import {OwnerPaymentsConsoleClient} from '@/components/payments/OwnerPaymentsConsoleClient';

export default function AdminPaymentsPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-4">
      <div className="border-b border-[rgba(216,214,211,.12)] pb-7">
        <div className="eyebrow-gold mb-3">Админка · Оплата</div>
        <h1 className="font-tall text-bone leading-none" style={{fontSize: 'clamp(40px,6vw,76px)'}}>Оплата и заказы</h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">
          Подключение Seller Online, включение и пауза оплаты, оплаченные заказы для производства.
        </p>
      </div>
    </section>
    <OwnerPaymentsConsoleClient/>
  </main>;
}
