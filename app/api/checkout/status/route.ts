import {connection} from 'next/server';
import {json} from '@/lib/payments/access';
import {publicCheckoutState} from '@/lib/payments/checkoutService';
import {CHECKOUT_PRICING_V1} from '@/lib/payments/pricing';

/** Is online payment available right now? (public, no personal data, never prerendered) */
export async function GET() {
  await connection();
  const state = await publicCheckoutState();
  return json({
    ok: true,
    checkout_active: state.active,
    engine: state.engine,
    storage_ready: state.storage_ready,
    remote_countries: CHECKOUT_PRICING_V1.remoteCountries,
    remote_surcharge_minor: CHECKOUT_PRICING_V1.remoteSurchargeMinor,
  });
}
