export const instant = false;

import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  Scissors,Truck,Plane,Boxes,Route,ScanLine,FileCheck2,
  ShieldCheck,ArrowRight,MapPin,
} from 'lucide-react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';

export const metadata:Metadata={
  title:'TheFEYA · Shipping Policy Review',
  description:'Private visual preview of TheFEYA delivery, production, shipping costs and customs guidance.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};

const box='rounded-[18px] border border-white/[.14] bg-[linear-gradient(150deg,rgba(255,255,255,.04),rgba(255,255,255,.012))]';
const smallTitle='text-[20px] sm:text-[22px] font-medium tracking-[-.02em] text-[#f7f3ec]';

function IconSpot({children}:{children:React.ReactNode}){
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(212,178,106,.26)] bg-[radial-gradient(circle_at_30%_20%,rgba(212,178,106,.14),rgba(212,178,106,.03))] text-[#dfbf79]">
    {children}
  </span>;
}

export default function ShippingReviewPage(){
  if(process.env.VERCEL_ENV!=='preview'&&process.env.NODE_ENV==='production')notFound();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-9 sm:pt-36 lg:pt-40 lg:pb-11">
      <p className="eyebrow-gold mb-4">TheFEYA · Shipping & care</p>
      <h1 className="visual-display max-w-4xl text-[clamp(31px,3.8vw,50px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">
        Shipping & Delivery
      </h1>
      <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">
        Your look is prepared in our workshop, carefully packed and sent to your destination.
        Choose the shipping option that suits your plans.
      </p>
    </section>

    <section className="container-feya pb-14 lg:pb-20" aria-label="Shipping information">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className={box+' p-6 sm:p-7'}>
          <IconSpot><Scissors size={35} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <p className="eyebrow-gold mt-6">Handmade for you</p>
          <h2 className="mt-3 text-[34px] font-medium text-[#f7f3ec]">3–5 days</h2>
          <p className="mt-2 text-[14px] font-medium text-[#e3dfd6]">Production</p>
          <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
            Typical production is 3–5 business days. Time varies by design and order complexity, before dispatch.
          </p>
        </article>
        <article className={box+' p-6 sm:p-7'}>
          <IconSpot><Truck size={38} strokeWidth={1.4} aria-hidden="true"/></IconSpot>
          <p className="eyebrow-gold mt-6">Standard Shipping</p>
          <h2 className="mt-3 text-[37px] font-medium text-[#f7f3ec]">€19</h2>
          <p className="mt-2 text-[14px] font-medium text-[#e3dfd6]">10–14 working days</p>
          <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
            A convenient option for most orders, with regular preparation and tracked delivery.
          </p>
        </article>
        <article className="rounded-[18px] border border-[rgba(212,178,106,.40)] bg-[linear-gradient(145deg,rgba(212,178,106,.10),rgba(255,255,255,.015))] p-6 sm:p-7">
          <IconSpot><Plane size={37} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <p className="eyebrow-gold mt-6">Express Shipping · Priority</p>
          <h2 className="mt-3 text-[37px] font-medium text-[#f7f3ec]">€35</h2>
          <p className="mt-2 text-[14px] font-medium text-[#e3dfd6]">6–9 working days</p>
          <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
            Our priority option for time-sensitive orders moves preparation ahead in the dispatch queue.
          </p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className={box+' flex min-w-0 gap-5 p-6 sm:p-7'}>
          <IconSpot><Boxes size={33} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <div>
            <h2 className={smallTitle}>Your parcel & delivery price</h2>
            <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
              Additional packaging space costs €5 for each different product listing beyond the first.
              Multiple sizes, pieces or quantities within the same listing do not add this charge.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              A €20 remote-region delivery surcharge may apply to eligible destinations where verified; any such charge is shown before payment.
            </p>
          </div>
        </article>
        <article className={box+' flex min-w-0 gap-5 p-6 sm:p-7'}>
          <IconSpot><Route size={34} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <div>
            <h2 className={smallTitle}>A reliable courier for your route</h2>
            <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
              We regularly work with Nova Poshta (Нова пошта), an established Ukrainian delivery company.
              Our studio can select another suitable carrier for your destination or discuss a specific preference with you.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              Please provide your correct address, telephone and email so your courier can reach you when needed.
            </p>
          </div>
        </article>
        <article className={box+' flex min-w-0 gap-5 p-6 sm:p-7'}>
          <IconSpot><ScanLine size={34} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <div>
            <h2 className={smallTitle}>Tracking & personal support</h2>
            <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
              We share your tracking number after dispatch and help you follow the shipment to delivery.
              Our team stays available if you need help with courier communication or delivery updates.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              Travel time is an estimate, not a guaranteed arrival date. Courier timetables, public holidays and customs clearance affect the route.
            </p>
          </div>
        </article>
        <article className={box+' flex min-w-0 gap-5 p-6 sm:p-7'}>
          <IconSpot><FileCheck2 size={33} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
          <div>
            <h2 className={smallTitle}>Documents & customs</h2>
            <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)]">
              We prepare the required export documents and Customs declarations carefully, using accurate
              descriptions and any lawful tariff reductions that apply. We work to keep import costs as low as legally possible.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[var(--bone-dim)]">
              If a destination authority assesses import duties or local taxes, the recipient pays them where applicable.
              Keep an eye on courier emails after customs clearance in case confirmation is requested.
            </p>
          </div>
        </article>
      </div>

      <div className="mt-5 flex items-start gap-4 rounded-[16px] border border-[rgba(212,178,106,.23)] bg-[rgba(212,178,106,.035)] p-5 sm:p-6">
        <IconSpot><ShieldCheck size={31} strokeWidth={1.45} aria-hidden="true"/></IconSpot>
        <div>
          <h2 className="text-[18px] font-medium text-[#f7f3ec]">Every order matters to us</h2>
          <p className="mt-2 max-w-4xl text-[14px] leading-7 text-[var(--bone-dim)]">
            We take care of preparing your shipment and the paperwork, and remain in touch throughout delivery.
            Let us know if you need assistance with a change of destination, a particular shipping request or tracking.
          </p>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/cart" className="btn-chrome inline-flex items-center gap-2">View your bag <ArrowRight size={16} aria-hidden="true"/></Link>
        <Link href="/contact" className="btn-ghost inline-flex items-center gap-2"><MapPin size={15} aria-hidden="true"/>Contact us</Link>
        <Link href="/returns" className="btn-ghost">Returns & Exchanges</Link>
      </div>
    </section>
    <Footer/>
  </main>;
}
