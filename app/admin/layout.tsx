import type { Metadata } from 'next';
import OwnerShell from '@/components/admin/OwnerShell';

export const metadata: Metadata = {
  title: 'FEYA — Центр управления',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OwnerShell>{children}</OwnerShell>;
}
