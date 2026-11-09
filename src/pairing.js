import { createBeacon, isBeacon, pairingSession, randomHex } from './session-entry.js';
import { VdoNinjaTransport } from './remote/vdo-ninja-transport.js';

const decoder=new TextDecoder();
function readMessage(data){
  if(typeof data!=='string'&&!(data instanceof ArrayBuffer))return;
  if((typeof data==='string'?data.length:data.byteLength)>256)return;
  try{
    const message=JSON.parse(typeof data==='string'?data:decoder.decode(data));
    if(typeof message?.id==='string'&&/^[a-f0-9]{24}$/.test(message.id))return message;
  }catch{/* Ignore malformed rendezvous messages. */}
}

export function initPairing({discovery,begin,end,prepareTarget,focusAfterPair}){
  const $=id=>document.getElementById(id);
  const actions=$('beacon-actions'),allow=$('allow-pair');
  let active;
  const status=(flow,text)=>{
    if(flow.status.textContent!==text)flow.status.textContent=text;
  };
  function releaseTransport(flow){
    clearTimeout(flow.retry);
    const previous=flow.transport;
    flow.transport=undefined;
    void previous?.stop();
  }
  function stop(){
    const flow=active;
    active=undefined;
    if(!flow)return;
    clearTimeout(flow.deadline);
    releaseTransport(flow);
    allow.hidden=true;
    flow.dialog.close();
  }
  function fail(text){
    if(!active)return false;
    clearTimeout(active.deadline);
    releaseTransport(active);
    active.request=undefined;
    allow.hidden=true;
    status(active,text);
    return true;
  }
  function cancel(){
    stop();
    end();
  }
  function createTransport(flow,streamId){
    const t=new VdoNinjaTransport({
      role:flow.role,room:discovery.room,sharedSecret:discovery.secret,streamId,autoSelect:false
    });
    flow.transport=t;
    return t;
  }
  function send(t,peer,message){
    return t.sendControl(peer,JSON.stringify(message));
  }

  async function transmit(flow){
    const streamId=createBeacon(),t=createTransport(flow,streamId);
    const current=()=>active===flow&&flow.transport===t;
    flow.streamId=streamId;
    status(flow,'Starting beacon…');
    t.addEventListener('controlmessage',event=>{
      if(!current())return;
      const {peerKey,data}=event.detail;
      if(flow.request?.peer===peerKey)return;
      const message=readMessage(data);
      if(flow.handoff||flow.request||message?.type!=='request'||message.beacon!==streamId){
        t.closePeer(peerKey);
        return;
      }
      if(!send(t,peerKey,{type:'waiting',id:message.id})){t.closePeer(peerKey);return;}
      flow.request={id:message.id,peer:peerKey};
      status(flow,'A browser wants to control playback.');
      allow.hidden=false;
    });
    t.addEventListener('peerclose',event=>{
      if(!current()||flow.handoff||flow.request?.peer!==event.detail.peerKey)return;
      flow.request=undefined;
      allow.hidden=true;
      status(flow,'Waiting for a browser…');
    });
    const failed=()=>{if(current()&&!flow.handoff)fail('Beacon unavailable. Close and try again.');};
    t.addEventListener('signalingfailed',failed);
    try{
      await t.start();
      if(current()&&!flow.request)status(flow,'Waiting for a browser…');
    }catch{failed();}
  }

  async function scan(flow){
    if(active!==flow)return;
    const t=createTransport(flow);
    const current=()=>active===flow&&flow.transport===t;
    let beacon,peer,id;
    status(flow,'Searching for beacons…');
    function retry(){
      if(!current())return;
      if(beacon)flow.recent.set(beacon,Date.now()+12000);
      releaseTransport(flow);
      flow.retry=setTimeout(()=>void scan(flow),500);
    }
    function select(){
      if(!current()||beacon||t.phase!=='discovering')return;
      for(const [candidate,until] of flow.recent)if(until<=Date.now())flow.recent.delete(candidate);
      beacon=[...t.sources.keys()].find(candidate=>isBeacon(candidate)&&!flow.recent.has(candidate));
      if(!beacon)return;
      clearTimeout(flow.retry);
      status(flow,'Requesting approval…');
      flow.retry=setTimeout(retry,10000);
      void t.selectTarget(beacon).catch(retry);
    }
    t.addEventListener('status',select);
    t.addEventListener('signalingfailed',retry);
    t.addEventListener('peeropen',event=>{
      if(!current()||!beacon||peer)return;
      peer=event.detail.peerKey;id=randomHex(12);
      if(!send(t,peer,{type:'request',id,beacon}))retry();
    });
    t.addEventListener('peerclose',retry);
    t.addEventListener('controlmessage',async event=>{
      if(!current()||!id||event.detail.peerKey!==peer)return;
      const message=readMessage(event.detail.data);
      if(message?.id!==id)return;
      if(message.type==='waiting'){
        clearTimeout(flow.retry);
        status(flow,'Waiting for approval…');
      } else if(message.type==='approved'&&typeof message.secret==='string'&&/^[a-f0-9]{64}$/.test(message.secret)){
        flow.handoff=true;
        releaseTransport(flow);
        status(flow,'Connecting…');
        try{
          const session=await pairingSession(discovery,beacon,message.secret);
          if(active===flow)begin(session,'controller');
        }catch{if(active===flow)fail('Pairing failed. Close and try again.');}
      }
    });
    try{
      await t.start();
      select();
      if(current()&&!beacon)flow.retry=setTimeout(retry,5000);
    }catch{retry();}
  }

  function open(role){
    end();
    const dialog=$(role==='target'?'beacon-dialog':'scan-dialog');
    const flow={role,dialog,status:dialog.querySelector('[role=status]'),recent:new Map()};
    active=flow;
    dialog.showModal();
    flow.deadline=setTimeout(()=>{
      if(active!==flow)return;
      end();fail('Pairing expired. Close and try again.');
    },120000);
    if(role==='target')void transmit(flow);
    else void scan(flow);
  }
  $('send-beacon').addEventListener('click',()=>open('target'));
  $('scan-beacons').addEventListener('click',()=>open('controller'));
  for(const name of ['beacon','scan']){
    $(name+'-dialog').addEventListener('cancel',event=>{event.preventDefault();cancel();});
    $('cancel-'+name).addEventListener('click',cancel);
  }
  allow.addEventListener('click',async()=>{
    const flow=active,request=flow?.request,t=flow?.transport;
    if(!request||!t||flow.handoff)return;
    allow.hidden=true;
    $('cancel-beacon').focus();
    prepareTarget();
    const secret=randomHex(32);
    try{
      const session=await pairingSession(discovery,flow.streamId,secret);
      if(active!==flow||flow.transport!==t||flow.request!==request)return;
      if(!send(t,request.peer,{type:'approved',id:request.id,secret})){
        t.closePeer(request.peer);
        flow.request=undefined;
        status(flow,'Waiting for a browser…');
        return;
      }
      flow.handoff=true;
      status(flow,'Connecting…');
      begin(session,'target');
    }catch{if(active===flow)fail('Pairing failed. Close and try again.');}
  });

  return {
    status(text){if(active?.handoff)status(active,text);},
    fail,
    connected(value){
      if(actions.hidden===value)return;
      const moveFocus=actions.contains(document.activeElement)||Boolean(active);
      actions.hidden=value;
      if(value){
        stop();
        if(moveFocus)focusAfterPair();
      }
    },
    stop
  };
}
