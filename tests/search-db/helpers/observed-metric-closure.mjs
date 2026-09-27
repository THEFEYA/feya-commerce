import {readFile} from 'node:fs/promises';
import {readerFixture} from './observed-reader-boundary.mjs';
const q=s=>'"'+s.replaceAll('"','""')+'"';
export const metricClosureFixture=async()=>JSON.parse(await readFile(new URL('../fixtures/observed-metric-closure-20260924.json',import.meta.url),'utf8'));

/** Complete SELECT dependency graph. Seven write tables retain their separately captured full fixture.
 * Other 31 tables restore columns/defaults/generated values/checks/keys/internal FKs/RLS/ACL.
 * External FKs, triggers and secondary indexes are outside this read/permission rehearsal.
 */
export async function metricClosureSchemaSQL(){
 const f=await metricClosureFixture(),base=JSON.parse(await readFile(new URL('../fixtures/observed-metric-schema-20260923.json',import.meta.url),'utf8'));
 const existing=new Set(base.tables.map(t=>t.name)),names=new Set(f.relations.map(r=>r.name)),sql=[];
 const extra=f.relations.filter(r=>r.kind==='r'&&!existing.has(r.name));
 for(const t of extra)for(const c of t.columns){const seq=c.default?.match(/^nextval\('([^']+)'::regclass\)$/)?.[1];if(seq)sql.push(`create sequence public.${q(seq)};`);if(c.identity)throw Error('Unreviewed identity');}
 for(const t of extra)sql.push(`create table public.${q(t.name)}(${t.columns.map(c=>q(c.name)+' '+c.type+(c.generated?' generated always as ('+c.default+') stored':c.default?' default '+c.default:'')+(c.not_null?' not null':'')).join(',')});`);
 for(const foreign of [false,true])for(const t of extra)for(const c of t.constraints||[]){
  if((c.type==='f')!==foreign)continue;if(c.type==='f'&&!names.has(c.foreign_table))continue;
  sql.push(`alter table public.${q(t.name)} add constraint ${q(c.name)} ${c.definition};`);
 }
 for(const fn of f.functions)sql.push(fn.definition+';');
 const pending=f.relations.filter(r=>r.kind==='v');
 while(pending.length){
  const ix=pending.findIndex(r=>!(r.dependencies||[]).some(n=>pending.some(p=>p.name===n)));
  if(ix<0)throw Error('Captured closure cycle');const v=pending.splice(ix,1)[0];
  sql.push(`create view public.${q(v.name)}${v.options?.length?' with ('+v.options.join(',')+')':''} as ${v.definition}`);
 }
 for(const r of f.relations){
  if(existing.has(r.name))continue;if(r.owner!=='postgres')throw Error('Unreviewed owner');
  if(r.kind==='r'&&r.rls)sql.push(`alter table public.${q(r.name)} enable row level security;`);
  sql.push(`revoke all on public.${q(r.name)} from public,anon,authenticated,service_role;`);
  for(const g of r.grants.filter(g=>g.grantee!=='postgres'))sql.push(`grant ${g.privilege} on public.${q(r.name)} to ${g.grantee==='PUBLIC'?'PUBLIC':q(g.grantee)}${g.grantable?' with grant option':''};`);
 }
 for(const fn of (await readerFixture()).functions)sql.push(fn.definition+';',`revoke all on function public.${fn.identity} from public,anon,authenticated; grant execute on function public.${fn.identity} to service_role;`);
 return sql.join('\n');
}
