import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase 12 v12 closes GSC Domain property gate while retaining owner approval as final blocker',()=>{
  const source=readFileSync('supabase/migrations/20261001235500_phase12_wave_a_release_v12.sql','utf8');
  for(const invariant of [
    "release_version=11",
    "'GATE_FAILED'",
    "7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7",
    "dpl_D3KccMszK6sVmsuib4GT5F3mR9fS",
    "36924805355",
    "110579381872",
    "11193221853",
    "when g.gate_code in ('K02','K14','K19') then 'PASS'",
    "required_property','sc-domain:thefeya.com'",
    "domain_property_verified',true",
    "permission_level','siteOwner'",
    "exact_release_hash_approved',false",
    "fail_count<>1",
    "pass_count<>16",
    "gate_code not in ('K20')",
  ]) assert.ok(source.includes(invariant),invariant);

  assert.doesNotMatch(source,/feya_search_prepare_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/feya_search_execute_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/set\s+release_status\s*=\s*'ACTIVE'/i);
});
