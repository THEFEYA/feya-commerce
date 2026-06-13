import type { ReactNode } from 'react';
import { AdminNav } from '@/components/AdminNav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07070A]">
      <AdminNav />
      <div className="lg:pl-[292px]">
        <div className="lg:hidden border-b border-[rgba(216,214,211,.12)] bg-black/50 px-5 py-4 backdrop-blur-xl">
          <div className="eyebrow-gold mb-1">FEYA Control Tower</div>
          <div className="text-[12px] text-[var(--bone-dim)]">Internal admin navigation</div>
        </div>
        {children}
      </div>
    </div>
  );
}
