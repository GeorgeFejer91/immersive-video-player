import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import { resolveAffectPlacement } from './affect-placement.js';
import { buildFlubberPath, clamp, createProfiles, createProjectionOffsets, DEFAULT_AFFECT_PALETTE } from './vendor/affect-tracker/math.js';

const TEXTURE_RADIUS = 1.8;
const STICK_DEAD_ZONE = 0.15;
const RATING_SPEED = 0.8;

function thumbstick(inputSources) {
  let fallback;
  for (const source of inputSources ?? []) {
    const axes = source.gamepad?.axes;
    if (!axes || axes.length < 4) continue;
    if (source.handedness === 'right') return axes;
    fallback ??= axes;
  }
  return fallback;
}

function stickAxis(value) {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.max(0, Math.abs(clamp(value)) - STICK_DEAD_ZONE);
  return Math.sign(value) * magnitude / (1 - STICK_DEAD_ZONE);
}

export function createAffectOverlay(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(mesh);

  const profiles = createProfiles();
  const offsets = createProjectionOffsets('immersive-video-player');
  const offset = new Vector3();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let valence = 0, arousal = 0, phase = 0, lastTime, lastDraw = -Infinity;
  let drawnValence, drawnArousal, drawnReducedMotion;

  return {
    get visible() { return mesh.visible; },
    setPlacement(placement, enabled) {
      const { offset: coordinates, diameter } = resolveAffectPlacement(placement);
      offset.set(...coordinates);
      mesh.position.copy(offset);
      mesh.lookAt(0, 0, 0);
      mesh.scale.setScalar(diameter * TEXTURE_RADIUS);
      mesh.visible = enabled;
      if (!enabled) lastTime = undefined;
    },
    update(time, eye, inputSources) {
      mesh.position.copy(eye).add(offset);
      const dt = clamp((time - (lastTime ?? time)) / 1000, 0, 0.05);
      lastTime = time;
      const axes = thumbstick(inputSources);
      if (axes) {
        valence = clamp(valence + stickAxis(axes[2]) * RATING_SPEED * dt);
        arousal = clamp(arousal - stickAxis(axes[3]) * RATING_SPEED * dt);
      }
      phase = (phase + dt * (1.5 + arousal) * 2 * Math.PI) % (2 * Math.PI);
      const still = reducedMotion.matches;
      if (time - lastDraw < 1000 / 30 ||
          (still && drawnReducedMotion && valence === drawnValence && arousal === drawnArousal)) return;
      lastDraw = time;
      drawnValence = valence;
      drawnArousal = arousal;
      drawnReducedMotion = still;
      const { path, color } = buildFlubberPath({
        profiles, offsets, x: valence, y: arousal, phase: still ? 0 : phase,
        palette: DEFAULT_AFFECT_PALETTE, reducedMotion: still
      });
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      const scale = canvas.width / (2 * TEXTURE_RADIUS);
      context.scale(scale, scale);
      const outline = new Path2D(path);
      context.fillStyle = color;
      context.fill(outline);
      context.strokeStyle = '#fffffff0';
      context.lineWidth = 0.035;
      context.stroke(outline);
      context.restore();
      texture.needsUpdate = true;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    }
  };
}
