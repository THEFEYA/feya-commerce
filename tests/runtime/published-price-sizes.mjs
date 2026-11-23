import assert from 'node:assert/strict';

/** Read-only preview check. Uses a fresh browser context and never enters checkout. */
export async function verifyPublishedPriceSizes({browser,origin}){
  const context=await browser.newContext();
  const page=await context.newPage();
  const path='/shop/fashion-corset-skirt-for-event-wear-luxury-corset-basque-women-s-top-mirrored-belt-choker-4373546738';
  const permalink=new URL(path,origin);
  const price=page.getByTestId('pdp-price-regular');
  const size=name=>page.getByRole('button',{name,exact:true});
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('feya_visual_cart_v1')||'[]'));
  try{
    await page.goto(permalink.href);
    await price.waitFor();
    assert.equal(await price.textContent(),'€230.21');
    assert.equal(await size('M').getAttribute('aria-pressed'),'false');
    await size('Add to bag').click();
    await page.getByRole('alert').filter({hasText:'Select a size'}).waitFor();
    assert.deepEqual(await stored(),[]);
    await size('XXL').click();
    assert.equal(await price.textContent(),'€183.44');
    await size('Add to bag').click();
    const [line]=await stored();
    assert.equal(line.size,'XXL');assert.equal(line.price,183.44);
    assert.equal(line.price_confidence_status,'website_only_size_price');
    await page.locator('button.feya-config-trigger').click();
    await size('Choker').click();
    assert.equal(await size('XXL').getAttribute('aria-pressed'),'false');
    assert.equal(await size('M').getAttribute('aria-pressed'),'false');
    assert.equal(await price.textContent(),'€100.09');
    await size('Add to bag').click();
    await page.getByRole('alert').filter({hasText:'Select a size'}).waitFor();
    assert.equal((await stored()).length,1);
    permalink.searchParams.set('configuration','bc5d078e-6a54-4270-9f17-52c0b55a3dd8');
    for(const [fit,amount] of [['M','€230.21'],['XXL','€183.44']]){
      permalink.searchParams.set('size',fit);
      await page.goto(permalink.href);
      await price.waitFor();
      assert.equal(await size(fit).getAttribute('aria-pressed'),'true');
      assert.equal(await price.textContent(),amount);
    }
  }finally{
    await context.close();
  }
}
