import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {Camera,HeartHandshake,Ruler,ShieldCheck,Star,Scissors,Mail} from 'lucide-react';

const card='rounded-[15px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.023)] p-6 sm:p-8';
const heading='text-[21px] sm:text-[24px] font-medium text-[#f7f3ec] tracking-[-.02em]';
const copy='mt-3 text-[14px] sm:text-[15px] leading-7 text-[var(--bone-dim)]';

function Frame({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:React.ReactNode}){
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-32 pb-10 sm:pt-36 lg:pt-40">
      <div className="max-w-4xl">
        <p className="eyebrow-gold mb-4">{eyebrow}</p>
        <h1 className="visual-display text-[clamp(36px,4.4vw,60px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">{title}</h1>
        <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">{description}</p>
      </div>
    </section>
    <div className="container-feya pb-16 lg:pb-24">{children}</div>
    <Footer/>
  </main>;
}

export function OwnerAboutReview(){
  return <Frame eyebrow="TheFEYA · Independent designer atelier" title="About TheFEYA"
    description="We believe what you wear can express who you are — boldly, unmistakably and entirely on your own terms.">
    <section className="rounded-[18px] border border-[rgba(212,178,106,.26)] bg-[radial-gradient(ellipse_at_top_right,rgba(212,178,106,.09),rgba(255,255,255,.015)_55%)] p-7 sm:p-10" aria-labelledby="feya-mission">
      <p className="eyebrow-gold">Our mission</p>
      <h2 id="feya-mission" className="visual-display mt-4 max-w-4xl text-[clamp(26px,3vw,41px)] leading-[1.15] text-[#f7f3ec]">
        Be seen. Be remembered. Be yourself.
      </h2>
      <p className={copy+' max-w-3xl'}>
        Our mission is to help performers, festival-goers, artists and confident individuals express their identity through distinctive clothing.
        Whether your stage is a performance, a festival or a photo shoot, we create pieces that bring your own personality into focus.
        The attention may follow — the expression starts with you.
      </p>
    </section>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <article className={card}><Star size={23} className="text-[#d4b26a]" aria-hidden="true"/>
        <h2 className={heading+' mt-5'}>A recognizable design language</h2>
        <p className={copy}>Sculptural silhouettes, reflective impact and coordinated statement pieces are part of our original TheFEYA design world.
        We design for strong visual character, not everyday uniformity. Each product page specifies its actual materials, components and selectable configurations.</p>
      </article>
      <article className={card}><Scissors size={23} className="text-[#d4b26a]" aria-hidden="true"/>
        <h2 className={heading+' mt-5'}>Handmade, with room for your ideas</h2>
        <p className={copy}>Pieces are typically prepared to order in around 3–5 working days; individual designs may need more time.
        We can discuss adjustments to fit, approved colors or details where a design allows. We specialize in our own creative direction rather than unrestricted made-from-a-sketch manufacturing.
        <Link href="/contact-review" className="ml-1 text-[#e1c27a] underline underline-offset-4">Ask our studio</Link> before ordering.</p>
      </article>
      <article className={card}><Camera size={23} className="text-[#d4b26a]" aria-hidden="true"/>
        <h2 className={heading+' mt-5'}>Our imagery, explained</h2>
        <p className={copy}>Some campaign images are stylized or AI-assisted creative presentations. A concept image does not establish the exact contents of a product.
        Always check each listing’s real configuration, included pieces and materials. If you would like to see workshop or unstyled product photos, ask us; we can share available real images for that design on request.</p>
      </article>
      <article className={card}><HeartHandshake size={23} className="text-[#d4b26a]" aria-hidden="true"/>
        <h2 className={heading+' mt-5'}>Designed for your expression</h2>
        <p className={copy}>We want you to feel assured when choosing a look. Our team can help explain sizes, combinations and practical care before you place an order.
        Transparent product information matters as much as the finished visual effect.</p>
      </article>
    </div>
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/shop" className="btn-chrome">Explore our designs</Link><Link href="/contact-review" className="btn-ghost">Talk to TheFEYA</Link></div>
  </Frame>;
}

