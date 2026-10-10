'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {
  ArrowRight,Check,Clock3,LockKeyhole,Minus,Package,Plus,ShieldCheck,
  ShoppingBag,Trash2,Truck,
} from 'lucide-react';
import {
  OWNER_CART_STORAGE_KEY,OWNER_BAG_COUNT_STORAGE_KEY,
  OWNER_CART_COUNTRIES,ownerCartAddressRegions,
  ownerCartVisualTotals,parseOwnerCartStorage,
  type OwnerCartPreviewItem,type OwnerCartPreviewMethod,
} from '@/lib/commerceOwnerCartReview';

type ContactForm={
  first_name:string;last_name:string;email:string;phone:string;
  country:string;region:string;city:string;postal_code:string;
  address_line1:string;address_line2:string;order_comment:string;
};
const blank:ContactForm={
  first_name:'',last_name:'',email:'',phone:'',country:'',region:'',
  city:'',postal_code:'',address_line1:'',address_line2:'',order_comment:'',
};
const currency=(minor:number)=>new Intl.NumberFormat('en-IE',{
  style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2,
}).format(minor/100);
const labels=new Intl.DisplayNames(['en'],{type:'region'});
const countryOptions=OWNER_CART_COUNTRIES.map(code=>({
  code,label:labels.of(code)||code,
})).sort((a,b)=>a.label.localeCompare(b.label,'en'));

const fieldStyle='min-h-11 w-full rounded-lg border border-[rgba(216,214,211,.20)] bg-[#141418] px-3.5 py-3 text-[14px] text-[#f7f3ec] outline-none placeholder:text-[#7d7572] focus:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d4b26a]';
const cardStyle='rounded-[16px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-5 sm:p-7';
const labelStyle='flex flex-col gap-1.5 text-[12px] font-medium text-[#d8d1c5]';

function safeStorageRead():{items:OwnerCartPreviewItem[];invalid_count:number}{
  try{
    const stored=window.localStorage.getItem(OWNER_CART_STORAGE_KEY);
    return parseOwnerCartStorage(stored?JSON.parse(stored):[]);
  }catch{return{items:[],invalid_count:1};}
}

