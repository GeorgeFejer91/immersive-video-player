import {test,expect} from '@playwright/test';

test('phone is a local video player with transport and an accessible headset connection button',async({page})=>{
  const sockets=[];page.on('websocket',ws=>sockets.push(ws.url()));
  await page.goto('./?controller=1');
  const settings=page.getByRole('dialog',{name:'Headset connection'});
  await expect(settings).toBeVisible();
  await page.keyboard.press('Escape');
  const headset=page.locator('#headset-status');
  await expect(headset).toBeFocused();
  await expect(headset).toHaveAttribute('data-state','disconnected');
  await expect(headset).toHaveAccessibleName('Headset disconnected');
  await expect(page.locator('#video')).toBeVisible();
  await expect(page.locator('#phone-controls')).toBeVisible();
  await expect(page.locator('#play')).toHaveText('Start');
  for(const id of ['play','pause','halt'])await expect(page.locator('#'+id)).toBeDisabled();
  expect(await page.locator('#stage canvas').count()).toBe(0);
  expect(await page.locator('#video').evaluate(v=>!v.controls&&v.muted&&new URL(v.currentSrc||v.src).pathname.endsWith('/media/jona.mp4'))).toBe(true);
  expect(sockets.filter(url=>url.includes('vdo.ninja'))).toEqual([]);
  expect((await page.locator('body').innerText()).trim().split(/\s+/).length).toBeLessThan(12);
  for(const [width,height] of [[320,560],[390,844],[640,390],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    const boxes=await page.locator('#phone-header,#video,#phone-controls').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
    expect(boxes[1].height).toBeGreaterThan(100);expect(boxes[0].bottom).toBeLessThanOrEqual(boxes[1].top+1);expect(boxes[1].bottom).toBeLessThanOrEqual(boxes[2].top+1);expect(boxes[2].bottom).toBeLessThanOrEqual(height);
  }
  await headset.click();await expect(settings).toBeVisible();
  await page.locator('#hide-controls').click();await expect(settings).toBeHidden();await expect(headset).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await headset.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:':root{font-size:32px} button{letter-spacing:.12em;word-spacing:.16em;line-height:1.5}'});
  await page.locator('#play').evaluate(el=>el.textContent='Wiedergabe starten');await page.waitForTimeout(200);
  expect(await page.locator('.screen').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await page.locator('#phone-controls button').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2))).toBe(true);
});
