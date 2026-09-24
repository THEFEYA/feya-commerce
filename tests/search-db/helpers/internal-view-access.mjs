import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {metricClosureFixture} from './observed-metric-closure.mjs';
const q=s=>'"'+s.replaceAll('"','""')+'"';
export const internalViewFixture=async()=>JSON.parse(await readFile(new URL('../fixtures/observed-internal-view-closure-20260924.json',import.meta.url),'utf8'));
export const internalViewAccessSQL=()=>readFile(new URL('../../../supabase/migrations/20260924091540_internal_seo_view_access_extension_v1.sql',import.meta.url),'utf8');
export const internalViewRollbackSQL=()=>readFile(new URL('../fixtures/rollback-internal-view-access.sql',import.meta.url),'utf8');
export const internalViewSeedSQL=()=>readFile(new URL('../fixtures/internal-view-seed.sql',import.meta.url),'utf8');

/** Extend the existing SELECT restore by one table, four views and two pure SQL helpers. */
export async function internalViewExtensionSchemaSQL(){
 const f=await internalViewFixture(),old=await metricClosureFixture(),known=new Map(old.relations.map(r=>[r.name,r]));
 for(const r of f.relations)if(known.has(r.name))for(const field of ['kind','owner','options','acl','rls','definition','columns','dependencies','constraints'])assert.deepEqual(r[field],known.get(r.name)[field],r.name+' '+field);
 const extra=f.relations.filter(r=>!known.has(r.name)),sql=[];
 assert.equal(extra.filter(r=>r.kind==='r').length,1);assert.equal(extra.filter(r=>r.kind==='v').length,4);
 for(const t of extra.filter(r=>r.kind==='r')){
  assert.ok(t.rls&&!t.policies?.length);assert.ok(t.columns.every(c=>!c.identity&&!c.generated&&!c.default?.includes('nextval(')));
  sql.push(`create table public.${q(t.name)}(${t.columns.map(c=>q(c.name)+' '+c.type+(c.default?' default '+c.default:'')+(c.not_null?' not null':'')).join(',')});`);
  for(const c of t.constraints)sql.push(`alter table public.${q(t.name)} add constraint ${q(c.name)} ${c.definition};`);
  sql.push(`alter table public.${q(t.name)} enable row level security;`);
 }
 for(const fn of f.functions){
  assert.equal(fn.owner,'postgres');assert.equal(fn.prosecdef,false);
  assert.equal(fn.acl,'{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}');
  sql.push(fn.definition+';',`revoke all on function public.${fn.identity} from public,anon,authenticated,service_role; grant execute on function public.${fn.identity} to anon,authenticated,service_role;`);
 }
 const pending=extra.filter(r=>r.kind==='v');
 while(pending.length){const ix=pending.findIndex(r=>!(r.dependencies||[]).some(n=>pending.some(p=>p.name===n)));assert.ok(ix>=0);const v=pending.splice(ix,1)[0];sql.push(`create view public.${q(v.name)}${v.options?.length?' with ('+v.options.join(',')+')':''} as ${v.definition}`);}
 for(const r of extra){
  assert.equal(r.owner,'postgres');sql.push(`revoke all on public.${q(r.name)} from public,anon,authenticated,service_role;`);
  for(const g of r.grants.filter(g=>g.grantee!=='postgres'))sql.push(`grant ${g.privilege} on public.${q(r.name)} to ${g.grantee==='PUBLIC'?'PUBLIC':q(g.grantee)}${g.grantable?' with grant option':''};`);
 }
 return sql.join('\n');
}
