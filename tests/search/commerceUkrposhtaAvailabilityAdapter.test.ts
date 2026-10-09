import test from 'node:test';
import assert from 'node:assert/strict';
import { probeUkrposhtaAvailability, UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION,
  UKRPOSHTA_AVAILABILITY_TTL_MINUTES } from '../../lib/commerceUkrposhtaAvailabilityAdapter.ts';

const fixedTime=()=>Date.parse('2026-10-09T13:00:00.000Z');
const input=()=>({country:'US' as const,carrier_product:'PARCEL' as const,transport_type:'AVIA' as const});
const auth={bearer:'dummy_authorization_bearer_123',userToken:'dummy_user_token_123'};
const payload=(available=true)=>({country:'US',packageType:'PARCEL',transportType:'AVIA',available});
const mock=(body:unknown,status=200)=>(async()=>new Response(
  typeof body==='string'?body:JSON.stringify(body),
  {status,headers:{'content-type':'application/json'}}
)) as typeof fetch;

test('Ukrposhta 2026 availability API accepts exactly country/package/transport, returns non-payable timestamped digest',async()=>{
  let calls=0;
  const fetcher=(async(url:RequestInfo|URL,init?:RequestInit)=>{
    calls++;
    const u=new URL(String(url));
    assert.equal(u.origin,'https://www.ukrposhta.ua');
    assert.equal(u.pathname,'/ecom/0.0.1/countries/delivery-availability');
    assert.equal(u.searchParams.get('country'),'US');
    assert.equal(u.searchParams.get('product'),'PARCEL');
    assert.equal(u.searchParams.get('type'),'AVIA');
    assert.equal(u.searchParams.get('token'),auth.userToken);
    assert.equal(init?.method,'GET');
    assert.equal(init?.cache,'no-store');
    assert.equal(init?.redirect,'error');
    assert.equal((init?.headers as Record<string,string>).Authorization,`Bearer ${auth.bearer}`);
    assert.ok(init?.signal);
    return new Response(JSON.stringify(payload()),{status:200});
  }) as typeof fetch;
  const out=await probeUkrposhtaAvailability(input(),auth,fetcher,fixedTime);
  assert.equal(calls,1);
  assert.equal(out.outcome,'available');
  assert.equal(out.source_adapter_version,UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION);
  assert.match(out.source_digest_sha256||'',/^[0-9a-f]{64}$/);
  assert.equal(out.captured_at,'2026-10-09T13:00:00.000Z');
  assert.equal(out.expires_at,'2026-10-09T14:00:00.000Z');
  assert.equal(UKRPOSHTA_AVAILABILITY_TTL_MINUTES,60);
  assert.equal(out.standard_verified,false);
  assert.equal(out.express_verified,false);
  assert.equal(out.shipping_method_mapping_owner_approved,false);
  assert.equal(out.payable,false);
  assert.equal(out.payment_enabled,false);
  assert.ok(!JSON.stringify(out).includes(auth.userToken));
  assert.ok(!JSON.stringify(out).includes(auth.bearer));
});

test('negative carrier answer is not guessed positive and cannot authorize Express or payment',async()=>{
  const no=await probeUkrposhtaAvailability(input(),auth,mock(payload(false)),fixedTime);
  assert.equal(no.outcome,'unavailable');
  assert.match(no.source_digest_sha256||'',/^[0-9a-f]{64}$/);
  assert.equal(no.payable,false);
  assert.equal(no.express_verified,false);
});

test('missing credentials or restricted destinations never issue an HTTP request',async()=>{
  let invoked=0;
  const fetcher=(async()=>{invoked++;throw Error('not called');}) as typeof fetch;
  assert.equal((await probeUkrposhtaAvailability(input(),null,fetcher,fixedTime)).outcome,'not_configured');
  assert.equal((await probeUkrposhtaAvailability(input(),{bearer:'',userToken:''},fetcher,fixedTime)).outcome,'not_configured');
  for(const country of ['RU','BY','KP','SY']){
    const r=await probeUkrposhtaAvailability({...input(),country},auth,fetcher,fixedTime);
    assert.equal(r.outcome,'unavailable');
    assert.equal(r.payable,false);
  }
  assert.equal(invoked,0);
});

test('Ukrposhta API 401/429/503, invalid JSON, changed country/product or transport produce UNKNOWN, never service',async()=>{
  for(const status of [401,429,503]){
    const out=await probeUkrposhtaAvailability(input(),auth,mock({message:'service unavailable'},status),fixedTime);
    assert.equal(out.outcome,'unknown');
    assert.equal(out.source_digest_sha256,null);
  }
  for(const body of ['not json',{country:'PL',packageType:'PARCEL',transportType:'AVIA',available:true},
    {country:'US',packageType:'EMS',transportType:'AVIA',available:true},
    {country:'US',packageType:'PARCEL',transportType:'GROUND',available:true},
    {country:'US',packageType:'PARCEL',transportType:'AVIA',available:'true'},
    {country:'US',packageType:'PARCEL',transportType:'AVIA',available:true,token:'not allowed'},
    'x'.repeat(4100)]){
    const out=await probeUkrposhtaAvailability(input(),auth,mock(body),fixedTime);
    assert.equal(out.outcome,'unknown');
    assert.equal(out.payable,false);
    assert.equal(out.source_digest_sha256,null);
  }
  const thrown=await probeUkrposhtaAvailability(input(),auth,
    (async()=>{throw Error('network URL with secret token');}) as typeof fetch,fixedTime);
  assert.equal(thrown.outcome,'unknown');
  assert.ok(!JSON.stringify(thrown).includes(auth.userToken));
});

test('invalid arbitrary carrier product and country input rejected before hitting Ukrposhta',async()=>{
  const fetcher=(async()=>{throw Error('not called');}) as typeof fetch;
  for(const bad of [
    {...input(),country:'ZZ'},
    {...input(),country:'us'},
    {...input(),carrier_product:'unknown'},
    {...input(),transport_type:'PRIVATE'},
  ]){
    await assert.rejects(probeUkrposhtaAvailability(bad as ReturnType<typeof input>,auth,fetcher,fixedTime),
      /ukrposhta_probe_input_invalid/);
  }
});
