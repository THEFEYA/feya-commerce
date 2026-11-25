export const instant = true;

import type {Metadata} from 'next';
import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {GuestWithdrawal} from '@/components/withdrawal/GuestWithdrawal';
import {releaseRobotsForPath} from '@/lib/searchReleaseIndexationServer';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';
import {withdrawalEnabled} from '@/lib/withdrawal/config';

const euNoticeBase='https://europa.eu/youreurope/business/images/content/eu-legal-guarantee-notice-and-garan-label/Legal-guarantee-harmonised-notice_';

export async function generateMetadata():Promise<Metadata>{
  return{
    title:'Returns & Exchanges',
    description:'TheFEYA return, exchange, remake and cancellation policy for made-to-order stage and festival pieces.',
    alternates:{canonical:'/returns'},
    robots:await releaseRobotsForPath('/returns'),
  };
}

const sections=[
  {
    title:'Orders are made to order',
    body:[
      'Production starts promptly. If you need to change or cancel an order, contact the studio as soon as possible. Once production begins, we generally cannot accommodate a voluntary cancellation.',
      'Your legal rights to withdraw from an eligible purchase or to obtain a remedy for a problem with your order still apply.',
    ],
  },
  {
    title:'If something is wrong',
    body:[
      'Please inspect your piece when it arrives and tell the studio if it is damaged, faulty, the wrong size or colour, or different from the specifications you agreed with us.',
      'For our voluntary exchange/remake process, please contact us ideally within 1–3 days and within 7 days if possible. This preferred reporting window does not shorten legal guarantee rights or your right to report defects later. We may ask for clear photos and measurements to resolve the issue correctly.',
      'Depending on your rights, the remedy may be a repair, replacement, price reduction or refund. We cover the necessary return cost for a faulty or incorrect item where required by law.',
    ],
  },
  {
    title:'Custom and personalised orders',
    body:[
      'Made-to-measure, personalised and non-standard custom orders are final sale under our store policy, except where we made the item incorrectly, supplied the wrong item, the item is defective, or mandatory law provides otherwise.',
      'Examples include personal measurements, non-standard materials or bespoke changes made to one customer’s unique specifications. Choosing a standard listed size or color is not automatically considered personalisation.',
    ],
  },
  {
    title:'Withdrawing from an EU or UK order',
    body:[
      'For an eligible online purchase, you have 14 days after the day you or your chosen recipient receives the goods to tell the seller you are withdrawing. If goods from one order arrive separately, the period generally runs from receipt of the last item. You may also withdraw before delivery. No reason is needed.',
      'Send the goods back within 14 days after giving notice. For a full withdrawal, the refund includes the price paid and the cost of the least expensive standard delivery we offered. We use the original payment method unless you expressly agree otherwise.',
      'In the EU, we refund within 14 days of your notice. Unless we offered collection, we may wait for the goods or proof you sent them back, whichever comes first. In the UK, when you send goods back, we refund within 14 days of receiving the goods or earlier proof of posting.',
    ],
  },
  {
    title:'Sale items and store credit',
    body:[
      'A sale price does not change your statutory rights. If you qualify for a refund, you can receive it through your original payment method. If we agree to a voluntary sale-item return outside those rights, we offer store credit for a future order.',
    ],
  },
  {
    title:'Events, shoots and one-time use',
    body:[
      'You may try a piece on as you would in a shop. Wearing it at a show or shoot goes beyond ordinary inspection. Where the law allows, any deduction reflects the actual loss in value caused by that handling.',
      'A change to your event plans does not create an extra right to a refund. If delivery by a particular date is essential, tell us before ordering. Missing an essential delivery deadline may entitle you to cancel under applicable law.',
    ],
  },
  {
    title:'Where to send your return',
    body:[
      'Contact the studio for the correct parcel address and include your order number if available. You can send a withdrawal notice immediately, without waiting for instructions or approval.',
      'For a change-of-mind return you pay the direct return postage where disclosed before purchase and permitted by law. If the item is faulty or incorrect, contact us so we can arrange the appropriate return. Keep proof of posting.',
    ],
  },
];

