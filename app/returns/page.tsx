import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'Returns & Exchanges',
  description:'TheFEYA return, exchange, remake and cancellation policy for made-to-order stage and festival pieces.',
  alternates:{canonical:'/returns'},
  robots:{index:false,follow:true},
};

const sections=[
  {
    title:'Orders are made to order',
    body:[
      'TheFEYA pieces enter production promptly after an order is placed. Under our store policy, orders are final once placed and we do not offer discretionary cancellations or “wear once and return” refunds.',
      'This store policy does not limit any mandatory consumer rights that cannot legally be waived.',
    ],
  },
  {
    title:'If something is wrong',
    body:[
      'Please inspect your order when it arrives. If the item is defective, materially different from the order, or the agreed size, color or configuration was supplied incorrectly, contact us as soon as possible.',
      'For our voluntary exchange/remake process, please contact us ideally within 1–3 days and no later than 7 days after delivery. We may ask for clear photos and measurements so we can resolve the issue correctly.',
      'Depending on the issue, the appropriate remedy may be an adjustment, repair, remake, replacement, exchange or another remedy required by applicable law.',
    ],
  },
  {
    title:'Custom and personalised orders',
    body:[
      'Made-to-measure, personalised and non-standard custom orders are final sale under our store policy, except where we made the item incorrectly, supplied the wrong item, the item is defective, or mandatory law provides otherwise.',
      'Examples include non-standard measurements, materials, colors, configurations or other changes made specifically for one customer.',
    ],
  },
  {
    title:'Sale items and store credit',
    body:[
      'Where TheFEYA voluntarily accepts a return or exchange of an eligible sale item, the remedy is store credit unless a different remedy is required because the item is defective, incorrect or applicable law requires otherwise.',
      'An exchange may be completed by placing a new order using the agreed store credit.',
    ],
  },
  {
    title:'Events, shoots and one-time use',
    body:[
      'A cancelled or changed event, photoshoot, performance, weather condition, missed call time or another circumstance outside TheFEYA’s control is not a reason for a voluntary cancellation or refund.',
      'Delivery estimates are not guarantees that an order will arrive before a particular event date unless TheFEYA expressly accepted that deadline in writing for the specific order.',
    ],
  },
  {
    title:'Return shipping and authorization',
    body:[
      'Do not send a return to an address that has not been provided by TheFEYA for that specific case. Unauthorized returns may not be accepted.',
      'For voluntary returns or exchanges that we agree to accept, the buyer is responsible for return shipping unless we expressly state otherwise. Where the item is defective, incorrect or non-conforming, shipping-cost responsibility follows the applicable mandatory rules.',
    ],
  },
];

export default function ReturnsPage(){
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Store policy · Made to order</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Returns & Exchanges</h1>
        <p className="editorial-italic mt-6 max-w-2xl text-lg leading-relaxed text-[var(--bone-dim)]">
          TheFEYA creates statement pieces for stage, festival, performance and editorial use. Our policy is designed to resolve genuine fit, production and order issues without turning made-to-order pieces into a free-rental service.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map(section=><article key={section.title} className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">{section.title}</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            {section.body.map(p=><p key={p}>{p}</p>)}
          </div>
        </article>)}
      </div>

      <div className="mt-6 rounded-xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-6 lg:p-7">
        <h2 className="text-bone text-xl">Before placing an order</h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
          Checkout will require an active acknowledgement that you have read the current Terms, Returns & Exchanges and Shipping policies. The policy version accepted with the order is retained as part of the order record. This acknowledgement does not waive any rights that cannot legally be waived.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/shipping" className="btn-ghost">Shipping policy</Link>
          <Link href="/shop" className="btn-ghost">Back to shop</Link>
        </div>
      </div>
    </section>
    <Footer/>
  </main>;
}
