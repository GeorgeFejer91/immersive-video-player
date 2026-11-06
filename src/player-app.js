import QRCode from 'qrcode';
import { Player, positionAt, clockOffset, validateState, parseInvite, previewMatches, SCOPES } from './player.js';
import { BRSPConnection, randomToken } from './remote/brsp.js';
import { VdoNinjaTransport, generateVdoRoomId } from './remote/vdo-ninja-transport.js';
import { createViewer } from './viewer.js';
import { measureTextRegions } from './text-fit.js';
import { sessionLinks } from './session-entry.js';

export function initPlayer({phone=false,invitation}={}) {
const $ = id => document.getElementById(id);
document.body.classList.toggle('phone',phone);
const video=$('video'), model=new Player(467.3);
let view, armed=false, state=model.snapshot(), pairing=invitation, connection, transport;
let generation=0, heartbeat, expiry, connectDeadline, expiresAt=0, pending, samples=[], offset=0, synced=false;
let lastStateAt=0, lastAnchor=-1, starting=false, blocked=false, wakeLock, stopped=false, lastPing=0;
const format=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const notice=text=>{for(const id of ['notice','phone-notice'])if($(id).textContent!==text)$(id).textContent=text;};
const remoteStatus=text=>{if($('connection').textContent!==text)$('connection').textContent=text;};
const targetNow=()=>performance.now()+(phone?offset:0);
function canControl(){return armed && (!phone || (connection?.phase==='ready' && synced && lastStateAt>0 && performance.now()-lastStateAt<2000));}
function refreshEnabled(){ $('controls').disabled=$('phone-controls').disabled=!canControl()||Boolean(pending);updatePhoneStatus(); }
function updatePhoneStatus(){
  if(!phone)return;
  const ready=connection?.phase==='ready';
  const matched=ready&&canControl()&&!document.hidden&&(!pending||pending.action==='ping')&&previewMatches(state,targetNow(),video);
  const status=matched?'synced':ready?'syncing':'disconnected';
  const button=$('headset-status'),label=`Headset ${status}`;
  if(button.dataset.state===status)return;
  button.dataset.state=status;button.setAttribute('aria-label',label);button.title=label;$('headset-state').textContent=label;
}
function updateRoleLink(){
  const link=$('switch-mode');
  if(!pairing){link.hidden=true;link.removeAttribute('href');$('show-qr').hidden=true;return;}
  const links=sessionLinks(location.href,pairing);
  link.href=phone?links.viewer:links.controller;
  link.textContent=phone?'Viewer':'Controller';
  link.hidden=false;
}
updateRoleLink();
try { if(!phone)view=createViewer($('stage'),video); }
catch { notice('Video unavailable'); $('enter-vr').disabled=true; }

if(phone){
  $('role-label').textContent='Controller';
  $('phone-header').hidden=false;$('phone-controls').hidden=false;
  $('video').removeAttribute('aria-hidden');$('video').setAttribute('aria-label','Jona');$('video').classList.add('stretch-body');
  $('video').closest('.screen').classList.add('stretch-shell');
  $('phone-controls').append($('transport'));$('controls').hidden=true;$('play').textContent='Start';
  $('hide-controls').textContent='Close';$('phone-dialog').append($('panel'));
  video.muted=true; notice('');
  if(!pairing){$('paste-invitation').hidden=false;remoteStatus('Link required');}
}
void measureTextRegions().catch(()=>{document.documentElement.dataset.pretext='unavailable';});
// Invitation material is kept only in memory, never in URL queries, logs or storage.
if(location.hash) history.replaceState(null,'',location.pathname+location.search);
$('use-link').addEventListener('click',()=>{
  try {const u=new URL($('pasted-link').value); if(u.origin!==location.origin||u.pathname!==location.pathname)throw new Error(); pairing=parseInvite(u.hash); $('pasted-link').value='';$('paste-invitation').hidden=true;updateRoleLink();remoteStatus('Ready');}
  catch {remoteStatus('Invalid link');}
});

$('arm').addEventListener('click',async()=>{
  const original=video.currentTime;
  try {
    // Call play during the actual gesture; waiting on signaling first loses activation.
    const play=video.play(); await play; video.pause(); video.currentTime=original;
    armed=true;blocked=false;lastAnchor=-1;$('arm').textContent='Enabled';
    $('arm').disabled=true;notice('');
    try{wakeLock=await navigator.wakeLock?.request('screen');}catch{/* Optional; browsers may refuse. */}
    refreshEnabled();
  } catch { notice('Not ready'); }
});
$('enter-vr').addEventListener('click',async()=>{try { await view?.enterVR(); } catch{notice('VR unavailable');} });
$('show-qr').addEventListener('click',()=>$('qr-dialog').showModal());

$('headset-status').addEventListener('click',()=>{$('connection-settings').open=true;$('phone-dialog').showModal();$('headset-status').setAttribute('aria-expanded','true');});
$('phone-dialog').addEventListener('close',()=>$('headset-status').setAttribute('aria-expanded','false'));
$('hide-controls').addEventListener('click',()=>{if(phone){$('phone-dialog').close();return;}document.body.classList.add('controls-hidden');$('show-controls').hidden=false;$('show-controls').focus();});
$('show-controls').addEventListener('click',()=>{document.body.classList.remove('controls-hidden');$('show-controls').hidden=true;$('hide-controls').focus();});

function renderState(next){
  if(phone && next.revision<state.revision)return;
  state=next; view?.update(state);
  $('seek').max=String(state.duration);
  for(const [id,value] of Object.entries({projection:state.projection,lens:state.lens,fov:state.fov,yaw:state.yaw,pitch:state.pitch,volume:state.volume})){
    if(document.activeElement!==$(id))$(id).value=String(value);
    if($(id+'-value'))$(id+'-value').textContent=id==='volume'?Math.round(value*100)+'%':value+'°';
  }
  video.volume=state.volume;
}
function localPause(){ model.command('player.transport','pause',{},true);renderState(model.snapshot());connection?.publishState(); }
function applyCommand(command){
  if(command.expectedRevision!==null && command.expectedRevision!==model.state.revision) return {ok:false,revision:model.state.revision,result:null,error:'revision_conflict'};
  const outcome=model.command(command.scope,command.action,command.args,armed&&video.readyState>=3);
  if(outcome.ok){renderState(model.snapshot());}
  return outcome;
}
function issue(action,args={},scope='player.transport'){
  if(!canControl()||pending)return;
  if(!phone){const result=applyCommand({scope,action,args,expectedRevision:null});connection?.publishState(); if(!result.ok)notice(result.error.replaceAll('_',' '));return;}
  try{const id=connection.sendCommand(scope,action,args,{expectedRevision:action==='ping'?null:state.revision});pending={id,action,sent:performance.now()};refreshEnabled();}
  catch {remoteStatus('Disconnected');}
}
$('play').addEventListener('click',()=>{ if(phone&&!synced){notice('Syncing');return;}issue('play',{previewReady:armed&&video.readyState>=3}); });
$('pause').addEventListener('click',()=>issue('pause'));
$('halt').addEventListener('click',()=>issue('stop'));
$('seek').addEventListener('change',()=>issue('seek',{position:Number($('seek').value)}));
$('volume').addEventListener('change',()=>issue('volume',{volume:Number($('volume').value)}));
$('recenter').addEventListener('click',()=>issue('recenter',{},'player.view'));
for(const id of ['projection','lens','fov','yaw','pitch'])$(id).addEventListener('change',()=>issue('projection',{
  mode:$('projection').value,lens:Number($('lens').value),fov:Number($('fov').value),yaw:Number($('yaw').value),pitch:Number($('pitch').value)
},'player.view'));

async function disconnect({keepPairing=false,quiet=false}={}){
  ++generation;clearInterval(heartbeat);clearTimeout(expiry);clearTimeout(connectDeadline);heartbeat=expiry=undefined;
  pending=undefined;synced=false;samples=[];lastStateAt=0;
  const old=connection;connection=undefined;transport=undefined;
  if(!phone)localPause();else {video.pause();state={...state,anchor:{...state.anchor,playing:false}};}
  if(!keepPairing){pairing=undefined;expiresAt=0;$('invite-link').value='';$('qr').getContext('2d').clearRect(0,0,$('qr').width,$('qr').height);$('invitation').hidden=true;$('qr-dialog').close();}
  updateRoleLink();
  $('connect').disabled=false;$('stop').hidden=true;refreshEnabled();
  if(!quiet)remoteStatus('Disconnected');
  await old?.close();
}
function received(event){
  try {const next=validateState(event.detail.state);lastStateAt=performance.now();renderState(next);refreshEnabled();}
  catch {remoteStatus('Invalid state');void disconnect({quiet:true});}
}
async function startRemote(reuse=false){
  if(transport)return;
  if(phone&&!armed){notice('Enable first');return;}
  if(phone&&!pairing){$('paste-invitation').hidden=false;remoteStatus('Link required');return;}
  if(!phone&&!reuse){
    if(!pairing)pairing={room:generateVdoRoomId(),secret:randomToken(32)};
    if(!expiresAt)expiresAt=performance.now()+30*60*1000;
  }
  if(phone)expiresAt=performance.now()+30*60*1000;
  updateRoleLink();
  const current=++generation;
  if(phone){state=model.snapshot();lastAnchor=-1;lastStateAt=0;synced=false;samples=[];}
  const t=new VdoNinjaTransport({role:phone?'controller':'target',room:pairing.room,sharedSecret:pairing.secret,label:'Immersive video viewer'});
  let controlWindow=performance.now(),controlCount=0,stateWindow=controlWindow,stateCount=0;
  // Bound inbound work before the protocol's async receive queue, including authenticated floods.
  t.addEventListener('controlmessage',e=>{const now=performance.now();if(now-controlWindow>1000){controlWindow=now;controlCount=0;}if(++controlCount>40){e.stopImmediatePropagation();if(transport===t){remoteStatus('Disconnected');void disconnect({quiet:true});}}});
  t.addEventListener('statemessage',e=>{const now=performance.now();if(now-stateWindow>1000){stateWindow=now;stateCount=0;}if(++stateCount>80)e.stopImmediatePropagation();});
  const c=new BRSPConnection({transport:t,role:phone?'controller':'target',sessionId:pairing.room,sharedSecret:pairing.secret,
    requestedScopes:phone?['player.transport']:[],grantedScopes:phone?[]:SCOPES,applyCommand,getState:()=>model.snapshot()});
  transport=t;connection=c;stopped=false;
  $('connect').disabled=true;$('stop').hidden=false;
  const active=()=>generation===current&&connection===c;
  t.addEventListener('status',e=>{if(active())remoteStatus(e.detail.error?'Connection failed':({connecting:'Connecting',discoverable:'Waiting',discovering:'Waiting','connecting-peer':'Connecting','peer-open':'Connecting'})[e.detail.phase]||'Connecting');});
  t.addEventListener('quality',e=>{if(active()){document.body.dataset.route=e.detail.route;document.body.dataset.rtt=String(e.detail.rttMs??'unknown');}});
  c.addEventListener('state',e=>{if(active())received(e);});c.addEventListener('snapshot',e=>{if(active())received(e);});
  c.addEventListener('ready',()=>{
    if(!active())return;clearTimeout(connectDeadline);
    remoteStatus(phone?'Syncing':'Connected');
    if(phone)$('phone-dialog').close();else $('playback-settings').open=true;
    if(phone){pending=undefined;sendClockPing();}else c.publishState();
    refreshEnabled();
  });
  c.addEventListener('commandapplied',e=>{
    if(!active()||pending?.id!==e.detail.commandId)return;
    const sent=pending.sent,action=pending.action;pending=undefined;
    if(action==='ping'&&e.detail.ok){
      const result=e.detail.result,receivedAt=performance.now();
      if(result?.sentAt!==sent || !Number.isFinite(result.receivedAt))return;
      samples.push({sent,received:receivedAt,target:result.receivedAt});if(samples.length>8)samples.shift();
      offset=clockOffset(samples);synced=true;remoteStatus('Connected');
      if(samples.length<4)setTimeout(()=>{if(active())sendClockPing();},100);
    } else if(!e.detail.ok)notice(e.detail.error.replaceAll('_',' '));
    else notice('');
    refreshEnabled();
  });
  const lost=()=>{
    if(!active())return;
    if(phone){void disconnect({keepPairing:true,quiet:true});remoteStatus('Disconnected');}
    else {void (async()=>{await disconnect({keepPairing:true,quiet:true});if(pairing&&!stopped){remoteStatus('Waiting');await startRemote(true);}})();}
  };
  c.addEventListener('peerclose',lost);
  c.addEventListener('protocolerror',()=>{if(active()){remoteStatus('Pairing failed');void disconnect({keepPairing:true,quiet:true});}});
  function sendClockPing(){
    if(!active()||pending||c.phase!=='ready')return;
    const sent=performance.now(),id=c.sendCommand('player.transport','ping',{sentAt:sent});
    pending={id,action:'ping',sent};lastPing=sent;refreshEnabled();
  }
  connectDeadline=setTimeout(()=>{if(active()&&c.phase!=='ready'){remoteStatus('Waiting');}},20000);
  expiry=setTimeout(()=>{if(active()){void disconnect();remoteStatus('Expired');}},Math.max(1,expiresAt-performance.now()));
  heartbeat=setInterval(()=>{
    if(!active())return;
    if(!phone)c.publishState();
    else {
      if(pending&&performance.now()-pending.sent>5000){remoteStatus('Timed out');void disconnect({keepPairing:true,quiet:true});return;}
      if(c.phase==='ready'&&performance.now()-lastStateAt>2000){remoteStatus('Reconnecting');video.pause();}
      if(c.phase==='ready'&&performance.now()-lastPing>10000)sendClockPing();
    }
    refreshEnabled();
  },250);
  if(!phone){
    const url=new URL(location.href);url.search='?controller=1';url.hash=new URLSearchParams(pairing).toString();
    $('invite-link').value=url.href;$('invitation').hidden=false;
    await QRCode.toCanvas($('qr'),url.href,{width:232,margin:2,errorCorrectionLevel:'M'});
    if(!active())return;
    $('qr').style.removeProperty('width');$('qr').style.removeProperty('height');$('show-qr').hidden=false;
  }
  try{await t.start();if(active()&&t.phase==='error')throw new Error();}
  catch {if(active()){await disconnect({keepPairing:true,quiet:true});remoteStatus('Connection failed');}}
}
$('connect').addEventListener('click',()=>{void startRemote();});
$('stop').addEventListener('click',()=>{stopped=true;void disconnect();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);remoteStatus('Copied');}catch{$('invite-link').select();remoteStatus('Copy link');}});

