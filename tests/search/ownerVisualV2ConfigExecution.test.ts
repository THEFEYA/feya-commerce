import test from 'node:test';
import assert from 'node:assert/strict';

test('real Next config routes normal menu URLs to changed owner pages on exact Vercel preview',async()=>{
  const keys=['VERCEL','VERCEL_ENV','VERCEL_PROJECT_ID','VERCEL_GIT_COMMIT_REF','FEYA_OWNER_PREVIEW_DISABLED'] as const;
  const previous=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
  try{
    process.env.VERCEL='1';
    process.env.VERCEL_ENV='preview';
    process.env.VERCEL_PROJECT_ID='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';
    process.env.VERCEL_GIT_COMMIT_REF='work/owner-visual-commercial-review-v2-20261010';
    delete process.env.FEYA_OWNER_PREVIEW_DISABLED;
    // Execute the actual NextConfig object, not an approximation/string search.
    const {default:config}=await import('../../next.config.ts');
    const rules=await config.rewrites?.();
    assert.ok(rules && !Array.isArray(rules));
    const before=rules.beforeFiles;
    assert.deepEqual(before.map(({source,destination})=>[source,destination]),[
      ['/events-performance','/events-performance-review'],
      ['/style','/style-review'],
      ['/about','/about-review'],
      ['/shipping','/shipping-review'],
      ['/returns','/returns-review'],
      ['/size-guide','/size-guide-review'],
      ['/contact','/contact-review'],
    ]);
    assert.equal(config.env?.NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW,'1');
    assert.deepEqual(rules.afterFiles,[]);
    assert.deepEqual(rules.fallback,[]);
  }finally{
    for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
  }
});
