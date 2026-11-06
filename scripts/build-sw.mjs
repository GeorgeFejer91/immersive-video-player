import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Explicit shell allow-list: never enumerate media, downloads or arbitrary URLs.
const files=['index.html','manifest.webmanifest','icons/controller-180.png','icons/controller-192.png','icons/controller-512.png','vendor/vdoninja/1.5.5/vdoninja-sdk.min.js',
  ...(await readdir('dist/assets')).filter(name=>/\.(js|css)$/.test(name)).map(name=>'assets/'+name)];
const hash=createHash('sha256');
for(const file of files)hash.update(file).update(await readFile('dist/'+file));
const version=hash.digest('hex').slice(0,16);
await writeFile('dist/sw.js',`// Generated application shell. No media, query URLs or invitations are cached.
const ROOT=self.registration.scope;
const PREFIX='ivp-shell-'+encodeURIComponent(new URL(ROOT).pathname)+'-';
const CACHE=PREFIX+'${version}';
const SHELL=${JSON.stringify(files)}.map(path=>new URL(path,ROOT).href);
const INDEX=new URL('index.html',ROOT).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
// Activate naturally after older clients close; never replace a playing session.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name))))));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||request.headers.has('range')||url.origin!==new URL(ROOT).origin)return;
  if(request.mode==='navigate'&&(url.pathname===new URL(ROOT).pathname||url.href.split('?')[0]===INDEX)){
    // Fetch the canonical shell, retaining route selection in the browser address only.
    event.respondWith(fetch(INDEX,{cache:'no-cache'}).then(response=>{
      if(response.ok)return response;
      throw new Error('Shell unavailable');
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match(INDEX))));
  }else if(!url.search&&SHELL.includes(url.href)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.href))||fetch(request)));
  }
});
`);
console.log('Application shell:',files.length,'files, version',version);
