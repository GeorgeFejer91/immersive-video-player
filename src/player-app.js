import { Player, positionAt, clockOffset, validateState, previewMatches, SCOPES } from './player.js';
import { BRSPConnection } from './remote/brsp.js';
import { VdoNinjaTransport } from './remote/vdo-ninja-transport.js';
import { createViewer } from './viewer.js';
import { measureTextRegions } from './text-fit.js';
import { TargetGroup } from './remote/target-group.js';
import { initPairing } from './pairing.js';
import { markPlaybackStarted } from './install-app.js';

export function initPlayer({phone,armOnVR,session:discovery}) {
const $ = id => document.getElementById(id);
let follows=false;
document.body.classList.toggle('phone',phone);
const video=$('video'),stage=$('stage'),screen=video.closest('.screen'),model=new Player(467.3);
const warpPresets=[...$('warp-presets').querySelectorAll('button')];
let view, armed=false, state=model.snapshot(), connection, transport;
let phonePreviewAttempted=false, enabling=false, enteringVR=false, xrAttempt=0;
let queuedLens,lensTimer,lastLensAt=0,recenterAfterPing=false;
let generation=0, heartbeat, connectDeadline, pending, samples=[], offset=0, synced=false;
let lastStateAt=0, lastAnchor=-1, starting=false, blocked=false, wakeLock, lastPing=0;
let session,paired=false,everPaired=false,retryTimer,retryAttempt=0,recovering=false,hiddenAt=0;
const format=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const notice=text=>{for(const id of ['notice','phone-notice'])if($(id).textContent!==text)$(id).textContent=text;};
const commandNotice=error=>({viewer_needs_play:'Tap Start on the viewer',viewer_needs_vr:'Tap VR on the headset',viewer_buffering:'Headset is buffering',xr_unavailable:'VR unavailable on the viewer',xr_exit_failed:'Could not exit VR'})[error]??error.replaceAll('_',' ');
const remoteStatus=text=>{
  if($('connection').textContent!==text)$('connection').textContent=text;
  pairing.status(text);
};
const targetNow=()=>performance.now()+(follows?offset:0);
function hasFreshState(){return lastStateAt>0&&performance.now()-lastStateAt<2000;}
function canControl(){return follows?paired&&connection?.phase==='ready'&&hasFreshState():phone?paired:armed;}
function canRecenter(){return follows?canControl()&&connection.acceptedScopes.includes('player.view'):Boolean(view)&&(!phone||paired);}
function refreshEnabled(){
  const available=canControl();
  const disabled=!available||Boolean(pending);
  $('controls').disabled=$('phone-controls').disabled=disabled;
  const recenter=$('recenter');
  recenter.disabled=!canRecenter();
  if(!recenter.disabled&&pending&&pending.action!=='ping')recenter.setAttribute('aria-disabled','true');
  else recenter.removeAttribute('aria-disabled');
  pairing.connected(follows?available:paired);
  const vr=$('remote-vr'),visible=follows&&available&&connection.acceptedScopes.includes('player.xr');
  if(vr.hidden===visible){
    const focused=document.activeElement===vr;
    vr.hidden=!visible;
    if(focused)$(phone?'headset-status':'recenter').focus();
  }
  const label={windowed:'Request VR',requested:'Cancel VR request',immersive:'Exit VR'}[state.xr];
  if(vr.textContent!==label)vr.textContent=label;
  if(document.body.dataset.clock!==String(synced))document.body.dataset.clock=String(synced);
  if(phone){
    const viewDisabled=follows&&(!available||!connection.acceptedScopes.includes('player.view'));
    $('warp-presets').disabled=viewDisabled||Boolean(pending);
    $('phone-lens').disabled=viewDisabled||state.projection!=='fisheye';
  }
  updatePhoneStatus();
}
function updatePhoneStatus(){
  if(!phone)return;
  const ready=connection?.phase==='ready';
  const matched=ready&&paired&&canControl()&&!document.hidden&&(!pending||pending.action==='ping')&&previewMatches(state,targetNow(),video);
  const status=matched?'synced':ready?'syncing':'disconnected';
  const button=$('headset-status'),label=`${session&&!follows?'Controller':'Headset'} ${status}`;
  const recenter=follows&&canRecenter();
  const actionLabel=recenter?'Recenter headset':label;
  const busy=recenter&&pending&&pending.action!=='ping';
  if(busy&&!button.hasAttribute('aria-disabled'))button.setAttribute('aria-disabled','true');
  else if(!busy&&button.hasAttribute('aria-disabled'))button.removeAttribute('aria-disabled');
  if(button.dataset.state===status&&button.title===actionLabel)return;
  button.dataset.state=status;button.setAttribute('aria-label',actionLabel);button.title=actionLabel;
  if(recenter){
    for(const attribute of ['aria-haspopup','aria-controls','aria-expanded'])button.removeAttribute(attribute);
  } else {
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','phone-dialog');
    button.setAttribute('aria-expanded',String($('phone-dialog').open));
  }
  if($('headset-state').textContent!==label)$('headset-state').textContent=label;
}
$('arm').hidden=phone||armOnVR;
try { if(!phone)view=createViewer(stage,video); }
catch { notice('Video unavailable'); $('enter-vr').disabled=true; }

if(phone){
  $('role-label').textContent='Controller';
  $('phone-header').append($('beacon-actions'));
  $('phone-header').hidden=false;$('phone-controls').hidden=false;
  video.removeAttribute('aria-hidden');video.setAttribute('aria-label','Jona');video.classList.add('stretch-body');
  stage.classList.add('stretch-body');stage.setAttribute('role','region');stage.setAttribute('aria-label','Jona panorama');
  screen.classList.add('stretch-shell');
  screen.insertBefore($('recenter'),$('install-app'));
  $('phone-controls').append($('transport'),$('seek').closest('label'),$('remote-vr'));$('controls').hidden=true;$('play').textContent='Start';
  $('hide-controls').textContent='Close';$('phone-dialog').append($('panel'));
  video.muted=true; notice('');
}
const pairing=initPairing({discovery,begin:beginRemote,end:()=>endRemote({quiet:true}),
  prepareTarget:()=>{
    if(phone){
      video.muted=false;
      if(!armed)void enablePlayback();
    }
  },
  focusAfterPair:()=>{
    if(phone)$('headset-status').focus();
    else if(follows||armed){
      $('playback-settings').open=true;$('playback-settings').querySelector('summary').focus();
    } else {$('connection-settings').open=true;$('enter-vr').focus();}
  }
});
if(!phone){
  $('invite-link').value=new URL('.',location.href).href;
  $('invitation').hidden=false;$('show-qr').hidden=false;
  view?.renderer.xr.addEventListener('sessionstart',()=>setXR('immersive'));
  view?.renderer.xr.addEventListener('sessionend',()=>setXR('windowed'));
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
    if(phone||armOnVR)$('arm').hidden=true;
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
function setXR(mode){
  model.setXR(mode);
  if(follows)return;
  renderState(model.snapshot());
  connection?.publishState();
  if(mode==='requested'){
    document.body.classList.remove('controls-hidden');$('show-controls').hidden=true;
    $('connection-settings').open=true;
    $('enter-vr').textContent='Enter VR';
    notice('Tap Enter VR on this headset');
  } else {
    $('enter-vr').textContent='VR';
    if($('notice').textContent==='Tap Enter VR on this headset')notice('');
  }
}
async function enterImmersive(){
  if(enteringVR||view?.renderer.xr.isPresenting)return;
  const attempt=++xrAttempt;
  enteringVR=true;
  const enabling=(armOnVR||follows||state.xr==='requested')&&!armed?enablePlayback():Promise.resolve();
  // Both requests must start within the same local headset gesture.
  const entering=view?view.enterVR(()=>attempt===xrAttempt).then(()=>true,()=>false):Promise.resolve(false);
  await enabling;
  if(!await entering&&attempt===xrAttempt){setXR('windowed');notice('VR unavailable');}
  enteringVR=false;
}
$('enter-vr').addEventListener('click',enterImmersive);
$('remote-vr').addEventListener('click',()=>issue(state.xr==='windowed'?'request-vr':'exit-vr',{},'player.xr'));

async function applyRemoteCommand(command){
  const {scope,action,args,expectedRevision}=command;
  const result=error=>({ok:!error,revision:model.state.revision,result:null,error});
  if(scope!=='player.xr'&&action!=='confirm-pairing')return applyCommand(command);
  if(expectedRevision!==null&&expectedRevision!==model.state.revision)return result('revision_conflict');
  if(Object.keys(args).length)return result('invalid_argument');
  if(scope==='player.transport'&&action==='confirm-pairing'){
    paired=everPaired=true;retryAttempt=0;
    remoteStatus('Connected');refreshEnabled();
    return result(null);
  }
  if(scope!=='player.xr'||!['request-vr','exit-vr'].includes(action))return result('unsupported_command');
  if(action==='request-vr'){
    if(phone||!view||!navigator.xr?.requestSession)return result('xr_unavailable');
    if(model.state.xr==='windowed')setXR('requested');
  } else {
    ++xrAttempt;
    try {await view?.renderer.xr.getSession()?.end();}
    catch{return result('xr_exit_failed');}
    setXR('windowed');
  }
  return result(null);
}
$('show-qr').addEventListener('click',async()=>{
  $('qr-dialog').showModal();
  try {
    const {default:QRCode}=await import('qrcode');
    const canvas=$('qr');
    await QRCode.toCanvas(canvas,$('invite-link').value,{width:232,margin:2,errorCorrectionLevel:'M'});
    canvas.style.removeProperty('width');canvas.style.removeProperty('height');
  } catch {remoteStatus('QR unavailable');}
});

function showConnection(){
  $('connection-settings').open=true;$('phone-dialog').showModal();
  if($('headset-status').hasAttribute('aria-expanded'))$('headset-status').setAttribute('aria-expanded','true');
}
$('headset-status').addEventListener('click',()=>{
  if(!follows||!canRecenter()){showConnection();return;}
  requestRecenter();
});
function requestRecenter(){
  if(pending?.action==='ping')recenterAfterPing=true;
  else issue('recenter',{},'player.view');
}
$('phone-dialog').addEventListener('close',()=>{
  if($('headset-status').hasAttribute('aria-expanded'))$('headset-status').setAttribute('aria-expanded','false');
});
$('show-warp').addEventListener('click',()=>{
  enablePhonePreview();
  $('warp-dialog').showModal();
});
$('open-connection').addEventListener('click',()=>{$('warp-dialog').close();showConnection();});
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
  if(follows){queuedLens=lens;scheduleLens();}
  else {
    applyCommand({scope:'player.view',action:'lens',args:{lens},expectedRevision:null});
    connection?.publishState();
  }
});
$('phone-lens').addEventListener('blur',()=>renderState(state));
for(const preset of warpPresets)preset.addEventListener('click',()=>{
  clearQueuedLens();
  const mode=preset.dataset.warpMode;
  const lens=Number(preset.dataset.warpLens??state.lens);
  const args={mode,lens,fov:state.fov,yaw:state.yaw,pitch:state.pitch};
  if(follows)issue('projection',args,'player.view');
  else {
    applyCommand({scope:'player.view',action:'projection',args,expectedRevision:null});
    connection?.publishState();refreshEnabled();
  }
  $('warp-dialog').close();
});
$('hide-controls').addEventListener('click',()=>{if(phone){$('phone-dialog').close();return;}document.body.classList.add('controls-hidden');$('show-controls').hidden=false;$('show-controls').focus();});
$('show-controls').addEventListener('click',()=>{document.body.classList.remove('controls-hidden');$('show-controls').hidden=true;$('hide-controls').focus();});

