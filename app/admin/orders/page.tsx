import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { AdminOrdersSavedClient } from '@/components/AdminOrdersSavedClient';
import { AtelierOrdersClient } from '@/components/AtelierOrdersClient';

export default function AdminOrdersPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Заказы</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Черновики заказов</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Сохранённые черновики из Supabase и локальный резервный просмотр. Оплата выключена: этот экран нужен только для проверки и подготовки производства.</p>
        </div>
        <Link href="/checkout" className="btn-ghost">Создать тестовый черновик <ArrowUpRight size={13} /></Link>
      </div>
    </section>
    <AdminOrdersSavedClient />
    <AtelierOrdersClient />
  </main>;
}
