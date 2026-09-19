import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { AdminOrdersSavedClient } from '@/components/AdminOrdersSavedClient';
import { AtelierOrdersClient } from '@/components/AtelierOrdersClient';

export default function AdminOrdersPage() {
  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · подготовка производства</div>
          <h1>Черновики заказов</h1>
          <p>Сохранённые тестовые черновики и резервная локальная копия. Они помогают проверить будущий процесс производства, но не являются продажами, завершёнными заказами или выручкой.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/checkout" className="owner-button">Создать тестовый черновик <ArrowUpRight size={13} /></Link>
        </div>
      </header>
      <div className="owner-card is-warning" style={{ marginBottom: '18px' }}>
        <div className="owner-status is-warning">Commerce ещё не запущен</div>
        <p className="owner-card-copy">Оплата выключена. Данные этого экрана нельзя использовать как факт продаж, заказов или выручки.</p>
      </div>
    </div>
    <AdminOrdersSavedClient />
    <AtelierOrdersClient />
  </main>;
}
