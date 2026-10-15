/** Public, non-secret commit provenance. Reject Preview and other projects.
 * This is NOT a deployment authorization, SEO content release, or payment gate.
 */
export const FEYA_PRODUCTION_REVISION_CONTRACT='feya_production_revision_v1' as const;

export function verifiedProductionRevision(env:Record<string,string|undefined>):string|null {
  if(env.VERCEL!=='1'
    ||env.VERCEL_PROJECT_ID!=='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    ||env.VERCEL_ENV!=='production'
    ||env.VERCEL_GIT_COMMIT_REF!=='main') return null;
  const sha=(env.VERCEL_GIT_COMMIT_SHA||'').trim().toLowerCase();
  return /^[a-f0-9]{40}$/.test(sha)?sha:null;
}
