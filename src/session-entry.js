const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const beaconPattern=/^brsp_target_beacon_([a-f0-9]{24})$/;
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
async function digest(value){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}

export async function sharedSession(address){
  const suffix=hex((await digest(new URL('.',address).href)).slice(0,9));
  return {room:'brsp_beacons_'+suffix,secret:'public-jona-beacon-discovery-v1'};
}

export function createBeacon(){
  const streamId='brsp_target_beacon_'+hex(crypto.getRandomValues(new Uint8Array(12)));
  const code=Array.from(crypto.getRandomValues(new Uint8Array(12)),byte=>alphabet[byte&31]).join('');
  return {streamId,code:code.match(/.{4}/g).join('-')};
}

export function beaconName(streamId){
  const id=beaconPattern.exec(streamId)?.[1];
  if(id)return 'Viewer '+id.slice(0,6).toUpperCase();
}

export async function pairingSession(discovery,streamId,input){
  const code=input.toUpperCase().replace(/[\s-]/g,'');
  if(!beaconName(streamId)||code.length!==12||[...code].some(char=>!alphabet.includes(char)))throw new TypeError('Invalid pairing code');
  const key=discovery.room+'\n'+streamId+'\n'+code;
  const route=hex((await digest('Jona route\n'+key)).slice(0,18));
  return {room:'brsp_pair_'+route,streamId:'brsp_target_'+route,
    password:hex(await digest('Jona signaling\n'+key)),secret:hex(await digest('Jona proof\n'+key))};
}

export function entryRoute(address,{userAgent=''}={}){
  const params=new URL(address).searchParams;
  const launch=params.get('launch')==='quest';
  const role=params.get('role');
  if(role==='controller'||params.get('controller')==='1')return {phone:true,armOnVR:false};
  if(launch)return {phone:false,armOnVR:true};
  if(role==='viewer')return {phone:false,armOnVR:false};
  const quest=/OculusBrowser|Meta Quest|Mobile VR|\bQuest\b/i.test(userAgent);
  return {phone:!quest,armOnVR:quest};
}
