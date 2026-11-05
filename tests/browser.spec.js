import { test, expect } from '@playwright/test';

test('viewer is inert before explicit connection, local playback works and clean view restores focus',async({page})=>{
  const requests=[],errors=[];
  page.on('websocket',ws=>requests.push(ws.url())); page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
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
  await page.goto('./');
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
  await page.goto('./');
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
  const viewerContext=await browser.newContext(), phoneContext=await browser.newContext({viewport:{width:390,height:844}});
  const viewer=await viewerContext.newPage();let phone=await phoneContext.newPage();
  const base=process.env.TEST_URL||'http://127.0.0.1:4174/';
  await viewer.goto(base);await viewer.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await viewer.locator('#arm').click();await expect(viewer.locator('#arm')).toBeDisabled();
  await viewer.locator('#connect').click();
  const link=await viewer.locator('#invite-link').inputValue();expect(link).toContain('#room=');
  await phone.goto(link);await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await phone.locator('#arm').click();await phone.locator('#connect').click();
  await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
  await expect(phone.locator('#play')).toBeEnabled();
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
  await viewerContext.close();await phoneContext.close();
});
