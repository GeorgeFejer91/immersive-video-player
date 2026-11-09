export async function sharedSession(address){
  const site=new URL('.',address);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(site.href));
  const suffix=Array.from(new Uint8Array(digest,0,9),byte=>byte.toString(16).padStart(2,'0')).join('');
  // All participants can compute these values from the site URL.
  return {room:'brsp_jona_'+suffix,streamId:'brsp_target_'+suffix,secret:'public-jona-playback-rendezvous-v1'};
}

export function entryRoute(address,{userAgent=''}={}){
  const params=new URL(address).searchParams;
  const launch=params.get('launch')==='quest';
  const role=params.get('role');
  if(role==='controller'||params.get('controller')==='1')return {phone:true,autoConnect:true};
  if(launch)return {phone:false,autoConnect:true};
  if(role==='viewer')return {phone:false,autoConnect:false};
  const quest=/OculusBrowser|Meta Quest|Mobile VR|\bQuest\b/i.test(userAgent);
  return {phone:!quest,autoConnect:true};
}
