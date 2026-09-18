'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminCompanySwitch() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/admin/company')) return null;

  return (
    <Link href="/admin/company" className="admin-company-switch" aria-label="Открыть центр управления FEYA">
      <span className="admin-company-switch-mark" aria-hidden="true">◈</span>
      <span>
        <strong>Центр управления</strong>
        <small>Компания и ИИ-команда FEYA</small>
      </span>
    </Link>
  );
}
