import QRCode from 'qrcode';
import { Player, positionAt, clockOffset, validateState, parseInvite, SCOPES } from './player.js';
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
const notice=text=>{$('notice').textContent=text;};
const remoteStatus=text=>{$('connection').textContent=text;};
const targetNow=()=>performance.now()+(phone?offset:0);
function canControl(){return armed && (!phone || (connection?.phase==='ready' && synced && performance.now()-lastStateAt<2000));}
function refreshEnabled(){ $('controls').disabled=!canControl()||Boolean(pending); }
function updateRoleLink(){
  const link=$('switch-mode');
  if(!pairing){link.hidden=true;link.removeAttribute('href');return;}
  const links=sessionLinks(location.href,pairing);
  link.href=phone?links.viewer:links.controller;
  link.textContent=phone?'Use headset viewer instead':'Use phone controls instead';
  link.hidden=false;
}
updateRoleLink();
try { view=createViewer($('stage'),video); }
catch { notice('This browser could not create the immersive view. Try a browser with WebGL enabled.'); $('enter-vr').disabled=true; }
void measureTextRegions().catch(()=>{document.documentElement.dataset.pretext='unavailable';});

if(phone){
  $('role-label').textContent='Control center'; $('panel-kicker').textContent='PHONE CONTROL CENTER';
  $('pair-title').textContent='Connect to the viewer';
  $('pair-help').textContent='Enable the preview, then connect. Playback and view changes are confirmed by the viewer.';
  $('connect').textContent='Connect to viewer'; $('arm').textContent='Enable phone preview';
  video.muted=true; notice('Enable this preview once so a remote start can play here. Preview sound stays off.');
  if(!pairing){$('paste-invitation').hidden=false;remoteStatus('Open or paste the session link shown by the viewer.');}
}
// Invitation material is kept only in memory, never in URL queries, logs or storage.
if(location.hash) history.replaceState(null,'',location.pathname+location.search);
$('use-link').addEventListener('click',()=>{
  try {const u=new URL($('pasted-link').value); if(u.origin!==location.origin||u.pathname!==location.pathname)throw new Error(); pairing=parseInvite(u.hash); $('pasted-link').value='';$('paste-invitation').hidden=true;remoteStatus('Invitation loaded. Press Connect to viewer.');}
  catch {remoteStatus('Use a complete controller link from this viewer website.');}
});

