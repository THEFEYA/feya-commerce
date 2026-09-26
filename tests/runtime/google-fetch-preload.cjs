// Test process only. No application endpoint/env override is shipped.
const origin=new URL(process.env.FEYA_TEST_GOOGLE_ORIGIN);
if(origin.hostname!=='127.0.0.1'||origin.protocol!=='http:')throw Error('Loopback provider fixture required');
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(['oauth2.googleapis.com','googleads.googleapis.com'].includes(url.hostname)){
  if(!(typeof input==='string'||input instanceof URL))throw Error('Unreviewed fixture Request object');
  return original(origin.origin+url.pathname,{...init,headers:{...init?.headers,'x-fixture-provider-host':url.hostname}});
 }
 return original(input,init);
};
