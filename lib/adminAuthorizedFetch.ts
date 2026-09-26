export type AdminDataAccess = {ok:true;userId:string} | {ok:false;status:401|403|503;code:string};

/** Checks authority before any privileged network request; no process-wide session cache. */
export function authorizedAdminFetch(authorize:()=>Promise<AdminDataAccess>,transport:typeof fetch):typeof fetch {
  return async(input,init)=>{
    let access:AdminDataAccess;
    try {access=await authorize();} catch {access={ok:false,status:503,code:'admin_auth_unavailable'};}
    if(!access.ok)return new Response(JSON.stringify({message:'FEYA Admin access denied.',code:access.code}),{
      status:access.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'},
    });
    // No shared Next data-cache entry may contain owner-only results.
    return transport(input,{...init,cache:'no-store'});
  };
}
