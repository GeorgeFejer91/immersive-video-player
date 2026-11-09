import {test,expect} from '@playwright/test';

const quest='Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/39.2 Mobile VR Safari/537.36';

test('one public address pairs one viewer and one controller, then hands off the controller slot',async({browser,baseURL})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const address=new URL(baseURL).href;
  const contexts=[];
  async function open(userAgent){
    const context=await browser.newContext({userAgent,viewport:{width:800,height:480},deviceScaleFactor:.5});
    contexts.push(context);
    const page=await context.newPage();
    await page.goto(address);
    return page;
  }
  try{
    const desktop=await open();
    await desktop.locator('#connect').click();
    await expect(desktop.locator('#connection')).toHaveText('Waiting',{timeout:20000});
    await expect(desktop.locator('#play')).toBeDisabled();
    const host=await open(quest);
    await expect(host.locator('body')).toHaveAttribute('data-page','viewer');
    await expect(host.locator('#invite-link')).toHaveValue(address);
    await expect(desktop.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
    const phone=await open('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1');
    await phone.locator('#connect').click();
    await expect(phone.locator('#connection')).toHaveText('Reconnecting',{timeout:25000});
    await expect(phone.locator('#play')).toBeDisabled();
    const extraViewer=await open(quest);
    await expect(extraViewer.locator('#connection')).toHaveText('Viewer in use',{timeout:25000});
    await expect(extraViewer.locator('#enter-vr')).toBeDisabled();
    await expect(host.locator('body')).toHaveAttribute('data-peers','1');
    await expect(host.locator('#connection')).toHaveText('Connected');
    await host.locator('#enter-vr').click();
    await host.waitForFunction(()=>{
      const video=document.querySelector('video');
      return video.paused&&!video.seeking&&video.readyState>=3;
    });
    await desktop.locator('#play').click();
    for(const page of [host,desktop]){
      await expect(page.locator('body')).toHaveAttribute('data-playing','true');
      expect(page.url()).toBe(address);
    }
    await expect(phone.locator('#halt')).toBeDisabled();
    await desktop.locator('#halt').click();
    for(const page of [host,desktop])await expect(page.locator('body')).toHaveAttribute('data-playing','false');
    await desktop.getByRole('button',{name:'Video settings',exact:true}).click();
    await desktop.getByRole('button',{name:'Connection',exact:true}).click();
    await desktop.locator('#stop').click();
    await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
    await expect(host.locator('body')).toHaveAttribute('data-peers','1');
    await expect(desktop.locator('#play')).toBeDisabled();
    await phone.locator('#play').click();
    await expect(host.locator('body')).toHaveAttribute('data-playing','true');
    await phone.locator('#halt').click();
    await expect(host.locator('body')).toHaveAttribute('data-playing','false');
    await host.evaluate(()=>window.dispatchEvent(new Event('offline')));
    await expect(phone.locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(host.locator('body')).toHaveAttribute('data-peers','1',{timeout:45000});
    await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','synced');
  }finally{await Promise.all(contexts.map(context=>context.close()));}
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
        await expect(phone.locator('#phone-header #connect')).toBeVisible();
        await expect(phone.locator('#arm')).toBeHidden();
        expect(new URL(phone.url()).hash).toBe('');
      }finally{await context.close();}
    });
  }
});
