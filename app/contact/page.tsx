import type {Metadata} from 'next';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';
import {isSellerOnlinePaymentsEnabled,SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Contact TheFEYA',
      description:'Contact TheFEYA for product, order and store support.',
      alternates:{canonical:'/contact'},
      
    };
    robots:await releaseRobotsForPath('/contact'),
  };
}

export default function ContactPage(){
  const sellerOnlineEnabled=isSellerOnlinePaymentsEnabled();
  return <main className="relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">TheFEYA · Customer support</div>
        <h1 className="font-tall text-bone leading-[.95]" style={{fontSize:'clamp(52px,7vw,96px)'}}>Contact</h1>
        <p className="editorial-italic mt-6 max-w-2xl text-lg leading-relaxed text-[var(--bone-dim)]">
          For product, sizing, order or policy questions, contact TheFEYA directly.
        </p>
      </div>
    </section>

    <section className="container-feya pb-16 lg:pb-24">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <div className="eyebrow-gold">Store support</div>
          <h2 className="mt-3 text-bone text-xl">TheFEYA</h2>
          <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
            Email: <a className="text-bone hover:text-white" href="mailto:manager.feya@gmail.com">manager.feya@gmail.com</a>
          </p>
        </article>

        {sellerOnlineEnabled ? <article className="rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <div className="eyebrow-gold">Payment service contact</div>
          <h2 className="mt-3 text-bone text-xl">{SELLER_ONLINE_PROVIDER.legalName}</h2>
          <div className="mt-4 space-y-1 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>{SELLER_ONLINE_PROVIDER.contactAddress.line1}</p>
            <p>{SELLER_ONLINE_PROVIDER.contactAddress.city}, {SELLER_ONLINE_PROVIDER.contactAddress.region} {SELLER_ONLINE_PROVIDER.contactAddress.postalCode}</p>
            <p>{SELLER_ONLINE_PROVIDER.contactAddress.country}</p>
            <p className="pt-2">Email: <a className="text-bone hover:text-white" href={`mailto:${SELLER_ONLINE_PROVIDER.usOfficeEmail}`}>{SELLER_ONLINE_PROVIDER.usOfficeEmail}</a></p>
            <p>Phone: {SELLER_ONLINE_PROVIDER.usOfficePhone}</p>
          </div>
        </article> : null}
      </div>
    </section>
    <Footer/>
  </main>;
}
