export const instant = false;

import Link from 'next/link';
import { DeliveryWorkspaceClient } from '@/components/admin/DeliveryWorkspaceClient';
import { CarrierOwnerReviewClient } from '@/components/admin/CarrierOwnerReviewClient';

export default function DeliveryWorkspacePage() {
  return <main className="owner-page"><div className="owner-page-inner">
    <header className="owner-page-head"><div><div className="owner-eyebrow">Настройки магазина</div>
      <h1>Доставка и изготовление</h1><p>Профили, страны, исключения и сроки для товаров. Сохраните черновик и проверьте заказ перед публикацией тарифов.</p>
    </div><Link href="/admin/company/system" className="owner-button">Вернуться в Систему</Link></header>
    <DeliveryWorkspaceClient />
    <CarrierOwnerReviewClient />
  </div></main>;
}
