import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRole, sessionLinks, entryRoute } from '../src/session-entry.js';

const pairing={room:'brsp_abcdefgh12345678',secret:'a'.repeat(43)};
const quest='Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 OculusBrowser/39.2 Mobile VR Safari/537.36';
const android='Mozilla/5.0 (Linux; Android 16; Pixel 9) Chrome/143 Mobile Safari/537.36';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1';
test('same session QR routes Quest before Android phone hints and supports XR capability',()=>{
  assert.equal(chooseRole({userAgent:quest}),'viewer');
  assert.equal(chooseRole({userAgent:android}),'controller');
  assert.equal(chooseRole({userAgent:iphone}),'controller');
  assert.equal(chooseRole({userAgent:'Macintosh',immersiveSupported:true}),'viewer');
  assert.equal(chooseRole({userAgent:'Mozilla/5.0 Windows NT'}),null);
});
test('manual role beats hints and all links preserve the same fragment-only bearer',()=>{
  const links=sessionLinks('https://example.org/player/?ignored=1#ignored',pairing);
  for(const link of Object.values(links)){
    const url=new URL(link);assert.equal(url.pathname,'/player/');assert.equal(url.searchParams.has('secret'),false);
    assert.equal(new URLSearchParams(url.hash.slice(1)).get('secret'),pairing.secret);
    assert.equal(new URLSearchParams(url.hash.slice(1)).get('room'),pairing.room);
  }
  assert.equal(entryRoute(links.viewer,{userAgent:iphone}).role,'viewer');
  assert.equal(entryRoute(links.controller,{userAgent:quest}).role,'controller');
  assert.equal(entryRoute(links.join,{userAgent:quest}).role,'viewer');
  assert.equal(entryRoute(links.join,{userAgent:iphone}).role,'controller');
  assert.deepEqual(entryRoute(links.join,{userAgent:'Windows'}).pairing,pairing);
  assert.equal(entryRoute(links.join,{userAgent:'Windows'}).role,null);
});
test('root is a launcher; old explicit links work; malformed invitations fail closed',()=>{
  assert.equal(entryRoute('https://example.org/player/').role,null);
  assert.equal(entryRoute('https://example.org/player/?role=viewer').role,'viewer');
  assert.equal(entryRoute('https://example.org/player/?controller=1').role,'controller');
  assert.throws(()=>entryRoute('https://example.org/player/?join=1#room=bad&secret=short'));
  assert.throws(()=>entryRoute('https://example.org/player/?join=1'));
  assert.throws(()=>sessionLinks('https://example.org/',{...pairing,room:'invalid'}));
});
