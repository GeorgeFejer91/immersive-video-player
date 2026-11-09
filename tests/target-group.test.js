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
async function join(network,group,index,key=secret){
  const lane=network.connect('phone_'+index);
  const connection=new BRSPConnection({transport:lane,role:'controller',sessionId:'session_12345678',sharedSecret:key,requestedScopes:['player.transport']});
  const ready=once(connection,key===secret?'ready':'protocolerror');
  const accepted=key===secret?once(group,'ready'):once(group,'peercount',event=>event.count===0);
  lane.open();await Promise.all([ready,accepted]);return connection;
}
test('one controller keeps its slot until it leaves',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],applyCommand:command=>model.command(command.scope,command.action,command.args,true),getState:()=>model.snapshot()});
  try{
    const first=await join(network,group,1);
    const waiting=network.connect('phone_2');
    waiting.open();
    assert.equal(network.clients.has('phone_2'),false);
    assert.equal(group.size,1);
    const applied=once(first,'commandapplied');
    first.sendCommand('player.transport','seek',{position:120},{expectedRevision:null});
    assert.equal((await applied).ok,true);
    await first.close();
    assert.equal(group.size,0);
    const replacement=await join(network,group,2);
    assert.equal(group.size,1);
    const stopped=once(replacement,'commandapplied');
    replacement.sendCommand('player.transport','stop',{},{expectedRevision:null});
    assert.equal((await stopped).ok,true);
    assert.equal(model.state.anchor.position,0);
  }finally{await group.close();}
});
test('wrong invitation isolates the failing peer and concurrent commands are serialized',async()=>{
  const network=new Network(),model=new Player(467.3);let active=0,maxActive=0;
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:async command=>{
    active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,5));
    const result=model.command(command.scope,command.action,command.args,true);active--;return result;
  }});
  await join(network,group,3,'wrong-high-entropy-secret-12345678');
  const first=await join(network,group,1);
  assert.equal(group.size,1);assert.equal(first.phase,'ready');
  const idA=first.sendCommand('player.transport','seek',{position:50},{expectedRevision:null});
  const idB=first.sendCommand('player.transport','seek',{position:100},{expectedRevision:null});
  const [a,b]=await Promise.all([once(first,'commandapplied',result=>result.commandId===idA),once(first,'commandapplied',result=>result.commandId===idB)]);
  assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(maxActive,1);assert.equal(model.state.revision,2);
  await group.close();
});
test('a flooding controller releases the slot for a healthy phone',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:command=>model.command(command.scope,command.action,command.args,true)});
  const first=await join(network,group,1);
  const removed=once(group,'peererror',event=>event.reason==='rate_limit');
  for(let i=0;i<41;i++)emit(network,'controlmessage',{peerKey:'phone_1',data:'invalid'});
  await removed;assert.equal(group.size,0);assert.equal(first.phase,'disconnected');
  const second=await join(network,group,2);
  assert.equal(group.size,1);assert.equal(second.phase,'ready');
  const applied=once(second,'commandapplied');second.sendCommand('player.transport','seek',{position:90},{expectedRevision:null});
  assert.equal((await applied).ok,true);assert.equal(model.state.anchor.position,90);
  await group.close();
});
test('recoverable host teardown closes lanes without telling phones the session ended',async()=>{
  const network=new Network(),model=new Player(467.3);
  const group=new TargetGroup({transport:network,sessionId:'session_12345678',sharedSecret:secret,grantedScopes:['player.transport'],getState:()=>model.snapshot(),applyCommand:()=>{}});
  const phone=await join(network,group,1),closed=once(phone,'peerclose'),sent=[];
  const send=network.sendControl.bind(network);network.sendControl=(key,data)=>{sent.push(data);return send(key,data);};
  await group.close({notify:false});
  assert.equal(sent.length,0);assert.notEqual((await closed).reason,'Peer ended the session.');assert.equal(group.size,0);
});
