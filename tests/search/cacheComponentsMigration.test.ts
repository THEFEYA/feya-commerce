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

test('Phase 6 enables Cache Components and removes the root-wide Block before activating the first named slice',()=>{
  const config=readFileSync('next.config.ts','utf8');
  const layout=readFileSync('app/layout.tsx','utf8');
  assert.ok(config.includes('cacheComponents: true'));
  assert.ok(!layout.includes('export const instant = false'));
});

test('only the first Phase 6 support slice is instant while all remaining route segments stay blocked',()=>{
  const activated=new Set([
    'app/about/page.tsx',
    'app/contact/page.tsx',
    'app/collections/[slug]/page.tsx',
    'app/page.tsx',
    'app/returns/page.tsx',
    'app/shipping/page.tsx',
    'app/shop/[slug]/page.tsx',
  ]);
  const wrongMode:string[]=[];
  const directiveBreaks:string[]=[];
  for(const path of walk('app')){
    if(!/(?:page|layout|default)\.(?:ts|tsx|js|jsx)$/.test(path))continue;
    const source=readFileSync(path,'utf8');
    if(path==='app/layout.tsx'){
      if(source.includes('export const instant = false'))wrongMode.push(path);
    }else if(activated.has(path)){
      if(!source.includes('export const instant = true')||source.includes('export const instant = false'))wrongMode.push(path);
    }else if(!source.includes('export const instant = false')){
      wrongMode.push(path);
    }
    if(source.includes('// @ts-nocheck')&&!source.trimStart().startsWith('// @ts-nocheck'))directiveBreaks.push(path);
    const lines=source.split(/\r?\n/);
    const firstCode=lines.find(line=>{
      const value=line.trim();
      return value && !value.startsWith('//');
    })?.trim();
    if((source.includes("'use client'")||source.includes('"use client"'))&&firstCode!=="'use client';"&&firstCode!=='"use client";')directiveBreaks.push(path);
  }
  assert.deepEqual(wrongMode,[],`unexpected Phase 6 instant mode:\n${wrongMode.join('\n')}`);
  assert.deepEqual([...new Set(directiveBreaks)],[],`top directives displaced:\n${[...new Set(directiveBreaks)].join('\n')}`);
});

test('URL-dependent client hooks are isolated behind Suspense for instant routes',()=>{
  const layout=readFileSync('app/layout.tsx','utf8');
  const collection=readFileSync('app/collections/[slug]/page.tsx','utf8');
  const pdp=readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.ok(layout.includes("<Suspense fallback={null}><MeasurementRuntime /></Suspense>"));
  assert.ok(collection.includes("<Suspense fallback={null}><Header/></Suspense>"));
  assert.ok(pdp.includes("<Suspense fallback={null}><Header /></Suspense>"));
});

test('legacy force-dynamic behavior is preserved with connection() until each storefront route is intentionally cached',()=>{
  const required=[
    'app/admin/layout.tsx',
    'app/shop/page.tsx',
  ];
  for(const path of required){
    const source=readFileSync(path,'utf8');
    assert.ok(source.includes("from 'next/server'"),path);
    assert.ok(source.includes('connection'),path);
    assert.ok(source.includes('await connection()'),path);
  }
  const collection=readFileSync('app/collections/[slug]/page.tsx','utf8');
  assert.ok(!collection.includes('await connection()'));
  assert.ok(collection.includes('export const instant = true'));

  const pdp=readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.ok(!pdp.includes('await connection()'));
  assert.ok(pdp.includes('export const instant = true'));
  assert.ok(pdp.includes('readCachedStorefrontProductPresentation'));

  const home=readFileSync('app/page.tsx','utf8');
  assert.ok(home.includes('export const instant = true'));
  assert.ok(home.includes('readCachedHomePresentationProducts'));
  assert.ok(home.includes('async function HomeBody()'));
  assert.ok(home.includes('await connection()'));
  assert.ok(home.includes('<Suspense fallback={<HomeBodyFallback />}>'));

  for(const path of [
    'app/about/page.tsx',
    'app/care/page.tsx',
    'app/contact/page.tsx',
    'app/privacy/page.tsx',
    'app/returns/page.tsx',
    'app/shipping/page.tsx',
    'app/size-guide/page.tsx',
    'app/terms/page.tsx',
  ]){
    const source=readFileSync(path,'utf8');
    assert.ok(!source.includes('await connection()'),path);
  }
});