export function CartOwnerLiveReviewClient(){
  const [hydrated,setHydrated]=useState(false);
  const [items,setItems]=useState<OwnerCartPreviewItem[]>([]);
  const [invalidCount,setInvalidCount]=useState(0);
  const [storageIssue,setStorageIssue]=useState('');
  const [method,setMethod]=useState<OwnerCartPreviewMethod>('standard');
  const [form,setForm]=useState<ContactForm>(blank);
  const [acceptedTerms,setAcceptedTerms]=useState(false);
  const [marketingConsent,setMarketingConsent]=useState(false);

  useEffect(()=>{
    const sync=()=>{
      const parsed=safeStorageRead();
      setItems(parsed.items);setInvalidCount(parsed.invalid_count);
      setHydrated(true);
    };
    sync();
    window.addEventListener('storage',sync);
    return()=>window.removeEventListener('storage',sync);
  },[]);

  const totals=useMemo(()=>ownerCartVisualTotals(items,method),[items,method]);
  const addressRegions=ownerCartAddressRegions(form.country);
  const fulfilled=Boolean(
    form.first_name.trim()&&form.last_name.trim()&&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    &&form.phone.trim()&&form.country
    &&(!addressRegions.length||form.region)
    &&form.city.trim()&&form.postal_code.trim()&&form.address_line1.trim()
  );

  const change=(name:keyof ContactForm,value:string)=>{
    setForm(current=>({
      ...current,[name]:value,
      ...(name==='country'?{region:''}:{}),
    }));
  };

  function persist(next:OwnerCartPreviewItem[]){
    // This writes ONLY catalog/selection fields for the owner preview.
    // Never persist or transmit buyer address, marketing consent or terms.
    setItems(next);
    setStorageIssue('');
    try{
      window.localStorage.setItem(OWNER_CART_STORAGE_KEY,JSON.stringify(next));
      window.localStorage.setItem(OWNER_BAG_COUNT_STORAGE_KEY,
        String(next.reduce((n,x)=>n+x.qty,0)));
      window.dispatchEvent(new Event('storage'));
    }catch{
      setStorageIssue('Your browser could not save this bag update. No server order was created.');
    }
  }
  function changeQty(id:string,delta:number){
    persist(items.map(x=>x.id!==id?x:{
      ...x,qty:Math.max(1,Math.min(100,x.qty+delta)),
    }));
  }
  function remove(id:string){persist(items.filter(x=>x.id!==id));}

  return <div className="container-feya pt-32 pb-20 sm:pt-36 lg:pt-40 lg:pb-28">
    <header className="max-w-4xl">
      <p className="eyebrow-gold">TheFEYA · Owner Preview · Real selected items</p>
      <h1 className="visual-display mt-4 text-[clamp(38px,4.5vw,62px)] font-medium leading-[1.03] tracking-[-.035em] text-[#f7f3ec]">
        Your bag
      </h1>
      <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Add a real item from this preview deployment&apos;s product pages, then return here.
        Selected variations and quantities are read from this browser. Final prices,
        taxes and delivery availability will be verified by the server before real payment.
      </p>
    </header>

    <div className="mt-7 rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.04)] px-5 py-4 text-[12px] leading-6 text-[#d8d1c5]" role="status">
      Visual and functional owner review only. No payments or orders are accepted here.
      Customer contact fields stay in memory on this page: they are never saved,
      submitted, emailed, or shared with a carrier.
    </div>

    {invalidCount>0&&<p className="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 text-[12px] leading-6 text-amber-100" role="alert">
      {invalidCount} outdated or invalid cart line(s) were not used in this preview.
      Revisit the product page to choose a current option. No unsafe price is accepted.
    </p>}
    {storageIssue&&<p className="mt-3 text-[12px] text-amber-100" role="alert">{storageIssue}</p>}

    <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1.24fr)_minmax(340px,.76fr)] xl:gap-9">
      <div className="min-w-0 space-y-6">
        <section className={cardStyle} aria-labelledby="owner-cart-lines-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="owner-cart-lines-title" className="text-[22px] font-medium text-[#f7f3ec]">Your selected pieces</h2>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-[#d4b26a] underline underline-offset-4 hover:text-white">
              Continue shopping <ArrowRight size={15}/>
            </Link>
          </div>
          {!hydrated?<p className="mt-7 text-[13px] text-[var(--bone-dim)]" role="status">Reading your browser bag…</p>
          :items.length===0?<div className="mt-6 rounded-xl border border-dashed border-[rgba(216,214,211,.20)] p-8 text-center">
            <ShoppingBag className="mx-auto text-[#d4b26a]" size={28} strokeWidth={1.4}/>
            <p className="mt-4 text-[14px] text-[var(--bone-dim)]">Your bag is empty. Choose an actual product and use “Add to bag”.</p>
            <Link href="/shop" className="btn-chrome mt-5">Explore the catalog</Link>
          </div>
          :<div className="mt-6 divide-y divide-[rgba(216,214,211,.12)]">
            {items.map(item=><article key={item.id}
              className="flex gap-4 py-5 first:pt-0 sm:gap-5" aria-label={item.title}>
              <Link href={`/shop/${item.slug}`}
                className="h-[128px] w-[98px] shrink-0 overflow-hidden rounded-lg bg-[#19191d] sm:h-[152px] sm:w-[118px]">
                {item.image?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={item.image} loading="lazy" className="h-full w-full object-cover"/>:null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/shop/${item.slug}`}
                  className="block text-[15px] leading-6 text-[#f7f3ec] hover:text-[#e8ca87] sm:text-[17px]">
                  {item.title}
                </Link>
                <p className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]">
                  {item.config} · {item.color} · {item.size}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex h-10 items-center rounded-lg border border-[rgba(216,214,211,.23)]">
                    <button type="button" aria-label={`Decrease quantity of ${item.title}`}
                      className="flex h-10 w-9 items-center justify-center hover:text-[#d4b26a]"
                      disabled={item.qty<=1} onClick={()=>changeQty(item.id,-1)}>
                      <Minus size={15} aria-hidden="true"/>
                    </button>
                    <output aria-label="Quantity" className="min-w-8 text-center text-[13px]">{item.qty}</output>
                    <button type="button" aria-label={`Increase quantity of ${item.title}`}
                      className="flex h-10 w-9 items-center justify-center hover:text-[#d4b26a]"
                      disabled={item.qty>=100} onClick={()=>changeQty(item.id,+1)}>
                      <Plus size={15} aria-hidden="true"/>
                    </button>
                  </div>
                  <button type="button" onClick={()=>remove(item.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 text-[12px] text-[var(--bone-dim)] hover:text-[#f7f3ec]">
                    <Trash2 size={14} aria-hidden="true"/> Remove
                  </button>
                  <Link className="text-[12px] text-[#d4b26a] underline underline-offset-4"
                    href={`/shop/${item.slug}`}>Edit options</Link>
                </div>
                <p className="mt-auto pt-4 text-right text-[16px] font-medium text-[#f7f3ec]">
                  {currency(Math.round(item.price*100)*item.qty)}
                </p>
              </div>
            </article>)}
          </div>}
          <p className="mt-4 text-[11px] leading-5 text-[var(--bone-dim)]">
            Items retain their original configuration, size, color, quantity and local display price.
            This browser data is not verified payment authority.
          </p>
        </section>

        <section className={cardStyle} aria-labelledby="owner-cart-shipping-title">
          <h2 id="owner-cart-shipping-title" className="text-[22px] font-medium text-[#f7f3ec]">Delivery preference</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">
            Express is best for time-sensitive orders — priority in the preparation and dispatch queue.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(['standard','express'] as const).map(choice=><label key={choice}
              className={`flex min-w-0 cursor-pointer flex-col rounded-xl border p-4 ${method===choice?'border-[#d4b26a] bg-[rgba(212,178,106,.07)]':'border-[rgba(216,214,211,.19)] hover:border-[rgba(212,178,106,.40)]'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="owner-cart-shipping" value={choice} checked={method===choice}
                  onChange={()=>setMethod(choice)} className="h-[18px] w-[18px] accent-[#d4b26a]"/>
                {choice==='express'?<Clock3 size={17} className="text-[#d4b26a]"/>:<Truck size={17} className="text-[#d4b26a]"/>}
                <strong className="text-[17px] text-[#f7f3ec]">{choice==='express'?'Express':'Standard'}</strong>
              </span>
              <span className="mt-3 text-[24px] text-[#f7f3ec]">{currency(choice==='express'?3500:1900)}</span>
              <span className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]">
                {choice==='express'?'6–9':'10–14'} business days · indicative planning estimate
              </span>
              <span className="mt-2 text-[12px] text-[#e5d2a2]">{choice==='express'?'Priority order preparation':'Regular preparation'}</span>
            </label>)}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-[var(--bone-dim)]">
            Typical production is 3–5 business days, depending on the pieces ordered.
            Dates are estimates, not event-date guarantees. We choose a suitable shipping carrier.
          </p>
        </section>

        <section className={cardStyle} aria-labelledby="owner-cart-address-title">
          <h2 id="owner-cart-address-title" className="text-[22px] font-medium text-[#f7f3ec]">Contact & delivery details</h2>
          <p className="mt-2 text-[12px] leading-6 text-[var(--bone-dim)]">
            These fields demonstrate the eventual checkout only. Nothing entered here is transmitted or stored.
            The actual checkout will accept only confirmed deliverable countries.
          </p>
          <form className="mt-5 space-y-5" autoComplete="off" onSubmit={e=>e.preventDefault()}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelStyle}>First name
                <input value={form.first_name} onChange={e=>change('first_name',e.target.value)}
                  autoComplete="off" maxLength={100} className={fieldStyle} placeholder="First name"/>
              </label>
              <label className={labelStyle}>Last name
                <input value={form.last_name} onChange={e=>change('last_name',e.target.value)}
                  autoComplete="off" maxLength={100} className={fieldStyle} placeholder="Last name"/>
              </label>
              <label className={labelStyle}>Email
                <input value={form.email} type="email" onChange={e=>change('email',e.target.value)}
                  autoComplete="off" maxLength={320} className={fieldStyle} placeholder="you@example.com"/>
              </label>
              <label className={labelStyle}>Telephone
                <input value={form.phone} type="tel" onChange={e=>change('phone',e.target.value)}
                  autoComplete="off" maxLength={100} className={fieldStyle} placeholder="For the delivery courier"/>
              </label>
            </div>
            <label className={labelStyle}>Destination country
              <select value={form.country} onChange={e=>change('country',e.target.value)} className={fieldStyle}>
                <option value="">Choose a destination (availability not yet confirmed)</option>
                {countryOptions.map(x=><option key={x.code} value={x.code}>{x.label}</option>)}
              </select>
            </label>
            {addressRegions.length>0&&<label className={labelStyle}>
              {form.country==='US'?'State':form.country==='CA'?'Province / territory':'State / territory'}
              <select className={fieldStyle} value={form.region} onChange={e=>change('region',e.target.value)}>
                <option value="">Select region</option>
                {addressRegions.map(([code,name])=><option value={code} key={code}>{name}</option>)}
              </select>
            </label>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelStyle}>City
                <input className={fieldStyle} autoComplete="off" maxLength={150}
                  value={form.city} onChange={e=>change('city',e.target.value)} placeholder="City"/>
              </label>
              <label className={labelStyle}>ZIP / postal code
                <input className={fieldStyle} autoComplete="off" maxLength={32}
                  value={form.postal_code} onChange={e=>change('postal_code',e.target.value)} placeholder="Postal code"/>
              </label>
            </div>
            <label className={labelStyle}>Street address
              <input className={fieldStyle} autoComplete="off" maxLength={250}
                value={form.address_line1} onChange={e=>change('address_line1',e.target.value)}
                placeholder="Street and house number"/>
            </label>
            <label className={labelStyle}>Apartment, suite, additional details (optional)
              <input className={fieldStyle} autoComplete="off" maxLength={250}
                value={form.address_line2} onChange={e=>change('address_line2',e.target.value)}
                placeholder="Apartment, building, floor"/>
            </label>
            <label className={labelStyle}>Order note (optional)
              <textarea className={fieldStyle+' min-h-[100px]'} maxLength={1200}
                value={form.order_comment} onChange={e=>change('order_comment',e.target.value)}
                placeholder="Sizing details, event date or other requests"/>
            </label>
            <div className="space-y-4 rounded-xl border border-[rgba(216,214,211,.13)] p-4">
              <label className="flex items-start gap-3 text-[13px] leading-6 text-[#e7e1d6]">
                <input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-[16px] w-[16px] shrink-0 accent-[#d4b26a]"/>
                <span>I have read the <Link className="underline underline-offset-4" href="/terms">terms</Link>,
                  {' '}<Link className="underline underline-offset-4" href="/returns">returns</Link> and
                  {' '}<Link className="underline underline-offset-4" href="/shipping">shipping policy</Link>.</span>
              </label>
              <p className="text-[11px] leading-5 text-[var(--bone-dim)]">
                Necessary customer data would be used only to fulfill a real order, subject to our
                {' '}<Link className="underline" href="/privacy">privacy notice</Link>.
                No processing is activated by this visual review.
              </p>
              <label className="flex items-start gap-3 text-[13px] leading-6 text-[#c9c1b6]">
                <input type="checkbox" checked={marketingConsent} onChange={e=>setMarketingConsent(e.target.checked)}
                  className="mt-1 h-[16px] w-[16px] shrink-0 accent-[#d4b26a]"/>
                <span>Optional: I would like to receive TheFEYA news and offers by email.</span>
              </label>
              <p className="text-[11px] leading-5 text-[var(--bone-dim)]">
                Newsletter consent is optional and unchecked by default. No subscription is stored or submitted here.
              </p>
            </div>
          </form>
        </section>
      </div>

      <aside className="min-w-0 self-start xl:sticky xl:top-28">
        <section className={cardStyle+' border-[rgba(212,178,106,.26)]'} aria-label="Order summary">
          <p className="eyebrow-gold">Illustrative review only</p>
          <h2 className="mt-3 text-[26px] font-medium text-[#f7f3ec]">Order summary</h2>
          <p className="mt-2 text-[12px] leading-6 text-[var(--bone-dim)]">
            Variant prices in this preview come from your browser cart, not a trusted server quote.
            The final payable amount cannot be calculated until taxes and the delivery route are confirmed.
          </p>
          <div className="mt-6 space-y-3 text-[13px]">
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Selected merchandise</span>
              <span className="text-[#f7f3ec]">{currency(totals.merchandise_subtotal_minor)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>{method==='express'?'Express priority':'Standard'} service</span>
              <span className="text-[#f7f3ec]">{currency(totals.shipping_minor)}</span>
            </div>
            {totals.show_handling_fee&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Additional packaging for multiple items</span>
              <span className="text-[#f7f3ec]">{currency(totals.handling_minor)}</span>
            </div>}
          </div>
          <div className="mt-5 border-t border-[rgba(216,214,211,.16)] pt-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] leading-6 text-[#f7f3ec]">Estimate before taxes</span>
              <strong className="text-[26px] font-medium text-[#e4c87d]">{currency(totals.illustrative_before_tax_minor)}</strong>
            </div>
            <p className="mt-3 text-[11px] leading-6 text-[var(--bone-dim)]">
              Remote destination surcharges, tax, duties and provider fees are not guessed.
              This is not the final order total, payment or invoice.
            </p>
          </div>
          <div className="mt-6 rounded-lg border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.04)] px-4 py-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="mt-1 shrink-0 text-[#d4b26a]"/>
              <p className="text-[12px] leading-6 text-[#d9d2c8]">
                {items.length&&fulfilled&&acceptedTerms?
                  'Preview form looks complete. Seller Online and final delivery checks must still authorize payment.':
                  'Review your items and delivery details. No real order is created.'}
              </p>
            </div>
          </div>
          <button type="button" aria-disabled="true" disabled
            className="mt-5 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[rgba(216,214,211,.26)] bg-[rgba(216,214,211,.11)] text-[13px] text-[var(--bone-dim)] opacity-80">
            <LockKeyhole size={16}/> Checkout not active
          </button>
          <p className="mt-3 text-[11px] leading-5 text-[var(--bone-dim)]">
            Once Seller Online is approved, available payment methods and a real receipt
            will be shown or emailed after confirmed payment. No account registration required.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-[12px]">
            <Link className="inline-flex min-h-11 items-center text-[#d4b26a] underline underline-offset-4" href="/shop">Continue shopping</Link>
            <Link className="inline-flex min-h-11 items-center text-[var(--bone-dim)] underline underline-offset-4" href="/contact">Contact support</Link>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[var(--bone-dim)]">
            Different options or multiple quantities of ONE listing never cause a packaging surcharge.
          </p>
        </section>
      </aside>
    </div>
  </div>;
}
