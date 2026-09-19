'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/AdminNav';
import OwnerShell from '@/components/admin/OwnerShell';

export default function AdminLegacyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';

  if (pathname.startsWith('/admin/login')) return <>{children}</>;

  // The new Company / AI operating system uses the owner-first shell.
  // These routes did not belong to the approved Product OS baseline.
  const agentRoutes = [
    '/admin/company',
    '/admin/advanced',
    '/admin/business-truth',
    '/admin/content-briefs',
    '/admin/content-qa',
    '/admin/data-authority',
    '/admin/data-health',
    '/admin/execution-map',
    '/admin/executions',
    '/admin/experiments',
    '/admin/growth',
    '/admin/incidents',
    '/admin/launch-readiness',
    '/admin/learning',
    '/admin/metrics',
    '/admin/opportunities',
    '/admin/owner-attention',
    '/admin/product-facts-review',
    '/admin/results',
    '/admin/roles',
    '/admin/scenario-tests',
    '/admin/search',
    '/admin/seo-cluster-proposals',
    '/admin/seo-clusters',
    '/admin/seo-indexability',
    '/admin/seo-keyword-review',
    '/admin/seo-ownership-proposals',
    '/admin/seo-portfolio',
    '/admin/signals',
    '/admin/strategy',
    '/admin/system',
    '/admin/system-readiness',
    '/admin/work',
  ];

  if (agentRoutes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <OwnerShell>{children}</OwnerShell>;
  }

  // Product OS remains on its approved legacy visual/workflow shell.
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
