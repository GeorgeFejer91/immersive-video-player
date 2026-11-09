import test from 'node:test';
import assert from 'node:assert/strict';
import { entryRoute, sharedSession } from '../src/session-entry.js';

const base='https://example.org/player/';
const quest='Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/39.2 Mobile VR Safari/537.36';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1';

test('one public URL opens the controller on desktop and phone and the viewer on Quest',()=>{
  assert.deepEqual(entryRoute(base),{phone:true,autoConnect:true});
  assert.deepEqual(entryRoute(base,{userAgent:iphone}),{phone:true,autoConnect:true});
  assert.deepEqual(entryRoute(base,{userAgent:quest}),{phone:false,autoConnect:true});
});

test('legacy role aliases still route devices without using the invitation fragment',()=>{
  assert.deepEqual(entryRoute(base+'?launch=quest#old-invitation'),{phone:false,autoConnect:true});
  assert.deepEqual(entryRoute(base+'?role=viewer'),{phone:false,autoConnect:false});
  assert.deepEqual(entryRoute(base+'?controller=1#old-invitation',{userAgent:quest}),{phone:true,autoConnect:true});
  assert.deepEqual(entryRoute(base+'?join=1#invalid'),entryRoute(base));
});

test('the same deployment has one rendezvous across query strings and fragments',async()=>{
  const session=await sharedSession(base);
  assert.deepEqual(await sharedSession(base+'?launch=quest#old-invitation'),session);
  assert.deepEqual(await sharedSession(base+'index.html'),session);
  assert.notEqual((await sharedSession('https://example.org/preview/')).streamId,session.streamId);
  assert.notEqual((await sharedSession('http://localhost:4174/player/')).room,session.room);
});
