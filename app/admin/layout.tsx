import type { Metadata } from 'next';
import AdminCompanySwitch from '@/components/admin/AdminCompanySwitch';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <AdminCompanySwitch />
    </>
  );
}