const policySections=[
 {title:'Orders and changes',body:[
   'We begin preparing made-to-order work promptly. Please contact us as soon as possible if you need to change an order. Once genuinely personalised work has started, discretionary cancellation may not be possible.',
   'This policy never removes rights to cancel, withdraw or obtain a remedy where applicable consumer law gives those rights.']},
 {title:'Made to your own specifications',body:[
   'A design created to your individual body measurements or agreed special specifications can be treated differently from a product ordered using ordinary, pre-set sizes, colors or configurations.',
   'For eligible truly personalised orders, a statutory change-of-mind withdrawal exception may apply. We will identify the applicable conditions before checkout; simply being made after purchase does not automatically make an item exempt.']},
 {title:'If something arrives wrong or damaged',body:[
   'If an item arrives defective, damaged, in the wrong size or color, or materially different from the agreed order, contact us with the order number and clear photos. We will help investigate and determine an appropriate solution.',
   'Depending on the situation and applicable law, the remedy may be adjustment, repair, replacement, remake, a price reduction or refund. We want to find a fair resolution, not leave you without support.']},
 {title:'Events and performance plans',body:[
   'TheFEYA sells clothing, not free rentals for an event or photoshoot. A change of event schedule, travel plans, a cancelled performance or simply no longer needing an outfit does not, by itself, establish a discretionary return under our store policy.',
   'Any mandatory withdrawal rights, statutory remedies and delivery obligations still apply. An agreed essential delivery deadline is handled in accordance with applicable law.']},
 {title:'Sale items and store credit',body:[
   'For a voluntary exception we choose to offer on an eligible sale item, store credit may be proposed as a practical option. Discount codes or promotional prices do not erase mandatory withdrawal or defect rights.',
   'We will confirm any voluntary credit or exchange terms in writing for the specific case.']},
 {title:'How to request help',body:[
   'Contact us promptly, preferably within 7 days for voluntary fit or finishing requests. Please send the order number and photos before shipping anything back; we will provide the correct return instructions for your case.',
   'For legal returns and defective goods, statutory periods and shipping cost rules prevail over any shorter voluntary assistance window.']},
];
export function OwnerReturnsReview(){
  return <Frame eyebrow="TheFEYA · Customer care" title="Returns, changes & solutions"
    description="We care about the experience behind every design. Here is what to expect if plans change or something is not right with your order.">
    <section className="rounded-[16px] border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.045)] p-6 sm:p-8">
      <ShieldCheck size={23} className="text-[#d4b26a]" aria-hidden="true"/>
      <h2 className={heading+' mt-4'}>We are here to resolve genuine order problems</h2>
      <p className={copy}>Our made-to-order policy limits discretionary order changes and returns where lawful; it does not affect mandatory consumer rights.
      If we supplied the wrong item or there is a defect, please get in touch — we will review the details and help arrange an appropriate remedy.</p>
    </section>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {policySections.map(section=><article key={section.title} className={card}>
        <h2 className={heading}>{section.title}</h2>
        {section.body.map(p=><p className={copy} key={p}>{p}</p>)}
      </article>)}
    </div>
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/contact-review" className="btn-chrome">Ask for assistance</Link><Link href="/shipping-review" className="btn-ghost">Shipping information</Link></div>
    <p className="mt-5 text-[12px] leading-6 text-[var(--bone-dim)]">Owner policy proposal for legal review before public publication; regional consumer rights and contracting trader identity must be checked before enabling paid checkout.</p>
  </Frame>;
}

