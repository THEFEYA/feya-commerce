import test from 'node:test';
import assert from 'node:assert/strict';
import {newCatalogSourceTiming, readGatewayUpstreamMs, createTimedCatalogFetch, catalogSourceTimingFields} from '../../lib/storefrontSourceTiming.ts';

test('gateway header accepts only finite bounded integer milliseconds',()=>{
 for(const value of [null,'','-1','2.4','21ms','123456',' 123','Infinity','0x10']) assert.equal(readGatewayUpstreamMs(value),null);
 assert.equal(readGatewayUpstreamMs('0'),0);
 assert.equal(readGatewayUpstreamMs('1290'),1290);
 assert.equal(readGatewayUpstreamMs('60000'),60000);
});

test('timed fetch preserves the response and stream unchanged',async()=>{
 const timing=newCatalogSourceTiming();
 const fake: typeof fetch=async()=>new Response('synthetic-body',{status:206,headers:{'x-envoy-upstream-service-time':'333'}});
 const response=await createTimedCatalogFetch(timing,fake)('https://synthetic.invalid');
 assert.equal(response.status,206);
 assert.equal(await response.text(),'synthetic-body');
 assert.equal(timing.responseCount,1);
 const fields=catalogSourceTimingFields(timing,1200);
 assert.equal(fields.gateway_upstream_ms,333);
 assert.ok(fields.fetch_headers_ms!==null && fields.fetch_headers_ms>=0 && fields.fetch_headers_ms<=1200);
 assert.equal(fields.post_headers_ms,1200-fields.fetch_headers_ms!);
});

test('multiple calls and missing header remain unattributed, no made-up zeros',async()=>{
 const t=newCatalogSourceTiming();
 const fake: typeof fetch=async()=>new Response('test');
 const f=createTimedCatalogFetch(t,fake);
 await f('https://synthetic.invalid');
 assert.equal(catalogSourceTimingFields(t,1700).gateway_upstream_ms,null);
 await f('https://synthetic.invalid');
 assert.deepEqual(catalogSourceTimingFields(t,1700),{fetch_headers_ms:null,gateway_upstream_ms:null,post_headers_ms:null});
 assert.deepEqual(catalogSourceTimingFields(newCatalogSourceTiming(),0),{fetch_headers_ms:null,gateway_upstream_ms:null,post_headers_ms:null});
});