function renderState(next){
  if(follows && next.revision<state.revision)return;
  if(follows&&next.xr!==state.xr){
    if(next.xr==='requested')notice('Tap Enter VR on the headset');
    else if($('phone-notice').textContent==='Tap Enter VR on the headset')notice('');
  }
  if(document.body.dataset.xr!==next.xr)document.body.dataset.xr=next.xr;
  if(document.body.dataset.revision!==String(next.revision))document.body.dataset.revision=String(next.revision);
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
  if(outcome.ok){
    renderState(model.snapshot());
    if(command.scope==='player.view'&&command.action==='recenter')view?.recenter();
  }
  else if(outcome.error==='viewer_not_ready')outcome.error=armed||enabling?'viewer_buffering':phone?'viewer_needs_play':'viewer_needs_vr';
  return outcome;
}
function issue(action,args={},scope='player.transport'){
  if(pending||!(action==='recenter'?canRecenter():canControl()))return;
  if(phone&&enabling&&(action==='pause'||action==='stop'||action==='seek'))video.pause();
  if(!follows){const result=applyCommand({scope,action,args,expectedRevision:null});connection?.publishState(); if(!result.ok)notice(commandNotice(result.error));return;}
  const expectedRevision=phone&&action==='projection'?state.revision:null;
  try{const id=connection.sendCommand(scope,action,args,{expectedRevision});pending={id,action,sent:performance.now()};refreshEnabled();}
  catch {remoteStatus('Disconnected');}
}
$('play').addEventListener('click',async()=>{
  if(!canControl()||pending||enabling)return;
  const current=generation;
  let previewReady=video.readyState>=3;
  if((phone||follows)&&!armed&&video.paused){
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
$('recenter').addEventListener('click',requestRecenter);
for(const id of ['projection','lens','fov','yaw','pitch'])$(id).addEventListener('change',()=>issue('projection',{
  mode:state.projection,lens:state.lens,fov:state.fov,yaw:state.yaw,pitch:state.pitch,
  [id==='projection'?'mode':id]:id==='projection'?$(id).value:Number($(id).value)
},'player.view'));

async function disconnect({quiet=false,recoveringTransport=false}={}){
  clearQueuedLens();
  ++generation;clearInterval(heartbeat);clearTimeout(connectDeadline);clearTimeout(retryTimer);retryTimer=undefined;
  pending=undefined;synced=false;samples=[];lastStateAt=0;recenterAfterPing=false;paired=false;
  const old=connection,oldTransport=transport,wasFollowing=follows;connection=undefined;transport=undefined;
  if(!session)follows=false;
  if(!wasFollowing){
    if(old&&!recoveringTransport)localPause();
    document.body.dataset.peers='0';
  } else {
    video.pause();
    if(follows)state={...state,anchor:{...state.anchor,playing:false}};
    else {lastAnchor=-1;renderState(model.snapshot());}
  }
  const restoreFocus=document.activeElement===$('stop');
  $('stop').hidden=!session;refreshEnabled();
  if(restoreFocus&&$('stop').hidden)$(phone?'hide-controls':'send-beacon').focus();
  if(!quiet)remoteStatus('Disconnected');
  // Recovery closes the lanes without an authenticated end-of-session message.
  if(wasFollowing&&recoveringTransport)await oldTransport?.stop();
  await old?.close({notify:!recoveringTransport});
}
function beginRemote(selected,role){
  follows=role==='controller';
  if(follows&&state.anchor.playing)localPause();
  if(phone)video.muted=follows;
  $('role-label').textContent=follows?'Controller':'Viewer';
  session=selected;retryAttempt=0;everPaired=false;
  if(navigator.onLine)void startRemote();
  else remoteStatus('Waiting for network');
}
function endRemote({quiet=false}={}){
  session=undefined;everPaired=false;
  if(follows&&$('notice').textContent==='Tap Enter VR on the headset')notice('');
  if(phone){video.muted=true;$('role-label').textContent='Controller';}
  else $('role-label').textContent='Viewer';
  if(!follows&&state.xr==='requested'){++xrAttempt;setXR('windowed');}
  return disconnect({quiet});
}
function failPairing(text){
  void endRemote({quiet:true});
  remoteStatus(text);
  const visible=pairing.fail(text);
  if(phone&&!visible)notice(text);
}
function scheduleRetry(){
  if(retryTimer||recovering||transport||!session||!navigator.onLine||(phone&&document.hidden))return;
  if(retryAttempt>=(everPaired?6:2)){
    failPairing(everPaired?'Connection lost. Pair again.':'Pairing timed out. Try again.');
    return;
  }
  remoteStatus('Reconnecting');
  retryTimer=setTimeout(()=>{
    retryTimer=undefined;
    if(session&&navigator.onLine&&(!phone||!document.hidden))void startRemote();
  },Math.min(15000,1000*2**retryAttempt++));
}
async function recoverRemote(){
  if(recovering||!session)return;
  const selected=session;
  recovering=true;
  try {await disconnect({quiet:true,recoveringTransport:true});}
  finally {
    recovering=false;
    if(session&&session!==selected&&navigator.onLine)void startRemote();
    else scheduleRetry();
  }
}
function received(event){
  const next=validateState(event.detail.state);
  lastStateAt=performance.now();renderState(next);refreshEnabled();scheduleLens();
}
async function startRemote(){
  if(transport||recovering||!session)return;
  const current=++generation;
  if(follows){
    state={...model.snapshot(),revision:0};
    lastAnchor=-1;lastStateAt=0;synced=false;samples=[];
  }
  const t=new VdoNinjaTransport({role:follows?'controller':'target',room:session.room,sharedSecret:session.password,streamId:session.streamId,label:'Immersive video viewer'});
  let controlWindow=performance.now(),controlCount=0,stateWindow=controlWindow,stateCount=0;
  // Bound inbound work before the protocol's async receive queue.
  if(follows){
    t.addEventListener('controlmessage',e=>{const now=performance.now();if(now-controlWindow>1000){controlWindow=now;controlCount=0;}if(++controlCount>40){e.stopImmediatePropagation();if(transport===t)failPairing('Connection closed');}});
    t.addEventListener('statemessage',e=>{const now=performance.now();if(now-stateWindow>1000){stateWindow=now;stateCount=0;}if(++stateCount>80)e.stopImmediatePropagation();});
  }
  const options={transport:t,sessionId:session.room,sharedSecret:session.secret,applyCommand:applyRemoteCommand,getState:()=>model.snapshot()};
  const c=follows?new BRSPConnection({...options,role:'controller',requestedScopes:SCOPES}):new TargetGroup({...options,grantedScopes:SCOPES.filter(scope=>scope!=='player.xr'||(!phone&&navigator.xr?.requestSession))});
  transport=t;connection=c;$('stop').hidden=false;
  let signalingFailed=false;
  const active=()=>generation===current&&connection===c;
  t.addEventListener('signalingfailed',()=>{
    if(!active())return;
    signalingFailed=true;
    if(c.phase!=='ready')void recoverRemote();
  });
  t.addEventListener('targetconflict',()=>{if(active())void recoverRemote();});
  t.addEventListener('status',e=>{
    if(!active()||paired||e.detail.error)return;
    const status={connecting:'Connecting',discoverable:'Waiting',discovering:'Finding selected viewer','connecting-peer':'Connecting','peer-open':'Verifying pairing'}[e.detail.phase];
    if(status)remoteStatus(status);
  });
  t.addEventListener('quality',e=>{if(active()){document.body.dataset.route=e.detail.route;document.body.dataset.rtt=String(e.detail.rttMs??'unknown');}});
  const onState=e=>{
    if(!active())return;
    try{received(e);confirmPairing();}
    catch{failPairing('Invalid viewer state');}
  };
  c.addEventListener('state',onState);c.addEventListener('snapshot',onState);
  c.addEventListener('ready',()=>{
    if(!active())return;
    remoteStatus('Synchronizing');
    if(follows){enablePhonePreview();sendClockPing();}
    else c.publishState();
  });
  if(!follows){
    c.addEventListener('peercount',event=>{
      if(!active())return;document.body.dataset.peers=String(event.detail.count);
      if(event.detail.count)return;
      paired=false;refreshEnabled();remoteStatus(everPaired?'Reconnecting':'Waiting');
      if(signalingFailed)void recoverRemote();
    });
    c.addEventListener('peerended',()=>{if(active()&&everPaired)void endRemote();});
  }
  c.addEventListener('commandapplied',e=>{
    if(!active()||pending?.id!==e.detail.commandId)return;
    const sent=pending.sent,action=pending.action;pending=undefined;
    if(action==='ping'&&e.detail.ok){
      const result=e.detail.result,receivedAt=performance.now();
      if(result?.sentAt!==sent||!Number.isFinite(result.receivedAt)||receivedAt-sent>5000){void recoverRemote();return;}
      samples.push({sent,received:receivedAt,target:result.receivedAt});if(samples.length>8)samples.shift();
      offset=clockOffset(samples);synced=true;
      confirmPairing();
      if(samples.length<4)setTimeout(()=>{if(active())sendClockPing();},100);
    } else if(action==='confirm-pairing'){
      if(!e.detail.ok){failPairing('Pairing confirmation failed');return;}
      paired=everPaired=true;clearTimeout(connectDeadline);retryAttempt=0;
      remoteStatus('Connected');notice('');
    } else if(!e.detail.ok)notice(commandNotice(e.detail.error));
    else {
      if(action==='recenter')view?.recenter();
      if(action!=='request-vr')notice('');
    }
    refreshEnabled();
    if(recenterAfterPing){recenterAfterPing=false;issue('recenter',{},'player.view');}
    scheduleLens();
  });
  c.addEventListener('peerclose',event=>{
    if(!active()||!follows)return;
    if(event.detail.reason==='Peer ended the session.'){
      if(everPaired)void endRemote();
      else failPairing('The viewer ended pairing');
      return;
    }
    void recoverRemote();
  });
  // A reserved controller slot can close the lanes before BRSP attaches.
  t.addEventListener('peerclose',()=>{if(active()&&follows)void recoverRemote();});
  c.addEventListener('protocolerror',event=>{
    if(!active())return;
    if(event.detail.message==='Reliable control lane is unavailable or backpressured.'){void recoverRemote();return;}
    failPairing('Pairing verification failed');
  });
  function sendInternal(action,args,sent){
    try{
      const id=c.sendCommand('player.transport',action,args);
      if(active()){pending={id,action,sent};refreshEnabled();}
    }catch{void recoverRemote();}
  }
  function sendClockPing(){
    if(!active()||pending||c.phase!=='ready'||(synced&&enabling))return;
    const sent=performance.now();lastPing=sent;
    sendInternal('ping',{sentAt:sent},sent);
  }
  function confirmPairing(){
    if(!active()||!follows||paired||pending||samples.length<4||!hasFreshState()||c.phase!=='ready')return;
    sendInternal('confirm-pairing',{},performance.now());
  }
  if(follows)connectDeadline=setTimeout(()=>{
    if(!active()||paired)return;
    void recoverRemote();
  },12000);
  heartbeat=setInterval(()=>{
    if(!active())return;
    if(!follows)c.publishState();
    else {
      const now=performance.now();
      if(pending&&now-pending.sent>5000){void recoverRemote();return;}
      if(c.phase==='ready'&&!hasFreshState())video.pause();
      if(c.phase==='ready'&&now-(lastStateAt||c.readyAt)>5000){void recoverRemote();return;}
      if(c.phase==='ready'&&now-lastPing>10000)sendClockPing();
      confirmPairing();
    }
    refreshEnabled();
  },250);
  try{await t.start();}
  catch{if(active())void recoverRemote();}
}
$('stop').addEventListener('click',()=>{pairing.stop();void endRemote();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);remoteStatus('Copied');}catch{$('invite-link').select();remoteStatus('Copy link');}});

function syncMedia(){
  updatePhoneStatus();
  if(enabling||(!phone&&!armed))return;
  const now=targetNow(),stale=follows&&(!paired||connection?.phase!=='ready'||!hasFreshState());
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
video.addEventListener('playing',()=>{
  if((phone||armed)&&state.anchor.playing){
    if($('notice').textContent==='Buffering')notice('');
    markPlaybackStarted();
  }
});
video.addEventListener('loadedmetadata',()=>{if(Number.isFinite(video.duration)){model.state.duration=video.duration;if(!follows)renderState(model.snapshot());}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=performance.now();if(follows)video.pause();else if(state.anchor.playing&&!view?.renderer.xr.isPresenting){localPause();notice('Paused');}}
  else {
    if(armed){lastAnchor=-1;try{void navigator.wakeLock?.request('screen').then(lock=>{wakeLock=lock;});}catch{/* Optional */}}
    if(transport&&session&&((follows&&everPaired&&!hasFreshState())||(!follows&&!connection.size&&performance.now()-hiddenAt>5000)))void recoverRemote();
    else scheduleRetry();
  }
});
window.addEventListener('offline',()=>{if(session)void recoverRemote();});
window.addEventListener('online',scheduleRetry);
window.addEventListener('pagehide',()=>{pairing.stop();clearInterval(mediaTimer);void endRemote({quiet:true});void wakeLock?.release();view?.dispose();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
renderState(state);
video.preload='auto';video.src=video.dataset.src;video.load();
refreshEnabled();

}