const women=[["XS","34","6","2","78–82","62–66","86–90"],["S","36","8","4","82–86","66–70","90–94"],["M","38","10","6","86–90","70–74","94–98"],["L","40","12","8","90–94","74–78","98–102"],["XL","42","14","10","94–98","78–82","102–106"],["XXL","44","16","12","98–102","82–86","106–110"],["XXXL","46","18","14","102–106","86–90","110–114"]] as const;
const men=[["S","48","38","94–98","82–86","96–100"],["M","50","40","98–102","86–90","100–104"],["L","52","42","102–106","90–94","104–108"],["XL","54","44","106–110","94–98","108–112"],["XXL","56","46","110–114","98–102","112–116"],["XXXL","58","48","114–118","102–106","116–120"]] as const;
const tableStyle='w-full border-collapse text-left text-[13px] tabular-nums';
const th='border-b border-white/20 px-3 py-3 text-[11px] uppercase tracking-[.1em] text-[#d4b26a]';
const td='border-b border-white/[.08] px-3 py-3 text-[#e5dfd5]';
function Chart({title,columns,rows}:{title:string;columns:readonly string[];rows:readonly (readonly string[])[]}){
  return <section className={card}>
    <h2 className={heading}>{title}</h2>
    <p className="mt-2 text-[12px] leading-6 text-[var(--bone-dim)]">Body measurements in centimeters. Use the chart that matches your requested product fit, regardless of who will wear it.</p>
    <div className="mt-5 overflow-x-auto"><table className={tableStyle}>
      <caption className="sr-only">{title} body measurements, centimeters</caption>
      <thead><tr>{columns.map(c=><th key={c} scope="col" className={th}>{c}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row[0]}>{row.map((x,i)=>i===0?<th key={i} scope="row" className={td}>{x}</th>:<td key={i} className={td}>{x}</td>)}</tr>)}</tbody>
    </table></div>
  </section>;
}
export function OwnerSizeGuideReview(){
  return <Frame eyebrow="TheFEYA · Fit & measurements" title="Costume size guide"
    description="Find your reference size, understand adjustability and tell us when a standard fit is not right for your design.">
    <div className="grid gap-5">
      <section className={card}>
        <Ruler size={24} className="text-[#d4b26a]" aria-hidden="true"/>
        <h2 className={heading+' mt-4'}>How our pieces fit</h2>
        <p className={copy}>Many designs have adjustable straps or closures that allow flexibility within the specified range. How much a piece adjusts depends on the product — do not assume one universal number of extra sizes.
        Refer to your selected product’s measurements and configuration. Measure your bust/chest, natural waist and fullest hips with the tape level; include height when requested.</p>
        <p className={copy}>Choose a <strong className="text-[#f7f3ec]">Women's-fit</strong> or <strong className="text-[#f7f3ec]">Men's-fit</strong> size chart based on the intended garment fit and body measurements, not gender identity. In the eventual checkout, the fit chart should be recorded with each selected garment to prevent sizing mistakes.</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <Chart title="Women's-fit size chart" columns={['Size','EU','UK','US','Bust','Waist','Hips']} rows={women}/>
        <Chart title="Men's-fit size chart" columns={['Size','EU','US','Chest','Waist','Hips']} rows={men}/>
      </div>
      <section className={card}>
        <h2 className={heading}>Made to your measurements</h2>
        <p className={copy}>Need a non-standard fit? Ask about the made-to-measure service when choosing options in the cart. A manager will contact you to confirm the measurements and which products qualify.
        This is a proposed optional paid add-on; the final EUR price, eligibility and measurement workflow must be approved before checkout can charge for it.</p>
      </section>
      <div className="flex flex-wrap gap-3"><Link href="/shop" className="btn-chrome">Shop designs</Link><Link href="/contact-review" className="btn-ghost"><Mail size={15} className="mr-2 inline"/>Ask about your fit</Link></div>
      <p className="text-[12px] leading-6 text-[var(--bone-dim)]">Chart sourced from the owner’s legacy FEYA women's/men's graphic (20 Nov 2024). Before production publication, reconfirm that these measurements still match the active approved sizing policy for every applicable item.</p>
    </div>
  </Frame>;
}
