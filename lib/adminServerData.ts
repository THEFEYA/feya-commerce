import 'server-only';
import {cache} from 'react';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseAuthServerClient,isAdminAuthRequired} from '@/lib/supabaseAuth';
import {adminAccessDecision} from '@/lib/adminAccess';
import {authorizedAdminFetch,type AdminDataAccess} from '@/lib/adminAuthorizedFetch';
import {isOwnerPreviewDeployment,ownerPreviewReadFetch} from '@/lib/ownerPreviewPolicy';

// React cache is scoped to this RSC request; no module-level actor/client promise is retained.
const requireAdminDataActor=cache(async():Promise<AdminDataAccess>=>{
  if(!isAdminAuthRequired())return {ok:false,status:503,code:'admin_auth_not_enabled'};
  const auth=await getSupabaseAuthServerClient();
  if(!auth)return {ok:false,status:503,code:'admin_auth_unavailable'};
  const {data,error}=await auth.auth.getClaims();
  if(error||!data?.claims||typeof data.claims.sub!=='string')return {ok:false,status:401,code:'authentication_required'};
  if(!adminAccessDecision({id:data.claims.sub,email:data.claims.email},process.env).allowed)return {ok:false,status:403,code:'admin_not_allowed'};
  return {ok:true,userId:data.claims.sub};
});

/** Synchronous factory preserves existing page contracts; each SQL fetch verifies the actor. */
export function getAdminServiceClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerPreview=isOwnerPreviewDeployment(process.env);
  if((!isAdminAuthRequired()&&!ownerPreview)||!url||!key)return null;
  return createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:ownerPreview?ownerPreviewReadFetch(fetch,url):authorizedAdminFetch(requireAdminDataActor,fetch)},
  });
}
