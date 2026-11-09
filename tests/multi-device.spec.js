import { test,expect } from '@playwright/test';
test.use({serviceWorkers:'allow'});
async function seek(page,position){
  const slider=page.locator('#seek');await expect(slider).toBeEnabled();
  // One focused range gesture: do not let a heartbeat replace a synthetic unfocused value.
  await slider.evaluate((element,value)=>{element.focus();element.value=String(value);element.dispatchEvent(new Event('change',{bubbles:true}));},position);
}

test('multiple phones and an additional viewer control one synchronized video without replacing each other',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Public data-only WebRTC qualification.');
  test.setTimeout(180000);
  const contexts=[],devices=[];
  async function device(options={}){
    const {follower,...contextOptions}=options;
    const context=await browser.newContext({viewport:{width:800,height:480},deviceScaleFactor:.5,...contextOptions});contexts.push(context);
    await context.addInitScript(()=>{
      const Peer=window.RTCPeerConnection;window.__peers=[];
      window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.__peers.push(this);}};
      window.__videoEvents=[];
      for(const type of ['waiting','playing','pause','seeking','seeked','error'])document.addEventListener(type,event=>{
        if(event.target.tagName!=='VIDEO')return;
        window.__videoEvents.push({type,at:performance.now(),position:event.target.currentTime,ready:event.target.readyState,revision:document.body?.dataset.revision});
        if(window.__videoEvents.length>24)window.__videoEvents.shift();
      },true);
    });
    const page=await context.newPage();devices.push(page);return page;
  }
  async function enable(page){
    await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
    await page.locator('#enter-vr').click();
    await page.waitForFunction(()=>{const video=document.querySelector('video');return document.body.dataset.playing==='false'&&!video.seeking&&video.readyState>=3;});
  }
  async function join(link,options={}){
    const page=await device(options);await page.goto(link);
    if(options.follower)await page.locator('#enter-vr').click();
    await expect(page.locator('body')).toHaveAttribute('data-clock','true',{timeout:45000});return page;
  }
  try {
    const host=await device();await host.goto(new URL('?launch=quest',process.env.TEST_URL||'http://127.0.0.1:4174/').href);
    await expect(host.locator('#show-qr')).toBeVisible();
    const link=await host.locator('#invite-link').inputValue();
    await enable(host);
    const phones=[];
    for(const userAgent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1','Mozilla/5.0 (Linux; Android 16) Chrome/143 Mobile Safari/537.36','Mozilla/5.0 (Linux; Android 15) SamsungBrowser/28 Mobile Safari/537.36'])phones.push(await join(link,{userAgent,viewport:{width:390,height:844}}));
    const follower=await join(link,{follower:true,userAgent:'OculusBrowser/39.2 Quest 3'});
    await expect(host.locator('body')).toHaveAttribute('data-peers','4');
    await phones[0].locator('#play').click();
    for(const page of [host,...phones,follower]){
      await expect(page.locator('body')).toHaveAttribute('data-playing','true',{timeout:10000});
      await expect(page.locator('body')).toHaveAttribute('data-revision','1');
    }
    await expect(phones[2].locator('#pause')).toBeEnabled();await phones[2].locator('#pause').click();
    for(const page of [host,...phones,follower])await expect(page.locator('body')).toHaveAttribute('data-playing','false');
    await seek(phones[1],100);
    for(const page of [host,...phones,follower])await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(99);
    const beforeJoin=await host.locator('body').getAttribute('data-revision');
    const late=await join(link,{viewport:{width:390,height:844}});
    await expect.poll(()=>late.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(99);
    await expect(host.locator('body')).toHaveAttribute('data-peers','5');
    await expect(late.locator('body')).toHaveAttribute('data-playing','false');
    await expect(host.locator('body')).toHaveAttribute('data-revision',beforeJoin);
    await phones[0].close();devices.splice(devices.indexOf(phones[0]),1);
    await expect(host.locator('body')).toHaveAttribute('data-peers','4');
    // A dropped phone connection must recover using its in-memory invitation.
    await phones[1].evaluate(()=>{for(const peer of window.__peers)peer.close();});
    await expect(phones[1].locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(phones[1].locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:45000});
    await expect(host.locator('body')).toHaveAttribute('data-peers','4');
    await expect(host.locator('body')).toHaveAttribute('data-revision',beforeJoin);
    await seek(phones[1],150);
    for(const page of [host,phones[1],phones[2],follower,late])await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(149);
    // A recoverable host interruption must not send a terminal session notification.
    await host.evaluate(()=>window.dispatchEvent(new Event('offline')));
    await expect(phones[1].locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(host.locator('body')).toHaveAttribute('data-peers','4',{timeout:45000});
    for(const page of [phones[1],phones[2],late])await expect(page.locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:30000});
    await expect(host.locator('#invite-link')).toHaveValue(link);
    await seek(phones[2],175);
    for(const page of [host,phones[1],phones[2],follower,late])await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(174);
    await expect(late.locator('#halt')).toBeEnabled();await late.locator('#halt').click();
    for(const page of [host,phones[1],phones[2],follower,late])await expect.poll(()=>page.locator('video').evaluate(video=>video.currentTime)).toBeLessThan(.1);
    for(const page of [host,phones[1],phones[2],follower,late])expect(await page.evaluate(()=>window.__peers.some(peer=>peer.localDescription?.sdp.includes('m=application'))&&window.__peers.every(peer=>!peer.getSenders().length&&!peer.getReceivers().length&&!/m=(audio|video)/.test(peer.localDescription?.sdp||'')))).toBe(true);
    await host.locator('#connection-settings summary').click();await host.locator('#stop').click();
    for(const page of [phones[1],phones[2],late])await expect(page.locator('#headset-status')).toHaveAttribute('data-state','disconnected');
  } catch(error){
    console.log(JSON.stringify({devices:await Promise.all(devices.filter(page=>!page.isClosed()).map(page=>page.evaluate(()=>({role:document.body.dataset.page,playing:document.body.dataset.playing,notice:document.getElementById('notice').textContent,connection:document.getElementById('connection').textContent,events:window.__videoEvents}))))}));
    throw error;
  } finally {for(const context of contexts)await context.close();}
});

