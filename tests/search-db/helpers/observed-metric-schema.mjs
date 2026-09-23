import { readFile } from 'node:fs/promises';
const q=s=>'"'+s.replaceAll('"','""')+'"';
export async function observedMetricSchemaSQL() {
  const {tables}=JSON.parse(await readFile(new URL('../fixtures/observed-metric-schema-20260923.json',import.meta.url),'utf8'));
  const sql=[`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`];
  for(const t of tables)for(const c of t.columns){
    const sequence=c.default?.match(/^nextval\('([^']+)'::regclass\)$/)?.[1];
    if(sequence)sql.push(`create sequence public.${q(sequence)};`);
  }
  for(const t of tables){
    if(t.policies?.length||t.columns.some(c=>c.identity))throw Error('Unexpected schema contract');
    if(t.acl!=='{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}')throw Error('Unexpected ACL');
    sql.push(`create table public.${q(t.name)} (${t.columns.map(c=>`${q(c.name)} ${c.type}${c.generated?' generated always as ('+c.default+') stored':c.default?' default '+c.default:''}${c.not_null?' not null':''}`).join(',')});`);
  }
  for(const fk of [false,true])for(const t of tables)for(const c of t.constraints||[])if((c.type==='f')===fk)sql.push(`alter table public.${q(t.name)} add constraint ${q(c.name)} ${c.definition};`);
  for(const t of tables){
    for(const ix of t.indexes||[])if(!(t.constraints||[]).some(c=>['p','u'].includes(c.type)&&ix.includes('INDEX '+c.name+' ON')))sql.push(ix+';');
    for(const tr of t.triggers||[])sql.push(tr.function_definition+';',tr.definition+';');
    if(t.rls)sql.push(`alter table public.${q(t.name)} enable row level security;`);
  }
  return sql.join('\n');
}
export const metricMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260923232105_keyword_metric_atomic_import_v1.sql',import.meta.url),'utf8');
