import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {
  growthP0MetadataQueries,summarizeGrowthP0Catalog,
} from '../../scripts/growth-p0-access-inventory.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
const script=resolve(dir,'../../scripts/growth-p0-access-inventory.mjs');
const valid={
  relationRows:[
    {scope:'mixed_public',object_count:450,table_count:120,
      anon_table_select_rls_off:24,anon_default_definer_views:90,
      anon_dml_grants_metadata:26},
    {scope:'legacy_sales',object_count:21,table_count:7,
      anon_table_select_rls_off:4,anon_default_definer_views:11,
      anon_dml_grants_metadata:1},
  ],
  functionRows:[
    {scope:'mixed_public',routine_count:100,anon_definer_execute:23,
      anon_definer_missing_explicit_path:4},
    {scope:'legacy_sales',routine_count:4,anon_definer_execute:2,
      anon_definer_missing_explicit_path:0},
  ],
  inspectedAt:'2026-10-19T19:20:00Z',
};

test('Stage A is an explicit opt-in; nothing connects without confirmation',()=>{
  const o=spawnSync(process.execPath,[script],{
    env:{...process.env,FEYA_ACCESS_AUDIT_DATABASE_URL:''},
    encoding:'utf8',timeout:3500,
  });
  assert.equal(o.status,2);
  assert.match(o.stderr,/Explicit --read-only-catalog required/);
  const noSecret=spawnSync(process.execPath,[script,'--read-only-catalog'],{
    env:{...process.env,FEYA_ACCESS_AUDIT_DATABASE_URL:''},
    encoding:'utf8',timeout:3500,
  });
  assert.equal(noSecret.status,2);
  assert.match(noSecret.stderr,/No database contacted/);
});

test('inventory SQL reads pg_catalog only and runs in READ ONLY transaction',()=>{
  const source=readFileSync(script,'utf8');
  assert.match(source,/BEGIN READ ONLY/);
  assert.match(source,/ROLLBACK/);
  assert.match(source,/SET LOCAL statement_timeout/);
  assert.ok(!source.includes('service_role') || source.includes('service secrets'));
  for(const sql of Object.values(growthP0MetadataQueries)){
    assert.match(sql,/^WITH\b/);
    assert.match(sql,/FROM pg_class|FROM pg_proc/);
    assert.match(sql,/JOIN pg_namespace/);
    assert.doesNotMatch(sql,/(?:^|\n)\s*(?:INSERT|UPDATE|DELETE|GRANT|REVOKE|CREATE|ALTER|DROP|TRUNCATE|CALL)\b/im);
    assert.doesNotMatch(sql,/FROM public\.[A-Za-z]|FROM feya_sales\.[A-Za-z]/i);
  }
});

test('catalog aggregate never invents API exposure, backup proof or a release authorization',()=>{
  const result=summarizeGrowthP0Catalog(valid);
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.grants_modified,false);
  assert.equal(result.safe_to_apply_permission_changes,false);
  assert.equal(result.canonical_owner_approval_required,true);
  assert.equal(result.independent_gate_evidence.api_exposed_schemas,'UNKNOWN');
  assert.equal(result.independent_gate_evidence.dated_restore_point,'UNVERIFIED');
  assert.equal(result.cohorts.length,2);
  assert.equal(result.cohorts.find(x=>x.scope==='mixed_public')?.anon_definer_execute,23);
  assert.ok(!JSON.stringify(result).includes('private_table_name'));
  assert.ok(!JSON.stringify(result).includes('object_identity'));
});

test('metadata validation fails closed on missing, ambiguous or inconsistent input',()=>{
  const bad=[
    {...valid,relationRows:[]},
    {...valid,relationRows:[...valid.relationRows,valid.relationRows[1]]},
    {...valid,relationRows:[...valid.relationRows.slice(0,1),{...valid.relationRows[1],anon_table_select_rls_off:-1}]},
    {...valid,functionRows:[...valid.functionRows.slice(0,1),{...valid.functionRows[1],routine_count:'4'}]},
    {...valid,inspectedAt:'n/a'},
  ];
  for(const input of bad)assert.throws(()=>summarizeGrowthP0Catalog(input),/READ_ONLY_METADATA_INCOMPLETE/);
});
