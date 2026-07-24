import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function FirstRealDraftPage() {
  redirect('/admin/seo-storefront-preview');
}
