import {NextResponse} from 'next/server';
import {FEYA_PRODUCTION_REVISION_CONTRACT,verifiedProductionRevision} from '@/lib/productionRevisionPolicy';

const headers={
  'Cache-Control':'private, no-store, max-age=0',
  'X-Robots-Tag':'noindex, nofollow',
};

/** Public, unprivileged deployment fingerprint: commit is already visible on GitHub.
 * No product truth, runtime secrets, user data, env listing, or administrative action.
 * Never allow an absent/incorrect Vercel identity to report a successful release.
 */
export async function GET(){
  const sha=verifiedProductionRevision(process.env);
  return NextResponse.json(
    {contract:FEYA_PRODUCTION_REVISION_CONTRACT,production:Boolean(sha),sha},
    {status:sha?200:503,headers},
  );
}
