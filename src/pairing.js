import { beaconName, createBeacon, pairingSession } from './session-entry.js';
import { VdoNinjaTransport } from './remote/vdo-ninja-transport.js';

export function initPairing({phone,discovery,begin,end,focusAfterPair}){
  const $=id=>document.getElementById(id);
  const trigger=$(phone?'scan-beacons':'send-beacon'),dialog=$(phone?'scan-dialog':'beacon-dialog');
  const status=$(phone?'scan-status':'beacon-status'),list=$('beacons'),form=$('scan-form');
  const inputs=$('scan-fields'),code=$('pairing-code');
  let transport,refreshing,deadline,refreshTimer,joining=false,revision=0,retryMessage='';
  const setStatus=text=>{if(status.textContent!==text)status.textContent=text;};

  function updateBeacons(){
    const selected=list.value;
    const sources=[...transport.sources.keys()].filter(id=>beaconName(id));
    if(sources.join()!==[...list.options].slice(1).map(option=>option.value).join()){
      list.replaceChildren(new Option('Choose a viewer',''),...sources.map(id=>new Option(beaconName(id),id)));
      if(sources.includes(selected))list.value=selected;
    }
    inputs.disabled=joining||!sources.length;
    if(!joining)setStatus(retryMessage||(sources.length?'Select a viewer and enter its code.':'Searching for beacons…'));
  }

  function stopDiscovery(){
    clearTimeout(deadline);clearTimeout(refreshTimer);
    ++revision;
    const previous=transport;transport=undefined;
    void previous?.stop();void refreshing?.stop();refreshing=undefined;
    joining=false;retryMessage='';code.value='';$('beacon-code').textContent='';$('beacon-name').textContent='';
  }

  function cancel(){
    stopDiscovery();
    end();
    dialog.close();
  }

  function fail(text){
    joining=false;retryMessage=text;
    if(!phone)stopDiscovery();
    else if(transport){updateBeacons();if(dialog.open&&!inputs.disabled)code.focus();}
    setStatus(text);
    return dialog.open;
  }

  function createDiscovery(beacon){
    return new VdoNinjaTransport({
      role:phone?'controller':'target',room:discovery.room,sharedSecret:discovery.secret,
      streamId:beacon?.streamId,discoveryOnly:true
    });
  }

  function watch(t){
    const changed=()=>{if(transport===t&&phone)updateBeacons();};
    t.addEventListener('status',event=>{if(!event.detail.error)changed();});
    t.addEventListener('sourceschanged',changed);
    t.addEventListener('signalingfailed',()=>{
      if(transport!==t)return;
      stopDiscovery();end();inputs.disabled=true;setStatus('Signaling failed. Close and try again.');
    });
  }

  function scheduleRefresh(current){
    if(revision!==current)return;
    // A fresh room join is authoritative even when the SDK omits departures.
    refreshTimer=setTimeout(async()=>{
      const next=createDiscovery();
      refreshing=next;
      try{
        await next.start();
        if(revision!==current)return;
        const previous=transport;transport=next;
        watch(next);updateBeacons();
        void previous.stop();
      }catch{/* Keep the last list while a fresh join is unavailable. */}
      finally{
        if(transport!==next)void next.stop();
        if(refreshing===next)refreshing=undefined;
        scheduleRefresh(current);
      }
    },5000);
  }

  async function open(){
    end();
    dialog.showModal();
    setStatus(phone?'Searching for beacons…':'Starting beacon…');
    list.replaceChildren(new Option('Choose a viewer',''));inputs.disabled=true;
    const beacon=phone?null:createBeacon();
    if(beacon){
      $('beacon-name').textContent=beaconName(beacon.streamId);
      $('beacon-code').textContent=beacon.code;
    }
    const current=++revision;
    const t=createDiscovery(beacon);
    transport=t;
    deadline=setTimeout(()=>{
      stopDiscovery();end();inputs.disabled=true;
      setStatus(phone?'Scan expired. Close and scan again.':'Beacon expired. Close and send a new one.');
    },120000);
    const active=()=>transport===t;
    const failed=()=>{
      if(!active())return;
      stopDiscovery();end();inputs.disabled=true;setStatus('Signaling failed. Close and try again.');
    };
    watch(t);
    try{
      if(beacon){
        const session=await pairingSession(discovery,beacon.streamId,beacon.code);
        if(revision!==current)return;
        begin(session);
      }
      await t.start();
      if(phone)scheduleRefresh(current);
      else if(active())setStatus('Beacon active. Scan on your controller.');
    }catch{failed();}
  }

  trigger.addEventListener('click',()=>void open());
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
  $(phone?'cancel-scan':'cancel-beacon').addEventListener('click',cancel);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const id=list.value;
    if(!phone||joining||!transport?.sources.has(id))return;
    const current=revision;
    joining=true;retryMessage='';inputs.disabled=true;setStatus('Connecting to '+beaconName(id)+'…');
    try{
      const session=await pairingSession(discovery,id,code.value);
      if(revision===current)begin(session);
    }catch{
      if(revision!==current)return;
      fail('Check the code shown on the viewer.');
    }
  });

  return {
    status(text){
      if(!dialog.open||(phone&&!joining))return;
      setStatus(!phone&&text==='Waiting'&&transport?.phase==='discoverable'?'Beacon active. Scan on your controller.':text);
    },
    fail,
    connected(value){
      if(trigger.hidden===value)return;
      const moveFocus=document.activeElement===trigger||dialog.open;
      trigger.hidden=value;
      if(value){
        stopDiscovery();
        dialog.close();
        if(moveFocus)focusAfterPair();
      }
    },
    stop(){stopDiscovery();dialog.close();}
  };
}
