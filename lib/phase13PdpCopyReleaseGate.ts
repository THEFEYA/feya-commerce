import {isOwnerUnifiedStorefrontPreview} from './ownerUnifiedStorefrontPreview.ts';

/** Separate future publication contract, never authorizes the 2026-09-24
 * authenticated-only review manifest by itself. Enabled only on a deliberately
 * configured Production deployment after full owner/release approval.
 */
export const PHASE13_PDP_COPY_PUBLIC_RELEASE='phase13-owner-approved-pdp207-20261010-v1' as const;
export const PHASE13_SOURCE_RELEASE='feya-review-207-20260924' as const;
// Independent immutable Git release lever: remains false until a separately
// approved, fully audited Production activation PR. Inaccessible/unreadable
// Vercel env settings can never turn public SEO copy on accidentally.
export const PHASE13_PRODUCTION_PUBLISH_AUTHORIZED=false as boolean;
export const PHASE13_REQUIRED_PIN_COUNT=207 as const;
export const PHASE13_APPROVED_SOURCE_ROW_COUNT=208 as const;
export const PHASE13_OWNER_SUPPRESSED_DUPLICATE_ID='d42dd678-7b11-4f38-890e-411de686f418' as const;

export function phase13PublicPdpCopyEnabled(
  env:Record<string,string|undefined>,
  pinned:{version:string;count:number;sourceCount:number;suppressedCount:number},
):boolean{
  const exactOwnerBranch=env.VERCEL_ENV==='preview'
    &&env.VERCEL_PROJECT_ID==='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    &&env.VERCEL_GIT_COMMIT_REF==='work/phase13-approved-pdp-public-read-gate-20261010'
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true'
    ||isOwnerUnifiedStorefrontPreview(env);
  const explicitPublic=PHASE13_PRODUCTION_PUBLISH_AUTHORIZED
    &&env.VERCEL_ENV==='production'
    &&env.FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE===PHASE13_PDP_COPY_PUBLIC_RELEASE
    &&env.FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF==='approved-2026-10-10';
  return env.VERCEL==='1'
    &&(exactOwnerBranch||explicitPublic)
    &&pinned.version==='approved-catalog-20260924-v1'
    &&pinned.count===PHASE13_REQUIRED_PIN_COUNT
    &&pinned.sourceCount===PHASE13_APPROVED_SOURCE_ROW_COUNT
    &&pinned.suppressedCount===1;
}
