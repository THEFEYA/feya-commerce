import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedAdminFetch,type AdminDataAccess} from '../../lib/adminAuthorizedFetch.ts';

test('denied or unavailable identity performs no privileged transport, including writes',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;return new Response('{}');};
 const denied:Extract<AdminDataAccess,{ok:false}>[]=[{ok:false,status:401,code:'anonymous'},{ok:false,status:403,code:'outsider'},{ok:false,status:503,code:'disabled'}];
 for(const decision of denied)for(const method of ['GET','POST','PATCH','DELETE']){
  const response=await authorizedAdminFetch(async()=>decision,transport)('https://example.test/rest/v1/private',{method});
  assert.equal(response.status,decision.status);assert.match(response.headers.get('cache-control')||'',/no-store/);
 }
 const unavailable=await authorizedAdminFetch(async()=>{throw Error('no request context');},transport)('https://example.test');
 assert.equal(unavailable.status,503);assert.equal(calls,0);
});

test('owner request preserves body and credentials, disables cache, and never authorizes a following outsider',async()=>{
 let actor:AdminDataAccess={ok:true,userId:'owner'},calls=0;
 const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(input,'https://example.test/rest/v1/private');assert.equal(init?.body,'reviewed-payload');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer synthetic-service');assert.equal(init?.cache,'no-store');return new Response('{"ok":true}',{status:201});};
 const request=authorizedAdminFetch(async()=>actor,transport),options={method:'POST',body:'reviewed-payload',headers:{authorization:'Bearer synthetic-service'},cache:'force-cache' as const};
 assert.equal((await request('https://example.test/rest/v1/private',options)).status,201);
 actor={ok:false,status:403,code:'outsider'};assert.equal((await request('https://example.test/rest/v1/private',options)).status,403);assert.equal(calls,1);
});
