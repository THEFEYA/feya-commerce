import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/** Browser/UI regression on a loopback instance only. The real catalog/pricing rules have separate fixture tests. */
export async function verifySavedCartColour({browser, env, out}) {
  const origin='http://127.0.0.1:3049';
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3049'],{
    env:{...env,NODE_ENV:'development',VERCEL:'1',VERCEL_ENV:'preview',
      VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',VERCEL_GIT_COMMIT_REF:'work/cart-saved-colour-mobile-20261123'},
    stdio:['ignore','ignore','inherit'],
  });
  const done=once(server,'exit');
  const prefix='067628e8-3ecd-4979-8501-6da61ca2f51a';
  const cfg='30daa219-ee33-4feb-8870-a43b9b593745';
  const old={id:prefix+'-'+cfg+'-M-Mirror',slug:'metallic-fringe-harness-set-top-skirt-fashion-festival-clothing-chrome-rave-outfit-1890025125',
    configuration_id:cfg,title:'Metallic Fringe Harness Set Top & Skirt – Fashion Festival Clothing',
    config:'Full Set',size:'M',color:'Mirror',qty:1,price:179.54,currency:'EUR'};
  const choices=['Gold','Silver'].map(label=>({code:label.toLowerCase(),label,configuration_id:cfg,config:'Full Set',unit_minor:17954,compare_at_minor:null}));
  const context=await browser.newContext({viewport:{width:390,height:844},storageState:{cookies:[],origins:[{origin,
    localStorage:[{name:'feya_visual_cart_v1',value:JSON.stringify([old])}]}]}});
  let finishInitialStatus;
  const initialStatus=new Promise(resolve=>{finishInitialStatus=resolve;});
  try {
    let ready=false;
    for(let i=0;i<100 && !ready;i++){
      if(server.exitCode!=null)throw new Error('Isolated cart test server exited');
      try{ready=(await fetch(origin+'/cart',{signal:AbortSignal.timeout(60000)})).ok;}catch{}
      if(!ready)await delay(400);
    }
    assert.ok(ready,'Cart on loopback must render');
    let orderAttempts=0;
    let statusAvailable=false;
    let paymentsEnabled=true;
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin)return route.abort();
      if(url.pathname==='/api/checkout/status'){
        if(!statusAvailable){
          await initialStatus;
          return route.fulfill({json:{ok:true,checkout_active:false,storage_ready:false}});
        }
        return route.fulfill({json:{ok:true,checkout_active:paymentsEnabled,storage_ready:true}});
      }
      if(url.pathname==='/api/checkout/quote'){
        const [line]=route.request().postDataJSON().lines;
        const valid=choices.some(c=>c.code===line.color_code&&c.label===line.color);
        return route.fulfill({status:valid?200:422,json:valid?{ok:true,amounts:{merchandise_minor:17954,
          shipping_minor:1900,extras_minor:0,remote_minor:0,handling_minor:0,total_minor:19854}}:
          {ok:false,code:'checkout_color_invalid',colour_recovery:{line_id:line.id,title:'Silver Body Harness Top and Fringe Skirt Set',choices}}});
      }
      if(url.pathname.startsWith('/api/checkout')){orderAttempts++;return route.abort();}
      return route.continue();
    });
    const page=await context.newPage();
    const hydrationErrors=[];
    page.on('pageerror',error=>{if(/hydrat/i.test(error.message))hydrationErrors.push(error.message);});
    await page.goto(origin+'/cart',{waitUntil:'domcontentloaded'});
    await page.getByText('Checking payment availability…',{exact:true}).waitFor();
    assert.equal(await page.getByText('Checkout not active',{exact:true}).count(),0);
    assert.equal(await page.getByLabel('Have a coupon code?').count(),0);
    finishInitialStatus();
    const retry=page.getByRole('button',{name:'Check again'});
    await retry.waitFor();
    assert.equal(await page.getByText('Checkout not active',{exact:true}).count(),0);
    statusAvailable=true;
    await retry.click();
    const silver=page.getByRole('button',{name:'Silver',exact:true});
    await silver.waitFor({timeout:60000});
    assert.ok(await page.getByTestId('checkout-pay').isDisabled());
    assert.equal(await page.getByRole('button',{name:'Gold',exact:true}).count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
    await page.screenshot({path:join(out,'saved-colour-mobile.png')});
    await silver.click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="server-total"]')?.textContent?.includes('198.54'));
    await page.reload();
    await page.getByText('Full Set · Silver · M',{exact:true}).waitFor();
    assert.equal(await page.getByRole('article').count(),1);
    await page.setViewportSize({width:1440,height:900});
    await page.getByTestId('server-order-summary').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
    await page.screenshot({path:join(out,'saved-colour-desktop.png')});
    const country=page.getByLabel('Destination country');
    const postalCode=page.getByLabel('ZIP / postal code');
    await country.selectOption('US');
    await postalCode.fill('90210');
    await country.selectOption('HK');
    assert.equal(await postalCode.count(),0);
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('Buyer');
    await page.locator('input[autocomplete="email"]').fill('test@example.invalid');
    await page.getByLabel('Telephone').fill('5550100');
    await page.getByLabel('District / locality').fill('Sha Tin');
    await page.getByLabel('Street address').fill('1 Test Road');
    await page.locator('input[type="checkbox"][required]').check();
    const area=page.getByLabel('Area (optional)');
    assert.equal(await area.inputValue(),'');
    await page.waitForFunction(()=>document.querySelector('[data-testid="checkout-pay"]')?.disabled===false);
    await area.selectOption('New Territories');
    await country.selectOption('US');
    assert.equal(await postalCode.inputValue(),'');
    assert.equal(await page.getByTestId('checkout-pay').isDisabled(),true);
    paymentsEnabled=false;
    await page.reload();
    await page.getByRole('button',{name:'Checkout not active'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Check again'}).count(),0);
    assert.equal(orderAttempts,0);
    assert.deepEqual(hydrationErrors,[]);
  } finally {
    finishInitialStatus();
    await context.close();
    if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([done,delay(4000)]);}
    if(server.exitCode===null)server.kill('SIGKILL');
  }
}
