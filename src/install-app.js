let dismissInstall=()=>{};
export function markPlaybackStarted(){dismissInstall();}

export function initInstallPrompt(){
  const button=document.getElementById('install-app'),dialog=document.getElementById('install-help');
  const quest=/Quest|OculusBrowser/i.test(navigator.userAgent);
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  const standalone=matchMedia('(display-mode: standalone)');
  const needsViewer=quest&&new URL(location.href).searchParams.get('launch')!=='quest';
  document.getElementById('shortcut-viewer').hidden=!needsViewer;
  let prompt,dismissed=false;
  button.textContent=quest?'Add to library':'Install app';
  document.getElementById('install-instructions').textContent=quest
    ?(needsViewer?'First select Open viewer below. Then open the Quest Browser menu (⋯) and choose Add this page to your library. The shortcut opens the viewer with a fresh phone QR.':'Open the Quest Browser menu (⋯), then choose Add this page to your library. The shortcut opens the viewer with a fresh phone QR.')
    :ios?'In Safari, open Share, then Add to Home Screen. Reopen your session link after installing to connect to the headset.'
    :'Open the browser menu and choose Install app or Add to Home Screen. Reopen your session link after installing to connect to the headset.';
  dismissInstall=()=>{
    dismissed=true;prompt=undefined;
    const restore=document.activeElement===button||dialog.contains(document.activeElement);
    if(dialog.open)dialog.close();button.hidden=true;
    if(restore)['pause','headset-status','open-viewer','stage'].map(id=>document.getElementById(id)).find(el=>el?.checkVisibility()&&!el.matches(':disabled'))?.focus();
  };
  if(standalone.matches||navigator.standalone)dismissInstall();
  standalone.addEventListener?.('change',event=>{if(event.matches)dismissInstall();});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();if(!dismissed&&!quest)prompt=event;});
  window.addEventListener('appinstalled',dismissInstall);
  button.addEventListener('click',async()=>{
    if(prompt){
      const offered=prompt;prompt=undefined;
      try {const result=await offered.prompt();if((result||await offered.userChoice)?.outcome==='accepted')dismissInstall();}
      catch {if(!dismissed)dialog.showModal();}
    }else dialog.showModal();
  });
  // No invitation or video is persisted. Only the versioned application shell is cached.
  if(import.meta.env.PROD&&'serviceWorker' in navigator){
    void navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
  }
}
