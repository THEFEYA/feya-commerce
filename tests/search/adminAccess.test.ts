import test from 'node:test';
import assert from 'node:assert/strict';
import {adminAccessDecision} from '../../lib/adminAccess.ts';
test('empty allowlist denies even a valid identity; exact UUID/email match preserves configured policy',()=>{
 assert.deepEqual(adminAccessDecision({id:'owner',email:'owner@example.test'},{}),{configured:false,allowed:false});
 assert.equal(adminAccessDecision({id:'OWNER'},{FEYA_ADMIN_ALLOWED_USER_IDS:' owner, , other '}).allowed,true);
 assert.equal(adminAccessDecision({email:'OWNER@example.test'},{FEYA_ADMIN_ALLOWED_EMAILS:'owner@example.test'}).allowed,true);
 assert.equal(adminAccessDecision({email:'attacker-owner@example.test'},{FEYA_ADMIN_ALLOWED_EMAILS:'owner@example.test'}).allowed,false);
});
test('editable admin metadata cannot grant access or replace the verified subject',()=>{
 const user={id:'outsider',email:'outsider@example.test',user_metadata:{id:'owner',email:'owner@example.test',role:'admin',is_admin:true}};
 assert.deepEqual(adminAccessDecision(user,{FEYA_ADMIN_ALLOWED_USER_IDS:'owner'}),{configured:true,allowed:false});
 assert.equal(adminAccessDecision({id:{toString:()=> 'owner'}},{FEYA_ADMIN_ALLOWED_USER_IDS:'owner'}).allowed,false);
});
