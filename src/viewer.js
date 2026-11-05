import * as THREE from 'three';

// A ray-to-source shader: the circular fisheye source is dewarped, not stretched onto equirectangular UVs.
export function createViewer(stage, video) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(80, 1, .01, 100);
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  const uniforms = { film: { value: texture }, mode: { value: 0 }, lens: { value: 270 * Math.PI / 180 },
    yaw: { value: 0 }, pitch: { value: 0 } };
  const material = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms,
    vertexShader: `varying vec3 ray; void main(){ ray=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `precision highp float; uniform sampler2D film; uniform int mode; uniform float lens; uniform float yaw; uniform float pitch; varying vec3 ray;
    void main(){
      vec3 d=normalize(ray); float cy=cos(yaw), sy=sin(yaw); d=vec3(cy*d.x-sy*d.z,d.y,sy*d.x+cy*d.z);
      float cp=cos(pitch),sp=sin(pitch); d=vec3(d.x,cp*d.y-sp*d.z,sp*d.y+cp*d.z);
      vec2 uv; float pi=3.14159265359;
      if(mode==0){ float theta=acos(clamp(-d.z,-1.0,1.0)); float radius=theta/lens;
        if(radius>0.5){ gl_FragColor=vec4(0.,0.,0.,1.);return; }
        float len=length(d.xy); uv=vec2(.5)+ (len<.00001?vec2(0.):d.xy/len)*radius;
      } else if(mode==1 || mode==2){ float angle=atan(d.x,-d.z); float span=mode==1?2.0*pi:pi;
        if(abs(angle)>span*.5){gl_FragColor=vec4(0.,0.,0.,1.);return;}
        uv=vec2(.5+angle/span,.5+asin(clamp(d.y,-1.,1.))/pi);
      } else { if(d.z>=0.0){gl_FragColor=vec4(0.,0.,0.,1.);return;}
        uv=vec2(.5)+d.xy/(-d.z)*.65; if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
      }
      gl_FragColor=sRGBTransferEOTF(texture2D(film,uv));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 40), material); scene.add(sphere);
  let longitude = 0, latitude = 0, drag, xrBase = 0, lastRecenter = 0;
  const resize = () => { const r=stage.getBoundingClientRect(); renderer.setSize(r.width,r.height); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(stage);
  stage.addEventListener('pointerdown', e => { drag={ x:e.clientX,y:e.clientY,lon:longitude,lat:latitude }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if(drag){longitude=drag.lon-(e.clientX-drag.x)*.003;latitude=THREE.MathUtils.clamp(drag.lat+(e.clientY-drag.y)*.003,-1.4,1.4);} });
  stage.addEventListener('pointerup', () => { drag=undefined; });
  stage.addEventListener('pointercancel', () => { drag=undefined; });
  stage.addEventListener('keydown', e => { if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return; e.preventDefault(); longitude+=(e.key==='ArrowLeft'?.08:e.key==='ArrowRight'?-.08:0); latitude=THREE.MathUtils.clamp(latitude+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0),-1.4,1.4); });
  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) camera.quaternion.setFromEuler(new THREE.Euler(-latitude, longitude, 0, 'YXZ'));
    // Keep the sphere centered at the eyes even when the wearer walks.
    if(renderer.xr.isPresenting){renderer.xr.updateCamera(camera);rig.updateWorldMatrix(true,false);sphere.position.copy(renderer.xr.getCamera().position).applyMatrix4(rig.matrixWorld);}
    else camera.getWorldPosition(sphere.position);
    renderer.render(scene,camera);
  });
  renderer.xr.addEventListener('sessionend',()=>{xrBase=0;rig.rotation.y=0;longitude=0;latitude=0;});
  function recenter() {
    if(renderer.xr.isPresenting){ const e=new THREE.Euler().setFromQuaternion(renderer.xr.getCamera().quaternion,'YXZ'); xrBase=-e.y; rig.rotation.y=xrBase; }
    else { longitude=0;latitude=0; }
  }
  return {
    renderer,
    update(state) { uniforms.mode.value=['fisheye','equirect360','equirect180','flat'].indexOf(state.projection); uniforms.lens.value=THREE.MathUtils.degToRad(state.lens); uniforms.yaw.value=THREE.MathUtils.degToRad(state.yaw); uniforms.pitch.value=THREE.MathUtils.degToRad(state.pitch); if(camera.fov!==state.fov){camera.fov=state.fov;camera.updateProjectionMatrix();} if(state.recenter!==lastRecenter){lastRecenter=state.recenter;recenter();} },
    async enterVR() { if(!navigator.xr || !await navigator.xr.isSessionSupported('immersive-vr')) throw new Error('Open this page in a WebXR headset browser to enter VR.');
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }); await renderer.xr.setSession(session); },
    dispose() { observer.disconnect();renderer.setAnimationLoop(null);renderer.dispose();material.dispose();sphere.geometry.dispose();texture.dispose(); }
  };
}
