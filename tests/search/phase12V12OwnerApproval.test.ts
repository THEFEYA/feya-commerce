import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase 12 v12 owner approval closes only K20 without mutating the approved release hash or activating',()=>{
  const source=readFileSync('supabase/migrations/20261001235900_phase12_v12_owner_approval_v1.sql','utf8');
  for(const invariant of [
    "2dc86d7c-6269-5327-9154-6b5178931254",
    "05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b",
    "7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7",
    "gate_code='K20'",
    "gate_status='PASS'",
    "exact_release_hash_approved',true",
    "activation_authorized',true",
    "pass_count',17",
    "fail_count',0",
    "excluded_approved_count',3",
    "phase12_v12_hash_mutated_after_approval",
  ]) assert.ok(source.includes(invariant),invariant);

  assert.doesNotMatch(source,/feya_search_prepare_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/feya_search_execute_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/set\s+release_status\s*=\s*'ACTIVE'/i);
});
