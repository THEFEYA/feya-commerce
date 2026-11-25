import type {NextRequest} from 'next/server';
import {json,sameOrigin,validAccessToken} from '@/lib/payments/access';
import {BodyError,readLimitedJson} from '@/lib/payments/http';
import {clientIpHash} from '@/lib/payments/runtime';
import {parseWithdrawal,publicWithdrawalReceipt} from '@/lib/withdrawal/contract';
import {withdrawalEnabled} from '@/lib/withdrawal/config';
import {withdrawalStore} from '@/lib/withdrawal/store';

export async function POST(request: NextRequest) {
  if (!withdrawalEnabled()) return json({ok:false,code:'withdrawal_unavailable'},503);
  if (!sameOrigin(request) || request.nextUrl.search) return json({ok:false,code:'invalid_input'},400);
  try {
    const input = parseWithdrawal(await readLimitedJson(request,4096),validAccessToken);
    if (!input) return json({ok:false,code:'invalid_input'},400);
    const row = await withdrawalStore.record(input,clientIpHash(request.headers));
    if (row.code==='rate_limited') return json({ok:false,code:row.code},429);
    if (row.code==='idempotency_conflict') return json({ok:false,code:row.code},409);
    const receipt=publicWithdrawalReceipt(row);
    if (!receipt) return json({ok:false,code:'withdrawal_unavailable'},503);
    // A receipt means the statement is durable. Never reveal order matches or mail status to an anonymous caller.
    return json({ok:true,receipt,acknowledgement:'pending'});
  } catch (e) {
    if (e instanceof BodyError) return json({ok:false,code:'invalid_input'},e.status);
    return json({ok:false,code:'withdrawal_unavailable'},503);
  }
}
