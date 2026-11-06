import { test, expect } from '@playwright/test';
async function fits(page,selector){
  expect(await page.locator(selector).evaluateAll(els=>els.filter(el=>el.checkVisibility()&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)).map(el=>el.id||el.tagName))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
}
test('minimal launcher stretches without panel scrolling',async({page})=>{
  await page.goto('./');
  await expect(page.getByRole('heading',{name:'Immersive Video Player',exact:true})).toBeVisible();
  const text=await page.locator('body').innerText();expect(text.replace('Download Quest APK','')).not.toMatch(/Quest|One film|instructions|Source|Scan|devices/i);
  expect(text.trim().split(/\s+/).length).toBeLessThan(20);
  for(const [width,height] of [[320,560],[390,844],[844,390],[1280,720],[1920,1080]]){
    await page.setViewportSize({width,height});
    for(const open of [false,true]){
      await page.locator('#entry-options').evaluate((el,value)=>el.open=value,open);await page.waitForTimeout(150);
      await fits(page,'.stretch-shell,.stretch-body,button,.button-link,summary');
      const qr=await page.locator('#entry-qr').boundingBox();expect(Math.abs(qr.width-qr.height)).toBeLessThan(1);
    }
  }
});
test('player accordion groups fit portrait and landscape',async({page})=>{
  for(const role of ['role=viewer']){
    await page.goto('./?'+role);await expect(page.locator('#player')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
    expect(await page.locator('body').innerText()).not.toMatch(/Quest|WebRTC|head tracking|immersive film|A view to step/i);
    await page.locator('#view-settings summary').focus();await page.keyboard.press('Enter');
    await expect(page.locator('#view-settings')).toHaveAttribute('open','');
    await expect(page.locator('#connection-settings')).not.toHaveAttribute('open');
    for(const [width,height] of [[320,560],[390,844],[640,390],[844,390],[800,480],[1280,720]]){
      await page.setViewportSize({width,height});
      for(const id of ['connection-settings','playback-settings','view-settings']){
        await page.locator('#'+id).evaluate(el=>el.open=true);await page.waitForTimeout(150);
        await fits(page,'.stretch-shell,.stretch-body,.accordion-content,button,summary');
        expect(await page.locator('[data-accordion][open]').count()).toBe(1);
      }
    }
  }
});
test('stretch spacing grows and enlarged text stays readable',async({page})=>{
  await page.goto('./');await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  await page.setViewportSize({width:640,height:560});await page.waitForTimeout(100);
  const small=await page.locator('#entry').evaluate(el=>({gap:parseFloat(getComputedStyle(el).gap),font:parseFloat(getComputedStyle(el).fontSize)}));
  await page.setViewportSize({width:1200,height:960});await page.waitForTimeout(100);
  const large=await page.locator('#entry').evaluate(el=>({gap:parseFloat(getComputedStyle(el).gap),font:parseFloat(getComputedStyle(el).fontSize)}));
  expect(large.gap).toBeGreaterThan(small.gap);expect(large.font).toBeGreaterThanOrEqual(small.font);
  await page.setViewportSize({width:320,height:700});await page.addStyleTag({content:':root{font-size:32px} button,a{letter-spacing:.12em;word-spacing:.16em;line-height:1.5}'});await page.waitForTimeout(200);
  expect(await page.locator('#entry').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
