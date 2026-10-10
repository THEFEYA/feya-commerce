/** One additional *private* owner Vercel Preview in which ALL visual
 * approvals can be exercised end to end, without switching between deployment
 * origins (browser shopping bag storage is origin-specific).
 * Deployment Protection (SSO) must remain enabled on Vercel. This only
 * accepts server-provided Vercel environment metadata, never URL/headers.
 */
export const OWNER_UNIFIED_PREVIEW_BRANCH='work/owner-unified-storefront-review-20261010' as const;
export const OWNER_UNIFIED_PREVIEW_PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID' as const;

export function isOwnerUnifiedStorefrontPreview(env:Record<string,string|undefined>):boolean{
  return env.VERCEL==='1'
    &&env.VERCEL_ENV==='preview'
    &&env.VERCEL_PROJECT_ID===OWNER_UNIFIED_PREVIEW_PROJECT
    &&env.VERCEL_GIT_COMMIT_REF===OWNER_UNIFIED_PREVIEW_BRANCH
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}
