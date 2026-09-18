import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AdminLegacyShell from '@/components/admin/AdminLegacyShell';

export const metadata: Metadata = {
  title: 'FEYA Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLegacyShell>{children}</AdminLegacyShell>;
}
