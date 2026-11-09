import { BRSPConnection } from './brsp.js';

function emit(target,type,detail){
  const event=new Event(type);Object.defineProperty(event,'detail',{value:detail});target.dispatchEvent(event);
}

class PeerTransport extends EventTarget {
  constructor(parent,key,onFlood){
    super();this.parent=parent;this.key=key;this.onFlood=onFlood;
    this.windowAt=performance.now();this.controls=0;this.states=0;
  }
  receive(type,detail){
    const now=performance.now();
    if(now-this.windowAt>=1000){this.windowAt=now;this.controls=this.states=0;}
    if(type==='controlmessage'&&++this.controls>40){this.onFlood();return;}
    if(type==='statemessage'&&++this.states>80)return;
    emit(this,type,detail);
  }
  sendControl(key,data){return !this.silent&&key===this.key&&this.parent.sendControl(key,data);}
  sendState(key,data){return key===this.key&&this.parent.sendState(key,data);}
  closePeer(key){if(key===this.key)this.parent.closePeer(key);}
  async stop(){
    this.parent.closePeer(this.key);
  }
}

export class TargetGroup extends EventTarget {
  constructor({transport,sessionId,sharedSecret,grantedScopes,applyCommand,getState}){
    super();this.transport=transport;this.peers=new Map();this.closed=false;this.queue=Promise.resolve();this.queued=0;
    this.options={sessionId,sharedSecret,grantedScopes,getState};this.applyCommand=applyCommand;this.getState=getState;
    this.openPeer=event=>this.addPeer(event.detail.peerKey);
    transport.addEventListener('peeropen',this.openPeer);
    this.handlers=new Map();
    for(const type of ['controlmessage','statemessage','peerclose']){
      const handler=event=>this.peers.get(event.detail.peerKey)?.lane.receive(type,event.detail);
      this.handlers.set(type,handler);transport.addEventListener(type,handler);
    }
  }
  get size(){let count=0;for(const {connection} of this.peers.values())if(connection.phase==='ready')count++;return count;}
  get phase(){return this.closed?'closed':this.size?'ready':'waiting-for-peer';}
  addPeer(key){
    if(this.closed||typeof key!=='string'||!key||key.length>128||this.peers.has(key))return;
    if(this.peers.size){this.transport.closePeer(key);return;}
    const lane=new PeerTransport(this.transport,key,()=>this.removePeer(key,'rate_limit'));
    const connection=new BRSPConnection({...this.options,transport:lane,role:'target',applyCommand:command=>this.applyOrdered(key,command)});
    const deadline=setTimeout(()=>this.removePeer(key,'authentication_timeout'),10000);
    this.peers.set(key,{connection,lane,deadline});
    connection.addEventListener('ready',()=>{
      if(this.closed||!this.peers.has(key))return;
      clearTimeout(deadline);this.publishState();emit(this,'ready',{peerKey:key,count:this.size});
      emit(this,'peercount',{count:this.size});
    });
    connection.addEventListener('command',event=>{
      this.publishState();emit(this,'command',{...event.detail,peerKey:key});
    });
    connection.addEventListener('peerclose',event=>{
      this.removePeer(key,'disconnected');
      if(event.detail.reason==='Peer ended the session.')emit(this,'peerended',{peerKey:key});
    });
    connection.addEventListener('protocolerror',()=>this.removePeer(key,'authentication_or_protocol_error'));
    void connection.attachPeer({peerKey:key}).catch(()=>this.removePeer(key,'channel_unavailable'));
  }
  applyOrdered(key,command){
    const reject=error=>({ok:false,revision:this.getState().revision,result:null,error});
    if(this.closed||this.queued>=128)return Promise.resolve(reject(this.closed?'session_closed':'busy'));
    this.queued++;
    const result=this.queue.then(()=>{
      if(this.closed||this.peers.get(key)?.connection.phase!=='ready')return reject('session_closed');
      return this.applyCommand(command);
    });
    this.queue=result.then(()=>undefined,()=>undefined);
    return result.finally(()=>{this.queued--;});
  }
  publishState(){
    if(this.closed)return false;
    let sent=false;
    for(const {connection} of this.peers.values())if(connection.phase==='ready')sent=connection.publishState()||sent;
    return sent;
  }
  removePeer(key,reason){
    const peer=this.peers.get(key);if(!peer)return;
    this.peers.delete(key);clearTimeout(peer.deadline);
    void peer.connection.close();emit(this,'peercount',{count:this.size});
    if(reason!=='disconnected')emit(this,'peererror',{reason,peerKey:key});
  }
  async close({notify=true}={}){
    if(this.closed)return;
    this.closed=true;this.transport.removeEventListener('peeropen',this.openPeer);
    for(const [type,handler] of this.handlers)this.transport.removeEventListener(type,handler);
    const peers=[...this.peers.values()];this.peers.clear();
    for(const peer of peers){clearTimeout(peer.deadline);peer.lane.silent=!notify;}
    await Promise.all(peers.map(peer=>peer.connection.close()));
    await this.transport.stop();emit(this,'peercount',{count:0});
  }
}
