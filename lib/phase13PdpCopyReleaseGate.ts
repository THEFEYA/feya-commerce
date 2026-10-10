import manifest from '@/config/approved-content-review-bindings.json';

/** Separate future publication contract, never authorizes the 2026-09-24
 * authenticated-only review manifest by itself. Enabled only on a deliberately
 * configured Production deployment after full owner/release approval.
 */
export const PHASE13_PDP_COPY_PUBLIC_RELEASE='phase13-owner-approved-pdp207-20261010-v1' as const;
export const PHASE13_SOURCE_RELEASE='feya-review-207-20260924' as const;
export const PHASE13_REQUIRED_PIN_COUNT=207 as const;

export function phase13PublicPdpCopyEnabled(env:Record<string,string|undefined>):boolean{
  return env.VERCEL==='1'
    &&env.VERCEL_ENV==='production'
    &&env.FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE===PHASE13_PDP_COPY_PUBLIC_RELEASE
    &&env.FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF==='approved-2026-10-10'
    &&manifest.version==='approved-catalog-20260924-v1'
    &&manifest.entries.length===PHASE13_REQUIRED_PIN_COUNT;
}
