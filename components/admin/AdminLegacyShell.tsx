'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import OwnerShell from '@/components/admin/OwnerShell';

export default function AdminLegacyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';

  if (pathname.startsWith('/admin/login')) return <>{children}</>;

  // /admin/company has its own nested layout with the same OwnerShell.
  if (pathname.startsWith('/admin/company')) return <>{children}</>;

  // All Product OS / SEO / review pages now use the same owner shell.
  // Their inner page markup is preserved; only the surrounding navigation is unified.
  return <OwnerShell>{children}</OwnerShell>;
}
