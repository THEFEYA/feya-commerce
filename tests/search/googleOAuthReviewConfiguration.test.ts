import test from 'node:test';
import assert from 'node:assert/strict';
import {googleOAuthReviewConfiguration,GOOGLE_MARKETING_APPLICATION_NAME} from '../../lib/googleOAuthReviewConfiguration.ts';

test('OAuth review diagnostics return a number hint but never credentials or provider approval',()=>{
 const id='826834264134-fixture.apps.googleusercontent.com';
 const result=googleOAuthReviewConfiguration({GOOGLE_ADS_CLIENT_ID:id,GOOGLE_ADS_CLIENT_SECRET:'secret-marker',GOOGLE_ADS_REFRESH_TOKEN:'refresh-marker'});
 assert.equal(result.applicationName,'FEYA SEO Metrics Tool');
 assert.equal(result.oauthProjectNumberHint,'826834264134');
 assert.equal(result.projectHintMatchesExpected,true);
 assert.equal(result.projectConfirmationRequired,true);
 assert.equal(result.brandVerification,'not_observed');
 assert.equal(result.apiAccessLevel,'not_observed');
 for(const credential of [id,'secret-marker','refresh-marker'])assert.equal(JSON.stringify(result).includes(credential),false);
});
test('missing, different or malformed client IDs cannot imply the intended Google project or control the console URL',()=>{
 assert.equal(GOOGLE_MARKETING_APPLICATION_NAME,'FEYA SEO Metrics Tool');
 assert.equal(googleOAuthReviewConfiguration({}).oauthProjectNumberHint,null);
 const other=googleOAuthReviewConfiguration({GOOGLE_ADS_CLIENT_ID:'999999999999-fixture.apps.googleusercontent.com'});
 assert.equal(other.projectHintMatchesExpected,false);
 for(const id of ['https://attacker.example/?secret=token','826834264134-fixture.apps.googleusercontent.com.evil.test','826834264134-fixture.apps.googleusercontent.com\nextra']){
  const result=googleOAuthReviewConfiguration({GOOGLE_ADS_CLIENT_ID:id});
  assert.equal(result.oauthProjectNumberHint,null);
  assert.equal(result.brandingUrl,'https://console.cloud.google.com/auth/branding?project=826834264134');
 }
});
