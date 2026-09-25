import assert from 'node:assert/strict';
import test from 'node:test';
import decision from '../../docs/search/price-baseline-schema-go-decision-20260925.json' with { type: 'json' };

test('E5 authorizes only the inert schema scope and records no production mutation',()=>{
  assert.equal(decision.decision.schema_only,'GO_PENDING_EXPLICIT_APPLY');
  assert.equal(decision.production_mutation_performed,false);
  assert.deepEqual(decision.allowed_schema_scope,[
    'supabase/migrations/20260925170000_price_baseline_adoption_v1.sql',
  ]);
  assert.equal(decision.forbidden_in_same_change.length,3);
});

test('all execution surfaces stay STOP until production owner-action environment is proven',()=>{
  assert.equal(decision.decision.owner_batch_prepare,'STOP');
  assert.equal(decision.decision.owner_batch_approval,'STOP');
  assert.equal(decision.decision.owner_batch_execute,'STOP');
  assert.equal(decision.decision.variant_quote_offer_cutover,'STOP');
  assert.equal(decision.decision.payment,'STOP');
  assert.equal(decision.decision.indexing,'STOP');
  assert.equal(decision.vercel_application.live,false);
  assert.equal(decision.vercel_application.production_target_detected,false);
  assert.equal(decision.vercel_application.relevant_owner_action_env_values_visible,false);
});

test('schema GO is bound to the exact audited production evidence',()=>{
  assert.equal(decision.production_database.clean_source_products,205);
  assert.equal(decision.production_database.clean_source_price_rows,850);
  assert.equal(decision.production_database.hold_products,0);
  assert.equal(decision.production_database.already_ready_clean_products,0);
  assert.equal(decision.production_database.target_migration_present,false);
  assert.equal(decision.production_database.pre_cutover_evidence_sha256,
    '500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f');
  assert.equal(decision.exact_head_ci.conclusion,'success');
  assert.equal(decision.exact_head_ci.jobs_total,14);
});
