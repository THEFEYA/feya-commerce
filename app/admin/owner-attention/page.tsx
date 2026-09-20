import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyOwnerAttentionRedirect() {
  redirect('/admin/company/owner-attention');
}
