/** Validate a raw PayPal Standard IPN against PayPal, never against a local
 * checksum or an untrusted browser status. This DOES NOT mark an order paid.
 *
 * The raw message must be the exact application/x-www-form-urlencoded payload
 * received from PayPal. The same bytes are echoed to the official PayPal IPN
 * postback endpoint with cmd=_notify-validate per PayPal's protocol.
 */
export type PayPalIpnEnvironment='sandbox'|'live';
export type PayPalIpnVerification =
  | {ok:true;verified:true}
  | {ok:false;verified:false;code:'invalid_input'|'invalid'|'provider_unavailable'};

const URLS:Record<PayPalIpnEnvironment,string>={
  sandbox:'https://www.sandbox.paypal.com/cgi-bin/webscr',
  live:'https://www.paypal.com/cgi-bin/webscr',
};

export async function verifyPayPalStandardIpnPostback(
  rawFormBody:string,
  environment:PayPalIpnEnvironment,
  transport:typeof fetch=fetch,
):Promise<PayPalIpnVerification>{
  if(typeof rawFormBody!=='string'||!rawFormBody||rawFormBody.length>16000||
    (environment!=='sandbox'&&environment!=='live')||
    rawFormBody.includes('\u0000')){
    return {ok:false,verified:false,code:'invalid_input'};
  }
  const postBody='cmd=_notify-validate&'+rawFormBody;
  let response:Response;
  try{
    response=await transport(URLS[environment],{
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded',
        'Accept':'text/plain',
      },
      body:postBody,
      cache:'no-store',
      redirect:'error',
      signal:AbortSignal.timeout(10000),
    });
  }catch{
    return {ok:false,verified:false,code:'provider_unavailable'};
  }
  if(!response.ok)return {ok:false,verified:false,code:'provider_unavailable'};
  let answer:string;
  try{answer=await response.text();}
  catch{return {ok:false,verified:false,code:'provider_unavailable'};}
  return answer==='VERIFIED'
    ?{ok:true,verified:true}
    :{ok:false,verified:false,code:'invalid'};
}
