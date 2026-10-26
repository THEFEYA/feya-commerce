import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CHECKOUT_POLICY_BUNDLE_V1} from '../../lib/payments/checkoutPolicyEvidence.ts';

test('no policy can change without a reviewed version/hash in each order',()=>{
  assert.match(CHECKOUT_POLICY_BUNDLE_V1.version,/^thefeya-sale-policy-[0-9]{8}-v[0-9]+$/);
  const entries=Object.entries(CHECKOUT_POLICY_BUNDLE_V1.sources);
  assert.equal(entries.length,4);
  for(const [name,source] of entries){
    const bytes=readFileSync(source.file);
    const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(hash,source.git_blob_sha1,name+' changed without a policy version update');
    assert.equal(source.url,'/'+name);
  }
});
