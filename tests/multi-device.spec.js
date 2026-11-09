import { test,expect } from '@playwright/test';
import { pairWithBeacon, sendBeacon } from './beacon-fixture.js';
test.use({serviceWorkers:'allow'});
async function seek(page,position){
  const slider=page.locator('#seek');await expect(slider).toBeEnabled();
  // One focused range gesture: do not let a heartbeat replace a synthetic unfocused value.
  await slider.evaluate((element,value)=>{element.focus();element.value=String(value);element.dispatchEvent(new Event('change',{bubbles:true}));},position);
}

test('the controller reconnects to an already playing viewer without changing its timeline',async({browser})=>{
  test.skip(process.env.RUN_NETWORK!=='1','Public data-only WebRTC qualification.');test.setTimeout(120000);
  const contexts=[],pages=[];
  async function open(url,phone=false){
    const context=await browser.newContext({serviceWorkers:'allow',deviceScaleFactor:.5,viewport:phone?{width:390,height:844}:{width:800,height:480}});contexts.push(context);
    await context.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.__peers=[];window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.__peers.push(this);}};});
    const page=await context.newPage();pages.push(page);await page.goto(url);
    await page.waitForFunction(()=>document.querySelector('video').readyState>=3);
    if(!phone){
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
    await pairWithBeacon(first,await sendBeacon(host));
    await first.locator('#play').click();await synchronized();
    await seek(first,20);
    await expect.poll(()=>host.locator('video').evaluate(video=>video.currentTime)).toBeGreaterThan(19);await synchronized();
    const revision=await host.locator('body').getAttribute('data-revision');
    await first.evaluate(()=>{for(const peer of window.__peers)peer.close();});
    await expect(first.locator('#headset-status')).not.toHaveAttribute('data-state','synced');
    await expect(first.locator('#headset-status')).toHaveAttribute('data-state','synced',{timeout:45000});await synchronized();
    await expect(host.locator('body')).toHaveAttribute('data-revision',revision);
    await first.locator('#pause').click();
    for(const page of pages)await expect(page.locator('body')).toHaveAttribute('data-playing','false');
    await expect(first.locator('#play')).toBeEnabled();
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
