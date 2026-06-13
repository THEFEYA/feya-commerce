import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { AdminOrdersSavedClient } from '@/components/AdminOrdersSavedClient';
import { AtelierOrdersClient } from '@/components/AtelierOrdersClient';

export default function AdminOrdersPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Orders</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Order drafts</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Saved checkout requests from Supabase plus local preview fallback. Payment remains off; this is review and production-prep only.</p>
        </div>
        <Link href="/checkout" className="btn-ghost">Create test draft <ArrowUpRight size={13} /></Link>
      </div>
      <AdminOrdersSavedClient />
    </section>

    <AtelierOrdersClient />
  </main>;
}
