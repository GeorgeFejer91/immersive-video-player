import { test, expect } from '@playwright/test';

const QUEST_UA='Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 OculusBrowser/39.2 Chrome/137.0.0.0 Mobile VR Safari/537.36';
const PHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

test('main page shows a shared QR immediately without loading video or signaling',async({page})=>{
  const media=[],sockets=[];
  page.on('request',r=>{if(r.url().includes('/media/jona.mp4'))media.push(r.url());});
  page.on('websocket',ws=>sockets.push(ws.url()));
  await page.goto('./');
  await expect(page.locator('#entry-qr')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  const link=await page.locator('#entry-link').inputValue();
  expect(new URL(link).searchParams.get('join')).toBe('1');
  expect(new URL(link).hash).toContain('secret=');
  await expect(page.locator('#player')).toBeHidden();
  expect(await page.locator('#entry-qr').evaluate(c=>c.width)).toBeGreaterThan(300);
  expect(media).toEqual([]);expect(sockets.filter(url=>url.includes('vdo.ninja'))).toEqual([]);
  await page.locator('#new-session').click();
  await expect(page.locator('#entry-link')).not.toHaveValue(link);
});

test('player controls stay hidden until their module and handlers are ready',async({page})=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/player-app-*.js',async route=>{await gate;await route.continue();});
  const requested=page.waitForRequest(/\/assets\/player-app-.*\.js/);
  const navigation=page.goto('./?role=viewer');
  await requested;
  try {await expect(page.locator('#player')).toBeHidden();}
  finally {release();await navigation;}
  await expect(page.locator('#player')).toBeVisible();
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.locator('#connect').click();await expect(page.locator('#invitation')).toBeVisible();
  await page.locator('#stop').click();
});

test('shared invitation survives signaling retry and End clears role links',async({browser,page})=>{
  await page.goto('./');const link=await page.locator('#open-viewer').getAttribute('href');
  const context=await browser.newContext();
  await context.addInitScript(()=>{
    const attempts=[];window.__attempts=attempts;
    class OfflineSdk extends EventTarget{
      constructor(options){super();attempts.push(options.password);}
      async connect(){if(attempts.length<=2)throw new Error('Simulated unavailable signaling');await new Promise(()=>{});}
      async disconnect(){}
    }
    Object.defineProperty(window,'VDONinjaSDK',{configurable:true,get:()=>OfflineSdk,set:()=>{}});
  });
  const viewer=await context.newPage();await viewer.goto(link);
  await expect(viewer.locator('#switch-mode')).toBeVisible();
  const originalRoleLink=await viewer.locator('#switch-mode').getAttribute('href');
  for(let i=0;i<2;i++){
    await viewer.locator('#connect').click();
    await expect(viewer.locator('#connection')).toContainText('Could not reach signaling');
    await expect(viewer.locator('#connect')).toBeEnabled();
    await expect(viewer.locator('#switch-mode')).toHaveAttribute('href',originalRoleLink);
  }
  expect(await viewer.evaluate(()=>window.__attempts.length===2&&window.__attempts[0]===window.__attempts[1])).toBe(true);
  await viewer.locator('#connect').click();await viewer.locator('#stop').click();
  await expect(viewer.locator('#switch-mode')).toBeHidden();
  expect(await viewer.locator('#switch-mode').getAttribute('href')).toBeNull();
  await viewer.locator('#connect').click();
  await expect(viewer.locator('#switch-mode')).not.toHaveAttribute('href',originalRoleLink);
  await viewer.locator('#stop').click();await context.close();
});

test('copy fallback restores the shared route after copying a headset override',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}}});});
  await page.goto('./');const shared=await page.locator('#entry-link').inputValue();
  await page.locator('#copy-headset').click();
  expect(new URL(await page.locator('#entry-link').inputValue()).searchParams.get('role')).toBe('viewer');
  await page.locator('#copy-session').click();await expect(page.locator('#entry-link')).toHaveValue(shared);
});

test('one QR link chooses Quest viewer, phone controls and manual desktop fallback',async({browser,page})=>{
  await page.goto('./');const link=await page.locator('#entry-link').inputValue();
  for(const [ua,role] of [[QUEST_UA,'viewer'],[PHONE_UA,'controller']]){
    const context=await browser.newContext({userAgent:ua,viewport:{width:390,height:844}});
    const device=await context.newPage();await device.goto(link);
    await expect(device.locator('body')).toHaveAttribute('data-page',role);
    expect(new URL(device.url()).hash).toBe('');
    await expect(device.locator('#switch-mode')).toBeVisible();
    if(role==='controller'){
      await expect(device.locator('body')).toHaveClass(/phone/);
      await expect(device.locator('#role-label')).toHaveText('Control center');
      await expect(device.locator('#enter-vr')).toBeHidden();
    }
    await context.close();
  }
  await page.goto(link);
  await expect(page.locator('body')).toHaveAttribute('data-page','launcher');
  await expect(page.locator('#entry-link')).toHaveValue(link);
  await page.locator('#open-viewer').click();
  await expect(page.locator('body')).toHaveAttribute('data-page','viewer');
});

test('launcher reflows at narrow widths, enlarged type and long action labels',async({page})=>{
  await page.goto('./');await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  for(const [width,height] of [[320,700],[390,844],[844,390],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await page.locator('.entry button,.entry .button-link').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2).map(el=>el.id))).toEqual([]);
  }
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:':root{font-size:32px}.entry .button-link{font-size:2rem}p{line-height:1.5;letter-spacing:.12em;word-spacing:.16em}'});
  await page.locator('#open-controller').evaluate(el=>el.textContent='Smartphone-Steuerungszentrale öffnen');
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('#open-controller')).toHaveAttribute('data-text-fit','wrapped');
});

