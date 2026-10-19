import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLegacyEdgeCaller} from '../../lib/security/legacyEdgeInboundGuard.ts';

const dedicated='uJ2cTrH3kz_7NaSwED6XyVkq59HeTaMq7Z98R0bW';
const req=(authorization:string|null,method='POST')=>({
  method,
  headers:new Headers(authorization?{authorization}:{}),
  expectedDedicatedSecret:dedicated,
});

test('separately provisioned and correctly presented dedicated caller can pass',async()=>{
  const result=await verifyLegacyEdgeCaller(req('Bearer '+dedicated));
  assert.deepEqual(result,{allowed:true,status:200,reason:'ACCEPTED'});
});

test('missing, malformed, truncated, repeated, and wrong tokens all fail closed',async()=>{
  const headers=[
    null,'','Basic '+dedicated,'bearer '+dedicated,
    'Bearer '+dedicated.slice(0,-1),
    'Bearer '+dedicated.slice(0,12),
    'Bearer '+dedicated+' ',
    'Bearer '+dedicated+',Bearer '+dedicated,
    'Bearer '+dedicated+'x',
    'Bearer '+('a'.repeat(1024)),
  ];
  for(const header of headers){
    const actual=await verifyLegacyEdgeCaller(req(header));
    assert.equal(actual.allowed,false,header||'missing');
    assert.equal(actual.status,401,header||'missing');
    assert.equal(JSON.stringify(actual).includes(dedicated),false);
  }
});

test('unsupported method and unconfigured secret never reach the handler',async()=>{
  const badMethod=await verifyLegacyEdgeCaller(req('Bearer '+dedicated,'GET'));
  assert.deepEqual(badMethod,{allowed:false,status:405,reason:'DENIED'});
  for(const secret of [undefined,'',dedicated.slice(0,10)]){
    assert.deepEqual(await verifyLegacyEdgeCaller({
      ...req('Bearer '+dedicated),expectedDedicatedSecret:secret,
    }),{allowed:false,status:503,reason:'DENIED'});
  }
});

test('failure of cryptographic verifier fails closed, not open',async()=>{
  const brokenDigest={
    digest:async (_algorithm:AlgorithmIdentifier,_data:BufferSource):Promise<ArrayBuffer>=>{
      throw new Error('simulated platform unavailable: do not disclose token');
    },
  };
  const result=await verifyLegacyEdgeCaller({
    ...req('Bearer '+dedicated),subtle:brokenDigest,
  });
  assert.deepEqual(result,{allowed:false,status:503,reason:'DENIED'});
});

test('helper does not invoke a network, mutate the database, or enable a worker',async()=>{
  const {readFileSync}=await import('node:fs');
  const src=readFileSync('lib/security/legacyEdgeInboundGuard.ts','utf8');
  assert.doesNotMatch(src,/fetch\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(|Deno\.serve\s*\(/);
  assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY\s*=|OPENAI_API_KEY\s*=/);
  assert.match(src,/The handler must verify the caller BEFORE/);
  assert.match(src,/MAX_TOKEN_LENGTH=512/);
  assert.match(src,/MIN_SECRET_LENGTH=32/);
});
