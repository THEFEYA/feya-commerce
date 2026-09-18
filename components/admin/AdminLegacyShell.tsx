'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/AdminNav';

export default function AdminLegacyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';

  if (pathname.startsWith('/admin/company') || pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#07070A]">
      <AdminNav />
      <div className="lg:pl-[292px]">
        <div className="lg:hidden border-b border-[rgba(216,214,211,.12)] bg-black/50 px-5 py-4 backdrop-blur-xl">
          <div className="eyebrow-gold mb-1">FEYA · Панель управления</div>
          <div className="text-[12px] text-[var(--bone-dim)]">Внутренняя навигация админки</div>
        </div>
        {children}
      </div>
    </div>
  );
}
