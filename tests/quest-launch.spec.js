import { test, expect } from '@playwright/test';

test('Quest opens the shared room and offers the same public QR after reconnecting',async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?launch=quest');
  await expect(page.locator('body')).toHaveAttribute('data-page','viewer');
  await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('#arm')).toBeHidden();
  await expect(page.locator('#connect')).toBeHidden();
  await expect(page.locator('#show-qr')).toBeVisible();
  await page.locator('#show-qr').click();
  const dialog=page.getByRole('dialog',{name:'Session QR'});
  await expect(dialog).toBeVisible();
  const address=new URL('.',page.url()).href;
  await expect(page.locator('#invite-link')).toHaveValue(address);
  expect(await page.locator('#video').evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  for(const [width,height] of [[320,560],[844,390],[1280,720],[1920,1080]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await expect(dialog.getByRole('button',{name:'Close'})).toBeInViewport();
  }
  await page.screenshot({path:test.info().outputPath('quest-pairing.png')});
  await page.keyboard.press('Escape');
  await expect(page.locator('#show-qr')).toBeFocused();
  await page.locator('#stop').click();
  await expect(page.locator('#connect')).toBeVisible();
  await page.locator('#connect').click();
  await expect(page.locator('#invite-link')).toHaveValue(address);
  await page.locator('#stop').click();
});

test('Quest VR gesture arms playback even if immersive entry is unavailable',async({page})=>{
  await page.addInitScript(()=>{
    window.xrAttempts=[];
    Object.defineProperty(navigator,'xr',{value:{
      isSessionSupported:async()=>true,
      requestSession:async mode=>{
        window.xrAttempts.push({mode,active:navigator.userActivation.isActive});
        throw new DOMException('Immersive mode unavailable','NotSupportedError');
      }
    }});
  });
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?launch=quest');
  expect(await page.evaluate(()=>window.xrAttempts)).toEqual([]);
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await page.locator('#enter-vr').click({timeout:2500});
  expect(await page.evaluate(()=>window.xrAttempts)).toEqual([{mode:'immersive-vr',active:true}]);
  await expect(page.locator('#arm')).toBeHidden();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#notice')).toHaveText('VR unavailable');
  expect(await page.locator('#video').evaluate(v=>v.paused)).toBe(true);
  await page.locator('#stop').click();
});

test('Quest auto-pairing retries the shared room after signaling failure and Disconnect cancels retries',async({page})=>{
  await page.addInitScript(()=>{
    window.__attempts=[];
    class OfflineSdk extends EventTarget{
      constructor(options){super();window.__attempts.push(options.password);}
      async connect(){throw new Error('Signaling unavailable');}
      async disconnect(){}
    }
    Object.defineProperty(window,'VDONinjaSDK',{configurable:true,get:()=>OfflineSdk,set:()=>{}});
  });
  await page.goto('./?launch=quest');
  await expect(page.locator('#connection')).toHaveText('Reconnecting');
  await expect.poll(()=>page.evaluate(()=>window.__attempts.length)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>new Set(window.__attempts).size)).toBe(1);
  await expect(page.locator('#arm')).toBeHidden();
  // Cancel a queued retry explicitly, then prove it cannot silently reopen a session.
  await page.locator('#stop').click();
  const attempts=await page.evaluate(()=>window.__attempts.length);
  await page.waitForTimeout(1700);expect(await page.evaluate(()=>window.__attempts.length)).toBe(attempts);
  await expect(page.locator('#show-qr')).toBeHidden();
});

test('Quest app entry pairs a phone over public VDO before the local VR gesture',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const viewer=await browser.newPage();
  const phone=await browser.newPage({viewport:{width:390,height:844}});
  try {
    const base=process.env.TEST_URL||'http://127.0.0.1:4174/';
    await viewer.goto(new URL('?launch=quest',base).href);
    await expect(viewer.locator('#show-qr')).toBeVisible();
    await phone.goto(await viewer.locator('#invite-link').inputValue());
    await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
    await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
    await expect(viewer.locator('#enter-vr')).toBeVisible();
    await expect(viewer.locator('#arm')).toBeHidden();
    await expect(phone.locator('#play')).toBeEnabled();
    // Model a browser that needs a Start gesture and time to buffer its preview.
    await phone.locator('#video').evaluate(video=>{
      const media=HTMLMediaElement.prototype;
      const paused=Object.getOwnPropertyDescriptor(media,'paused').get;
      const readyState=Object.getOwnPropertyDescriptor(media,'readyState').get;
      let cold=true, warming;
      Object.defineProperties(video,{
        paused:{get:()=>warming?false:paused.call(video)},
        readyState:{get:()=>cold?2:readyState.call(video)},
      });
      video.play=()=>!cold?media.play.call(video):new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          cold=false;warming=undefined;media.play.call(video).then(resolve,reject);
        },300);
        warming=()=>{clearTimeout(timer);warming=undefined;reject(new DOMException('Interrupted','AbortError'));};
      });
      video.pause=()=>{warming?.();media.pause.call(video);};
    });
    await phone.locator('#play').click();
    await expect(phone.locator('#phone-notice')).toHaveText('viewer not ready');
    expect(await viewer.locator('#video').evaluate(v=>v.paused)).toBe(true);
    await viewer.waitForFunction(()=>document.querySelector('video').readyState>=3);
    await viewer.locator('#enter-vr').click();
    await expect(viewer.locator('#arm')).toBeHidden();
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
