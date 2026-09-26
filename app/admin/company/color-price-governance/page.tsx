import Link from 'next/link';
import {Palette,ShieldCheck} from 'lucide-react';
import {AdminColorPriceGovernanceClient} from '@/components/AdminColorPriceGovernanceClient';

export const dynamic='force-dynamic';
export const revalidate=0;

export default function ColorPriceGovernancePage(){
  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Commerce Truth · M1</div>
          <h1>Color-price exception lane</h1>
          <p>
            Три legacy leather products имеют реальные source-observed цены по цвету. Здесь они проходят отдельный exact governance,
            а не принудительно приводятся к общему правилу price-neutral color.
          </p>
        </div>
        <Link href="/admin/company" className="owner-button">Вернуться в Сегодня</Link>
      </header>

      <section className="owner-grid two">
        <article className="owner-card is-warning">
          <div className="owner-status is-warning">Source truth</div>
          <h2 className="owner-card-title" style={{marginTop:'10px'}}>3 товара / 9 exact prices</h2>
          <p className="owner-card-copy">
            У каждого товара есть Black, Green и Brown с разными исходными суммами. Все девять строк имеют 95% source confidence,
            source amount = public amount и не содержат manual override.
          </p>
        </article>
        <article className="owner-card is-info">
          <div className="owner-status is-info">Variant rule</div>
          <h2 className="owner-card-title" style={{marginTop:'10px'}}>Без Cartesian вариантов</h2>
          <p className="owner-card-copy">
            Price row остаётся единственным денежным authority. Позже variant связывает конкретную price row только с её цветом;
            система не умножает три цены на дополнительные цвета или размеры автоматически.
          </p>
        </article>
      </section>

      <section className="owner-section">
        <div className="owner-section-head">
          <div className="owner-section-heading">
            <span className="owner-section-icon is-work" aria-hidden="true"><Palette size={17}/></span>
            <div>
              <h2>Точное действие</h2>
              <div className="owner-section-kicker">Доступно только после catalog-wide structural repair</div>
            </div>
          </div>
        </div>
        <AdminColorPriceGovernanceClient />
      </section>

      <section className="owner-section">
        <div className="owner-card is-success">
          <div className="owner-status is-success"><ShieldCheck size={13}/> Safety contract</div>
          <p className="owner-card-copy" style={{marginTop:'10px'}}>
            Execution сохраняет все девять commercial amounts и currency, создаёт только недостающие price-scope identities,
            подтверждает exact governance и оставляет order creation, payment и indexing выключенными.
          </p>
        </div>
      </section>
    </div>
  </main>;
}
