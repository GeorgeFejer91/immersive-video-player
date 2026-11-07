import './style.css';
import { entryRoute, sharedSession } from './session-entry.js';
import { initInstallPrompt } from './install-app.js';

const route=entryRoute(location.href,{userAgent:navigator.userAgent});
// Remove obsolete invitation fragments without using them to create a room.
function clearFragment(){
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
}
clearFragment();
window.addEventListener('hashchange',clearFragment);
initInstallPrompt();
const [{initPlayer},session]=await Promise.all([import('./player-app.js'),sharedSession(location.href)]);
document.getElementById('player').hidden=false;
document.body.dataset.page=route.phone?'controller':'viewer';
initPlayer({...route,session});
