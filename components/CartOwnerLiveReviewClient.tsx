'use client';

import Link from 'next/link';
import {colorChoiceLabel} from '@/lib/bonanzaColorChoices';
import {useEffect,useMemo,useRef,useState} from 'react';
import {
  ArrowRight,Check,Clock3,LockKeyhole,Minus,Package,Plus,ShieldCheck,
  ShoppingBag,Trash2,Truck,
} from 'lucide-react';
import {
  OWNER_CART_STORAGE_KEY,OWNER_BAG_COUNT_STORAGE_KEY,
  OWNER_CART_COUNTRIES,ownerCartAddressRegions,
  ownerCartVisualTotals,ownerCartPreviewExtraEstimate,parseOwnerCartStorage,
  requiresPaidCustomMeasurements,selectedPaidCustomMeasurementIds,toggleOptionalCustomMeasurement,
  type OwnerCartPreviewItem,type OwnerCartPreviewMethod,
} from '@/lib/commerceOwnerCartReview';
import {
  checkoutApi,newIdempotencyKey,redirectToProvider,rememberPendingCheckout,submitProviderForm,
  type QuoteResult,
} from '@/lib/payments/checkoutBrowser';

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
  // Owner visual-only selectable EUR proposals, never authorized payable prices.
  const [extras,setExtras]=useState<string[]>([]);
  const [giftMessage,setGiftMessage]=useState('');
  const [wearerByItem,setWearerByItem]=useState<Record<string,'men'|'women'>>({});
  const [coupon,setCoupon]=useState('');
  const [couponNotice,setCouponNotice]=useState(false);
  const toggleExtra=(id:string)=>setExtras(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  // Live checkout: availability and totals are decided by the server, never by this page.
  const [checkoutActive,setCheckoutActive]=useState(false);
  const [quote,setQuote]=useState<QuoteResult|null>(null);
  const [quoteLoading,setQuoteLoading]=useState(false);
  const [paying,setPaying]=useState(false);
  const [payError,setPayError]=useState('');
  const quoteSeq=useRef(0);

  useEffect(()=>{
    let alive=true;
    checkoutApi.status().then(state=>{if(alive)setCheckoutActive(state.checkout_active===true);})
      .catch(()=>{if(alive)setCheckoutActive(false);});
    return()=>{alive=false;};
  },[]);

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

  const customFitIds=useMemo(()=>selectedPaidCustomMeasurementIds(items),[items]);
  const totals=useMemo(()=>ownerCartVisualTotals(items,method),[items,method]);
  const visualExtras=useMemo(()=>ownerCartPreviewExtraEstimate(items,{
    madeToMeasureItemIds:customFitIds.filter(id=>items.some(x=>x.id===id)),
    giftCard:extras.includes('card'),giftBox:extras.includes('box'),destination:form.country,
  }),[items,customFitIds,extras,form.country]);
  // Do not guess remote-zone charges from a country name alone.
  const illustrativeTotal=totals.illustrative_before_tax_minor
    +visualExtras.made_to_measure_minor+visualExtras.gift_card_minor+visualExtras.gift_box_minor;
  const regularBeforeSale=items.reduce((n,item)=>n+Math.round((item.compare_at_unit_price_amount??item.price)*100)*item.qty,0);
  const saleSavings=Math.max(0,regularBeforeSale-totals.merchandise_subtotal_minor);
  const addressRegions=ownerCartAddressRegions(form.country);
  const fulfilled=Boolean(
    form.first_name.trim()&&form.last_name.trim()&&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    &&form.phone.trim()&&form.country
    &&(!addressRegions.length||form.region)
    &&form.city.trim()&&form.postal_code.trim()&&form.address_line1.trim()
  );

  const checkoutLines=useMemo(()=>items.map(item=>({
    id:item.id,slug:item.slug,configuration_id:item.configuration_id,
    size:item.paired_selection?.women.size??item.size,
    color:item.paired_selection?colorChoiceLabel(item.paired_selection.women.color):item.color,
    color_code:item.paired_selection?.women.color??item.color_code??null,
    paired_selection:item.paired_selection??null,
    quantity:item.qty,wearer:item.paired_selection?null:(wearerByItem[item.id]??null),
    made_to_measure:customFitIds.includes(item.id),
    client_unit_minor:Math.round(item.price*100),
  })),[items,wearerByItem,customFitIds]);
  const linesOrderable=items.length>0&&items.every(item=>Boolean(item.configuration_id));

  useEffect(()=>{
    if(!checkoutActive||!hydrated||!linesOrderable){setQuote(null);return;}
    const seq=++quoteSeq.current;
    setQuoteLoading(true);
    const timer=window.setTimeout(()=>{
      checkoutApi.quote({lines:checkoutLines,method,gift_card:extras.includes('card'),
        gift_box:extras.includes('box'),country:form.country||''})
        .then(result=>{if(seq===quoteSeq.current)setQuote(result);})
        .catch(()=>{if(seq===quoteSeq.current)setQuote({ok:false,message:'We could not confirm the total right now. Please try again.'});})
        .finally(()=>{if(seq===quoteSeq.current)setQuoteLoading(false);});
    },250);
    return()=>window.clearTimeout(timer);
  },[checkoutActive,hydrated,linesOrderable,checkoutLines,method,extras,form.country]);

  const serverAmounts=checkoutActive&&quote?.ok?quote.amounts??null:null;
  const canPay=checkoutActive&&linesOrderable&&Boolean(serverAmounts)&&fulfilled&&acceptedTerms&&!paying&&!quoteLoading;

  async function pay(){
    if(!canPay)return;
    setPaying(true);setPayError('');
    const request={
      idempotency_key:newIdempotencyKey(),lines:checkoutLines,method,
      gift_card:extras.includes('card'),gift_message:extras.includes('card')?giftMessage:'',
      gift_box:extras.includes('box'),
      buyer:{first_name:form.first_name,last_name:form.last_name,email:form.email,phone:form.phone},
      address:{country:form.country,region:form.region,city:form.city,postal_code:form.postal_code,
        line1:form.address_line1,line2:form.address_line2},
      note:form.order_comment,accepted_terms:acceptedTerms,marketing_opt_in:marketingConsent,
    };
    try{
      let result=await checkoutApi.start(request);
      // One automatic retry with the SAME key: the server replays instead of duplicating.
      if(!result.ok&&(result.code==='checkout_unavailable'||result.code==='provider_unavailable'))
        result=await checkoutApi.start(request);
      if(!result.ok||!result.session||!result.order_number){
        setPayError(result.message||'Checkout is temporarily unavailable. Please try again shortly.');
        setPaying(false);return;
      }
      rememberPendingCheckout({order_number:result.order_number,access_token:result.access_token??null});
      if(result.session.kind==='redirect')redirectToProvider(result.session.url);
      else submitProviderForm(result.session.form);
    }catch{
      setPayError('We could not reach PayPal. Your card has not been charged. Please try again.');
      setPaying(false);
    }
  }

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
  function remove(id:string){
    setWearerByItem(cur=>{const next={...cur};delete next[id];return next;});
    persist(items.filter(x=>x.id!==id));
  }
  function toggleCustomFit(id:string){persist(toggleOptionalCustomMeasurement(items,id));}

  return <div data-testid="owner-cart-review" className="container-feya pt-20 pb-16 sm:pt-24 lg:pt-24 lg:pb-20">
    <header className="max-w-4xl">
      <p className="eyebrow-gold">TheFEYA · Your order</p>
      <h1 className="visual-display mt-4 text-[clamp(30px,3.7vw,46px)] font-medium leading-[1.03] tracking-[-.035em] text-[#f7f3ec]">
        Your bag
      </h1>
      <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Review your pieces, choose delivery and add the finishing touches you would like.
      </p>
    </header>

    {!checkoutActive&&<p className="sr-only">
      No payments or orders are accepted here; customer contact fields are never saved,
      transmitted or shared with a carrier by this private design preview.
    </p>}
    {invalidCount>0&&<p className="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 text-[12px] leading-6 text-amber-100" role="alert">
      {invalidCount} outdated or invalid cart line(s) were not used in this preview.
      Revisit the product page to choose a current option. No unsafe price is accepted.
    </p>}
    {storageIssue&&<p className="mt-3 text-[12px] text-amber-100" role="alert">{storageIssue}</p>}

    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.24fr)_minmax(340px,.76fr)] xl:gap-7">
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
                className="h-[138px] w-[106px] shrink-0 overflow-hidden rounded-lg bg-[#19191d] sm:h-[172px] sm:w-[136px]">
                {item.image?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={item.image} loading="lazy" className="h-full w-full object-cover"/>:null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/shop/${item.slug}`}
                  className="block text-[16px] leading-6 text-[#f7f3ec] hover:text-[#e8ca87] sm:text-[18px]">
                  {item.title}
                </Link>
                <p className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]">
                  {item.config}{!item.paired_selection ? ` · ${item.color} · ${item.size}` : ''}
                </p>
                {item.paired_selection ? <div className="mt-1.5 text-[12px] leading-5 text-[var(--bone-dim)]">
                  <p>Women: {item.paired_selection.women.size} · {colorChoiceLabel(item.paired_selection.women.color)}</p>
                  <p>Men: {item.paired_selection.men.size} · {colorChoiceLabel(item.paired_selection.men.color)}</p>
                </div> : null}
                {!item.paired_selection ? <fieldset className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--bone-dim)]">
                  <legend className="mb-1 text-[11px]">Intended wearer for this item</legend>
                  {(['men','women'] as const).map(choice=><label key={choice} className="inline-flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name={'owner-wearer-'+item.id} value={choice}
                      checked={wearerByItem[item.id]===choice}
                      onChange={()=>setWearerByItem(cur=>({...cur,[item.id]:choice}))}
                      className="h-4 w-4 accent-[#d4b26a]"/>
                    {choice==='men'?'Men':'Women'}
                  </label>)}
                </fieldset> : null}
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
                <p className="mt-auto pt-2 text-right text-[17px] font-medium text-[#f7f3ec]">
                  {currency(Math.round(item.price*100)*item.qty)}
                </p>
              </div>
            </article>)}
          </div>}

        </section>

        <section className={cardStyle} aria-labelledby="owner-cart-shipping-title">
          <h2 id="owner-cart-shipping-title" className="text-[22px] font-medium text-[#f7f3ec]">Delivery preference</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--bone-dim)]">Choose how you would like your order delivered.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(['standard','express'] as const).map(choice=><label key={choice}
              className={`flex min-w-0 cursor-pointer flex-col rounded-xl border p-4 ${method===choice?'border-[#d4b26a] bg-[rgba(212,178,106,.07)]':'border-[rgba(216,214,211,.19)] hover:border-[rgba(212,178,106,.40)]'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="owner-cart-shipping" value={choice} checked={method===choice}
                  onChange={()=>setMethod(choice)} className="h-[18px] w-[18px] accent-[#d4b26a]"/>
                {choice==='express'?<Clock3 size={17} className="text-[#d4b26a]"/>:<Truck size={17} className="text-[#d4b26a]"/>}
                <strong className="text-[17px] text-[#f7f3ec]">{choice==='express'?'Express Shipping':'Standard Shipping'}</strong>
              </span>
              <span className="mt-3 text-[24px] text-[#f7f3ec]">{currency(choice==='express'?3500:1900)}</span>
              <span className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]">
                {choice==='express'?'6–9':'10–14'} business days
              </span>
              <span className="mt-2 text-[12px] text-[#e5d2a2]">{choice==='express'?'Priority order preparation':'Regular preparation'}</span>
            </label>)}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-[var(--bone-dim)]">
            Production usually takes 3–5 working days. Delivery times are approximate and vary by destination.
          </p>
        </section>

        <section className={cardStyle+' !p-4 sm:!p-5'} aria-labelledby="owner-cart-extras-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="owner-cart-extras-title" className="text-[21px] font-medium text-[#f7f3ec]">Make it yours</h2>
            <span className="text-[11px] text-[var(--bone-dim)]">Optional extras</span>
          </div>
          <div className="mt-3 space-y-2">
            {items.length>0&&<div className="rounded-lg border border-white/[.12] px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <strong className="text-[13px] font-medium text-[#f7f3ec]">Made to your measurements</strong>
                <span className="text-[13px] text-[#e4c87d]">+€15 per piece</span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-[var(--bone-dim)]">We’ll contact you to confirm measurements. For Custom size, this service is required and is included automatically in your order total.</p>
              <div className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                {items.map(item=><label key={item.id}
                  className="flex min-h-8 cursor-pointer items-center gap-2 text-[12px] text-[#d8d0c6]">
                  <input type="checkbox" checked={customFitIds.includes(item.id)}
                    disabled={requiresPaidCustomMeasurements(item)}
                    onChange={()=>toggleCustomFit(item.id)} className="h-4 w-4 shrink-0 accent-[#d4b26a]"/>
                  <span className="min-w-0 flex-1 truncate" title={item.title}>{item.title}{requiresPaidCustomMeasurements(item)?' · Required for Custom size':''}</span>
                </label>)}
              </div>
            </div>}
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                {id:'card',label:'Gift message card',price:'€10'},
                {id:'box',label:'Gift box',price:'€25'},
              ] as const).map(extra=><label key={extra.id}
                className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-white/[.12] px-3 py-2">
                <input type="checkbox" checked={extras.includes(extra.id)} onChange={()=>toggleExtra(extra.id)}
                  className="h-4 w-4 shrink-0 accent-[#d4b26a]"/>
                <span className="min-w-0 flex-1 text-[13px] text-[#f7f3ec]">{extra.label}</span>
                <span className="text-[13px] text-[#e4c87d]">{extra.price}</span>
              </label>)}
            </div>
            {extras.includes('card')&&<label className={labelStyle}>Your gift message
              <textarea className={fieldStyle+' min-h-[72px]'} rows={2} value={giftMessage}
                maxLength={250} onChange={e=>setGiftMessage(e.target.value)}
                placeholder="Write your personal note"/>
            </label>}
          </div>
        </section>

        <section className={cardStyle} aria-labelledby="owner-cart-address-title">
          <h2 id="owner-cart-address-title" className="text-[22px] font-medium text-[#f7f3ec]">Contact & delivery details</h2>

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
                <option value="">Select your country</option>
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
            <div className="space-y-3 rounded-xl border border-[rgba(216,214,211,.13)] p-4">
              <label className="flex items-start gap-3 text-[13px] leading-6 text-[#e7e1d6]">
                <input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-[16px] w-[16px] shrink-0 accent-[#d4b26a]"/>
                <span>I have read the <Link className="underline underline-offset-4" href="/terms">terms</Link>,
                  {' '}<Link className="underline underline-offset-4" href="/returns">returns</Link> and
                  {' '}<Link className="underline underline-offset-4" href="/shipping">shipping policy</Link>.</span>
              </label>
              {checkoutActive?<p className="text-[11px] leading-5 text-[var(--bone-dim)]">
                Your contact and delivery details are sent securely only to make and deliver this order.
                Card details are entered on PayPal&apos;s page, never on thefeya.com. See the
                {' '}<Link className="underline underline-offset-4" href="/privacy">privacy notice</Link>.
              </p>:<p className="text-[11px] leading-5 text-[var(--bone-dim)]">
                Necessary contact details are not stored or sent by this prepayment form. See the
                {' '}<Link className="underline underline-offset-4" href="/privacy">privacy notice</Link>.
              </p>}
              <label className="flex items-start gap-3 text-[13px] leading-6 text-[#c9c1b6]">
                <input type="checkbox" checked={marketingConsent} onChange={e=>setMarketingConsent(e.target.checked)}
                  className="mt-1 h-[16px] w-[16px] shrink-0 accent-[#d4b26a]"/>
                <span>Optional: I would like to receive TheFEYA news and offers by email.</span>
              </label>

            </div>
          </form>
        </section>
      </div>

      <aside className="min-w-0 self-start xl:sticky xl:top-28">
        <section className={cardStyle+' border-[rgba(212,178,106,.26)]'} aria-label="Order summary">
          <h2 className="text-[26px] font-medium text-[#f7f3ec]">Order summary</h2>
          {serverAmounts?<div className="mt-6 space-y-3 text-[13px]" data-testid="server-order-summary">
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Merchandise subtotal</span><span className="text-[#f7f3ec]">{currency(serverAmounts.merchandise_minor)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>{method==='express'?'Express Shipping':'Standard Shipping'}</span>
              <span className="text-[#f7f3ec]">{currency(serverAmounts.shipping_minor)}</span>
            </div>
            {serverAmounts.remote_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Remote destination delivery</span><span className="text-[#f7f3ec]">{currency(serverAmounts.remote_minor)}</span>
            </div>}
            {serverAmounts.handling_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Additional packaging for multiple items</span><span className="text-[#f7f3ec]">{currency(serverAmounts.handling_minor)}</span>
            </div>}
            {serverAmounts.extras_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Finishing touches</span><span className="text-[#f7f3ec]">{currency(serverAmounts.extras_minor)}</span>
            </div>}
            {quote?.lines?.some(line=>line.price_changed)&&<p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-[12px] leading-5 text-amber-100" role="status">
              A price in your bag was updated to the current product price.
            </p>}
          </div>:<div className="mt-6 space-y-3 text-[13px]">
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Merchandise subtotal</span>
              <span className="text-[#f7f3ec]">{currency(totals.merchandise_subtotal_minor)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>{method==='express'?'Express Shipping':'Standard Shipping'}</span>
              <span className="text-[#f7f3ec]">{currency(totals.shipping_minor)}</span>
            </div>
            {totals.show_handling_fee&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Additional packaging for multiple items</span>
              <span className="text-[#f7f3ec]">{currency(totals.handling_minor)}</span>
            </div>}
            {visualExtras.made_to_measure_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Made to your measurements</span><span className="text-[#f7f3ec]">{currency(visualExtras.made_to_measure_minor)}</span>
            </div>}
            {visualExtras.gift_card_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Gift message card</span><span className="text-[#f7f3ec]">{currency(visualExtras.gift_card_minor)}</span>
            </div>}
            {visualExtras.gift_box_minor>0&&<div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Gift box</span><span className="text-[#f7f3ec]">{currency(visualExtras.gift_box_minor)}</span>
            </div>}
            {saleSavings>0&&<>
              <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
                <span>Original merchandise value</span><s>{currency(regularBeforeSale)}</s>
              </div>
              <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
                <span>Included sale savings</span><span className="text-[#e4c87d]">−{currency(saleSavings)}</span>
              </div>
            </>}
            <div className="flex justify-between gap-3 text-[var(--bone-dim)]">
              <span>Coupon discount</span><span className="text-[#f7f3ec]">Not applied</span>
            </div>
          </div>}
          <div className="mt-5 rounded-xl border border-white/[.11] p-4">
            <label htmlFor="preview-coupon" className="block text-[12px] font-medium text-[#f7f3ec]">Have a coupon code?</label>
            <div className="mt-2 flex gap-2">
              <input id="preview-coupon" value={coupon} onChange={e=>{setCoupon(e.target.value.slice(0,48));setCouponNotice(false);}}
                className={fieldStyle+' min-w-0 flex-1'} placeholder="Enter code"/>
              <button type="button" onClick={()=>setCouponNotice(true)}
                className="min-h-11 rounded-lg border border-[rgba(212,178,106,.4)] px-4 text-[13px] text-[#e4c87d]">Apply</button>
            </div>
            {couponNotice&&<p className="mt-2 text-[12px] leading-5 text-[var(--bone-dim)]" role="status">This coupon cannot be applied yet.</p>}
          </div>
          {checkoutActive?<>
            <div className="mt-5 border-t border-[rgba(216,214,211,.16)] pt-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[13px] leading-6 text-[#f7f3ec]">Total to pay</span>
                <strong className="text-[26px] font-medium text-[#e4c87d]" data-testid="server-total">
                  {serverAmounts?currency(serverAmounts.total_minor):quoteLoading?'…':'—'}
                </strong>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--bone-dim)]">
                {!linesOrderable&&items.length>0
                  ?'One of the pieces in your bag needs to be selected again on its product page before payment.'
                  :quote&&!quote.ok?quote.message
                  :form.country?'Price in EUR, confirmed by TheFEYA. Customs/import charges, where applicable, may be collected separately on delivery.'
                  :'Select your destination country to confirm delivery charges.'}
              </p>
            </div>
            <button type="button" onClick={pay} disabled={!canPay} aria-disabled={!canPay}
              data-testid="checkout-pay"
              className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-medium ${canPay?'bg-[#d4b26a] text-[#151318] hover:bg-[#e4c87d]':'cursor-not-allowed border border-[rgba(216,214,211,.26)] bg-[rgba(216,214,211,.11)] text-[var(--bone-dim)]'}`}>
              <LockKeyhole size={16}/> {paying?'Opening PayPal…':'Pay securely with PayPal'}
            </button>
            {payError&&<p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-[12px] leading-5 text-amber-100" role="alert">{payError}</p>}
            {!fulfilled&&items.length>0&&<p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">Complete your contact and delivery details to continue.</p>}
            {fulfilled&&!acceptedTerms&&<p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]">Please confirm the terms, returns and shipping policy.</p>}
            <p className="mt-3 flex gap-2 text-[11px] leading-5 text-[var(--bone-dim)]">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#d4b26a]" aria-hidden="true"/>
              <span>You will pay on PayPal&apos;s secure page with a card or your PayPal account.
                Legal seller: Seller-Online LLC. Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner.</span>
            </p>
          </>:<>
          <div className="mt-5 border-t border-[rgba(216,214,211,.16)] pt-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] leading-6 text-[#f7f3ec]">Estimated order total</span>
              <strong className="text-[26px] font-medium text-[#e4c87d]">{currency(illustrativeTotal)}</strong>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--bone-dim)]">
              The final payable amount cannot be calculated until taxes and the delivery route are confirmed.
            </p>
          </div>
          <button type="button" aria-disabled="true" disabled
            className="mt-5 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[rgba(216,214,211,.26)] bg-[rgba(216,214,211,.11)] text-[13px] text-[var(--bone-dim)] opacity-80">
            <LockKeyhole size={16}/> Checkout not active
          </button>
          <p className="mt-3 text-[12px] leading-5 text-[var(--bone-dim)]" role="status">
            Online checkout is not active yet. You cannot place an order.
          </p>
          </>}
          <div className="mt-5 flex flex-wrap gap-3 text-[12px]">
            <Link className="inline-flex min-h-11 items-center text-[#d4b26a] underline underline-offset-4" href="/shop">Continue shopping</Link>
            <Link className="inline-flex min-h-11 items-center text-[var(--bone-dim)] underline underline-offset-4" href="/contact">Contact support</Link>
          </div>

        </section>
      </aside>
    </div>
  </div>;
}