$('arm').addEventListener('click',async()=>{
  const original=video.currentTime;
  try {
    // Call play during the actual gesture; waiting on signaling first loses activation.
    const play=video.play(); await play; video.pause(); video.currentTime=original;
    armed=true;blocked=false;lastAnchor=-1;$('arm').textContent=phone?'Preview enabled':'Playback enabled';
    $('arm').disabled=true;notice(phone?'Preview ready. Connect, then press Play together.':'Ready. Pair a phone, or use the playback controls here.');
    try{wakeLock=await navigator.wakeLock?.request('screen');}catch{/* Optional; browsers may refuse. */}
    refreshEnabled();
  } catch { notice('Playback is blocked or the film is still loading. Wait briefly, then enable playback again.'); }
});
$('enter-vr').addEventListener('click',async()=>{try { await view?.enterVR(); } catch(e){notice(e.message);} });
if(!navigator.xr)$('vr-help').textContent='Drag the film to look around. For head tracking, open this page in a WebXR headset browser.';
$('hide-controls').addEventListener('click',()=>{document.body.classList.add('controls-hidden');$('show-controls').hidden=false;$('show-controls').focus();});
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
  catch {remoteStatus('Connection unavailable. Reconnect to the viewer.');}
}
$('play').addEventListener('click',()=>{ if(phone&&!synced){notice('Wait for the viewer clock to synchronize.');return;}issue('play',{previewReady:armed&&video.readyState>=3}); });
$('pause').addEventListener('click',()=>issue('pause'));
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
  if(!keepPairing){pairing=undefined;expiresAt=0;$('invite-link').value='';$('qr').getContext('2d').clearRect(0,0,$('qr').width,$('qr').height);$('invitation').hidden=true;}
  updateRoleLink();
  $('connect').disabled=false;$('stop').hidden=true;refreshEnabled();
  if(!quiet)remoteStatus('Session ended. Start or load a fresh invitation to reconnect.');
  await old?.close();
}
function received(event){
  try {const next=validateState(event.detail.state);lastStateAt=performance.now();renderState(next);refreshEnabled();}
  catch {remoteStatus('Viewer sent an unsupported state. End the session and reload both pages.');void disconnect({quiet:true});}
}
async function startRemote(reuse=false){
  if(transport)return;
  if(phone&&!armed){notice('Enable phone preview first, then connect.');return;}
  if(phone&&!pairing){$('paste-invitation').hidden=false;remoteStatus('A controller invitation is required.');return;}
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
  t.addEventListener('controlmessage',e=>{const now=performance.now();if(now-controlWindow>1000){controlWindow=now;controlCount=0;}if(++controlCount>40){e.stopImmediatePropagation();if(transport===t){remoteStatus('Remote message limit exceeded. Session ended.');void disconnect({quiet:true});}}});
  t.addEventListener('statemessage',e=>{const now=performance.now();if(now-stateWindow>1000){stateWindow=now;stateCount=0;}if(++stateCount>80)e.stopImmediatePropagation();});
  const c=new BRSPConnection({transport:t,role:phone?'controller':'target',sessionId:pairing.room,sharedSecret:pairing.secret,
    requestedScopes:phone?SCOPES:[],grantedScopes:phone?[]:SCOPES,applyCommand,getState:()=>model.snapshot()});
  transport=t;connection=c;stopped=false;
  $('connect').disabled=true;$('stop').hidden=false;
  const active=()=>generation===current&&connection===c;
  t.addEventListener('status',e=>{if(active())remoteStatus(e.detail.error?'Signaling failed. End this session and try again.':e.detail.message);});
  t.addEventListener('quality',e=>{if(active())$('diagnostics').textContent=`BRSP/1 · VDO.Ninja 1.5.5 · ${e.detail.route} route · RTT ${e.detail.rttMs??'unknown'} ms · ${phone?'Phone preview muted':'Viewer owns playback'}`;});
  c.addEventListener('state',e=>{if(active())received(e);});c.addEventListener('snapshot',e=>{if(active())received(e);});
  c.addEventListener('ready',()=>{
    if(!active())return;clearTimeout(connectDeadline);
    remoteStatus(phone?'Paired. Synchronizing the viewer clock…':'Phone paired. Playback controls are active.');
    if(phone){pending=undefined;lastStateAt=performance.now();sendClockPing();}else c.publishState();
    refreshEnabled();
  });
  c.addEventListener('commandapplied',e=>{
    if(!active()||pending?.id!==e.detail.commandId)return;
    const sent=pending.sent,action=pending.action;pending=undefined;
    if(action==='ping'&&e.detail.ok){
      const result=e.detail.result,receivedAt=performance.now();
      if(result?.sentAt!==sent || !Number.isFinite(result.receivedAt))return;
      samples.push({sent,received:receivedAt,target:result.receivedAt});if(samples.length>8)samples.shift();
      offset=clockOffset(samples);synced=true;remoteStatus('Paired · phone controls the viewer');
      if(samples.length<4)setTimeout(()=>{if(active())sendClockPing();},100);
    } else if(!e.detail.ok)notice(`Viewer: ${e.detail.error.replaceAll('_',' ')}. Try again when ready.`);
    else notice(action==='play'?'Start scheduled for both screens.':action==='pause'?'Paused on both screens.':'Change confirmed by the viewer.');
    refreshEnabled();
  });
  const lost=()=>{
    if(!active())return;
    if(phone){void disconnect({keepPairing:true,quiet:true});remoteStatus('Viewer disconnected. Press Connect to viewer to try again.');}
    else {void (async()=>{await disconnect({keepPairing:true,quiet:true});if(pairing&&!stopped){remoteStatus('Controller left. Waiting for another invited phone…');await startRemote(true);}})();}
  };
  c.addEventListener('peerclose',lost);
  c.addEventListener('protocolerror',e=>{if(active()){$('diagnostics').textContent=e.detail.message;remoteStatus('Pairing failed. Check the invitation and reconnect.');void disconnect({keepPairing:true,quiet:true});}});
  function sendClockPing(){
    if(!active()||pending||c.phase!=='ready')return;
    const sent=performance.now(),id=c.sendCommand('player.transport','ping',{sentAt:sent});
    pending={id,action:'ping',sent};lastPing=sent;refreshEnabled();
  }
  connectDeadline=setTimeout(()=>{if(active()&&c.phase!=='ready'){remoteStatus('Still waiting for a peer. Check both pages and your Internet connection.');}},20000);
  expiry=setTimeout(()=>{if(active()){void disconnect();remoteStatus('Session expired after 30 minutes. Generate a new invitation.');}},Math.max(1,expiresAt-performance.now()));
  heartbeat=setInterval(()=>{
    if(!active())return;
    if(!phone)c.publishState();
    else {
      if(pending&&performance.now()-pending.sent>5000){remoteStatus('Command confirmation timed out. Reconnect before trying again.');void disconnect({keepPairing:true,quiet:true});return;}
      if(c.phase==='ready'&&performance.now()-lastStateAt>2000){remoteStatus('Viewer state is stale. Playback controls are paused.');video.pause();}
      if(c.phase==='ready'&&performance.now()-lastPing>10000)sendClockPing();
    }
    refreshEnabled();
  },250);
  if(!phone){
    const url=new URL(location.href);url.search='?controller=1';url.hash=new URLSearchParams(pairing).toString();
    $('invite-link').value=url.href;$('invitation').hidden=false;
    await QRCode.toCanvas($('qr'),url.href,{width:232,margin:2,errorCorrectionLevel:'M'});
    if(!active())return;
  }
  try{await t.start();if(active()&&t.phase==='error')throw new Error();}
  catch {if(active()){await disconnect({keepPairing:true,quiet:true});remoteStatus('Could not reach signaling. Check Internet access and try again.');}}
}
$('connect').addEventListener('click',()=>{void startRemote();});
$('stop').addEventListener('click',()=>{stopped=true;void disconnect();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);remoteStatus('Controller link copied.');}catch{$('invite-link').select();remoteStatus('Select and copy the controller link.');}});

