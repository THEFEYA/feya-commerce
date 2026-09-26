import {readFile} from 'node:fs/promises';
const q=s=>'"'+s.replaceAll('"','""')+'"';
export const readerFixture=async()=>JSON.parse(await readFile(new URL('../fixtures/observed-reader-boundary-20260923.json',import.meta.url),'utf8'));
export const readerMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260923234026_keyword_metric_reader_boundary_v1.sql',import.meta.url),'utf8');

/** Exact direct-reader SQL. External relations are typed boundary fixtures, explicitly not full upstream logic. */
export async function readerBoundarySchemaSQL() {
 const f=await readerFixture();
 const base=JSON.parse(await readFile(new URL('../fixtures/observed-metric-schema-20260923.json',import.meta.url),'utf8'));
 const existing=new Set(base.tables.map(t=>t.name));
 const statements=[];
 for(const r of f.dependencies.filter(r=>!r.definition&&!existing.has(r.name))){
   statements.push(`create table public.${q(r.name)}(${r.columns.map(c=>q(c.name)+' '+c.type).join(',')});`);
 }
 const pending=f.dependencies.filter(r=>r.definition);
 while(pending.length){
   const ix=pending.findIndex(r=>!pending.some(other=>other!==r&&new RegExp('\\b'+other.name+'\\b').test(r.definition)));
   if(ix<0)throw Error('Direct-reader dependency cycle');
   const r=pending.splice(ix,1)[0];
   if(r.owner!=='postgres'||r.acl!=='{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}')throw Error('Unreviewed reader ACL');
   statements.push(`create view public.${q(r.name)}${r.options?.length?' with ('+r.options.join(',')+')':''} as ${r.definition}`);
 }
 for(const fn of f.functions){
   if(fn.owner!=='postgres'||fn.acl!=='{postgres=X/postgres,service_role=X/postgres}')throw Error('Unreviewed function ACL');
   statements.push(fn.definition+';',`revoke all on function public.${fn.identity} from public,anon,authenticated; grant execute on function public.${fn.identity} to service_role;`);
 }
 return statements.join('\n');
}
