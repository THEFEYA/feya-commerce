#!/usr/bin/env node
/**
 * FEYA Stage A: catalog-only privilege inventory.
 * This file does NOT read private business rows, list sensitive object names,
 * call HTTP APIs, validate actual public reachability, or modify permissions.
 *
 * Explicit opt-in:
 *   FEYA_ACCESS_AUDIT_DATABASE_URL=<private connection URL> \
 *     node scripts/growth-p0-access-inventory.mjs --read-only-catalog
 * Never put a database URL into commits, tickets or chat messages.
 */
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const RELATION_SQL=[
"WITH catalog AS (",
" SELECT CASE WHEN n.nspname='public' THEN 'mixed_public'",
"             WHEN n.nspname='feya_sales' THEN 'legacy_sales' END AS scope,",
"        c.relkind,c.relrowsecurity,",
"        has_schema_privilege('anon',n.oid,'USAGE') AS schema_usable,",
"        has_table_privilege('anon',c.oid,'SELECT') AS anon_select,",
"        (has_table_privilege('anon',c.oid,'INSERT')",
"         OR has_table_privilege('anon',c.oid,'UPDATE')",
"         OR has_table_privilege('anon',c.oid,'DELETE')) AS anon_dml_grant,",
"        COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)",
"          WHERE option_name='security_invoker'),'false')='true' AS view_invoker",
" FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace",
" WHERE n.nspname IN ('public','feya_sales') AND c.relkind IN ('r','p','v','m')",
") SELECT scope,",
" count(*)::int AS object_count,",
" count(*) FILTER(WHERE relkind IN ('r','p'))::int AS table_count,",
" count(*) FILTER(WHERE relkind IN ('r','p')",
"   AND schema_usable AND anon_select AND NOT relrowsecurity)::int AS anon_table_select_rls_off,",
" count(*) FILTER(WHERE relkind='v' AND schema_usable AND anon_select",
"   AND NOT view_invoker)::int AS anon_default_definer_views,",
" count(*) FILTER(WHERE schema_usable AND anon_dml_grant)::int AS anon_dml_grants_metadata",
"FROM catalog GROUP BY scope ORDER BY scope",
].join("\n");

const FUNCTION_SQL=[
"WITH routines AS (",
" SELECT CASE WHEN n.nspname='public' THEN 'mixed_public'",
"             WHEN n.nspname='feya_sales' THEN 'legacy_sales' END AS scope,",
"        p.prosecdef,has_schema_privilege('anon',n.oid,'USAGE') AS schema_usable,",
"        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,",
"        EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) x",
"          WHERE x LIKE 'search_path=%') AS explicit_path",
" FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace",
" WHERE n.nspname IN ('public','feya_sales')",
") SELECT scope,count(*)::int AS routine_count,",
" count(*) FILTER(WHERE prosecdef AND schema_usable AND anon_execute)::int AS anon_definer_execute,",
" count(*) FILTER(WHERE prosecdef AND schema_usable AND anon_execute",
"   AND NOT explicit_path)::int AS anon_definer_missing_explicit_path",
"FROM routines GROUP BY scope ORDER BY scope",
].join("\n");

export const growthP0MetadataQueries=Object.freeze({relations:RELATION_SQL,functions:FUNCTION_SQL});
const COHORTS=new Set(['mixed_public','legacy_sales']);
const FIELDS={
  relations:['object_count','table_count','anon_table_select_rls_off',
    'anon_default_definer_views','anon_dml_grants_metadata'],
  functions:['routine_count','anon_definer_execute','anon_definer_missing_explicit_path'],
};
function parseRows(rows,kind){
  if(!Array.isArray(rows))throw new Error('READ_ONLY_METADATA_INCOMPLETE');
  const found=new Map();
  for(const row of rows){
    if(!row||typeof row!=='object'||!COHORTS.has(row.scope)||found.has(row.scope))
      throw new Error('READ_ONLY_METADATA_INCOMPLETE');
    const entry={scope:row.scope};
    for(const field of FIELDS[kind]){
      if(!Number.isSafeInteger(row[field])||row[field]<0)
        throw new Error('READ_ONLY_METADATA_INCOMPLETE');
      entry[field]=row[field];
    }
    found.set(row.scope,entry);
  }
  if(found.size!==COHORTS.size)throw new Error('READ_ONLY_METADATA_INCOMPLETE');
  return [...found.values()].sort((a,b)=>a.scope.localeCompare(b.scope));
}

/** Aggregate catalog snapshot, never interpret grants as proven public HTTP access. */
export function summarizeGrowthP0Catalog({relationRows,functionRows,inspectedAt}){
  if(typeof inspectedAt!=='string'||!Number.isFinite(Date.parse(inspectedAt)))
    throw new Error('READ_ONLY_METADATA_INCOMPLETE');
  const relations=parseRows(relationRows,'relations');
  const functions=parseRows(functionRows,'functions');
  return {
    audit:'FEYA_GROWTH_STAGE_A_ACCESS_CATALOG_V1',
    inspected_at:new Date(inspectedAt).toISOString(),
    scope:'mixed_public_and_legacy_sales_catalog_only',
    status:'REVIEW_REQUIRED',
    findings_are:'SQL_PERMISSION_METADATA_NOT_CONFIRMED_API_EXPOSURE',
    cohorts:relations.map(row=>({...row,...functions.find(x=>x.scope===row.scope)})),
    independent_gate_evidence:{
      api_exposed_schemas:'UNKNOWN',
      edge_handler_authorization:'NOT_TESTED',
      legacy_consumers:'NOT_FULLY_INVENTORIED',
      dated_restore_point:'UNVERIFIED',
      effective_anonymous_http_read:'NOT_TESTED',
    },
    grants_modified:false,
    safe_to_apply_permission_changes:false,
    canonical_owner_approval_required:true,
  };
}

async function run(){
  if(!process.argv.includes('--read-only-catalog')){
    process.stderr.write('Explicit --read-only-catalog required. Nothing executed.\n');
    process.exitCode=2;return;
  }
  const connectionString=process.env.FEYA_ACCESS_AUDIT_DATABASE_URL;
  if(!connectionString){
    process.stderr.write('Set FEYA_ACCESS_AUDIT_DATABASE_URL privately. No database contacted.\n');
    process.exitCode=2;return;
  }
  const {default:pg}=await import('pg');
  const client=new pg.Client({connectionString,connectionTimeoutMillis:5000,
    statement_timeout:10000,query_timeout:15000,
    application_name:'feya_growth_stage_a_read_only_catalog'});
  let transaction=false;
  try{
    await client.connect();
    await client.query('BEGIN READ ONLY');transaction=true;
    await client.query("SET LOCAL statement_timeout = '10s'");
    const relations=await client.query(RELATION_SQL);
    const functions=await client.query(FUNCTION_SQL);
    const result=summarizeGrowthP0Catalog({
      relationRows:relations.rows,functionRows:functions.rows,
      inspectedAt:new Date().toISOString(),
    });
    await client.query('ROLLBACK');transaction=false;
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch{
    // Do not print raw database errors: they may include private hostnames.
    process.stderr.write('READ_ONLY_METADATA_INCOMPLETE; no permissions modified.\n');
    process.exitCode=1;
  }finally{
    if(transaction)try{await client.query('ROLLBACK')}catch{}
    await client.end().catch(()=>{});
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  await run();
