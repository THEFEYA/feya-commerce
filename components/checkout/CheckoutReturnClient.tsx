'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {CheckCircle2, Clock3, RotateCcw, XCircle} from 'lucide-react';
import {OWNER_BAG_COUNT_STORAGE_KEY, OWNER_CART_STORAGE_KEY, parseOwnerCartStorage} from '@/lib/commerceOwnerCartReview';
import {verifiedPurchaseFromReceipt} from '@/lib/measurementVerifiedPurchase';
import {getAnalyticsConsent,trackVerifiedPurchaseOnce} from '@/lib/measurementClient';
import {checkoutApi, readPendingCheckout, rememberReceipt, CHECKOUT_PENDING_KEY} from '@/lib/payments/checkoutBrowser';

type View =
  | {state: 'working'}
  | {state: 'paid'; orderNumber: string; receipt: string | null}
  | {state: 'pending'; orderNumber: string | null; receipt: string | null}
  | {state: 'cancelled'}
  | {state: 'declined'; retryUrl: string | null}
  | {state: 'problem'; message: string};

const card = 'mx-auto max-w-2xl rounded-[18px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-7 sm:p-10';

function clearBag() {
  try {
    window.localStorage.removeItem(OWNER_CART_STORAGE_KEY);
    window.localStorage.setItem(OWNER_BAG_COUNT_STORAGE_KEY, '0');
    window.dispatchEvent(new Event('storage'));
    window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
  } catch { /* ignore */ }
}

async function recordPaidPurchase(
  accessToken:string,confirmedOrderNumber:string,bagSnapshot:string,
){
  if(getAnalyticsConsent()!=='granted'||!bagSnapshot)return;
  try{
    const buyer=await checkoutApi.receipt(accessToken);
    if(!buyer.ok||!buyer.order||buyer.order.status!=='paid')return;
    const parsed=parseOwnerCartStorage(JSON.parse(bagSnapshot));
    if(parsed.invalid_count||!parsed.items.length)return;
    const purchase=verifiedPurchaseFromReceipt(buyer.order,parsed.items);
    if(!purchase||purchase.transactionId!==confirmedOrderNumber)return;
    await trackVerifiedPurchaseOnce(purchase);
  }catch{ /* Analytics must never block a paid order or expose buyer data. */ }
}

