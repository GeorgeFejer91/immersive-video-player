import { test, expect } from '@playwright/test';

const QUEST_UA='Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 OculusBrowser/39.2 Chrome/137.0.0.0 Mobile VR Safari/537.36';
const PHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

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
  await page.locator('#connect').click();await expect(page.locator('#show-qr')).toBeVisible();
  await page.locator('#stop').click();
});

test('viewer is inert before explicit connection, local playback works and clean view restores focus',async({page})=>{
  const requests=[],errors=[];
  page.on('websocket',ws=>requests.push(ws.url())); page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?role=viewer');
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  expect(requests.filter(url=>url.includes('vdo.ninja'))).toHaveLength(0);
  await page.locator('#arm').click();
  await expect(page.locator('#arm')).toBeDisabled();
  await page.locator('#playback-settings summary').click();
  await page.locator('#play').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','true',{timeout:7000});
  await page.locator('#pause').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','false');
  await page.locator('#hide-controls').click();
  await expect(page.locator('#show-controls')).toBeFocused();
  await page.locator('#show-controls').click();
  await expect(page.locator('#hide-controls')).toBeFocused();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#hide-controls').click();
  expect(await page.locator('.screen').evaluate(el=>Math.abs(el.getBoundingClientRect().height-innerHeight))).toBeLessThan(1);
  await page.locator('#show-controls').click();
  expect(errors).toEqual([]);
  await page.locator('#video').evaluate(v=>{v.play=()=>new Promise((resolve,reject)=>{window.__rejectPlay=reject;});});
  await page.locator('#play').click();await page.waitForFunction(()=>window.__rejectPlay);
  await page.locator('#halt').click();
  await page.evaluate(()=>window.__rejectPlay(new DOMException('Interrupted by Stop','AbortError')));
  await expect(page.locator('#notice')).toHaveText('');
  await expect(page.locator('#arm')).toBeDisabled();
  await expect(page.locator('#play')).toBeEnabled();
});

test('seeking a playing video preserves its playing state through transient native waiting',async({page})=>{
  await page.goto('./?role=viewer');await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await page.locator('#arm').click();await page.locator('#playback-settings summary').click();await page.locator('#play').click();
  await expect(page.locator('body')).toHaveAttribute('data-playing','true');
  const revision=await page.locator('body').getAttribute('data-revision');
  await page.locator('video').evaluate(video=>{
    Object.defineProperty(video,'seeking',{configurable:true,value:true});
    video.dispatchEvent(new Event('waiting'));delete video.seeking;
  });
  await expect(page.locator('body')).toHaveAttribute('data-revision',revision);
  await expect(page.locator('#notice')).toHaveText('');
  await page.locator('#seek').fill('100');await page.locator('#seek').dispatchEvent('change');
  await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(99);
  await expect(page.locator('body')).toHaveAttribute('data-playing','true');
  await page.locator('#pause').click();await expect(page.locator('body')).toHaveAttribute('data-playing','false');
});

