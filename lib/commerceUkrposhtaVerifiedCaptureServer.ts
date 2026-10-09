import 'server-only';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { probeUkrposhtaAvailability } from './commerceUkrposhtaAvailabilityAdapter.ts';
import { captureUkrposhtaVerifiedSource } from './commerceUkrposhtaVerifiedCapture.ts';

/** Internal worker ONLY, not an API route. No automatic country promotion,
 * owner method mapping, checkout total, address or payment is permitted.
 * Both flags are deliberately independent and false by default.
 */
export const isUkrposhtaVerifiedCaptureEnabled=()=>
  process.env.FEYA_UKRPOSHTA_AVAILABILITY_ENABLED==='true'
  && process.env.FEYA_UKRPOSHTA_EVIDENCE_CAPTURE_ENABLED==='true';

export async function captureUkrposhtaVerifiedSourceServer(request:unknown){
  if(!isUkrposhtaVerifiedCaptureEnabled())
    return {ok:false as const,status:423,code:'ukrposhta_evidence_capture_disabled'};
  const client=getSupabaseServiceClient();
  if(!client) return {ok:false as const,status:503,code:'carrier_evidence_storage_not_configured'};
  const bearer=process.env.FEYA_UKRPOSHTA_AUTH_BEARER||'';
  const userToken=process.env.FEYA_UKRPOSHTA_USER_TOKEN||'';
  // Provider tokens must remain in memory and may never enter the RPC payload.
  // The official provider puts userToken in the HTTPS query; never log the URL.
  return captureUkrposhtaVerifiedSource(
    request,
    probe => probeUkrposhtaAvailability(probe,{bearer,userToken}),
    client,
  );
}
