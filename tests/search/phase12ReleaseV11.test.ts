import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase 12 v11 binds the current production proof while remaining fail-closed',()=>{
  const source=readFileSync('supabase/migrations/20261001212000_phase12_wave_a_release_v11.sql','utf8');
  for(const invariant of [
    "release_version=10",
    "11,",
    "'GATE_FAILED'",
    "97437ccb5aedc314bf98ddcf5850422876a28b46",
    "dpl_HSAskAJ4g66ibwaJcuPEwA6xEFLJ",
    "36912038552",
    "110536787495",
    "11187326919",
    "when g.gate_code in ('K02','K14') then 'PASS'",
    "domain_property_verified',false",
    "exact_release_hash_approved',false",
    "fail_count<>2",
    "pass_count<>15",
    "gate_code not in ('K19','K20')",
  ]) assert.ok(source.includes(invariant),invariant);

  assert.doesNotMatch(source,/feya_search_prepare_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/feya_search_execute_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/set\s+release_status\s*=\s*'ACTIVE'/i);
});
