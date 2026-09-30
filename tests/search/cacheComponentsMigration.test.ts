import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir:string):string[]{
  const out:string[]=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(path));
    else if(/\.(?:ts|tsx|js|jsx)$/.test(entry.name))out.push(path.replaceAll('\\','/'));
  }
  return out;
}

test('Cache Components migration has no legacy route cache segment exports',()=>{
  const offenders:string[]=[];
  for(const path of walk('app')){
    if(!/(?:page|layout|default|route)\.(?:ts|tsx|js|jsx)$/.test(path) && !/^app\/(?:robots|sitemap)\.ts$/.test(path))continue;
    const source=readFileSync(path,'utf8');
    if(/export\s+const\s+(?:dynamic|revalidate|fetchCache|runtime)\s*=/.test(source))offenders.push(path);
  }
  assert.deepEqual(offenders,[],`legacy cache route exports remain:\n${offenders.join('\n')}`);
});

test('Phase 6 enables Cache Components and keeps global instant validation opted out during migration',()=>{
  const config=readFileSync('next.config.ts','utf8');
  const layout=readFileSync('app/layout.tsx','utf8');
  assert.ok(config.includes('cacheComponents: true'));
  assert.ok(layout.includes('export const instant = false'));
});


test('all page/layout/default segments are explicitly opted out until Phase 6 activates them route by route',()=>{
  const missing:string[]=[];
  const directiveBreaks:string[]=[];
  for(const path of walk('app')){
    if(!/(?:page|layout|default)\.(?:ts|tsx|js|jsx)$/.test(path))continue;
    const source=readFileSync(path,'utf8');
    if(!source.includes('export const instant = false'))missing.push(path);
    if(source.includes('// @ts-nocheck')&&!source.trimStart().startsWith('// @ts-nocheck'))directiveBreaks.push(path);
    const lines=source.split(/\r?\n/);
    const firstCode=lines.find(line=>{
      const value=line.trim();
      return value && !value.startsWith('//');
    })?.trim();
    if((source.includes("'use client'")||source.includes('"use client"'))&&firstCode!=="'use client';"&&firstCode!=='"use client";')directiveBreaks.push(path);
  }
  assert.deepEqual(missing,[],`instant opt-out missing:\n${missing.join('\n')}`);
  assert.deepEqual([...new Set(directiveBreaks)],[],`top directives displaced:\n${[...new Set(directiveBreaks)].join('\n')}`);
});