test('viewer is inert before explicit connection, local playback works and clean view restores focus',async({page})=>{
  const requests=[],errors=[];
  page.on('websocket',ws=>requests.push(ws.url())); page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?role=viewer');
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  expect(requests.filter(url=>url.includes('vdo.ninja'))).toHaveLength(0);
  await page.getByRole('button',{name:'Enable playback',exact:true}).click();
  await expect(page.locator('#arm')).toBeDisabled();
  await page.locator('#play').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','true',{timeout:7000});
  await page.locator('#pause').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','false');
  await page.getByRole('button',{name:'Hide controls',exact:true}).click();
  await expect(page.locator('#show-controls')).toBeFocused();
  await page.locator('#show-controls').click();
  await expect(page.locator('#hide-controls')).toBeFocused();
  expect(errors).toEqual([]);
});

test('rendered labels reflow at phone widths, landscape, desktop, large type and spacing',async({page})=>{
  await page.goto('./?role=viewer');
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  await page.locator('.about').evaluate(el=>el.open=true);
  for(const [width,height] of [[320,700],[390,844],[844,390],[1440,900],[1920,1080]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const overflowing=await page.locator('button,summary,.notice,.connection').evaluateAll(els=>els.filter(el=>el.getClientRects().length&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)).map(el=>el.id||el.textContent));
    expect(overflowing).toEqual([]);
  }
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:':root{font-size:32px} button{font-size:2rem} p{line-height:1.5;letter-spacing:.12em;word-spacing:.16em;margin-bottom:2em}'});
  await page.locator('#connect').evaluate(el=>el.textContent='Smartphone-Fernbedienung verbinden');
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('#connect')).toHaveAttribute('data-text-fit','wrapped');
});

test('phone strips bearer fragment and requires local preview before connecting',async({page})=>{
  await page.goto('./?controller=1#room=brsp_abcdefgh&secret='+ 'a'.repeat(43));
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#connect').click();
  await expect(page.locator('#notice')).toContainText('Enable phone preview first');
  await expect(page.locator('#paste-invitation')).toBeHidden();
});

test('Stop wins while signaling is unavailable and clears invitation',async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?role=viewer');
  await page.locator('#connect').click();
  await expect(page.locator('#invitation')).toBeVisible();
  await page.locator('#stop').click();
  await expect(page.locator('#invite-link')).toHaveValue('');
  await expect(page.locator('#invitation')).toBeHidden();
  await expect(page.locator('#connect')).toBeEnabled();
});

test('public VDO route: real handshake, scheduled play, seek, projection and controller handoff',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const launcherContext=await browser.newContext();const launcher=await launcherContext.newPage();
  const viewerContext=await browser.newContext({userAgent:QUEST_UA}), phoneContext=await browser.newContext({userAgent:PHONE_UA,viewport:{width:390,height:844}});
  const viewer=await viewerContext.newPage();let phone=await phoneContext.newPage();
  const base=process.env.TEST_URL||'http://127.0.0.1:4174/';
  await launcher.goto(base);const link=await launcher.locator('#entry-link').inputValue();
  await viewer.goto(link);await expect(viewer.locator('body')).toHaveAttribute('data-page','viewer');
  await viewer.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await viewer.locator('#arm').click();await expect(viewer.locator('#arm')).toBeDisabled();
  await viewer.locator('#connect').click();
  expect(new URL(await viewer.locator('#invite-link').inputValue()).hash).toBe(new URL(link).hash);
  await phone.goto(link);await expect(phone.locator('body')).toHaveAttribute('data-page','controller');
  await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await phone.locator('#arm').click();await phone.locator('#connect').click();
  await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
  await expect(phone.locator('#play')).toBeEnabled();
  const playBounds=await phone.locator('#play').boundingBox();expect(playBounds.y+playBounds.height).toBeLessThan(844);
  await phone.locator('#play').click();
  await expect(viewer.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
  await expect(phone.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
  const times=await Promise.all([viewer,phone].map(p=>p.locator('video').evaluate(v=>v.currentTime)));
  expect(Math.abs(times[0]-times[1])).toBeLessThan(.4);
  await expect(phone.locator('#pause')).toBeEnabled();await phone.locator('#pause').click();
  await expect(viewer.locator('body')).toHaveAttribute('data-playing','false');
  await expect(phone.locator('#seek')).toBeEnabled();
  await phone.locator('#seek').fill('100');await phone.locator('#seek').dispatchEvent('change');
  await expect.poll(()=>viewer.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(99);
  await phone.locator('fieldset details summary').click();
  await expect(phone.locator('#projection')).toBeEnabled();await phone.locator('#projection').selectOption('equirect360');
  await expect(viewer.locator('#projection')).toHaveValue('equirect360');
  await phone.locator('#stop').click();
  await expect(viewer.locator('#connection')).toContainText(/waiting|announced/i,{timeout:20000});
  await phone.close();phone=await phoneContext.newPage();
  await phone.goto(link);await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await phone.locator('#arm').click();await phone.locator('#connect').click();
  await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
  await phone.waitForTimeout(2200);
  console.log(JSON.stringify({route:await phone.locator('#diagnostics').textContent(),observedPreviewDriftSeconds:Math.abs(times[0]-times[1])}));
  await viewer.locator('#stop').click();await expect(phone.locator('#connection')).toContainText(/disconnected|ended|failed/i);
  await viewerContext.close();await phoneContext.close();await launcherContext.close();
});
