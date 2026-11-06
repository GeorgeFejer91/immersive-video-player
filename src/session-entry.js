import { parseInvite } from './player.js';

// Device hints choose a layout, never identity, authorization or WebXR support.
export function chooseRole({ userAgent='', mobile=false, immersiveSupported=false }={}) {
  if (/OculusBrowser|Meta Quest|Mobile VR|\bQuest\b/i.test(userAgent) || immersiveSupported) return 'viewer';
  if (mobile || /iPhone|iPad|iPod|Android|\bMobi/i.test(userAgent)) return 'controller';
  return null;
}

export function entryRoute(address, hints={}) {
  const url=new URL(address);
  const role=url.searchParams.get('role');
  const explicit=role==='viewer'||role==='controller'?role:url.searchParams.get('controller')==='1'?'controller':null;
  const pairing=url.hash?parseInvite(url.hash):undefined;
  if(url.searchParams.get('join')==='1'&&!pairing)throw new TypeError('Missing session invitation');
  return { role:explicit||(pairing?chooseRole(hints):null), pairing };
}

export function sessionLinks(address, invitation) {
  const pairing=parseInvite('#'+new URLSearchParams(invitation));
  const base=new URL(address);
  if(!['https:','http:'].includes(base.protocol))throw new TypeError('Unsupported site origin');
  const link=search=>{const url=new URL(base);url.search=search;url.hash=new URLSearchParams(pairing).toString();return url.href;};
  return { join:link('?join=1'),viewer:link('?role=viewer'),controller:link('?controller=1') };
}
