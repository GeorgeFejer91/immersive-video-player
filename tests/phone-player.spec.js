import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
});

test('phone is a local video player with transport and an accessible headset connection button',async({page})=>{
  await page.goto('./?controller=1');
  const settings=page.getByRole('dialog',{name:'Headset connection'});
  await expect(settings).toBeHidden();
  const headset=page.locator('#headset-status');
  await expect(headset).toHaveAttribute('data-state','disconnected');
  await expect(headset).toHaveAccessibleName('Headset disconnected');
  await expect(page.locator('#video')).toBeVisible();
  await expect(page.locator('#phone-controls')).toBeVisible();
  await expect(page.locator('#play')).toHaveText('Start');
  for(const id of ['play','pause','halt'])await expect(page.locator('#'+id)).toBeDisabled();
  expect(await page.locator('#stage canvas').count()).toBe(0);
  expect(await page.locator('#video').evaluate(v=>!v.controls&&v.muted&&new URL(v.currentSrc||v.src).pathname.endsWith('/media/jona.mp4'))).toBe(true);
  const connect=page.locator('#phone-header #scan-beacons');
  await expect(connect).toBeVisible();
  expect((await page.locator('body').innerText()).trim().split(/\s+/).length).toBeLessThanOrEqual(18);
  const recenter=page.getByRole('button',{name:'Recenter view',exact:true});
  await expect(recenter).toBeVisible();await expect(recenter).toBeDisabled();
  for(const [width,height] of [[320,560],[390,844],[640,390],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    const boxes=await page.locator('#phone-header,#video,#phone-controls').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
    expect(boxes[1].height).toBeGreaterThan(100);expect(boxes[0].bottom).toBeLessThanOrEqual(boxes[1].top+1);expect(boxes[1].bottom).toBeLessThanOrEqual(boxes[2].top+1);expect(boxes[2].bottom).toBeLessThanOrEqual(height);
    await expect(recenter).toBeInViewport();
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
  expect(await connect.evaluate(el=>el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2)).toBe(true);
  expect(await recenter.evaluate(el=>el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2)).toBe(true);
  expect(await page.locator('#phone-controls button').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2))).toBe(true);
});

test('phone dewarps Jona at 240° and switches lens presets on the same paused frame',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await page.keyboard.press('Escape');
  const warp=page.getByRole('button',{name:'Video settings',exact:true});
  await expect(warp).toBeVisible();
  await warp.click();
  await page.keyboard.press('Escape');
  const panorama=page.getByRole('region',{name:'Jona panorama'});
  await expect(panorama).toBeVisible();
  const video=page.locator('#video');
  await video.evaluate(el=>{el.currentTime=120;});
  await page.waitForFunction(()=>{
    const el=document.querySelector('video');
    return el.paused&&!el.seeking&&el.readyState>=3&&el.currentTime===120;
  });
  const original=await panorama.screenshot();
  await warp.focus();await page.keyboard.press('Enter');
  const settings=page.getByRole('dialog',{name:'Video warp'});
  expect((await settings.boundingBox()).y).toBeLessThan(40);
  await expect(settings.getByRole('button',{name:'Jona 240°'})).toHaveAttribute('aria-pressed','true');
  const angle=settings.getByRole('slider',{name:'Angle',exact:true});
  await expect(angle).toHaveValue('240');
  await angle.fill('253');
  await expect(angle).toHaveValue('253');
  await expect(settings.locator('#phone-lens-value')).toHaveText('253°');
  await expect(settings).toBeVisible();
  await settings.getByRole('button',{name:'Jona 240°'}).click();
  await warp.click();await expect(angle).toHaveValue('240');
  await settings.getByRole('button',{name:'Fisheye 270°'}).click();
  await expect(settings).toBeHidden();await expect(warp).toBeFocused();
  expect((await panorama.screenshot()).equals(original)).toBe(false);
  expect(await video.evaluate(el=>[el.paused,el.currentTime])).toEqual([true,120]);
  await warp.click();
  await expect(settings.getByRole('button',{name:'Fisheye 270°'})).toHaveAttribute('aria-pressed','true');
  await settings.getByRole('button',{name:'Fisheye 360°'}).click();
  await warp.click();
  await expect(settings.getByRole('button',{name:'Fisheye 360°'})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');await expect(warp).toBeFocused();
  for(const [width,height] of [[320,560],[390,844],[640,390],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>{
      const stage=document.querySelector('#stage').getBoundingClientRect();
      const controls=document.querySelector('#phone-controls').getBoundingClientRect();
      return stage.height>100&&stage.bottom<=controls.top+1&&
        document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1;
    })).toBe(true);
  }
  await page.setViewportSize({width:320,height:560});
  await page.addStyleTag({content:':root{font-size:32px} button{letter-spacing:.12em;word-spacing:.16em;line-height:1.5}'});
  await warp.click();
  const localized=settings.getByRole('button',{name:'Fisheye 270°'});
  await localized.evaluate(el=>el.textContent='Fischaugenobjektiv 270°');
  await expect(settings.getByRole('button',{name:'Fischaugenobjektiv 270°'})).toHaveAttribute('data-text-fit','wrapped');
  await expect.poll(()=>settings.evaluate(el=>el.scrollWidth<=el.clientWidth+2&&
    [...el.querySelectorAll('button')].every(button=>button.scrollWidth<=button.clientWidth+2&&button.scrollHeight<=button.clientHeight+2)
  )).toBe(true);
  await page.addStyleTag({content:'#warp-dialog{--popup-top:47px;--popup-bottom:34px;inset-block-start:47px}'});
  await expect.poll(()=>settings.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight-34)).toBe(true);
  await settings.getByRole('button',{name:'Flat',exact:true}).scrollIntoViewIfNeeded();
  expect((await settings.getByRole('button',{name:'Flat',exact:true}).boundingBox()).y).toBeLessThan(560-34);
});

test('phone falls back to native video when WebGL is unavailable',async({page})=>{
  await page.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      return type.startsWith('webgl')?null:getContext.call(this,type,...args);
    };
  });
  await page.goto('./?controller=1');
  await expect(page.getByRole('dialog',{name:'Headset connection'})).toBeHidden();
  await page.getByRole('button',{name:'Video settings',exact:true}).click();
  const settings=page.getByRole('dialog',{name:'Video warp'});
  await expect(settings.getByText('Showing unwarped phone video.')).toBeVisible();
  await settings.getByRole('button',{name:'Fisheye 270°'}).click();
  await expect(page.locator('#video')).toBeVisible();
  await expect(page.locator('#video')).toHaveAttribute('aria-hidden','false');
  await expect(page.getByRole('region',{name:'Jona panorama'})).toHaveCount(0);
});
