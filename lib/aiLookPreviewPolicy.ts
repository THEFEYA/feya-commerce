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
/** 
 * Owner-provided one-use key for a protected SSO Vercel Preview only.
 * Never persisted in Git, environment, database, browser storage or logs.
 * This is NOT the customer-facing authentication or quota system.
 */
export type AiLookKeyInputIssue=
  |'key_missing'|'tracking_id'|'masked_secret'|'bad_prefix'
  |'key_too_short'|'key_too_long'|'contains_whitespace'|'bad_characters';

/**
 * Validate only the public syntax; do NOT log, echo, hash, or persist the key.
 * The OpenAI API must still verify that the full secret is active.
 */
export function aiLookKeyInputIssue(input:unknown):AiLookKeyInputIssue|null{
 if(typeof input!=='string'||!input.trim())return 'key_missing';
 const value=input.trim();
 if(/^key_[a-z0-9_-]+$/i.test(value))return 'tracking_id';
 if(/\.{2,}|\u2026|[\u2022\u25cf*]/.test(value))return 'masked_secret';
 if(!value.startsWith('sk-'))return 'bad_prefix';
 if(value.length<27)return 'key_too_short';
 if(value.length>240)return 'key_too_long';
 if(/\s/.test(value))return 'contains_whitespace';
 if(!/^sk-[a-zA-Z0-9_-]+$/.test(value))return 'bad_characters';
 return null;
}

export function aiLookKeyIssueMessage(issue:AiLookKeyInputIssue):string{
 switch(issue){
  case 'key_missing':return 'Вставьте полный секретный ключ OpenAI.';
  case 'tracking_id':return 'Это Tracking ID (key_…), а не API-ключ. Нужен полный секрет sk-proj-… из окна создания ключа.';
  case 'masked_secret':return 'Это сокращённая маска sk-… из списка ключей, а не полный секрет. Откройте сохранённое полное значение или создайте новый секретный ключ.';
  case 'bad_prefix':return 'Нужен полный секретный ключ, начинающийся с sk-. Название ключа и Tracking ID не подходят.';
  case 'key_too_short':return 'Ключ слишком короткий. Похоже, вставлена только видимая часть из списка OpenAI, а не полный секрет.';
  case 'key_too_long':return 'Слишком длинное значение. Вставьте только секретный ключ без окружающего текста.';
  case 'contains_whitespace':return 'Внутри ключа есть пробел или перенос строки. Скопируйте только полный секрет.';
  default:return 'В ключе есть недопустимые символы. Скопируйте исходный секрет целиком.';
 }
}

export function resolveAiLookOwnerTestKey(
 env:Record<string,string|undefined>,input:unknown
):string|null{
 if(!isAiLookOwnerPreview(env))return null;
 if(isAiLookGenerationConfigured(env))return env.OPENAI_API_KEY!;
 if(aiLookKeyInputIssue(input)!==null)return null;
 return typeof input==='string'?input.trim():null;
}
export const AI_LOOK_SCENES=['studio','festival','burning-man','stage','red-carpet'] as const;
export type AiLookScene=typeof AI_LOOK_SCENES[number];
export function isAiLookScene(value:unknown):value is AiLookScene{
 return typeof value==='string'&&(AI_LOOK_SCENES as readonly string[]).includes(value);
}
