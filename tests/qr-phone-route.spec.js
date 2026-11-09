import {test,expect} from '@playwright/test';
import { pairWithBeacon, sendBeacon } from './beacon-fixture.js';

const quest='Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/39.2 Mobile VR Safari/537.36';

test('scan lists two viewers, pairs only the chosen one, and controls its VR session',async({browser,baseURL})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const pages=[];
  async function open(url,userAgent){
    const page=await browser.newPage({userAgent,viewport:{width:800,height:560},deviceScaleFactor:.5});
    pages.push(page);
    if(userAgent)await page.addInitScript(()=>{
      window.xrRequests=0;window.xrEnds=0;
      WebGL2RenderingContext.prototype.makeXRCompatible=async()=>{};
      window.XRWebGLBinding=undefined;
      window.XRWebGLLayer=class {
        framebuffer=null;
        framebufferWidth=320;
        framebufferHeight=240;
      };
      class Session extends EventTarget {
        updateRenderState(){}
        async requestReferenceSpace(){return {};}
        requestAnimationFrame(callback){return window.requestAnimationFrame(time=>callback(time,{getViewerPose:()=>null}));}
        cancelAnimationFrame(id){window.cancelAnimationFrame(id);}
        async end(){window.xrEnds++;this.dispatchEvent(new Event('end'));}
      }
      Object.defineProperty(navigator,'xr',{value:Object.assign(new EventTarget(),{
        requestSession:async()=>{
          if(!navigator.userActivation.isActive)throw new DOMException('Gesture required','SecurityError');
          window.xrRequests++;
          return new Session();
        }
      })});
    });
    await page.goto(url);
    return page;
  }
  try{
    const controller=await open(baseURL);
    await controller.locator('#scan-beacons').click();
    await expect(controller.locator('#scan-status')).toHaveText('Searching for beacons…');
    const first=await open(baseURL,quest),second=await open(baseURL,quest);
    const other=await sendBeacon(first),chosen=await sendBeacon(second);
    await expect(controller.locator('#beacons option').filter({hasText:other.name})).toHaveCount(1);
    await pairWithBeacon(controller,chosen);
    await expect(first.locator('#beacon-dialog')).toBeVisible();
    await expect(second.locator('#beacon-dialog')).toBeHidden();
    await expect(second.locator('#send-beacon')).toBeHidden();
    await expect(second.locator('body')).toHaveAttribute('data-peers','1');
    await expect(controller.locator('#headset-status')).toBeFocused();

    const observer=await open(baseURL);
    await observer.locator('#scan-beacons').click();
    await expect(observer.locator('#beacons option').filter({hasText:other.name})).toHaveCount(1);
    await expect(observer.locator('#beacons option').filter({hasText:chosen.name})).toHaveCount(0);
    await first.locator('#cancel-beacon').click();
    await expect(observer.locator('#beacons option').filter({hasText:other.name})).toHaveCount(0,{timeout:12000});
    await observer.locator('#cancel-scan').click();

    await controller.getByRole('button',{name:'Request VR',exact:true}).click();
    await expect(second.locator('#notice')).toHaveText('Tap Enter VR on this headset');
    expect(await second.evaluate(()=>window.xrRequests)).toBe(0);
    await expect(first.locator('body')).toHaveAttribute('data-xr','windowed');
    await second.getByRole('button',{name:'Enter VR',exact:true}).click();
    const exit=controller.getByRole('button',{name:'Exit VR',exact:true});
    await expect(exit).toBeEnabled();
    await exit.click();
    await expect(second.locator('body')).toHaveAttribute('data-xr','windowed');
    await expect(controller.getByRole('button',{name:'Request VR',exact:true})).toBeEnabled();
    expect(await second.evaluate(()=>[window.xrRequests,window.xrEnds])).toEqual([1,1]);

    await second.evaluate(()=>window.dispatchEvent(new Event('offline')));
    await expect(controller.locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(controller.locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:45000});
    await expect(second.locator('body')).toHaveAttribute('data-peers','1');
    await expect(observer.locator('#play')).toBeDisabled();
  }finally{await Promise.all(pages.map(page=>page.close()));}
});


test('shared public URL opens phone playback controls without a pairing dialog',async({browser,page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./');
  const link=page.url();
  expect(new URL(link).search).toBe('');
  const phones=[
    ['iPhone Safari','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'],
    ['iPhone Chrome','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/143.0.0.0 Mobile/15E148 Safari/604.1'],
    ['Android Chrome','Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/143.0.0.0 Mobile Safari/537.36'],
    ['Samsung Internet','Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36'],
    ['Android scanner WebView','Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP4A; wv) AppleWebKit/537.36 Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36'],
    ['iPad desktop Safari','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'],
  ];
  for(const [name,userAgent]of phones){
    await test.step(name,async()=>{
      const context=await browser.newContext({userAgent,hasTouch:true,viewport:{width:390,height:844}});
      if(name.startsWith('iPad'))await context.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5}));
      try{
        await context.routeWebSocket('wss://wss.vdo.ninja',()=>{});
        const phone=await context.newPage();await phone.goto(link);
        await expect(phone.locator('body')).toHaveAttribute('data-page','controller');
        await expect(phone.locator('#player')).toBeVisible();
        await expect(phone.getByRole('dialog',{name:'Headset connection'})).toBeHidden();
        await expect(phone.locator('#phone-controls')).toBeVisible();
        await expect(phone.locator('#phone-header #scan-beacons')).toBeVisible();
        await expect(phone.locator('#arm')).toBeHidden();
        expect(new URL(phone.url()).hash).toBe('');
      }finally{await context.close();}
    });
  }
});