test('a new and a reconnected smartphone join an already playing timeline without changing the Quest state',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Public data-only WebRTC qualification.');test.setTimeout(120000);
  const contexts=[],pages=[];
  async function open(url,phone=false){
    const context=await browser.newContext({serviceWorkers:'allow',deviceScaleFactor:.5,viewport:phone?{width:390,height:844}:{width:800,height:480}});contexts.push(context);
    await context.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.__peers=[];window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.__peers.push(this);}};});
    const page=await context.newPage();pages.push(page);await page.goto(url);
    await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
    if(phone)await expect(page.locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:45000});
    else {
      await page.locator('#enter-vr').click();
      await page.waitForFunction(()=>{const video=document.querySelector('video');return !video.seeking&&video.readyState>=3;});
    }
    return page;
  }
  async function synchronized(){
    for(const page of pages)await expect(page.locator('body')).toHaveAttribute('data-playing','true');
    await expect.poll(async()=>{
      const samples=await Promise.all(pages.map(page=>page.evaluate(()=>{const video=document.querySelector('video');return {position:video.currentTime,at:performance.timeOrigin+performance.now(),ready:video.readyState>=3&&!video.seeking&&!video.paused};})));
      if(samples.some(sample=>!sample.ready))return Infinity;
      const at=Math.max(...samples.map(sample=>sample.at)),positions=samples.map(sample=>sample.position+(at-sample.at)/1000);
      return Math.max(...positions)-Math.min(...positions);
    },{timeout:15000}).toBeLessThan(.35);
  }
  try {
    const host=await open(new URL('?launch=quest',process.env.TEST_URL||'http://127.0.0.1:4174/').href);
    const link=await host.locator('#invite-link').inputValue(),first=await open(link,true);
    await first.locator('#play').click();await synchronized();
    await seek(first,20);
    await expect.poll(()=>host.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(19);await synchronized();
    const revision=await host.locator('body').getAttribute('data-revision');
    const late=await open(link,true);await synchronized();
    await expect(host.locator('body')).toHaveAttribute('data-revision',revision);
    await first.evaluate(()=>{for(const peer of window.__peers)peer.close();});
    await expect(first.locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(first.locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:45000});await synchronized();
    await expect(host.locator('body')).toHaveAttribute('data-revision',revision);
    await first.locator('#pause').click();
    for(const page of pages)await expect(page.locator('body')).toHaveAttribute('data-playing','false');
    await expect(late.locator('#play')).toBeEnabled();
  } catch(error) {
    console.log('Late-join media state',await Promise.all(pages.map(page=>page.evaluate(()=>{
      const video=document.querySelector('video');
      return {time:video.currentTime,paused:video.paused,ready:video.readyState,seeking:video.seeking,
        clock:document.body.dataset.clock,revision:document.body.dataset.revision,
        notice:document.getElementById('notice').textContent,status:document.getElementById('connection').textContent};
    }))));
    throw error;
  } finally {for(const context of contexts)await context.close();}
});
