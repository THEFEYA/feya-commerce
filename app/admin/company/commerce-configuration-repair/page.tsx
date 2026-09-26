import Link from 'next/link';
import {GitBranch,ShieldCheck} from 'lucide-react';
import {AdminReleaseConfigurationRepairClient} from '@/components/AdminReleaseConfigurationRepairClient';

export const dynamic='force-dynamic';
export const revalidate=0;

export default function ReleaseConfigurationRepairPage(){
  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Commerce Truth · M1</div>
          <h1>Configuration identity repair</h1>
          <p>
            Точный production repair для launch release. Он исправляет только связь price row → sellable configuration identity.
            Цены, currency, owner overrides, payment и indexing не меняются.
          </p>
        </div>
        <Link href="/admin/company" className="owner-button">Вернуться в Сегодня</Link>
      </header>

      <section className="owner-grid two">
        <article className="owner-card is-warning">
          <div className="owner-status is-warning">Обнаружено production-аудитом</div>
          <h2 className="owner-card-title" style={{marginTop:'10px'}}>631 неверная configuration binding</h2>
          <p className="owner-card-copy">
            846 price rows относятся к оси configuration. 215 уже выровнены, а 631 сейчас указывают на sellable configuration
            с другим option mapping. Из-за этого старый price baseline больше нельзя считать безопасным для authoritative offers.
          </p>
        </article>
        <article className="owner-card is-info">
          <div className="owner-status is-info">Отдельный HOLD</div>
          <h2 className="owner-card-title" style={{marginTop:'10px'}}>3 товара / 9 color-price rows</h2>
          <p className="owner-card-copy">
            Эти строки действительно относятся к оси color и имеют разные source prices. Repair не маскирует их под configuration:
            они останутся отдельной коммерческой задачей после structural repair.
          </p>
        </article>
      </section>

      <section className="owner-section">
        <div className="owner-section-head">
          <div className="owner-section-heading">
            <span className="owner-section-icon is-work" aria-hidden="true"><GitBranch size={17}/></span>
            <div>
              <h2>Точное действие</h2>
              <div className="owner-section-kicker">Human Owner approval → atomic repair → postflight</div>
            </div>
          </div>
        </div>
        <AdminReleaseConfigurationRepairClient />
      </section>

      <section className="owner-section">
        <div className="owner-card is-success">
          <div className="owner-status is-success"><ShieldCheck size={13}/> Safety contract</div>
          <p className="owner-card-copy" style={{marginTop:'10px'}}>
            Execution проверяет exact evidence hash, 207-product scope, 856 price rows, 846 configuration-axis rows,
            неизменность commercial values и повторно блокирует payment/indexing. При любом drift транзакция откатывается.
          </p>
        </div>
      </section>
    </div>
  </main>;
}
