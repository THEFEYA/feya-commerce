import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DECISIONS = [
  { title: 'Похожесть товаров — не штраф', text: 'Для Google это не Etsy-локомотив, который съедает показы внутри одного marketplace. Похожесть используем как сигнал продуктовой линии и как подсказку для разведения углов текста.' },
  { title: 'Блокируем только почти дубль', text: 'Красный блокер нужен только если совпадают главный ключ, угол заголовка и описание почти один в один, либо если страница не добавляет нового смысла для пользователя.' },
  { title: 'Разводим углы, а не запрещаем ключи', text: 'Два похожих товара могут использовать общий semantic universe, но один получает главный угол по детали, второй по событию, третий по материалу, четвёртый по образу.' },
  { title: 'Уникальность текста важнее страха', text: 'Описание должно быть человеческим, точным и отличаться по selling angle: компоненты, styling, use case, фото, комплектность, материал/поверхность, событие.' },
];

const LEVELS = [
  { level: 'БЕЗОПАСНО', rule: 'Похожая категория или общий стиль, но разные детали, фото, комплектация или угол.', action: 'Можно использовать похожие ключи, но дать уникальный title, intro и смысловой акцент.' },
  { level: 'НАБЛЮДАТЬ', rule: 'Одинаковый главный ключ у 2–3 близких товаров.', action: 'Не блокировать. Подсказать разные вторичные ключи, long-tail и места использования.' },
  { level: 'РИСК ДУБЛЯ', rule: 'Почти одинаковый title, description, главный ключ и визуальное обещание.', action: 'Не публиковать как есть. Нужен новый угол текста или решение через коллекцию/canonical.' },
];

export default function PortfolioOverlapPolicyPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · политика похожести</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Политика похожести товаров</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Переопределяем старую Etsy-логику каннибализации: для Google похожесть не является автоматическим минусом. Это инструмент управления уникальностью, углом текста и распределением главного поискового намерения.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/scoring/preview" className="btn-ghost">Preview scoring <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring" className="btn-ghost">Контракт scoring <ArrowUpRight size={13} /></Link></div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">{DECISIONS.map((item) => <div key={item.title} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4"><div className="flex items-start justify-between gap-3"><div className="text-bone text-[14px] leading-snug">{item.title}</div><ShieldCheck size={15} className="text-[var(--gold-warm)]" /></div><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{item.text}</div></div>)}</div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Уровни похожести</div></div>
        <div className="p-4 space-y-3">{LEVELS.map((item) => <div key={item.level} className="grid md:grid-cols-[150px_1fr_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[var(--gold-warm)] text-[12px] uppercase tracking-[0.16em]">{item.level}</div><div className="text-[11px] leading-relaxed text-[var(--bone-dim)]">{item.rule}</div><div className="text-[11px] leading-relaxed text-bone">{item.action}</div></div>)}</div>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Итоговое правило для системы: похожесть снижает уверенность только при почти полном дубле. В остальных случаях она помогает выбрать уникальный угол: через деталь товара, событие, материал, образ или коллекцию. Поэтому в scoring это не штраф, а слой разведения товарного портфеля.
      </div>
    </section>
  </main>;
}
