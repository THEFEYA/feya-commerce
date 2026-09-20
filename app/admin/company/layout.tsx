import OwnerShell from '@/components/admin/OwnerShell';

export default function CompanyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OwnerShell>{children}</OwnerShell>;
}
