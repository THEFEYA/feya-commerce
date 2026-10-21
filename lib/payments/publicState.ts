import 'server-only';
import {cacheLife, cacheTag} from 'next/cache';
import {paymentsKillSwitch} from './runtime.ts';
import {paymentsStore} from './store.ts';

export const PAYMENTS_STATE_TAG = 'feya-payments-state';

/**
 * Cached "is online payment live?" for public pages (legal copy, shipping).
 * Revalidated immediately on activation/pause, and at most every minute otherwise.
 * Fails closed: any error means "not active".
 */
export async function readPaymentsPublicActive(): Promise<boolean> {
  'use cache';
  cacheLife({stale: 60, revalidate: 60, expire: 3600});
  cacheTag(PAYMENTS_STATE_TAG);
  if (paymentsKillSwitch()) return false;
  try {
    const state = await paymentsStore.publicState();
    return state.active === true;
  } catch {
    return false;
  }
}
