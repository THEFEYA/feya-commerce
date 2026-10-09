import 'server-only';
import { probeUkrposhtaAvailability, type UkrposhtaProbe } from './commerceUkrposhtaAvailabilityAdapter.ts';

/** This remains OFF until owner has a valid international Ukrposhta contract
 * and has installed both carrier-issued secrets in Vercel Production. This
 * wrapper is not mounted to a web API route and never creates customer rates.
 */
export const isUkrposhtaAvailabilityEnabled=()=>
  process.env.FEYA_UKRPOSHTA_AVAILABILITY_ENABLED==='true';

export async function probeUkrposhtaAvailabilityServer(input:UkrposhtaProbe){
  if(!isUkrposhtaAvailabilityEnabled())
    return {ok:false as const,status:423,code:'carrier_probe_disabled'};
  const bearer=process.env.FEYA_UKRPOSHTA_AUTH_BEARER||'';
  const userToken=process.env.FEYA_UKRPOSHTA_USER_TOKEN||'';
  const result=await probeUkrposhtaAvailability(input,{bearer,userToken});
  if(result.outcome==='not_configured')
    return {ok:false as const,status:503,code:'carrier_credentials_not_configured'};
  return {ok:true as const,proof:result};
}
