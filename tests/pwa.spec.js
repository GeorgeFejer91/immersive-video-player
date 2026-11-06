import { test,expect } from '@playwright/test';

test.use({serviceWorkers:'allow'});
test('controller has a valid subpath-safe manifest, real icons and an offline shell without cached media or invitations',async({page,context})=>{
  await page.goto('./?controller=1');
  const manifestAddress=await page.locator('link[rel=manifest]').getAttribute('href');
  expect(manifestAddress).toBeTruthy();
  const manifestResponse=await context.request.get(new URL(manifestAddress,page.url()).href);
  const manifest=await manifestResponse.json();
  expect(manifest.display).toBe('standalone');expect(manifest.start_url).toBe('./?controller=1');expect(manifest.scope).toBe('./');
  for(const icon of manifest.icons){
    const response=await context.request.get(new URL(icon.src,manifestResponse.url()).href),bytes=await response.body();
    const size=Number(icon.sizes.split('x')[0]);expect(bytes.readUInt32BE(16)).toBe(size);expect(bytes.readUInt32BE(20)).toBe(size);
  }
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(await page.evaluate(async()=>{
    const response=await fetch('./media/jona.mp4',{headers:{Range:'bytes=0-63'}});await response.arrayBuffer();return response.status;
  })).toBe(206);
  const cached=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(name=>name.startsWith('ivp-shell-'));
    return (await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(request=>request.url)))).flat();
  });
  expect(cached.length).toBeGreaterThan(5);expect(cached.length).toBeLessThanOrEqual(32);
  for(const address of cached){const url=new URL(address);expect(url.search).toBe('');expect(url.hash).toBe('');expect(url.pathname).not.toMatch(/\/media\/|\/downloads\/|\.apk$/);}
  await context.setOffline(true);
  await page.goto('./?controller=1#room=brsp_offline12345678&secret='+ 'a'.repeat(43));
  await expect(page.locator('body')).toHaveClass(/phone/);await expect(page.locator('#phone-controls')).toBeVisible();
  await expect.poll(()=>new URL(page.url()).hash).toBe('');
  await context.setOffline(false);
});

test('install action appears on entry, explains Quest library creation and hides only for actual playback',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/39.2 Mobile VR Safari/537.36'});
  });
  await page.goto('./?role=viewer');
  await expect(page.locator('#install-app')).toBeVisible();
  await page.evaluate(()=>{
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{throw new Error('Quest must use its Library shortcut');};window.dispatchEvent(event);
  });
  await page.locator('#install-app').click();
  await expect(page.locator('#install-help')).toBeVisible();
  await expect(page.locator('#install-instructions')).toContainText('Add this page to your library');
  await expect(page.locator('#shortcut-viewer')).toHaveAttribute('href','./?launch=quest');
  await page.keyboard.press('Escape');await expect(page.locator('#install-app')).toBeFocused();
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await page.locator('#arm').click();await expect(page.locator('#arm')).toBeDisabled();
  await expect(page.locator('#install-app')).toBeVisible();
  await page.locator('#playback-settings summary').click();await page.locator('#play').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','true');
  await expect(page.locator('#install-app')).toBeHidden();
  await page.locator('#pause').click();await expect(page.locator('#install-app')).toBeHidden();
});

test('install invokes a supplied browser prompt inside the user gesture',async({page})=>{
  await page.goto('./?controller=1');
  await page.locator('#phone-dialog button#hide-controls').click();
  await page.evaluate(()=>{
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.__installGesture=navigator.userActivation.isActive;return {outcome:'accepted'};};
    window.dispatchEvent(event);
  });
  await page.locator('#install-app').click();
  expect(await page.evaluate(()=>window.__installGesture)).toBe(true);
  await expect(page.locator('#install-app')).toBeHidden();
  await expect(page.locator('#headset-status')).toBeFocused();
});

test('iPhone install help and bounded install labels remain readable',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1'});
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();event.stopImmediatePropagation();},{capture:true});
  });
  await page.goto('./?controller=1');await expect(page.locator('#phone-dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.locator('#install-app').click();
  await expect(page.locator('#install-instructions')).toContainText('Share, then Add to Home Screen');
  await page.keyboard.press('Escape');await expect(page.locator('#install-app')).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  for(const [width,height] of [[320,560],[390,844],[640,390],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    await expect(page.locator('#install-app')).toBeInViewport();
    if(width===390)await page.screenshot({path:test.info().outputPath('controller-install-390.png')});
  }
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:':root{font-size:32px} button{letter-spacing:.12em;word-spacing:.16em;line-height:1.5}'});
  await page.locator('#install-app').evaluate(el=>el.textContent='Controller zum Startbildschirm hinzufügen');
  await expect(page.locator('#install-app')).toHaveAttribute('data-text-fit','wrapped');
  expect(await page.locator('#install-app').evaluate(el=>el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2&&parseFloat(getComputedStyle(el).fontSize)>=32)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:test.info().outputPath('controller-install-enlarged.png')});
});