function syncMedia(){
  if(!armed)return;
  const now=targetNow(),stale=phone&&(!synced||connection?.phase!=='ready'||performance.now()-lastStateAt>2000);
  const desired=positionAt(state,now),future=state.anchor.playing&&now<state.anchor.at;
  if(state.anchor.generation!==lastAnchor){video.pause();video.currentTime=desired;lastAnchor=state.anchor.generation;}
  if(stale||!state.anchor.playing||future||desired>=state.duration){if(!video.paused)video.pause();}
  else {
    const drift=desired-video.currentTime;
    if(Math.abs(drift)>.3)video.currentTime=desired;
    video.playbackRate=Math.abs(drift)>.07?Math.max(.98,Math.min(1.02,1+drift*.06)):1;
    if(video.paused&&!starting&&!blocked){starting=true;video.play().catch(()=>{blocked=true;armed=false;$('arm').disabled=false;notice('Playback needs another local tap. Enable playback again on this screen.');refreshEnabled();}).finally(()=>{starting=false;});}
  }
  $('screen-time').textContent=`${format(video.currentTime)} / ${format(state.duration)}`;
  $('position').textContent=format(desired);
  if(document.activeElement!==$('seek'))$('seek').value=String(desired);
  document.body.dataset.playing=String(!video.paused);
  document.body.dataset.revision=String(state.revision);
  document.body.dataset.clock=String(synced);
}
const mediaTimer=setInterval(syncMedia,50);
video.addEventListener('waiting',()=>{
  if(!phone&&state.anchor.playing&&targetNow()>state.anchor.at&&armed){
    model.command('player.transport','seek',{position:Math.min(video.currentTime,state.duration)},true);localPause();
    notice('The viewer is buffering. Playback paused; press Play together when ready.');
  }
});
video.addEventListener('error',()=>notice('The film could not load. Check the connection and reload this page.'));
video.addEventListener('loadedmetadata',()=>{if(!phone&&Number.isFinite(video.duration)){model.state.duration=video.duration;renderState(model.snapshot());}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(phone)video.pause();else if(state.anchor.playing&&!view?.renderer.xr.isPresenting){localPause();notice('Viewer was hidden. Playback paused.');}}
  else if(armed){lastAnchor=-1;try{void navigator.wakeLock?.request('screen').then(lock=>{wakeLock=lock;});}catch{/* Optional */}}
});
window.addEventListener('pagehide',()=>{stopped=true;clearInterval(mediaTimer);void disconnect({quiet:true});void wakeLock?.release();view?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
renderState(state);
video.preload='auto';video.src=video.dataset.src;video.load();
}
