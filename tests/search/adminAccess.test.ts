import test from 'node:test';
import assert from 'node:assert/strict';
import {adminAccessDecision,adminAuthConfiguration,adminLoginConfigurationReady} from '../../lib/adminAccess.ts';
test('empty allowlist denies even a valid identity; exact UUID/email match preserves configured policy',()=>{
 assert.deepEqual(adminAccessDecision({id:'owner',email:'owner@example.test'},{}),{configured:false,allowed:false});
 assert.equal(adminAccessDecision({id:'OWNER'},{FEYA_ADMIN_ALLOWED_USER_IDS:' owner, , other '}).allowed,true);
 assert.equal(adminAccessDecision({email:'OWNER@example.test'},{FEYA_ADMIN_ALLOWED_EMAILS:'owner@example.test'}).allowed,true);
 assert.equal(adminAccessDecision({email:'attacker-owner@example.test'},{FEYA_ADMIN_ALLOWED_EMAILS:'owner@example.test'}).allowed,false);
});
test('owner login stays unavailable until an auth mode, Supabase keys and a nonempty allowlist are configured',()=>{
 const env={FEYA_ADMIN_AUTH_REQUIRED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test-key',FEYA_ADMIN_ALLOWED_EMAILS:'owner@example.test'};
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration(env)),true);
 for(const key of Object.keys(env)){
  assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,[key]:''})),false,key);
 }
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,FEYA_ADMIN_ALLOWED_EMAILS:' , , '})),false);
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,FEYA_ADMIN_ALLOWED_EMAILS:'',FEYA_ADMIN_ALLOWED_USER_IDS:'trusted-user-id'})),true);
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,NEXT_PUBLIC_SUPABASE_ANON_KEY:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'publishable-test-key'})),true);
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,FEYA_ADMIN_AUTH_REQUIRED:'TRUE'})),false);
 assert.equal(adminLoginConfigurationReady(adminAuthConfiguration({...env,FEYA_ADMIN_AUTH_REQUIRED:'false',FEYA_OWNER_ACTION_AUTH_REQUIRED:'true'})),true);
});
test('editable admin metadata cannot grant access or replace the verified subject',()=>{
 const user={id:'outsider',email:'outsider@example.test',user_metadata:{id:'owner',email:'owner@example.test',role:'admin',is_admin:true}};
 assert.deepEqual(adminAccessDecision(user,{FEYA_ADMIN_ALLOWED_USER_IDS:'owner'}),{configured:true,allowed:false});
 assert.equal(adminAccessDecision({id:{toString:()=> 'owner'}},{FEYA_ADMIN_ALLOWED_USER_IDS:'owner'}).allowed,false);
});