export default function ReturnsPage(){
  const onlineWithdrawal = withdrawalEnabled();
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-36 pb-14 lg:pt-44 lg:pb-20">
      <div className="max-w-4xl">
        <div className="eyebrow-gold mb-5">Store policy · Made to order</div>
        <h1 className="visual-display text-[clamp(48px,6vw,86px)] font-medium leading-[.94] tracking-[-.045em] text-[#f7f3ec]">Returns & Exchanges</h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-7 text-[#aaa2a0]">
          For a fit issue, damaged parcel or change to your order, <Link href="/contact" className="text-bone underline underline-offset-4">contact the studio</Link>. You can give notice of withdrawal by <a href={onlineWithdrawal ? '#withdrawal-by-email' : '#withdrawal-notice'} className="text-bone underline underline-offset-4">email</a> without a customer account.
        </p>
        {onlineWithdrawal && <div id="withdrawal-notice" className="scroll-mt-24">
          <GuestWithdrawal seller={SELLER_ONLINE_PROVIDER.legalName} email={SELLER_ONLINE_PROVIDER.usOfficeEmail}/>
        </div>}
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
        <article id={onlineWithdrawal ? 'withdrawal-by-email' : 'withdrawal-notice'} className="scroll-mt-24 rounded-xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-6 lg:p-7">
          <h2 className="text-bone text-xl">How to give notice of withdrawal</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-[var(--bone-dim)]">
            <p>For an order sold by {SELLER_ONLINE_PROVIDER.legalName}, email <a className="break-all text-bone underline underline-offset-4" href={`mailto:${SELLER_ONLINE_PROVIDER.usOfficeEmail}?subject=TheFEYA%20withdrawal%20notice`}>{SELLER_ONLINE_PROVIDER.usOfficeEmail}</a>. Identify your order and say you wish to withdraw. You may use your own words.</p>
            <details>
              <summary className="cursor-pointer text-bone underline underline-offset-4">Optional withdrawal form and postal address</summary>
              <div className="mt-3 space-y-2">
                <p>To {SELLER_ONLINE_PROVIDER.legalName}, {SELLER_ONLINE_PROVIDER.contactAddress.line1}, {SELLER_ONLINE_PROVIDER.contactAddress.city}, {SELLER_ONLINE_PROVIDER.contactAddress.region} {SELLER_ONLINE_PROVIDER.contactAddress.postalCode}, {SELLER_ONLINE_PROVIDER.contactAddress.country}.</p>
                <p>I/we give notice that I/we withdraw from the purchase of the following goods:</p>
                <p>Goods or order reference:<br/>Order date / date received:<br/>Name and address of customer(s):<br/>Date of notice:<br/>Signature (for a paper notice only):</p>
                <p>This is the seller’s address for notices. Contact the studio for parcel routing.</p>
              </div>
            </details>
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-6 lg:p-7">
        <h2 className="text-bone text-xl">Before placing an order</h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
          Checkout records the version of the Terms, Returns & Exchanges and Shipping policies you accept. Your statutory consumer rights continue to apply.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-[var(--bone-dim)]">
          If goods sold to you in the EU are faulty or differ from what was agreed, the legal guarantee generally protects you for at least two years. Read the official EU notice in{' '}
          <a className="text-bone underline underline-offset-4" href={`${euNoticeBase}en.jpg`} hrefLang="en">English</a>,{' '}
          <a className="text-bone underline underline-offset-4" href={`${euNoticeBase}ga.jpg`} hrefLang="ga" lang="ga">Gaeilge</a>,{' '}
          <a className="text-bone underline underline-offset-4" href={`${euNoticeBase}nl.jpg`} hrefLang="nl" lang="nl">Nederlands</a> or{' '}
          <a className="text-bone underline underline-offset-4" href={`${euNoticeBase}de.jpg`} hrefLang="de" lang="de">Deutsch</a>.{' '}
          <a className="text-bone underline underline-offset-4" href="https://europa.eu/youreurope/citizens/consumers/shopping/guarantees-returns/index_en.htm">Read about your guarantee in text</a>.
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
