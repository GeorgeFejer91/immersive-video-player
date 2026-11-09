import { Player, positionAt, clockOffset, validateState, previewMatches, SCOPES } from './player.js';
import { BRSPConnection } from './remote/brsp.js';
import { VdoNinjaTransport } from './remote/vdo-ninja-transport.js';
import { createViewer } from './viewer.js';
import { measureTextRegions } from './text-fit.js';
import { TargetGroup } from './remote/target-group.js';
import { markPlaybackStarted } from './install-app.js';

export function initPlayer({phone,autoConnect,session}) {
const $ = id => document.getElementById(id);
let follows=phone;
document.body.classList.toggle('phone',phone);
const video=$('video'),stage=$('stage'),screen=video.closest('.screen'),model=new Player(467.3);
const warpPresets=[...$('warp-presets').querySelectorAll('button')];
let view, armed=false, state=model.snapshot(), connection, transport;
let phonePreviewAttempted=false, enabling=false;
let queuedLens,lensTimer,lastLensAt=0;
let generation=0, heartbeat, connectDeadline, pending, samples=[], offset=0, synced=false;
let lastStateAt=0, lastAnchor=-1, starting=false, blocked=false, wakeLock, stopped=false, lastPing=0;
let remoteWanted=autoConnect,retryTimer,retryAttempt=0,recovering=false,hiddenAt=0;
const format=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const notice=text=>{for(const id of ['notice','phone-notice'])if($(id).textContent!==text)$(id).textContent=text;};
const remoteStatus=text=>{if($('connection').textContent!==text)$('connection').textContent=text;};
const targetNow=()=>performance.now()+(follows?offset:0);
function canControl(){return (phone||armed) && (!follows || (connection?.phase==='ready' && synced && lastStateAt>0 && performance.now()-lastStateAt<2000));}
function refreshEnabled(){
  const disabled=!canControl()||Boolean(pending);
  $('controls').disabled=$('phone-controls').disabled=disabled;
  if(phone){
    const viewDisabled=connection?.phase==='ready'&&(!canControl()||!connection.acceptedScopes.includes('player.view'));
    $('warp-presets').disabled=viewDisabled||Boolean(pending);
    $('phone-lens').disabled=viewDisabled||state.projection!=='fisheye';
  }
  updatePhoneStatus();
}
function updatePhoneStatus(){
  if(!phone)return;
  const ready=connection?.phase==='ready';
  const matched=ready&&canControl()&&!document.hidden&&(!pending||pending.action==='ping')&&previewMatches(state,targetNow(),video);
  const status=matched?'synced':ready?'syncing':'disconnected';
  const button=$('headset-status'),label=`Headset ${status}`;
  if(button.dataset.state===status)return;
  button.dataset.state=status;button.setAttribute('aria-label',label);button.title=label;$('headset-state').textContent=label;
}
$('arm').hidden=phone||autoConnect;
try { if(!phone)view=createViewer(stage,video); }
catch { notice('Video unavailable'); $('enter-vr').disabled=true; }

if(phone){
  $('role-label').textContent='Controller';
  $('phone-header').hidden=false;$('phone-controls').hidden=false;
  video.removeAttribute('aria-hidden');video.setAttribute('aria-label','Jona');video.classList.add('stretch-body');
  stage.classList.add('stretch-body');stage.setAttribute('role','region');stage.setAttribute('aria-label','Jona panorama');
  screen.classList.add('stretch-shell');
  $('phone-controls').append($('transport'),$('seek').closest('label'));$('controls').hidden=true;$('play').textContent='Start';
  $('hide-controls').textContent='Close';$('phone-dialog').append($('panel'));
  video.muted=true; notice('');
}
function setPhonePreview(warped){
  screen.dataset.preview=warped?'warped':'native';
  video.setAttribute('aria-hidden',String(warped));
  $('warp-fallback').hidden=warped;
}
function enablePhonePreview(){
  if(!phone||phonePreviewAttempted)return;
  phonePreviewAttempted=true;
  try {
    view=createViewer(stage,video,{preview:true});
    view.update(state);
    view.renderer.domElement.addEventListener('webglcontextlost',()=>setPhonePreview(false));
    view.renderer.domElement.addEventListener('webglcontextrestored',()=>setPhonePreview(true));
    setPhonePreview(true);
  } catch { setPhonePreview(false); }
}
void measureTextRegions().catch(()=>{document.documentElement.dataset.pretext='unavailable';});
async function enablePlayback(){
  if(enabling)return false;
  enabling=true;
  const original=video.currentTime;
  try {
    // Call play during the actual gesture; waiting on signaling first loses activation.
    const play=video.play(); await play; video.pause(); video.currentTime=original;
    armed=true;blocked=false;lastAnchor=-1;$('arm').textContent='Enabled';
    $('arm').disabled=true;notice('');
    if(phone||autoConnect)$('arm').hidden=true;
    enablePhonePreview();
    try{void navigator.wakeLock?.request('screen').then(lock=>{wakeLock=lock;}).catch(()=>{});}catch{/* Optional; browsers may refuse. */}
    refreshEnabled();
    return true;
  } catch (error) {
    if(error?.name!=='AbortError')notice('Not ready');
    return false;
  } finally { enabling=false; }
}
$('arm').addEventListener('click',()=>{void enablePlayback();});
async function enterImmersive(){
  const enabling=autoConnect&&!phone&&!armed?enablePlayback():Promise.resolve();
  // Request XR and media during the same headset action.
  const entering=view?view.enterVR().then(()=>true,()=>false):Promise.resolve(false);
  await enabling;
  if(follows)scheduleRetry();
  if(!await entering)notice('VR unavailable');
}
$('enter-vr').addEventListener('click',enterImmersive);
$('show-qr').addEventListener('click',async()=>{
  $('qr-dialog').showModal();
  try {
    const {default:QRCode}=await import('qrcode');
    const canvas=$('qr');
    await QRCode.toCanvas(canvas,$('invite-link').value,{width:232,margin:2,errorCorrectionLevel:'M'});
    canvas.style.removeProperty('width');canvas.style.removeProperty('height');
  } catch {remoteStatus('QR unavailable');}
});

$('headset-status').addEventListener('click',()=>{$('connection-settings').open=true;$('phone-dialog').showModal();$('headset-status').setAttribute('aria-expanded','true');});
$('phone-dialog').addEventListener('close',()=>$('headset-status').setAttribute('aria-expanded','false'));
$('show-warp').addEventListener('click',()=>{
  enablePhonePreview();
  $('warp-dialog').showModal();
});
function clearQueuedLens(){
  queuedLens=undefined;clearTimeout(lensTimer);lensTimer=undefined;
}
function scheduleLens(){
  if(queuedLens===undefined||lensTimer||pending||!canControl()||connection?.phase!=='ready')return;
  lensTimer=setTimeout(()=>{
    lensTimer=undefined;
    if(queuedLens===undefined||pending||!canControl()||connection?.phase!=='ready')return;
    const lens=queuedLens;queuedLens=undefined;lastLensAt=performance.now();
    issue('lens',{lens},'player.view');
  },Math.max(0,100-(performance.now()-lastLensAt)));
}
$('phone-lens').addEventListener('input',()=>{
  const lens=Number($('phone-lens').value);
  $('phone-lens-value').textContent=lens+'°';
  if(connection?.phase==='ready'){queuedLens=lens;scheduleLens();}
  else renderState({...state,lens});
});
$('phone-lens').addEventListener('blur',()=>renderState(state));
for(const preset of warpPresets)preset.addEventListener('click',()=>{
  clearQueuedLens();
  const mode=preset.dataset.warpMode;
  const lens=Number(preset.dataset.warpLens??state.lens);
  if(connection?.phase==='ready')issue('projection',{mode,lens,fov:state.fov,yaw:state.yaw,pitch:state.pitch},'player.view');
  else {renderState({...state,projection:mode,lens});refreshEnabled();}
  $('warp-dialog').close();
});
$('hide-controls').addEventListener('click',()=>{if(phone){$('phone-dialog').close();return;}document.body.classList.add('controls-hidden');$('show-controls').hidden=false;$('show-controls').focus();});
$('show-controls').addEventListener('click',()=>{document.body.classList.remove('controls-hidden');$('show-controls').hidden=true;$('hide-controls').focus();});

function renderState(next){
  if(follows && next.revision<state.revision)return;
  state=next; view?.update(state);
  if(phone){
    if(state.projection!=='fisheye')clearQueuedLens();
    if(document.activeElement!==$('phone-lens')&&queuedLens===undefined&&pending?.action!=='lens')$('phone-lens').value=String(state.lens);
    const angleText=$('phone-lens').value+'°';
    if($('phone-lens-value').textContent!==angleText)$('phone-lens-value').textContent=angleText;
    let selected=false;
    for(const preset of warpPresets){
      const active=preset.dataset.warpMode===state.projection&&
        (preset.dataset.warpLens===undefined||Number(preset.dataset.warpLens)===state.lens);
      if(preset.getAttribute('aria-pressed')!==String(active))preset.setAttribute('aria-pressed',String(active));
      selected||=active;
    }
    const current=$('warp-current');
    if(current.hidden!==selected)current.hidden=selected;
    if(!selected&&current.textContent!==`Fisheye ${state.lens}°`)current.textContent=`Fisheye ${state.lens}°`;
  }
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
  if(phone&&enabling&&(action==='pause'||action==='stop'||action==='seek'))video.pause();
  if(!follows){const result=applyCommand({scope,action,args,expectedRevision:null});connection?.publishState(); if(!result.ok)notice(result.error.replaceAll('_',' '));return;}
  const expectedRevision=phone&&action==='projection'?state.revision:null;
  try{const id=connection.sendCommand(scope,action,args,{expectedRevision});pending={id,action,sent:performance.now()};refreshEnabled();}
  catch {remoteStatus('Disconnected');}
}
$('play').addEventListener('click',async()=>{
  if(!canControl()||pending||enabling)return;
  const current=generation;
  let previewReady=video.readyState>=3;
  if(phone&&!armed&&video.paused){
    // Successful play warms the decoder before Enable restores the paused frame.
    previewReady=await enablePlayback();
    if(!previewReady)return;
  }
  if(current===generation)issue('play',{previewReady});
});
$('pause').addEventListener('click',()=>issue('pause'));
$('halt').addEventListener('click',()=>issue('stop'));
$('seek').addEventListener('change',()=>issue('seek',{position:Number($('seek').value)}));
$('volume').addEventListener('change',()=>issue('volume',{volume:Number($('volume').value)}));
$('recenter').addEventListener('click',()=>issue('recenter',{},'player.view'));
for(const id of ['projection','lens','fov','yaw','pitch'])$(id).addEventListener('change',()=>issue('projection',{
  mode:state.projection,lens:state.lens,fov:state.fov,yaw:state.yaw,pitch:state.pitch,
  [id==='projection'?'mode':id]:id==='projection'?$(id).value:Number($(id).value)
},'player.view'));

async function disconnect({quiet=false,recoveringTransport=false}={}){
  clearQueuedLens();
  ++generation;clearInterval(heartbeat);clearTimeout(connectDeadline);clearTimeout(retryTimer);retryTimer=undefined;heartbeat=undefined;
  pending=undefined;synced=false;samples=[];lastStateAt=0;
  const old=connection;connection=undefined;transport=undefined;
  if(!follows){localPause();document.body.dataset.peers='0';}else {video.pause();state={...state,anchor:{...state.anchor,playing:false}};}
  $('invite-link').value='';$('invitation').hidden=true;$('qr-dialog').close();$('show-qr').hidden=true;
  const restoreConnect=document.activeElement===$('stop');
  $('connect').disabled=false;$('connect').hidden=phone;
  $('stop').hidden=!(remoteWanted&&!stopped);refreshEnabled();
  if(restoreConnect&&$('stop').hidden)$(phone?'hide-controls':'connect').focus();
  if(!quiet)remoteStatus('Disconnected');
  await old?.close({notify:!recoveringTransport});
}
function scheduleRetry(){
  if(retryTimer||recovering||transport||!remoteWanted||stopped||!navigator.onLine||document.hidden||(follows&&!phone&&!armed))return;
  $('connect').hidden=true;
  remoteStatus('Reconnecting');
  retryTimer=setTimeout(()=>{
    retryTimer=undefined;
    if(!stopped&&remoteWanted&&navigator.onLine&&!document.hidden)void startRemote();
  },Math.min(15000,1000*2**Math.min(retryAttempt++,4)));
}
async function recoverRemote(){
  if(recovering||stopped||!remoteWanted)return;
  recovering=true;
  try {await disconnect({quiet:true,recoveringTransport:true});}
  finally {recovering=false;scheduleRetry();}
}
function received(event){
  try {const next=validateState(event.detail.state);lastStateAt=performance.now();renderState(next);refreshEnabled();scheduleLens();}
  catch {remoteStatus('Invalid state');void disconnect({quiet:true});}
}
async function startRemote(){
  if(transport||recovering)return;
  if(follows&&!phone&&!armed){notice('Enable first');return;}
  const current=++generation;
  if(follows){state=model.snapshot();lastAnchor=-1;lastStateAt=0;synced=false;samples=[];}
  const t=new VdoNinjaTransport({role:follows?'controller':'target',room:session.room,sharedSecret:session.secret,streamId:session.streamId,label:'Immersive video viewer'});
  let controlWindow=performance.now(),controlCount=0,stateWindow=controlWindow,stateCount=0;
  // Bound inbound work before the protocol's async receive queue, including authenticated floods.
  if(follows){
    t.addEventListener('controlmessage',e=>{const now=performance.now();if(now-controlWindow>1000){controlWindow=now;controlCount=0;}if(++controlCount>40){e.stopImmediatePropagation();if(transport===t){remoteStatus('Disconnected');void disconnect({quiet:true});}}});
    t.addEventListener('statemessage',e=>{const now=performance.now();if(now-stateWindow>1000){stateWindow=now;stateCount=0;}if(++stateCount>80)e.stopImmediatePropagation();});
  }
  const options={transport:t,sessionId:session.room,sharedSecret:session.secret,applyCommand,getState:()=>model.snapshot()};
  const c=follows?new BRSPConnection({...options,role:'controller',requestedScopes:SCOPES}):new TargetGroup({...options,grantedScopes:SCOPES});
  transport=t;connection=c;
  const restoreStop=document.activeElement===$('connect');
  $('connect').disabled=true;$('connect').hidden=true;$('stop').hidden=false;
  if(restoreStop)$('stop').focus();
  const active=()=>generation===current&&connection===c;
  if(!follows)t.addEventListener('targetconflict',async()=>{
    if(!active()||recovering)return;
    recovering=true;
    try{await disconnect({quiet:true,recoveringTransport:true});}
    finally{follows=true;recovering=false;}
    if(stopped)return;
    remoteStatus('Shared viewer');
    scheduleRetry();
  });
  t.addEventListener('status',e=>{if(active())remoteStatus(e.detail.error?'Connection failed':({connecting:'Connecting',discoverable:'Waiting',discovering:'Waiting','connecting-peer':'Connecting','peer-open':'Connecting'})[e.detail.phase]||'Connecting');});
  t.addEventListener('quality',e=>{if(active()){document.body.dataset.route=e.detail.route;document.body.dataset.rtt=String(e.detail.rttMs??'unknown');}});
  c.addEventListener('state',e=>{if(active())received(e);});c.addEventListener('snapshot',e=>{if(active())received(e);});
  c.addEventListener('ready',()=>{
    if(!active())return;clearTimeout(connectDeadline);retryAttempt=0;
    remoteStatus(follows?'Syncing':'Connected');
    if(phone)enablePhonePreview();
    else if(!autoConnect||armed)$('playback-settings').open=true;
    if(follows){pending=undefined;sendClockPing();}else c.publishState();
    refreshEnabled();
  });
  if(!follows)c.addEventListener('peercount',event=>{
    if(!active())return;document.body.dataset.peers=String(event.detail.count);
    remoteStatus(event.detail.count?'Connected':'Waiting');
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
    scheduleLens();
  });
  c.addEventListener('peerclose',()=>{if(active()&&follows)void recoverRemote();});
  c.addEventListener('protocolerror',event=>{
    if(!active())return;
    // The pinned protocol reports a failed reliable-lane send through this event too.
    if(follows&&event.detail.message==='Reliable control lane is unavailable or backpressured.'){
      void recoverRemote();return;
    }
    remoteWanted=false;remoteStatus('Pairing failed');void disconnect({quiet:true});
  });
  function sendClockPing(){
    if(!active()||pending||c.phase!=='ready'||(phone&&synced&&enabling))return;
    const sent=performance.now(),id=c.sendCommand('player.transport','ping',{sentAt:sent});
    pending={id,action:'ping',sent};lastPing=sent;refreshEnabled();
  }
  connectDeadline=setTimeout(()=>{if(active()&&c.phase!=='ready'){if(follows)void recoverRemote();else remoteStatus('Waiting');}},20000);
  heartbeat=setInterval(()=>{
    if(!active())return;
    if(!follows)c.publishState();
    else {
      if(pending&&performance.now()-pending.sent>5000){void recoverRemote();return;}
      if(c.phase==='ready'&&performance.now()-lastStateAt>2000){remoteStatus('Reconnecting');video.pause();}
      if(c.phase==='ready'&&lastStateAt&&performance.now()-lastStateAt>5000){void recoverRemote();return;}
      if(c.phase==='ready'&&performance.now()-lastPing>10000)sendClockPing();
    }
    refreshEnabled();
  },250);
  if(!follows){
    const url=new URL('.',location.href);
    $('invite-link').value=url.href;$('invitation').hidden=false;
    $('show-qr').hidden=false;
  }
  try{await t.start();if(active()&&t.phase==='error')throw new Error();}
  catch {
    if(!active())return;
    if(!follows&&!autoConnect)remoteWanted=false;
    await disconnect({quiet:true});
    remoteStatus('Connection failed');
    scheduleRetry();
  }
}
$('connect').addEventListener('click',async()=>{
  const button=$('connect');
  if(follows&&!armed){
    button.disabled=true;
    await enablePlayback();
    button.disabled=false;
    if(!armed)return;
  }
  remoteWanted=true;stopped=false;retryAttempt=0;clearTimeout(retryTimer);retryTimer=undefined;void startRemote();
});
$('stop').addEventListener('click',()=>{stopped=true;remoteWanted=false;void disconnect();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);remoteStatus('Copied');}catch{$('invite-link').select();remoteStatus('Copy link');}});