export function CheckoutReturnClient() {
  const params = useSearchParams();
  const [view, setView] = useState<View>({state: 'working'});
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token') || '';
    const cancelled = params.get('cancelled') === '1';
    const pending = readPendingCheckout();
    const paid = (orderNumber: string) => {
      if (pending?.access_token) {
        rememberReceipt(orderNumber, pending.access_token);
        // Capture the checkout-time merchandise IDs before clearing the bag.
        // The server's PAID buyer receipt confirms whether they match the
        // actual purchased order; only then may consented GA4 record purchase.
        const bagSnapshot=window.localStorage.getItem(OWNER_CART_STORAGE_KEY)||'';
        void recordPaidPurchase(pending.access_token,orderNumber,bagSnapshot);
      }
      clearBag();
      setView({state: 'paid', orderNumber, receipt: pending?.access_token ?? null});
    };

    (async () => {
      if (cancelled) {
        if (token) await checkoutApi.cancel(token).catch(() => null);
        setView({state: 'cancelled'});
        return;
      }
      if (token) {
        // PayPal Checkout: capture server-side, then show the verified result.
        const result = await checkoutApi.complete(token).catch(() => null);
        if (!result || !result.ok) {
          setView({state: 'problem', message: result?.message || 'We could not confirm the payment yet. If PayPal charged you, your order is safe — we will confirm it by email or you can contact us with the PayPal receipt.'});
          return;
        }
        if (result.status === 'paid') return paid(result.order_number || pending?.order_number || '');
        if (result.status === 'instrument_declined') return setView({state: 'declined', retryUrl: result.retry_url ?? null});
        if (result.status === 'payment_pending') return setView({state: 'pending', orderNumber: result.order_number || null, receipt: pending?.access_token ?? null});
        if (result.status === 'not_approved') return setView({state: 'cancelled'});
        return setView({state: 'problem', message: 'The payment was not completed. Your bag is still saved.'});
      }
      // PayPal Standard: confirmation arrives separately from PayPal; poll the receipt.
      if (pending?.access_token) {
        for (let i = 0; i < 20; i++) {
          const receipt = await checkoutApi.receipt(pending.access_token).catch(() => null);
          const status = receipt?.order?.status;
          if (status === 'paid') return paid(String(receipt?.order?.order_number || pending.order_number));
          if (status === 'cancelled' || status === 'payment_failed') return setView({state: 'problem', message: 'The payment was not completed. Your bag is still saved.'});
          await new Promise(r => setTimeout(r, 3000));
        }
        return setView({state: 'pending', orderNumber: pending.order_number, receipt: pending.access_token});
      }
      setView({state: 'problem', message: 'We could not find a payment in progress. If you were charged, please contact us with your PayPal receipt.'});
    })();
  }, [params]);

  return <section className="container-feya pt-32 pb-20 lg:pt-40 lg:pb-28" data-testid="checkout-return">
    <div className={card}>
      {view.state === 'working' && <div role="status">
        <p className="eyebrow-gold">TheFEYA · Payment</p>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">Confirming your payment…</h1>
        <p className="mt-4 text-[14px] leading-7 text-[var(--bone-dim)]">Please keep this page open for a moment while we confirm the payment with PayPal.</p>
      </div>}
      {view.state === 'paid' && <div>
        <CheckCircle2 className="text-[#d4b26a]" size={34} strokeWidth={1.5} aria-hidden="true"/>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">Thank you — your order is confirmed</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
          Order <strong className="text-[#f7f3ec]">{view.orderNumber}</strong> is paid. PayPal has sent your payment receipt by email.
          We will start making your piece and contact you if we need any measurements or details.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {view.receipt && <Link className="btn-chrome" href={`/order#t=${view.receipt}`}>View order</Link>}
          <Link className="btn-ghost" href="/shop">Continue shopping</Link>
        </div>
      </div>}
      {view.state === 'pending' && <div>
        <Clock3 className="text-[#d4b26a]" size={34} strokeWidth={1.5} aria-hidden="true"/>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">Payment received — awaiting PayPal confirmation</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">
          {view.orderNumber ? <>Order <strong className="text-[#f7f3ec]">{view.orderNumber}</strong>: </> : null}
          PayPal is still confirming this payment. You do not need to pay again; the order status updates automatically.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {view.receipt && <Link className="btn-chrome" href={`/order#t=${view.receipt}`}>Check order status</Link>}
          <Link className="btn-ghost" href="/contact">Contact TheFEYA</Link>
        </div>
      </div>}
      {view.state === 'cancelled' && <div>
        <RotateCcw className="text-[#d4b26a]" size={32} strokeWidth={1.5} aria-hidden="true"/>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">Payment not completed</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">You left PayPal before paying. Nothing was charged and your bag is still saved.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link className="btn-chrome" href="/cart">Return to bag</Link></div>
      </div>}
      {view.state === 'declined' && <div>
        <XCircle className="text-amber-200" size={32} strokeWidth={1.5} aria-hidden="true"/>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">The payment method was declined</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">PayPal could not charge the selected card or account. Please choose another payment method.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {view.retryUrl && <a className="btn-chrome" href={view.retryUrl}>Choose another payment method</a>}
          <Link className="btn-ghost" href="/cart">Return to bag</Link>
        </div>
      </div>}
      {view.state === 'problem' && <div role="alert">
        <XCircle className="text-amber-200" size={32} strokeWidth={1.5} aria-hidden="true"/>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] leading-[1.05] text-[#f7f3ec]">We could not confirm the payment</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--bone-dim)]">{view.message}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="btn-chrome" href="/cart">Return to bag</Link>
          <Link className="btn-ghost" href="/contact">Contact TheFEYA</Link>
        </div>
      </div>}
    </div>
  </section>;
}
