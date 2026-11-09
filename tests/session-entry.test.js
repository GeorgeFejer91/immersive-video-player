import test from 'node:test';
import assert from 'node:assert/strict';
import { entryRoute, sharedSession, createBeacon, beaconName, pairingSession } from '../src/session-entry.js';

const base='https://example.org/player/';
const quest='Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/39.2 Mobile VR Safari/537.36';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1';

test('one public URL opens the controller on desktop and phone and the viewer on Quest',()=>{
  assert.deepEqual(entryRoute(base),{phone:true,armOnVR:false});
  assert.deepEqual(entryRoute(base,{userAgent:iphone}),{phone:true,armOnVR:false});
  assert.deepEqual(entryRoute(base,{userAgent:quest}),{phone:false,armOnVR:true});
});

test('legacy role aliases still route devices without using the invitation fragment',()=>{
  assert.deepEqual(entryRoute(base+'?launch=quest#old-invitation'),{phone:false,armOnVR:true});
  assert.deepEqual(entryRoute(base+'?role=viewer'),{phone:false,armOnVR:false});
  assert.deepEqual(entryRoute(base+'?controller=1#old-invitation',{userAgent:quest}),{phone:true,armOnVR:false});
  assert.deepEqual(entryRoute(base+'?join=1#invalid'),entryRoute(base));
});

test('the same deployment has one rendezvous across query strings and fragments',async()=>{
  const session=await sharedSession(base);
  assert.deepEqual(await sharedSession(base+'?launch=quest#old-invitation'),session);
  assert.deepEqual(await sharedSession(base+'index.html'),session);
  assert.notEqual((await sharedSession('https://example.org/preview/')).room,session.room);
  assert.notEqual((await sharedSession('http://localhost:4174/player/')).room,session.room);
});


test('beacon names identify invitations without exposing the private pairing code',async()=>{
  const discovery=await sharedSession(base), beacon=createBeacon();
  assert.notEqual(createBeacon().streamId,beacon.streamId);
  assert.match(beaconName(beacon.streamId),/^Viewer [A-F0-9]{6}$/);
  assert.equal(beaconName('brsp_target_legacy'),undefined);
  assert.equal(beacon.streamId.includes(beacon.code),false);
  const paired=await pairingSession(discovery,beacon.streamId,beacon.code);
  assert.deepEqual(await pairingSession(discovery,beacon.streamId,beacon.code.toLowerCase()),paired);
  assert.notEqual(paired.room,discovery.room);
  assert.notEqual(paired.secret,discovery.secret);
  assert.notEqual((await pairingSession(discovery,beacon.streamId,beacon.code==='2222-2222-2222'?'3333-3333-3333':'2222-2222-2222')).room,paired.room);
  await assert.rejects(pairingSession(discovery,beacon.streamId,'1234'));
});
