import { test, expect } from '@playwright/test';
async function fits(page,selector){
  expect(await page.locator(selector).evaluateAll(els=>els.filter(el=>el.checkVisibility()&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)).map(el=>el.id||el.tagName))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
}
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
  await page.goto('./?role=viewer');await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  await page.setViewportSize({width:640,height:390});await page.waitForTimeout(100);
  const small=await page.locator('#panel').evaluate(el=>({gap:parseFloat(getComputedStyle(el).gap),font:parseFloat(getComputedStyle(el).fontSize)}));
  await page.setViewportSize({width:1200,height:960});await page.waitForTimeout(100);
  const large=await page.locator('#panel').evaluate(el=>({gap:parseFloat(getComputedStyle(el).gap),font:parseFloat(getComputedStyle(el).fontSize)}));
  expect(large.gap).toBeGreaterThan(small.gap);expect(large.font).toBeGreaterThan(small.font);
  await page.setViewportSize({width:320,height:700});await page.addStyleTag({content:':root{font-size:32px} button,a{letter-spacing:.12em;word-spacing:.16em;line-height:1.5}'});await page.waitForTimeout(200);
  expect(await page.locator('#panel').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
