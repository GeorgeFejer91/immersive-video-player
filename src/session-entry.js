const beaconPattern=/^brsp_target_approve_[a-f0-9]{24}$/;
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
export const randomHex=length=>hex(crypto.getRandomValues(new Uint8Array(length)));
async function digest(value){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}

export async function sharedSession(address){
  const suffix=hex((await digest(new URL('.',address).href)).slice(0,9));
  return {room:'brsp_approvals_'+suffix,secret:'public-jona-beacon-approval-v1'};
}

export function createBeacon(){
  return 'brsp_target_approve_'+randomHex(12);
}

export function isBeacon(streamId){
  return typeof streamId==='string'&&beaconPattern.test(streamId);
}

export async function pairingSession(discovery,streamId,secret){
  if(!isBeacon(streamId)||typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new TypeError('Invalid pairing approval');
  const key=discovery.room+'\n'+streamId+'\n'+secret;
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
