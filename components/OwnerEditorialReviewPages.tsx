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
        <h1 className="visual-display text-[clamp(31px,3.8vw,50px)] leading-[1.04] tracking-[-.035em] text-[#f7f3ec]">{title}</h1>
        <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--bone-dim)]">{description}</p>
      </div>
    </section>
    <div className="container-feya pb-16 lg:pb-24">{children}</div>
    <Footer/>
  </main>;
}

export function OwnerAboutReview(){
  const features=[
    {title:'A signature look',Icon:Star,body:'TheFEYA has its own visual language: bold silhouettes, sculptural details and designs made to be noticed. Every product has its own documented materials, parts and available options.'},
    {title:'Crafted in our workshop',Icon:Scissors,body:'Our team prepares designs by hand, typically in 3–5 working days depending on complexity. We can discuss selected changes to fit, color or details while preserving the character of our original design.'},
    {title:'Real pieces, honest imagery',Icon:Camera,body:'Some creative campaigns include AI-assisted or highly stylized images. The selected option and product description determine what you receive. Available real production photos can be requested from our studio.'},
    {title:'Here for your ideas',Icon:HeartHandshake,body:'We help you understand fit, combinations and care, so you can choose a look confidently. Questions or small custom adjustments are welcome — contact our studio before ordering.'},
  ] as const;
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <section className="container-feya pt-28 pb-11 sm:pt-32 lg:pt-32 lg:pb-12">
      <div className="w-full">
        <p className="eyebrow-gold">Independent designer atelier · TheFEYA</p>
        <h1 className="visual-display mt-4 text-[clamp(34px,4.1vw,54px)] leading-[1.08] tracking-[-.035em] text-[#f7f3ec]">About TheFEYA</h1>
        <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#d5cdc2]">
          <p>We are an independent creative team specializing in handmade statement outfits for stages, festivals, performances and fashion photography. Our workshop brings together original design and hands-on production, creating distinctive pieces with a recognizable TheFEYA aesthetic.</p>
          <p>From sculptural shoulder armor and accessories to expressive bodysuits and coordinated looks, each design starts with our studio's own creative direction. Our pieces reach performers, festival-goers and artists in different countries. We care about the people who wear them and aim to help every customer feel confident and happy with their choice.</p>
        </div>
        <div className="mt-7 border-t border-[rgba(212,178,106,.26)] pt-6">
          <p className="eyebrow-gold">Our mission</p>
          <h2 className="visual-display mt-3 text-[clamp(25px,3.2vw,39px)] leading-[1.15] text-[#f7f3ec]">Be seen. Be remembered. Be yourself.</h2>
          <p className="mt-4 text-[15px] leading-7 text-[#d5cdc2]">
            We believe clothing is a way to express individuality. The right look can tell your story before you say a word — on stage, at a festival or in front of the camera.
            Our original pieces help you bring your own visual identity forward. Your expression is what makes the look memorable.
          </p>
        </div>
      </div>
    </section>

    <section className="container-feya pb-14 lg:pb-20" aria-label="Our design and studio">
      <div className="grid gap-4 md:grid-cols-2">
        {features.map(({title,Icon,body})=><article key={title}
          className="rounded-[18px] border border-white/[.14] bg-[linear-gradient(155deg,rgba(255,255,255,.045),rgba(255,255,255,.011))] p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-[rgba(212,178,106,.30)] bg-[radial-gradient(circle_at_30%_15%,rgba(212,178,106,.13),rgba(212,178,106,.02))] text-[#dfbf79]">
              <Icon size={29} strokeWidth={1.5} aria-hidden="true"/>
            </span>
            <h2 className="text-[clamp(18px,2vw,23px)] font-medium leading-tight text-[#f7f3ec]">{title}</h2>
          </div>
          <p className="mt-3 text-[14px] leading-7 text-[var(--bone-dim)] sm:text-[15px]">{body}</p>
        </article>)}
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-chrome">Explore our designs</Link>
        <Link href="/contact" className="btn-ghost">Contact our studio</Link>
      </div>
    </section>
    <Footer/>
  </main>;
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
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/contact" className="btn-chrome">Ask for assistance</Link><Link href="/shipping" className="btn-ghost">Shipping information</Link></div>
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
      <div className="flex flex-wrap gap-3"><Link href="/shop" className="btn-chrome">Shop designs</Link><Link href="/contact" className="btn-ghost"><Mail size={15} className="mr-2 inline"/>Ask about your fit</Link></div>
      <p className="text-[12px] leading-6 text-[var(--bone-dim)]">Chart sourced from the owner’s legacy FEYA women's/men's graphic (20 Nov 2024). Before production publication, reconfirm that these measurements still match the active approved sizing policy for every applicable item.</p>
    </div>
  </Frame>;
}
