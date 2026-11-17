/**
 * TheFEYA Stage A security proposal: Deno/Node-compatible inbound protection.
 *
 * This is a pure opt-in helper for an independently reviewed legacy Edge
 * handler. It is NOT wired into deployed functions, and does NOT grant access.
 * The handler must verify the caller BEFORE parsing a body, making external
 * requests, creating a service-role client or triggering side effects.
 *
 * Never use SUPABASE_SERVICE_ROLE_KEY, anon/publishable keys or query parameters
 * as the dedicated caller secret. The secret must be separately provisioned and
 * owned by an approved non-browser caller. No secret is ever logged/returned.
 */
export type LegacyEdgeAccessResult=
  |{allowed:true;status:200;reason:'ACCEPTED'}
  |{allowed:false;status:401|405|503;reason:'DENIED'};

type IncomingHeaders={get(name:string):string|null};

const MAX_TOKEN_LENGTH=512;
const MIN_SECRET_LENGTH=32;
const TOKEN_SHAPE=/^[A-Za-z0-9._~+/-]+={0,2}$/;

function plausibleSecret(value:unknown):value is string{
  return typeof value==='string'
    &&value.length>=MIN_SECRET_LENGTH
    &&value.length<=MAX_TOKEN_LENGTH
    &&TOKEN_SHAPE.test(value);
}

/**
 * Only a POST with a strict Bearer header and a separately configured
 * 32+ character high-entropy token can proceed. Does not perform JWT validation
 * and is not a drop-in replacement for a full caller/consumer assessment.
 */
export async function verifyLegacyEdgeCaller(args:{
  method:string;
  headers:IncomingHeaders;
  expectedDedicatedSecret:string|undefined;
  subtle?:Pick<SubtleCrypto,'digest'>;
}):Promise<LegacyEdgeAccessResult>{
  if(args.method!=='POST')return {allowed:false,status:405,reason:'DENIED'};
  const expected=args.expectedDedicatedSecret;
  if(!plausibleSecret(expected))return {allowed:false,status:503,reason:'DENIED'};
  const header=args.headers?.get('authorization');
  if(typeof header!=='string'||header.length>MAX_TOKEN_LENGTH+7)
    return {allowed:false,status:401,reason:'DENIED'};
  const parts=/^Bearer ([A-Za-z0-9._~+/-]+={0,2})$/.exec(header);
  if(!parts||!plausibleSecret(parts[1]))
    return {allowed:false,status:401,reason:'DENIED'};
  const subtle=args.subtle||globalThis.crypto?.subtle;
  if(!subtle)return {allowed:false,status:503,reason:'DENIED'};
  try{
    const encoder=new TextEncoder();
    const [actualDigest,expectedDigest]=await Promise.all([
      subtle.digest('SHA-256',encoder.encode(parts[1])),
      subtle.digest('SHA-256',encoder.encode(expected)),
    ]);
    const a=new Uint8Array(actualDigest),b=new Uint8Array(expectedDigest);
    if(a.length!==b.length||a.length!==32)
      return {allowed:false,status:503,reason:'DENIED'};
    let mismatch=0;
    for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
    return mismatch===0
      ?{allowed:true,status:200,reason:'ACCEPTED'}
      :{allowed:false,status:401,reason:'DENIED'};
  }catch{
    return {allowed:false,status:503,reason:'DENIED'};
  }
}
