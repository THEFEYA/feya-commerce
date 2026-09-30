export const instant = false;

import type { Metadata } from 'next';
import { connection } from 'next/server';
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

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  return <AdminLegacyShell>{children}</AdminLegacyShell>;
}