function syncMedia(){
  updatePhoneStatus();
  if(!armed)return;
  const now=targetNow(),stale=phone&&(!synced||connection?.phase!=='ready'||performance.now()-lastStateAt>2000);
  const desired=positionAt(state,now),future=state.anchor.playing&&now<state.anchor.at;
  if(state.anchor.generation!==lastAnchor){video.pause();video.currentTime=desired;lastAnchor=state.anchor.generation;}
  if(stale||!state.anchor.playing||future||desired>=state.duration){if(!video.paused)video.pause();}
  else {
    const drift=desired-video.currentTime;
    if(Math.abs(drift)>.3)video.currentTime=desired;
    video.playbackRate=Math.abs(drift)>.07?Math.max(.98,Math.min(1.02,1+drift*.06)):1;
    if(video.paused&&!starting&&!blocked){
      const session=generation,anchor=state.anchor.generation;starting=true;
      video.play().catch(()=>{
        if(session!==generation||anchor!==state.anchor.generation||!state.anchor.playing)return;
        blocked=true;armed=false;$('arm').disabled=false;
        if(!phone)localPause();
        notice('Enable first');refreshEnabled();
      }).finally(()=>{starting=false;});
    }
  }
  const time=`${format(video.currentTime)} / ${format(state.duration)}`;
  if($('screen-time').textContent!==time)$('screen-time').textContent=time;
  if($('position').textContent!==format(desired))$('position').textContent=format(desired);
  if(document.activeElement!==$('seek'))$('seek').value=String(desired);
  document.body.dataset.playing=String(!video.paused);
  document.body.dataset.revision=String(state.revision);
  document.body.dataset.clock=String(synced);
}
const mediaTimer=setInterval(syncMedia,50);
video.addEventListener('waiting',()=>{
  if(!phone&&state.anchor.playing&&targetNow()>state.anchor.at&&armed){
    model.command('player.transport','seek',{position:Math.min(video.currentTime,state.duration)},true);localPause();
    notice('Buffering');
  }
});
video.addEventListener('error',()=>notice('Video unavailable'));
video.addEventListener('loadedmetadata',()=>{if(!phone&&Number.isFinite(video.duration)){model.state.duration=video.duration;renderState(model.snapshot());}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(phone)video.pause();else if(state.anchor.playing&&!view?.renderer.xr.isPresenting){localPause();notice('Paused');}}
  else if(armed){lastAnchor=-1;try{void navigator.wakeLock?.request('screen').then(lock=>{wakeLock=lock;});}catch{/* Optional */}}
});
window.addEventListener('pagehide',()=>{stopped=true;clearInterval(mediaTimer);void disconnect({quiet:true});void wakeLock?.release();view?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
renderState(state);
video.preload='auto';video.src=video.dataset.src;video.load();
if(phone){$('headset-status').focus();$('headset-status').click();}
}
