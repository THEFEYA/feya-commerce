import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const BRANCH='work/search-architecture-foundation-20260923';
const PROJECT='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';

export async function verifyOwnerActionStepUpRuntime({
  browser,ownerPage,env,check,report,
}){
  const base='http://127.0.0.1:3002';
  const stepEnv={
    ...env,
    FEYA_ADMIN_AUTH_REQUIRED:'false',
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',
    FEYA_OWNER_ACTIONS_ENABLED:'true',
    FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED:'false',
    FEYA_COMMERCE_MANUAL_CONFIGURATION_REPAIR_ENABLED:'false',
    FEYA_COMMERCE_MANUAL_PRICE_GOVERNANCE_ENABLED:'false',
    VERCEL:'1',
    VERCEL_ENV:'preview',
    VERCEL_PROJECT_ID:PROJECT,
    VERCEL_GIT_COMMIT_REF:BRANCH,
  };
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{
    env:stepEnv,stdio:['ignore','pipe','pipe'],
  });
  let log='';server.stdout.on('data',b=>{log+=b});server.stderr.on('data',b=>{log+=b});
  try{
    let ready=false;
    for(let i=0;i<80;i++){
      try{if((await fetch(base+'/admin/login')).status===200){ready=true;break}}catch{}
      await new Promise(r=>setTimeout(r,250));
    }
    assert.equal(ready,true,'Step-up preview server did not start');

    const anonymous=await browser.newContext();
    const anonPage=await anonymous.newPage();
    await check('Owner preview stays anonymously readable while arbitrary writes remain locked',async()=>{
      const read=await anonPage.goto(base+'/admin');
      assert.equal(read?.status(),200);
      const write=await anonPage.request.post(base+'/api/admin/review-events',{data:{}});
      assert.equal(write.status(),423);
      assert.equal((await write.json()).code,'owner_preview_read_only');
    });

    await check('Step-up price endpoint requires an authenticated owner instead of opening preview writes',async()=>{
      for(const path of ['/api/admin/review/prices/baseline-adoption','/api/admin/review/prices/manual-configuration-repair','/api/admin/review/prices/manual-price-governance']){
        const response=await anonPage.request.post(base+path,{data:{action:'prepare'}});
        assert.equal(response.status(),401,path);
        const body=await response.json();
        assert.equal(body.code,'authentication_required');
      }
    });
    await anonymous.close();

    const owner=ownerPage.context();
    const page=await owner.newPage();

    await check('Existing allowlisted Supabase session steps up without locking anonymous preview reads',async()=>{
      const read=await page.goto(base+'/admin');
      assert.equal(read?.status(),200);
      const baseline=await page.request.post(base+'/api/admin/review/prices/baseline-adoption',{data:{action:'prepare'}});
      assert.equal(baseline.status(),423);
      assert.equal((await baseline.json()).code,'price_baseline_adoption_disabled');
      const repair=await page.request.post(base+'/api/admin/review/prices/manual-configuration-repair',{data:{action:'prepare'}});
      assert.equal(repair.status(),423);
      assert.equal((await repair.json()).code,'manual_configuration_repair_disabled');
      const governance=await page.request.post(base+'/api/admin/review/prices/manual-price-governance',{data:{action:'prepare'}});
      assert.equal(governance.status(),423);
      assert.equal((await governance.json()).code,'manual_price_governance_disabled');
    });

    await check('Authenticated owner still cannot use unrelated preview mutation endpoints',async()=>{
      for(const path of ['/api/admin/review-events','/api/admin/company/execution-approval']){
        const unrelated=await page.request.post(base+path,{data:{}});
        assert.equal(unrelated.status(),423);
        assert.equal((await unrelated.json()).code,'owner_preview_read_only');
      }
    });
    await page.close();

    report.owner_action_step_up_runtime=true;
    report.owner_preview_read_only_preserved=true;
    report.owner_action_execution_enabled=false;
  }finally{
    server.kill('SIGTERM');
    await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);
    if(server.exitCode===null)server.kill('SIGKILL');
    if(server.exitCode&&server.exitCode!==0) throw new Error('Step-up preview server failed: '+log.slice(-3000));
  }
}
