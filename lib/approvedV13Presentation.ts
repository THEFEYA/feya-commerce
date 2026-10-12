/** Owner-approved responsive V13, not an indexing or payment release.
 * Exact SSO-protected preview branch plus production in the correct project.
 */
export const PUBLIC_V13_PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';
export const PUBLIC_V13_BRANCH='work/v13-public-presentation-release-20261012';
export function isApprovedV13Presentation(env:Record<string,string|undefined>):boolean{
  if(env.VERCEL!=='1'||env.VERCEL_PROJECT_ID!==PUBLIC_V13_PROJECT)return false;
  if(env.VERCEL_ENV==='production')return true;
  return env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF===PUBLIC_V13_BRANCH
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}
