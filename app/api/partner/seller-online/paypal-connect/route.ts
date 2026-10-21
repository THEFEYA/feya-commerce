import type {NextRequest} from 'next/server';
import {json,resolveInstaller,sameOrigin} from '@/lib/payments/access';
import {PartnerConnectError} from '@/lib/payments/paypalPartnerOnboarding';
import {
  getPartnerOnboardingStatus,startPartnerOnboarding,completePartnerOnboarding,
} from '@/lib/payments/paypalPartnerOnboardingServer';
import {BodyError,readLimitedJson} from '@/lib/payments/http';

function failure(error:unknown){
  const code=error instanceof PartnerConnectError?error.code:'partner_provider_unavailable';
  const status=code==='partner_not_approved'?423
    :code==='partner_permission_not_granted'?403
    :code==='partner_request_rejected'?422
    :code==='partner_provider_unavailable'?503:409;
  return json({ok:false,code},status);
}
/** Read-only status; never exposes partner OAuth tokens, credentials or merchant PII. */
export async function GET(req:NextRequest){
  const actor=await resolveInstaller(req);
  if(!actor)return json({ok:false,code:'invitation_required'},401);
  try{return json({ok:true,...await getPartnerOnboardingStatus(actor)});}
  catch(e){return failure(e);}
}
/** start: sends the consenting merchant to PayPal's official login page.
 * complete: verifies the seller's privileges with PayPal server-to-server.
 * Neither action enables customer payment capture.
 */
export async function POST(req:NextRequest){
  if(!sameOrigin(req))return json({ok:false,code:'same_origin_required'},403);
  const actor=await resolveInstaller(req);
  if(!actor)return json({ok:false,code:'invitation_required'},401);
  let input:Record<string,unknown>;
  try{const parsed=await readLimitedJson(req,1300);
    input=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)
      ?parsed as Record<string,unknown>:{};
  }catch(e){return json({ok:false,code:'invalid_request'},e instanceof BodyError?e.status:400);}
  try{
    if(input.action==='start'){
      if(Object.keys(input).length!==1)return json({ok:false,code:'invalid_request'},400);
      const result=await startPartnerOnboarding(actor);
      return json({ok:true,action_url:result.url});
    }
    if(input.action==='complete'){
      if(Object.keys(input).some(k=>!['action','tracking_id','merchant_id'].includes(k)))
        return json({ok:false,code:'invalid_request'},400);
      const result=await completePartnerOnboarding(actor,input);
      return json({ok:true,...result});
    }
    return json({ok:false,code:'invalid_request'},400);
  }catch(e){return failure(e);}
}