function syncMedia(){
  updatePhoneStatus();
  if(enabling||(!phone&&!armed))return;
  const now=targetNow(),stale=follows&&(!synced||connection?.phase!=='ready'||performance.now()-lastStateAt>2000);
  const desired=positionAt(state,now),future=state.anchor.playing&&now<state.anchor.at;
  if(state.anchor.generation!==lastAnchor){video.pause();video.currentTime=desired;lastAnchor=state.anchor.generation;}
  if(stale||!state.anchor.playing||future||desired>=state.duration){if(!video.paused)video.pause();}
  else {
    const drift=desired-video.currentTime;
    if(Math.abs(drift)>.3&&!video.seeking)video.currentTime=desired;
    video.playbackRate=Math.abs(drift)>.07?Math.max(.98,Math.min(1.02,1+drift*.06)):1;
    if(video.paused&&!starting&&!blocked){
      const session=generation,anchor=state.anchor.generation;starting=true;
      video.play().catch(()=>{
        if(session!==generation||anchor!==state.anchor.generation||!state.anchor.playing)return;
        blocked=true;armed=false;$('arm').disabled=false;$('arm').hidden=false;
        if(!follows)localPause();
        notice(phone?'Preview blocked':'Enable first');refreshEnabled();
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
  // Native seeking emits waiting too; it must not turn a requested seek into Pause.
  if(!video.seeking&&!follows&&state.anchor.playing&&targetNow()>state.anchor.at&&armed){
    model.command('player.transport','seek',{position:Math.min(video.currentTime,state.duration)},true);localPause();
    notice('Buffering');
  }
});
video.addEventListener('error',()=>notice('Video unavailable'));
video.addEventListener('playing',()=>{if((phone||armed)&&state.anchor.playing)markPlaybackStarted();});
video.addEventListener('loadedmetadata',()=>{if(!follows&&Number.isFinite(video.duration)){model.state.duration=video.duration;renderState(model.snapshot());}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=performance.now();if(follows)video.pause();else if(state.anchor.playing&&!view?.renderer.xr.isPresenting){localPause();notice('Paused');}}
  else {
    if(armed){lastAnchor=-1;try{void navigator.wakeLock?.request('screen').then(lock=>{wakeLock=lock;});}catch{/* Optional */}}
    if(transport&&remoteWanted&&((follows&&performance.now()-lastStateAt>2000)||(!follows&&!connection.size&&performance.now()-hiddenAt>5000)))void recoverRemote();
    else scheduleRetry();
  }
});
window.addEventListener('offline',()=>{if(remoteWanted)void recoverRemote();});
window.addEventListener('online',scheduleRetry);
window.addEventListener('pagehide',()=>{stopped=true;remoteWanted=false;clearInterval(mediaTimer);void disconnect({quiet:true});void wakeLock?.release();view?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
renderState(state);
video.preload='auto';video.src=video.dataset.src;video.load();
refreshEnabled();
if(autoConnect)void startRemote();
}
