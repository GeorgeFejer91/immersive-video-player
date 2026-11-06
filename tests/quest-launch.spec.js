import { test, expect } from '@playwright/test';

test('Quest app entry starts pairing and shows a fresh phone QR without arming media',async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?launch=quest');
  await expect(page.locator('body')).toHaveAttribute('data-page','viewer');
  await expect(page.locator('#qr-dialog')).toBeVisible();
  await expect(page.locator('#connect')).toBeDisabled();
  await expect(page.locator('#arm')).toBeEnabled();
  await expect(page.locator('#play')).toBeDisabled();
  const first=await page.locator('#invite-link').inputValue();
  expect(new URL(first).search).toBe('?controller=1');
  expect(new URL(first).hash).toContain('secret=');
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.locator('#video').evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  for(const [width,height] of [[320,560],[844,390],[1280,720],[1920,1080]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await expect(page.locator('#qr-dialog button').first()).toBeInViewport();
  }
  await page.screenshot({path:test.info().outputPath('quest-pairing.png')});
  await page.locator('#qr-dialog button').first().click();
  await expect(page.locator('#show-qr')).toBeFocused();
  await page.locator('#stop').click();
  await expect(page.locator('#invitation')).toBeHidden();
  await page.locator('#connect').click();
  await expect(page.locator('#invite-link')).not.toHaveValue(first);
  await page.locator('#stop').click();
  await page.reload();
  await expect(page.locator('#qr-dialog')).toBeVisible();
  await expect(page.locator('#invite-link')).not.toHaveValue(first);
});

test('Quest VR gesture arms playback even if immersive entry is unavailable',async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?launch=quest');
  await expect(page.locator('#qr-dialog')).toBeVisible();
  await page.locator('#qr-dialog button').first().click();
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await page.locator('#enter-vr').click();
  await expect(page.locator('#arm')).toBeDisabled();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#notice')).toHaveText('VR unavailable');
  expect(await page.locator('#video').evaluate(v=>v.paused)).toBe(true);
  await page.locator('#stop').click();
});

test('Quest auto-pairing retains its invitation after a signaling failure',async({page})=>{
  await page.addInitScript(()=>{
    class OfflineSdk extends EventTarget{
      async connect(){throw new Error('Signaling unavailable');}
      async disconnect(){}
    }
    Object.defineProperty(window,'VDONinjaSDK',{configurable:true,get:()=>OfflineSdk,set:()=>{}});
  });
  await page.goto('./?launch=quest');
  await expect(page.locator('#qr-dialog')).toBeVisible();
  const link=await page.locator('#invite-link').inputValue();
  await expect(page.locator('#connection')).toHaveText('Connection failed');
  await page.keyboard.press('Escape');
  await expect(page.locator('#show-qr')).toBeFocused();
  await page.locator('#connect').click();
  await expect(page.locator('#connection')).toHaveText('Connection failed');
  await expect(page.locator('#invite-link')).toHaveValue(link);
  await expect(page.locator('#arm')).toBeEnabled();
});

test('Quest app entry pairs a phone over public VDO before the local VR gesture',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const viewer=await browser.newPage();
  const phone=await browser.newPage({viewport:{width:390,height:844}});
  try {
    const base=process.env.TEST_URL||'http://127.0.0.1:4174/';
    await viewer.goto(new URL('?launch=quest',base).href);
    await expect(viewer.locator('#qr-dialog')).toBeVisible();
    await phone.goto(await viewer.locator('#invite-link').inputValue());
    await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
    await phone.locator('#arm').click();await phone.locator('#connect').click();
    await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
    await expect(viewer.locator('#qr-dialog')).toBeHidden();
    await expect(viewer.locator('#enter-vr')).toBeVisible();
    await expect(viewer.locator('#arm')).toBeEnabled();
    await expect(phone.locator('#play')).toBeEnabled();
    await phone.locator('#play').click();
    await expect(phone.locator('#phone-notice')).toHaveText('viewer not ready');
    expect(await viewer.locator('#video').evaluate(v=>v.paused)).toBe(true);
    await viewer.waitForFunction(()=>document.querySelector('video').readyState>=3);
    await viewer.locator('#enter-vr').click();
    await expect(viewer.locator('#arm')).toBeDisabled();
    await viewer.waitForFunction(()=>{
      const video=document.querySelector('#video');
      return document.body.dataset.playing==='false'&&video.paused&&!video.seeking&&video.readyState>=3;
    });
    await phone.locator('#play').click();
    for(const p of [viewer,phone])await expect(p.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
    await expect(phone.locator('#halt')).toBeEnabled();await phone.locator('#halt').click();
    for(const p of [viewer,phone]){
      await expect(p.locator('body')).toHaveAttribute('data-playing','false');
      await expect.poll(()=>p.locator('#video').evaluate(v=>v.currentTime)).toBeLessThan(.1);
    }
    await viewer.locator('#stop').click();
    await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','disconnected');
  } finally {await viewer.close();await phone.close();}
});
