import { readFile } from 'node:fs/promises';

const quote = value => '"' + value.replaceAll('"', '""') + '"';
const role = value => value === 'PUBLIC' ? 'PUBLIC' : quote(value);
const object = value => `${quote(value.schema)}.${quote(value.name)}`;

/** Reviewed metadata only. No business rows, passwords or Auth sessions are restored. */
export async function observedSchemaSQL() {
  const snapshot = JSON.parse(await readFile(new URL('../fixtures/observed-schema-20260923.json', import.meta.url), 'utf8'));
  const roles = new Set(['anon', 'authenticated', 'service_role', 'supabase_admin']);
  for (const table of snapshot.tables) {
    roles.add(table.owner);
    for (const grant of table.grants) roles.add(grant.grantee);
  }
  for (const acl of snapshot.default_acls) {
    roles.add(acl.owner);
    for (const grant of acl.grants) roles.add(grant.grantee);
  }
  const statements = ["create schema if not exists auth;"];
  for (const r of roles) if (!['postgres', 'PUBLIC'].includes(r)) {
    statements.push(`create role ${quote(r)}${r === 'service_role' ? ' bypassrls' : ''};`);
  }
  statements.push(`grant usage on schema public to ${[...roles].map(role).join(', ')};`);
  // Reproduce broad observed defaults BEFORE applying our explicit private grants.
  for (const acl of snapshot.default_acls) for (const grant of acl.grants) {
    const kind = { r: 'tables', f: 'functions', S: 'sequences' }[acl.object_type];
    if (!kind) throw Error('Unreviewed default ACL type');
    statements.push(`alter default privileges for role ${quote(acl.owner)}${acl.schema ? ` in schema ${quote(acl.schema)}` : ''} grant ${grant.privilege} on ${kind} to ${role(grant.grantee)};`);
  }
  for (const table of snapshot.tables) {
    if (table.policies.length) throw Error('Policy restoration needs explicit review');
    const columns = table.columns.map(c => {
      if (c.identity) throw Error('Identity restoration needs explicit review');
      const expression = c.generated ? ` generated always as (${c.default}) stored` : c.default ? ` default ${c.default}` : '';
      return `${quote(c.name)} ${c.type}${expression}${c.not_null ? ' not null' : ''}`;
    });
    statements.push(`create table ${object(table)} (${columns.join(',\n')});`);
  }
  // Referenced unique keys must exist before any foreign keys are added.
  for (const isFK of [false, true]) for (const table of snapshot.tables) for (const constraint of table.constraints) {
    if ((constraint.type === 'f') === isFK) statements.push(`alter table ${object(table)} add constraint ${quote(constraint.name)} ${constraint.definition};`);
  }
  for (const fn of [...snapshot.supporting_functions, ...snapshot.trigger_functions]) statements.push(fn.definition + ';');
  for (const table of snapshot.tables) {
    for (const index of table.indexes) statements.push(index + ';');
    for (const trigger of table.triggers) statements.push(trigger.definition + ';');
    if (table.rls) statements.push(`alter table ${object(table)} enable row level security;`);
    if (table.force_rls) statements.push(`alter table ${object(table)} force row level security;`);
    statements.push(`alter table ${object(table)} owner to ${quote(table.owner)};`);
    statements.push(`revoke all on ${object(table)} from ${[...roles].map(role).join(', ')};`);
    for (const grant of table.grants) statements.push(`grant ${grant.privilege} on ${object(table)} to ${role(grant.grantee)}${grant.grantable ? ' with grant option' : ''};`);
  }
  for (const view of snapshot.views) {
    if (view.options?.length) throw Error('View options need explicit review');
    statements.push(`create view ${object(view)} as ${view.definition}`);
    statements.push(`revoke all on ${object(view)} from ${[...roles].map(role).join(', ')};`);
    for (const grant of view.grants) statements.push(`grant ${grant.privilege} on ${object(view)} to ${role(grant.grantee)};`);
  }
  return statements.join('\n');
}

export async function migrationSQL() {
  const names = ['20260923205841_search_portfolio_foundation_v1.sql', '20260923223420_seo_draft_atomic_save_v1.sql'];
  return (await Promise.all(names.map(name => readFile(new URL(`../../../supabase/migrations/${name}`, import.meta.url), 'utf8')))).join('\n');
}
