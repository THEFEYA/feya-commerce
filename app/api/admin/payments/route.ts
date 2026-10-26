import type {NextRequest} from 'next/server';
import {revalidateTag} from 'next/cache';
import {json, resolveOwner, sameOrigin} from '@/lib/payments/access';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {providerStatusForPanel} from '@/lib/payments/installation';
import {PAYMENTS_STATE_TAG} from '@/lib/payments/publicState';
import {PAYMENTS_SITE_ORIGIN} from '@/lib/payments/runtime';
import {paymentsStore} from '@/lib/payments/store';
import {isPaidCommerceReleaseApproved} from '@/lib/payments/commerceRelease';
import {readOwnerSearchGateState} from '@/lib/payments/ownerLaunchReadServer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner console data: provider state, orders (with fulfilment details), links, audit. */
export async function GET(request: NextRequest) {
  const owner = await resolveOwner();
  if (!owner) return json({ok: false, code: 'owner_authentication_required'}, 401);
  const includeTests = request.nextUrl.searchParams.get('tests') === '1';
  try {
    const [status, orders, grants, audit, searchLaunch] = await Promise.all([
      providerStatusForPanel(), paymentsStore.ordersForOwner(100, includeTests),
      paymentsStore.listGrants(), paymentsStore.auditRecent(30),
      readOwnerSearchGateState(),
    ]);
    return json({ok: true, status, orders, grants, audit, searchLaunch});
  } catch {
    return json({ok: false, code: 'storage_unavailable'}, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  const owner = await resolveOwner();
  if (!owner) return json({ok: false, code: 'owner_authentication_required'}, 401);
  let body: Record<string, unknown>;
  try { body = await readLimitedJson(request, 2_000) as Record<string, unknown>; }
  catch (error) { return json({ok: false, code: 'invalid_request'}, error instanceof BodyError ? error.status : 400); }
  try {
    if (body.action === 'mint_technician_link') {
      const days = typeof body.ttl_days === 'number' && Number.isInteger(body.ttl_days) ? Math.min(30, Math.max(1, body.ttl_days)) : 14;
      const label = typeof body.label === 'string' ? body.label.slice(0, 120) : 'Seller Online';
      const grant = await paymentsStore.mintGrant('technician', label, days * 24, owner.name);
      // The raw token is shown to the owner once and never stored.
      return json({ok: true, link: `${PAYMENTS_SITE_ORIGIN}/partner/seller-online#access=${grant.token}`, expires_at: grant.expires_at});
    }
    if (body.action === 'revoke_grant') {
      if (typeof body.grant_id !== 'string' || !UUID.test(body.grant_id)) return json({ok: false, code: 'invalid_request'}, 400);
      return json(await paymentsStore.revokeGrant(body.grant_id, owner.name));
    }
    if (body.action === 'set_active') {
      if (typeof body.active !== 'boolean') return json({ok: false, code: 'invalid_request'}, 400);
      if (body.active && !isPaidCommerceReleaseApproved()) return json({ok:false,code:'commerce_release_pending'},423);
      const result = await paymentsStore.setActive(body.active, owner.name, 'owner');
      revalidateTag(PAYMENTS_STATE_TAG, 'max');
      return json(result.code ? {ok: false, code: result.code} : {ok: true}, result.code ? 409 : 200);
    }
    return json({ok: false, code: 'unknown_action'}, 400);
  } catch {
    return json({ok: false, code: 'storage_unavailable'}, 503);
  }
}
