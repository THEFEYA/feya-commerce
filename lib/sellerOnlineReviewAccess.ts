/** One-purpose, temporary external review of the EXISTING V13 owner preview.
 * Vercel's branch/deployment protection is still the first access boundary.
 * A time-limited Vercel shareable link is required for a person without team membership.
 * No Production, API credentials, mutations, or checkout capability is granted.
 * Remove this exception after the Seller Online technical review.
 */
export function isSellerOnlineReadOnlyReview(env:Record<string,string|undefined>):boolean {
  return env.VERCEL==='1'
    && env.VERCEL_ENV==='preview'
    && env.VERCEL_PROJECT_ID==='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    && env.VERCEL_GIT_COMMIT_REF==='work/bonanza-color-variants-20261020'
    && env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}
