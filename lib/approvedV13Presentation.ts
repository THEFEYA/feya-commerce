/** Owner-approved responsive V13, not an indexing or payment release.
 * Exact SSO-protected preview branch plus production in the correct project.
 */
export const PUBLIC_V13_PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';
export const PUBLIC_V13_BRANCH='work/v13-public-presentation-release-20261012';
export const PUBLIC_V13_HUB_BRANCH='work/v13-public-hubs-release-20261012';
/** Approved visual baseline plus new color interactions: exact protected Preview only. */
export const OWNER_COLOR_V13_PREVIEW_BRANCH='work/bonanza-color-variants-20261020';
export const AI_LOOK_OWNER_PREVIEW_BRANCH='work/ai-look-preview-prototype-20261020';
/** Protected Phase13 P1 experiment: render the SAME frozen V13 wrapper as production.
 * No public rollout, new environment or extra preview routes are authorized.
 */
export const PHASE13_SHOP_WIRE_QA_BRANCH='work/phase13-shop-wire-payload-20261015';
export function isApprovedV13Presentation(env:Record<string,string|undefined>):boolean{
  if(env.VERCEL!=='1'||env.VERCEL_PROJECT_ID!==PUBLIC_V13_PROJECT)return false;
  if(env.VERCEL_ENV==='production')return true;
  return env.VERCEL_ENV==='preview'&&[PUBLIC_V13_BRANCH,PUBLIC_V13_HUB_BRANCH,PHASE13_SHOP_WIRE_QA_BRANCH,OWNER_COLOR_V13_PREVIEW_BRANCH,AI_LOOK_OWNER_PREVIEW_BRANCH].includes(env.VERCEL_GIT_COMMIT_REF||'')
    &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}

/** Scopes the historical two-location Contact reference to this private visual review. */
export function isOwnerColorV13Preview(env:Record<string,string|undefined>):boolean{
  return isApprovedV13Presentation(env)
    &&env.VERCEL_ENV==='preview'
    &&env.VERCEL_GIT_COMMIT_REF===OWNER_COLOR_V13_PREVIEW_BRANCH;
}
