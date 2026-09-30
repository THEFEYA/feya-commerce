import { redirect } from 'next/navigation';
export default function LegacyOwnerAttentionRedirect() {
  redirect('/admin/company/owner-attention');
}
