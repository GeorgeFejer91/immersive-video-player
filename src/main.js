import './style.css';
import QRCode from 'qrcode';
import { randomToken } from './remote/brsp.js';
import { generateVdoRoomId } from './remote/vdo-ninja-transport.js';
import { entryRoute, sessionLinks } from './session-entry.js';
import { measureTextRegions } from './text-fit.js';

const $=id=>document.getElementById(id);
const address=location.href;
// A scanner opens a fragment bearer. Consume it before async device checks.
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
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
  $('entry-status').textContent=route.role==='viewer'?'Opening the headset viewer…':'Opening the phone control center…';
  const { initPlayer }=await import('./player-app.js');
  // Showing interactive controls and binding their handlers happen in one task.
  $('entry').hidden=true;$('player').hidden=false;
  document.body.classList.remove('landing');document.body.dataset.page=route.role;
  initPlayer({phone:route.role==='controller',invitation:route.pairing});
}else{
  document.body.dataset.page='launcher';
  let links;
  let invitationGeneration=0;
  async function display(invitation){
    const current=++invitationGeneration;
    links=sessionLinks(address,invitation);
    $('entry-link').value=links.join;
    $('open-viewer').href=links.viewer;$('open-controller').href=links.controller;
    $('entry-invitation').hidden=false;
    $('entry-status').textContent='Ready for one headset and one phone. Scan the same QR on both devices.';
    try {
      await QRCode.toCanvas($('entry-qr'),links.join,{width:360,margin:4,errorCorrectionLevel:'M'});
      // QRCode sets inline pixel dimensions. Let CSS preserve a square at phone widths.
      $('entry-qr').style.removeProperty('width');$('entry-qr').style.removeProperty('height');
    }
    catch {if(current===invitationGeneration)$('entry-status').textContent='QR rendering is unavailable. Use the session links below.';}
  }
  $('new-session').addEventListener('click',()=>{void display({room:generateVdoRoomId(),secret:randomToken(32)});});
  $('copy-session').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(links.join);$('entry-status').textContent='Session link copied. Open it on the headset and phone.';}
    catch {$('entry-link').value=links.join;$('entry-link').select();$('entry-status').textContent='Select and copy the session link.';}
  });
  $('copy-headset').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(links.viewer);$('entry-status').textContent='Headset link copied. Open it in Quest Browser.';}
    catch {$('entry-link').value=links.viewer;$('entry-link').select();$('entry-status').textContent='Select and copy this headset link.';}
  });
  if(invalid){$('entry-invitation').hidden=true;$('entry-status').textContent='This invitation is incomplete or invalid. Ask for the full link, or create a new session.';}
  else await display(route.pairing||{room:generateVdoRoomId(),secret:randomToken(32)});
  void measureTextRegions().catch(()=>{document.documentElement.dataset.pretext='unavailable';});
}
