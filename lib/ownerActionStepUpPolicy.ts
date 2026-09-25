export const OWNER_ACTION_STEP_UP_PATHS = new Set([
  '/api/admin/company/execution-approval',
  '/api/admin/review/prices/baseline-adoption',
]);

export function isOwnerActionAuthRequired(env:Record<string,string|undefined>){
  return env.FEYA_OWNER_ACTION_AUTH_REQUIRED === 'true' || env.FEYA_ADMIN_AUTH_REQUIRED === 'true';
}

export function isOwnerActionStepUpPath(pathname:string){
  return OWNER_ACTION_STEP_UP_PATHS.has(pathname);
}

export function ownerPreviewMutationAllowed(pathname:string,method:string,env:Record<string,string|undefined>){
  if(pathname==='/admin/login') return ['GET','HEAD','POST'].includes(method.toUpperCase());
  return isOwnerActionStepUpPath(pathname)
    && env.FEYA_OWNER_ACTION_AUTH_REQUIRED==='true'
    && ['GET','HEAD','POST'].includes(method.toUpperCase());
}
