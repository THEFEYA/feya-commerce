import Link from 'next/link';
import {SELLER_ONLINE_PROVIDER} from '@/lib/sellerOnlineProvider';

/** Publicly readable, intentionally quiet logistics/payment contact details.
 * Used at the END of the owner's Shipping & Payment review, not Contact.
 * No payment or legal trader role is activated by this disclosure.
 */
export function OwnerSellerOnlinePartnerDetails(){
  const op=SELLER_ONLINE_PROVIDER;
  return <>
    <section className="container-feya pb-5 pt-5 lg:pb-6 lg:pt-6" aria-labelledby="payment-operator-heading">
      <div className="px-0 py-1">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 id="payment-operator-heading" className="text-[11px] font-medium tracking-[.10em] text-[#89837b]">Payment & shipping partner details</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#817b74]">
              {op.legalName} is a designated payment and logistics partner for planned online checkout. Online payments on thefeya.com are not active yet.
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#817b74]">Partner details are provided for transparency and are not the contact for product support or confirmation of the legal seller.</p>
          </div>
          <div className="text-[12px] leading-6 text-[#817b74]">
            <p>{op.legalName}, {op.contactAddress.line1}, {op.contactAddress.city}, {op.contactAddress.region} {op.contactAddress.postalCode}, {op.contactAddress.country}</p>
            <p className="break-all">{op.usOfficeEmail} · {op.usOfficePhone}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-5 text-[12px] text-[#817b74]">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="underline underline-offset-4 hover:text-white">Terms of Use</Link>
        </div>
      </div>
    </section>

  </>;
}
