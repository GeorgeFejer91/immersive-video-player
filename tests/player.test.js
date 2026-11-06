import test from 'node:test';
import assert from 'node:assert/strict';
import { Player, positionAt, clockOffset, validateState, parseInvite, previewMatches } from '../src/player.js';

test('scheduled playback anchors both screens to the viewer timeline', () => {
  let now = 1000;
  const p = new Player(467.3, () => now);
  assert.equal(p.command('player.transport', 'play', { previewReady: true }, false).error, 'viewer_not_ready');
  const result = p.command('player.transport', 'play', { previewReady: true }, true);
  assert.equal(result.ok, true);
  assert.equal(p.state.anchor.at, 1500);
  assert.equal(positionAt(p.state, 1400), 0);
  assert.equal(positionAt(p.state, 2500), 1);
  now = 4500;
  p.command('player.transport', 'pause', {}, true);
  assert.equal(positionAt(p.state, 9000), 3);
});
test('reject malformed, out-of-scope and not-ready requests without mutation', () => {
  const p = new Player(467.3, () => 10);
  for (const [scope, action, args] of [
    ['player.transport', 'seek', { position: -1 }],
    ['player.transport', 'seek', { position: 500 }],
    ['player.transport', 'seek', { position: NaN }],
    ['player.transport', 'pause', { extra: 1 }],
    ['player.transport', 'play', { previewReady: false }],
    ['anything', 'pause', {}], ['player.transport', 'eval', {}],
    ['player.view', 'projection', { mode: 'fisheye', lens: 1, fov: 80, yaw: 0, pitch: 0 }]
  ]) {
    const before = structuredClone(p.state);
    assert.equal(p.command(scope, action, args, true).ok, false);
    assert.deepEqual(p.state, before);
  }
});
test('seek replaces an old scheduled start; pause/stop cannot restart later', () => {
  let now = 100;
  const p = new Player(467.3, () => now);
  p.command('player.transport', 'play', { previewReady: true }, true);
  p.command('player.transport', 'seek', { position: 40 }, true);
  assert.equal(positionAt(p.state, 100), 40);
  now = 900;
  p.command('player.transport', 'pause', {}, true);
  assert.equal(positionAt(p.state, 9000), 40.2);
  assert.equal(p.command('player.transport', 'ping', { sentAt: 77 }, true).result.receivedAt, 900);
});
test('clock uses the lowest RTT and rejects invalid clock/state data', () => {
  assert.equal(clockOffset([{ sent: 100, received: 140, target: 1120 }, { sent: 0, received: 1000, target: 900 }]), 1000);
  assert.throws(() => clockOffset([{ sent: 2, received: 1, target: 0 }]));
  const p = new Player(467.3, () => 0);
  assert.equal(validateState(p.snapshot()).duration, 467.3);
  assert.throws(() => validateState({ ...p.snapshot(), volume: Infinity }));
  assert.throws(() => validateState({ ...p.snapshot(), projection: 'remote-url' }));
});
test('pairing parser accepts only bounded fragment invitations, never arbitrary origins', () => {
  const secret = 'a'.repeat(32);
  assert.deepEqual(parseInvite('#room=brsp_abcdefgh&secret=' + secret), { room: 'brsp_abcdefgh', secret });
  assert.throws(() => parseInvite('#room=brsp_abcdefgh&secret=1234'));
  assert.throws(() => parseInvite('#room=brsp_abcdefgh&secret=' + secret + '&action=play'));
});

test('Stop resets the shared timeline and cancels a scheduled start',()=>{
  let now=100;const p=new Player(467.3,()=>now);
  p.command('player.transport','seek',{position:100},true);
  p.command('player.transport','play',{previewReady:true},true);
  now=200;
  assert.equal(p.command('player.transport','stop',{},true).ok,true);
  assert.equal(p.state.anchor.playing,false);
  assert.equal(positionAt(p.state,9000),0);
  const before=p.snapshot();
  assert.equal(p.command('player.transport','stop',{position:10},true).ok,false);
  assert.deepEqual(p.snapshot(),before);
});

test('preview sync requires ready media, matching transport and a bounded position difference',()=>{
  const p=new Player(467.3,()=>100);
  const video={readyState:4,seeking:false,paused:true,currentTime:0};
  assert.equal(previewMatches(p.state,100,video),true);
  assert.equal(previewMatches(p.state,100,{...video,currentTime:1}),false);
  assert.equal(previewMatches(p.state,100,{...video,readyState:2}),false);
  assert.equal(previewMatches(p.state,100,{...video,seeking:true}),false);
  p.command('player.transport','play',{previewReady:true},true);
  assert.equal(previewMatches(p.state,200,video),true); // Waiting for the scheduled anchor.
  assert.equal(previewMatches(p.state,2000,{...video,paused:false,currentTime:1.4}),true);
  assert.equal(previewMatches(p.state,2000,{...video,paused:true,currentTime:1.4}),false);
});
