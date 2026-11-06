import './style.css';
import QRCode from 'qrcode';
import { randomToken } from './remote/brsp.js';
import { generateVdoRoomId } from './remote/vdo-ninja-transport.js';
import { entryRoute, sessionLinks } from './session-entry.js';
import { measureTextRegions } from './text-fit.js';
import { initInstallPrompt } from './install-app.js';

const $=id=>document.getElementById(id);
const address=location.href;
// A scanner opens a fragment bearer. Consume it before async device checks.
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
// OS/PWA link handoff can update only the fragment of an already open page.
window.addEventListener('hashchange',()=>{if(location.hash)location.reload();});
initInstallPrompt();
const hints={userAgent:navigator.userAgent,mobile:Boolean(navigator.userAgentData?.mobile)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)};
let route,invalid=false;
try{
  route=entryRoute(address,hints);
  if(!route.role&&route.pairing&&navigator.xr?.isSessionSupported){
    const supported=await Promise.race([Promise.resolve().then(()=>navigator.xr.isSessionSupported('immersive-vr')).catch(()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),1500))]);
    route=entryRoute(address,{...hints,immersiveSupported:supported});
  }
}catch{invalid=true;route={role:null};}

if(route.role){
  $('entry-invitation').hidden=true;$('new-session').hidden=true;
  $('entry-status').textContent='Loading';
  const { initPlayer }=await import('./player-app.js');
  // Showing interactive controls and binding their handlers happen in one task.
  $('entry').hidden=true;$('player').hidden=false;
  document.body.classList.remove('landing');document.body.dataset.page=route.role;
  initPlayer({phone:route.role==='controller',invitation:route.pairing,autoConnect:route.autoConnect,follower:route.follower});
}else{
  document.body.dataset.page='launcher';
  let links;
  let invitationGeneration=0;
  async function display(invitation){
    const current=++invitationGeneration;
    links=sessionLinks(address,invitation);
    $('entry-link').value=links.join;
    $('open-viewer').href=links.viewer;$('open-controller').href=links.controller;
    $('open-viewer').hidden=false;$('open-controller').hidden=false;
    $('entry-invitation').hidden=false;
    $('entry-status').textContent='';
    try {
      await QRCode.toCanvas($('entry-qr'),links.join,{width:360,margin:4,errorCorrectionLevel:'M'});
      // QRCode sets inline pixel dimensions. Let CSS preserve a square at phone widths.
      $('entry-qr').style.removeProperty('width');$('entry-qr').style.removeProperty('height');
    }
    catch {if(current===invitationGeneration)$('entry-status').textContent='QR unavailable';}
  }
  $('new-session').addEventListener('click',()=>{void display({room:generateVdoRoomId(),secret:randomToken(32)});});
  $('copy-session').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(links.join);$('entry-status').textContent='Copied';}
    catch {$('entry-options').open=true;$('entry-link').value=links.join;$('entry-link').select();$('entry-status').textContent='Copy link';}
  });
  $('copy-headset').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(links.viewer);$('entry-status').textContent='Copied';}
    catch {$('entry-options').open=true;$('entry-link').value=links.viewer;$('entry-link').select();$('entry-status').textContent='Copy link';}
  });
  if(invalid){$('entry-invitation').hidden=true;$('entry-status').textContent='Invalid link';$('open-viewer').hidden=true;$('open-controller').hidden=true;}
  else await display(route.pairing||{room:generateVdoRoomId(),secret:randomToken(32)});
  void measureTextRegions().catch(()=>{document.documentElement.dataset.pretext='unavailable';});
}