test('ending a VR session preserves the browser view until Recenter view is pressed',async({page})=>{
  await page.addInitScript(()=>{
    const gl=WebGL2RenderingContext.prototype,locations=new WeakSet();
    const getLocation=gl.getUniformLocation,setMatrix=gl.uniformMatrix4fv;
    gl.getUniformLocation=function(program,name){
      const location=getLocation.call(this,program,name);
      if(location&&name==='modelViewMatrix')locations.add(location);
      return location;
    };
    gl.uniformMatrix4fv=function(location,transpose,data,...rest){
      if(locations.has(location))window.pan=data[2];
      return setMatrix.call(this,location,transpose,data,...rest);
    };
    gl.makeXRCompatible=async()=>{};
    window.XRWebGLBinding=undefined;
    window.XRWebGLLayer=class {framebufferWidth=320;framebufferHeight=240;};
    class Session extends EventTarget {
      updateRenderState(){}
      async requestReferenceSpace(){return {};}
      requestAnimationFrame(){window.xrStarted=true;return 1;}
      cancelAnimationFrame(){}
      async end(){this.dispatchEvent(new Event('end'));}
    }
    Object.defineProperty(navigator,'xr',{value:Object.assign(new EventTarget(),{
      requestSession:async()=>window.xrSession=new Session()
    })});
  });
  await page.goto('./?role=viewer');
  const pan=()=>page.evaluate(()=>Math.abs(window.pan));
  const stage=page.locator('#stage');
  await expect(stage.locator('canvas')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>typeof window.pan)).toBe('number');
  await stage.focus();
  await expect(stage).toBeFocused();
  await stage.press('ArrowRight');
  await expect.poll(pan).toBeGreaterThan(.05);
  await page.locator('#enter-vr').click();
  await page.waitForFunction(()=>window.xrStarted,undefined,{timeout:5000});
  await page.evaluate(async()=>{
    await window.xrSession.end();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  expect(await pan()).toBeGreaterThan(.05);
  await page.getByRole('button',{name:'Recenter view',exact:true}).press('Enter');
  await expect.poll(pan).toBe(0);
});

test('rendered labels reflow at phone widths, landscape, desktop, large type and spacing',async({page})=>{
  await page.goto('./?role=viewer');
  await expect(page.locator('html')).toHaveAttribute('data-pretext','measured');
  for(const [width,height] of [[320,700],[390,844],[844,390],[1440,900],[1920,1080]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const overflowing=await page.locator('button,summary,.status').evaluateAll(els=>els.filter(el=>el.checkVisibility()&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)).map(el=>el.id||el.textContent));
    expect(overflowing).toEqual([]);
  }
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:':root{font-size:32px} button{font-size:2rem} p{line-height:1.5;letter-spacing:.12em;word-spacing:.16em;margin-bottom:2em}'});
  await page.locator('#connect').evaluate(el=>el.textContent='Smartphone-Fernbedienung verbinden');
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('#connect')).toHaveAttribute('data-text-fit','wrapped');
});

test('controller Connect starts the handshake, retries it, and reconnects after Disconnect',async({page})=>{
  let attempts=0;
  await page.clock.install();
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{attempts++;});
  await page.goto('./?controller=1#room=obsolete');
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('#phone-dialog')).toBeHidden();
  await expect(page.locator('#phone-controls')).toBeVisible();
  await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('#arm')).toBeHidden();
  expect(attempts).toBe(0);
  const connect=page.getByRole('button',{name:'Connect',exact:true});
  await expect(connect).toBeVisible();
  await connect.focus();
  await page.keyboard.press('Enter');
  await expect.poll(()=>attempts).toBe(1);
  await connect.click();
  await expect.poll(()=>attempts).toBe(2);
  expect(await page.locator('#video').evaluate(video=>video.paused)).toBe(true);
  await page.locator('#headset-status').click();
  await page.locator('#stop').click();
  await expect(page.locator('#hide-controls')).toBeFocused();
  await page.clock.fastForward(21000);
  expect(attempts).toBe(2);
  await page.keyboard.press('Escape');
  await connect.click();
  await expect.poll(()=>attempts).toBe(3);
});

test('Disconnect wins while signaling is unavailable and closes the share controls',async({page})=>{
  await page.routeWebSocket('wss://wss.vdo.ninja',()=>{});
  await page.goto('./?role=viewer');
  await page.locator('#connect').click();
  await page.locator('#show-qr').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Session QR'})).toBeVisible();
  await expect(page.locator('#invitation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#show-qr')).toBeFocused();
  await page.locator('#stop').click();
  await expect(page.locator('#invite-link')).toHaveValue('');
  await expect(page.locator('#invitation')).toBeHidden();
  await expect(page.locator('#show-qr')).toBeHidden();
  await expect(page.locator('#connect')).toBeEnabled();
});

