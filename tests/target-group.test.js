import test from 'node:test';
import assert from 'node:assert/strict';
import { BRSPConnection } from '../src/remote/brsp.js';
import { TargetGroup } from '../src/remote/target-group.js';
import { Player } from '../src/player.js';

const emit=(target,type,detail)=>{const event=new Event(type);Object.defineProperty(event,'detail',{value:detail});target.dispatchEvent(event);};
const once=(target,type,predicate=()=>true)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Timed out: '+type)),3000);
  const handler=event=>{if(!predicate(event.detail))return;clearTimeout(timer);target.removeEventListener(type,handler);resolve(event.detail);};
  target.addEventListener(type,handler);
});
class Network extends EventTarget {
  clients=new Map();
  sendControl(key,data){const client=this.clients.get(key);if(!client)return false;queueMicrotask(()=>emit(client,'controlmessage',{peerKey:key,data}));return true;}
  sendState(key,data){const client=this.clients.get(key);if(!client)return false;queueMicrotask(()=>emit(client,'statemessage',{peerKey:key,data}));return true;}
  closePeer(key){const client=this.clients.get(key);this.clients.delete(key);if(client)queueMicrotask(()=>emit(client,'peerclose',{peerKey:key}));}
  async stop(){for(const key of this.clients.keys())this.closePeer(key);}
  connect(key){
    const client=new EventTarget();this.clients.set(key,client);
    client.sendControl=(peerKey,data)=>{if(!this.clients.has(key))return false;queueMicrotask(()=>emit(this,'controlmessage',{peerKey,data}));return true;};
    client.sendState=(peerKey,data)=>{queueMicrotask(()=>emit(this,'statemessage',{peerKey,data}));return true;};
    client.closePeer=()=>{this.clients.delete(key);emit(this,'peerclose',{peerKey:key});};
    client.stop=async()=>client.closePeer();
    client.open=()=>{emit(this,'peeropen',{peerKey:key});emit(client,'peeropen',{peerKey:key});};
    return client;
  }
}
const secret='a-high-entropy-invitation-secret-12345678';
async function join(network,index,key=secret){
  const lane=network.connect('phone_'+index);
  const connection=new BRSPConnection({transport:lane,role:'controller',sessionId:'session_12345678',sharedSecret:key,requestedScopes:['player.transport']});
  const ready=once(connection,key===secret?'ready':'protocolerror');lane.open();await ready;return connection;
}
test('many authenticated controllers share one ordered state and departing peers do not revoke others',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],applyCommand:command=>model.command(command.scope,command.action,command.args,true),getState:()=>model.snapshot()});
  const phones=await Promise.all(Array.from({length:24},(_,i)=>join(network,i)));
  assert.equal(group.size,24);
  const snapshots=phones.map(phone=>once(phone,'state',frame=>frame.state.revision===1));
  const applied=once(phones[12],'commandapplied');phones[12].sendCommand('player.transport','seek',{position:120},{expectedRevision:null});
  assert.equal((await applied).ok,true);
  for(const state of await Promise.all(snapshots))assert.equal(state.state.anchor.position,120);
  await phones[0].close();assert.equal(group.size,23);assert.equal(group.phase,'ready');
  const second=once(phones[23],'commandapplied');phones[23].sendCommand('player.transport','stop',{}, {expectedRevision:null});
  assert.equal((await second).ok,true);assert.equal(model.state.anchor.position,0);
  const closed=phones.slice(1).map(phone=>once(phone,'peerclose'));await group.close();await Promise.all(closed);
  assert.equal(network.clients.size,0);assert.equal(group.size,0);
});
test('wrong invitation isolates the failing peer and concurrent commands are serialized',async()=>{
  const network=new Network(),model=new Player(467.3);let active=0,maxActive=0;
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:async command=>{
    active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,5));
    const result=model.command(command.scope,command.action,command.args,true);active--;return result;
  }});
  const first=await join(network,1),second=await join(network,2);
  await join(network,3,'wrong-high-entropy-secret-12345678');
  assert.equal(group.size,2);assert.equal(first.phase,'ready');
  const a=once(first,'commandapplied'),b=once(second,'commandapplied');
  first.sendCommand('player.transport','seek',{position:50},{expectedRevision:null});
  second.sendCommand('player.transport','seek',{position:100},{expectedRevision:null});
  assert.equal((await a).ok,true);assert.equal((await b).ok,true);assert.equal(maxActive,1);assert.equal(model.state.revision,2);
  await group.close();
});
test('a flooding controller is removed without blocking a healthy phone',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:command=>model.command(command.scope,command.action,command.args,true)});
  const first=await join(network,1),second=await join(network,2);
  const removed=once(group,'peererror',event=>event.reason==='rate_limit');
  for(let i=0;i<41;i++)emit(network,'controlmessage',{peerKey:'phone_1',data:'invalid'});
  await removed;assert.equal(group.size,1);assert.equal(first.phase,'disconnected');assert.equal(second.phase,'ready');
  const applied=once(second,'commandapplied');second.sendCommand('player.transport','seek',{position:90},{expectedRevision:null});
  assert.equal((await applied).ok,true);assert.equal(model.state.anchor.position,90);
  await group.close();
});
test('recoverable host teardown closes lanes without telling phones the session ended',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:()=>{}});
  const phone=await join(network,1),closed=once(phone,'peerclose'),sent=[];
  const send=network.sendControl.bind(network);network.sendControl=(key,data)=>{sent.push(data);return send(key,data);};
  await group.close({notify:false});
  assert.equal(sent.length,0);assert.notEqual((await closed).reason,'Peer ended the session.');assert.equal(group.size,0);
});
