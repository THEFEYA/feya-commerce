/** Private visual + API experiment. Never enabled on public Production. */
export const AI_LOOK_PREVIEW_BRANCH='work/ai-look-preview-prototype-20261020' as const;
export const AI_LOOK_PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID' as const;
export const AI_LOOK_MAX_UPLOAD_BYTES=6*1024*1024;
export const AI_LOOK_FREE_DEMO_PREVIEWS=3;

export function isAiLookOwnerPreview(env:Record<string,string|undefined>):boolean{
 return env.VERCEL==='1'&&env.VERCEL_ENV==='preview'
  &&env.VERCEL_PROJECT_ID===AI_LOOK_PROJECT
  &&env.VERCEL_GIT_COMMIT_REF===AI_LOOK_PREVIEW_BRANCH
  &&env.FEYA_OWNER_PREVIEW_DISABLED!=='true';
}
export function isAiLookGenerationConfigured(env:Record<string,string|undefined>):boolean{
 return isAiLookOwnerPreview(env)
  &&env.FEYA_AI_LOOK_PREVIEW_ENABLED==='true'
  &&typeof env.OPENAI_API_KEY==='string'
  &&env.OPENAI_API_KEY.startsWith('sk-');
}
export const AI_LOOK_SCENES=['studio','festival','burning-man','stage','red-carpet'] as const;
export type AiLookScene=typeof AI_LOOK_SCENES[number];
export function isAiLookScene(value:unknown):value is AiLookScene{
 return typeof value==='string'&&(AI_LOOK_SCENES as readonly string[]).includes(value);
}