test('public VDO route: local phone video, Start/Pause/Stop, data-only sync and controller handoff',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Opt-in: public VDO service is an external dependency.');
  test.setTimeout(120000);
  const viewerContext=await browser.newContext({userAgent:QUEST_UA}), phoneContext=await browser.newContext({userAgent:PHONE_UA,viewport:{width:390,height:844}});
  for(const context of [viewerContext,phoneContext])await context.addInitScript(()=>{
    const Peer=window.RTCPeerConnection;window.__peers=[];
    window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.__peers.push(this);}};
  });
  const viewer=await viewerContext.newPage();let phone=await phoneContext.newPage();
  const base=process.env.TEST_URL||'http://127.0.0.1:4174/';
  const link=new URL(base).href;
  await viewer.goto(link);await expect(viewer.locator('body')).toHaveAttribute('data-page','viewer');
  await viewer.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await viewer.locator('#enter-vr').click();
  await expect(viewer.locator('#invite-link')).toHaveValue(link);
  await phone.goto(link);await expect(phone.locator('body')).toHaveAttribute('data-page','controller');
  await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await phone.locator('#connect').click();
  await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
  await expect(phone.locator('#phone-dialog')).not.toBeVisible();
  await expect(phone.locator('#connect')).toBeHidden();
  await expect(phone.locator('#headset-status')).toBeFocused();
  await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','synced');
  await expect(phone.locator('#headset-status')).toHaveAccessibleName('Recenter headset');
  await expect(phone.locator('#headset-state')).toHaveText('Headset synced');
  const recenterRevision=Number(await viewer.locator('body').getAttribute('data-revision'));
  const recenter=phone.getByRole('button',{name:'Recenter view',exact:true});
  await recenter.press('Enter');
  await expect(viewer.locator('body')).toHaveAttribute('data-revision',String(recenterRevision+1));
  await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','synced');
  await expect(recenter).toBeFocused();
  await phone.getByRole('button',{name:'Recenter headset'}).click();
  await expect(viewer.locator('body')).toHaveAttribute('data-revision',String(recenterRevision+2));
  await expect(phone.locator('#phone-dialog')).toBeHidden();
  await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','synced');
  expect(await phone.locator('#headset-status').evaluate(el=>getComputedStyle(el).animationName)).toBe('headset-pulse');
  await phone.emulateMedia({reducedMotion:'reduce'});
  expect(await phone.locator('#headset-status').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await phone.emulateMedia({reducedMotion:'no-preference'});
  await expect(phone.getByRole('region',{name:'Jona panorama'})).toBeVisible();
  for(const p of [viewer,phone])expect(await p.evaluate(()=>window.__peers.some(pc=>pc.localDescription?.sdp.includes('m=application'))&&window.__peers.every(pc=>!pc.getSenders().length&&!pc.getReceivers().length&&!/m=(audio|video)/.test(pc.localDescription?.sdp||'')))).toBe(true);
  await expect(phone.locator('#play')).toBeEnabled();
  const playBounds=await phone.locator('#play').boundingBox();expect(playBounds.y+playBounds.height).toBeLessThan(844);
  await phone.locator('#play').click();
  await expect(viewer.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
  await expect(phone.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
  let observedDrift,rawDrift,samplingGap;
  await expect.poll(async()=>{
    const samples=await Promise.all([viewer,phone].map(p=>p.locator('video').evaluate(v=>({position:v.currentTime,at:performance.timeOrigin+performance.now(),rate:v.playbackRate}))));
    const at=Math.max(...samples.map(s=>s.at));
    const positions=samples.map(s=>s.position+(at-s.at)/1000*s.rate);
    rawDrift=Math.abs(samples[0].position-samples[1].position);samplingGap=Math.abs(samples[0].at-samples[1].at)/1000;
    observedDrift=Math.abs(positions[0]-positions[1]);return observedDrift;
  },{timeout:5000}).toBeLessThan(.35);
  await expect(phone.locator('#pause')).toBeEnabled();await phone.locator('#pause').click();
  await expect(viewer.locator('body')).toHaveAttribute('data-playing','false');
  await viewer.locator('#seek').fill('100');await viewer.locator('#seek').dispatchEvent('change');
  await expect.poll(()=>viewer.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(99);
  await expect.poll(()=>phone.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(99);
  await expect(phone.locator('#halt')).toBeEnabled();await phone.locator('#halt').click();
  for(const p of [viewer,phone]){
    await expect(p.locator('body')).toHaveAttribute('data-playing','false');
    await expect.poll(()=>p.locator('video').evaluate(v=>v.currentTime)).toBeLessThan(.1);
  }
  await viewer.locator('#view-settings summary').click();
  await expect(viewer.locator('#lens')).toHaveValue('240');
  const beforeAlignment=await viewer.locator('body').getAttribute('data-revision');
  await viewer.locator('#yaw').evaluate(el=>{
    el.value='15';el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(viewer.locator('body')).not.toHaveAttribute('data-revision',beforeAlignment);
  await expect(phone.locator('body')).toHaveAttribute('data-revision',await viewer.locator('body').getAttribute('data-revision'));
  const warp=phone.getByRole('button',{name:'Video settings',exact:true});
  await warp.click();
  const warpDialog=phone.getByRole('dialog',{name:'Video warp'});
  await expect(warpDialog.getByRole('button',{name:'Jona 240°'})).toHaveAttribute('aria-pressed','true');
  await warpDialog.getByRole('button',{name:'Fisheye 270°'}).click();
  await expect(viewer.locator('#lens')).toHaveValue('270');
  await expect(viewer.locator('#yaw')).toHaveValue('15');
  await warp.click();
  const angle=warpDialog.getByRole('slider',{name:'Angle',exact:true});
  await angle.fill('251');
  await angle.evaluate(el=>{
    for(const value of [252,258,263,253]){
      el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  await expect(viewer.locator('#lens')).toHaveValue('253');
  await expect(viewer.locator('#yaw')).toHaveValue('15');
  await expect(angle).toHaveValue('253');
  await viewer.locator('#lens').focus();
  await angle.fill('254');
  await expect(viewer.locator('#lens-value')).toHaveText('254°');
  await viewer.locator('#yaw').evaluate(el=>{
    el.focus();el.value='20';el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(viewer.locator('#lens')).toHaveValue('254');
  await expect(viewer.locator('#yaw')).toHaveValue('20');
  await expect.poll(()=>angle.inputValue()).toBe('254');
  await phone.keyboard.press('Escape');
  for(const p of [viewer,phone])expect(await p.locator('video').evaluate(v=>v.paused&&v.currentTime<.1)).toBe(true);
  await viewer.locator('#projection').selectOption('equirect360');
  await expect(viewer.locator('#projection')).toHaveValue('equirect360');
  await warp.click();
  await expect(warpDialog.getByRole('button',{name:'Panorama 360°'})).toHaveAttribute('aria-pressed','true');
  await phone.keyboard.press('Escape');
  // Stop's native seek must finish before deliberately blocking a subsequent play.
  await viewer.waitForFunction(()=>{const video=document.querySelector('video');return video.paused&&!video.seeking&&video.readyState>=3;});
  await phone.waitForFunction(()=>{const video=document.querySelector('video');return video.paused&&!video.seeking&&video.readyState>=3;});
  // A blocked headset decoder must stop the shared timeline, rather than leave a false green playback state.
  await viewer.locator('#video').evaluate(v=>{v.play=()=>Promise.reject(new DOMException('Blocked','NotAllowedError'));});
  await expect(phone.locator('#play')).toBeEnabled();await phone.locator('#play').click();
  await expect(viewer.locator('#notice')).toHaveText('Enable first');
  await expect.poll(()=>phone.locator('video').evaluate(v=>v.paused),{timeout:7000}).toBe(true);
  await phone.waitForFunction(()=>{const video=document.querySelector('video');return video.paused&&!video.seeking&&video.readyState>=3;});
  await expect(phone.locator('#play')).toBeEnabled();await phone.locator('#play').click();
  await expect(phone.locator('#phone-notice')).toHaveText('Tap VR on the headset');
  await expect(phone.locator('#phone-notice')).toBeVisible();
  await phone.getByRole('button',{name:'Video settings',exact:true}).click();
  await phone.getByRole('button',{name:'Connection',exact:true}).click();
  await phone.locator('#stop').click();
  await expect(viewer.locator('#connection')).toContainText(/waiting|announced/i,{timeout:20000});
  await phone.close();phone=await phoneContext.newPage();
  await phone.goto(link);await phone.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await phone.locator('#connect').click();
  await expect(phone.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});
  await phone.waitForTimeout(2200);
  console.log(JSON.stringify({route:await phone.locator('body').getAttribute('data-route'),rtt:await phone.locator('body').getAttribute('data-rtt'),observedPreviewDriftSeconds:observedDrift,rawDriftSeconds:rawDrift,samplingGapSeconds:samplingGap}));
  await viewer.locator('#connection-settings summary').click();
  await viewer.locator('#stop').click();await expect(phone.locator('#connection')).toContainText(/reconnecting|waiting/i);
  await expect(phone.locator('#headset-status')).toHaveAttribute('data-state','disconnected');
  await expect(phone.locator('#phone-dialog')).toBeHidden();
  await expect(phone.locator('#connect')).toBeVisible();
  await expect(phone.getByRole('region',{name:'Jona panorama'})).toBeVisible();
  await expect(phone.locator('#halt')).toBeDisabled();
  await viewerContext.close();await phoneContext.close();
});
