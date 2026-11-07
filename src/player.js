export const MODES = ['fisheye', 'equirect360', 'equirect180', 'flat'];
export const JONA_LENS = 240;
export const SCOPES = ['player.transport', 'player.view'];
const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const shape = (v, keys) => v && Object.getPrototypeOf(v) === Object.prototype &&
  Object.keys(v).sort().join(',') === [...keys].sort().join(',');

export function positionAt(state, now) {
  const { position, at, playing } = state.anchor;
  return Math.min(state.duration, Math.max(0, position + (playing ? Math.max(0, now - at) / 1000 : 0)));
}

export function previewMatches(state, now, video) {
  const position=positionAt(state,now);
  const paused=!state.anchor.playing||now<state.anchor.at||position>=state.duration;
  return video.readyState>=3&&!video.seeking&&video.paused===paused&&Math.abs(video.currentTime-position)<=.35;
}

export class Player {
  constructor(duration, now = () => performance.now()) {
    this.now = now;
    this.state = { revision: 0, duration, projection: 'fisheye', lens: JONA_LENS, fov: 80,
      yaw: 0, pitch: 0, volume: 1, recenter: 0,
      anchor: { position: 0, at: now(), playing: false, generation: 0 } };
  }
  snapshot() { return structuredClone(this.state); }
  command(scope, action, args, viewerReady = false) {
    const s = this.state, now = this.now();
    const reject = error => ({ ok: false, revision: s.revision, result: null, error });
    if (!SCOPES.includes(scope)) return reject('scope_denied');
    if (scope === 'player.transport' && action === 'ping') {
      if (!shape(args, ['sentAt']) || !finite(args.sentAt, 0, Number.MAX_SAFE_INTEGER)) return reject('invalid_argument');
      return { ok: true, revision: s.revision, result: { sentAt: args.sentAt, receivedAt: now }, error: null };
    }
    let change;
    if (scope === 'player.transport' && action === 'play') {
      if (!shape(args, ['previewReady']) || args.previewReady !== true) return reject('preview_not_ready');
      if (!viewerReady) return reject('viewer_not_ready');
      change = { anchor: { position: positionAt(s, now) >= s.duration ? 0 : positionAt(s, now), at: now + 500,
        playing: true, generation: s.anchor.generation + 1 } };
    } else if (scope === 'player.transport' && (action === 'pause'||action === 'stop')) {
      if (!shape(args, [])) return reject('invalid_argument');
      change = { anchor: { position: action==='stop'?0:positionAt(s, now), at: now, playing: false, generation: s.anchor.generation + 1 } };
    } else if (scope === 'player.transport' && action === 'seek') {
      if (!shape(args, ['position']) || !finite(args.position, 0, s.duration)) return reject('invalid_argument');
      change = { anchor: { position: args.position, at: now + (s.anchor.playing ? 600 : 0),
        playing: s.anchor.playing, generation: s.anchor.generation + 1 } };
    } else if (scope === 'player.transport' && action === 'volume') {
      if (!shape(args, ['volume']) || !finite(args.volume, 0, 1)) return reject('invalid_argument');
      change = { volume: args.volume };
    } else if (scope === 'player.view' && action === 'lens') {
      if (!shape(args, ['lens']) || !finite(args.lens, 180, 360)) return reject('invalid_argument');
      change = { lens: args.lens };
    } else if (scope === 'player.view' && action === 'projection') {
      if (!shape(args, ['mode', 'lens', 'fov', 'yaw', 'pitch']) || !MODES.includes(args.mode) ||
        !finite(args.lens, 180, 360) || !finite(args.fov, 45, 110) || !finite(args.yaw, -180, 180) || !finite(args.pitch, -90, 90)) return reject('invalid_argument');
      change = { projection: args.mode, lens: args.lens, fov: args.fov, yaw: args.yaw, pitch: args.pitch };
    } else if (scope === 'player.view' && action === 'recenter') {
      if (!shape(args, [])) return reject('invalid_argument');
      change = { recenter: s.recenter + 1 };
    } else return reject('unsupported_command');
    Object.assign(s, change, { revision: s.revision + 1 });
    return { ok: true, revision: s.revision, result: { at: now }, error: null };
  }
}

export function validateState(s) {
  if (!shape(s, ['revision','duration','projection','lens','fov','yaw','pitch','volume','recenter','anchor']) ||
    !Number.isSafeInteger(s.revision) || s.revision < 0 || !Number.isSafeInteger(s.recenter) || s.recenter < 0 ||
    !finite(s.duration, 0.01, 86400) || !MODES.includes(s.projection) || !finite(s.lens,180,360) ||
    !finite(s.fov,45,110) || !finite(s.yaw,-180,180) || !finite(s.pitch,-90,90) || !finite(s.volume,0,1) ||
    !shape(s.anchor, ['position','at','playing','generation']) || !finite(s.anchor.position,0,s.duration) ||
    !finite(s.anchor.at,0,Number.MAX_SAFE_INTEGER) || typeof s.anchor.playing !== 'boolean' ||
    !Number.isSafeInteger(s.anchor.generation) || s.anchor.generation < 0) throw new TypeError('Invalid player state');
  return structuredClone(s);
}

export function clockOffset(samples) {
  const valid = samples.filter(s => [s.sent,s.received,s.target].every(Number.isFinite) && s.received >= s.sent && s.received - s.sent <= 5000);
  if (!valid.length) throw new TypeError('No valid clock samples');
  const best = valid.reduce((a,b) => a.received-a.sent < b.received-b.sent ? a : b);
  return best.target - (best.sent + best.received) / 2;
}

export function parseInvite(fragment) {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  if (params.size !== 2 || !params.has('room') || !params.has('secret')) throw new TypeError('Invalid invitation');
  const room = params.get('room'), secret = params.get('secret');
  if (!/^brsp_[A-Za-z0-9_]{8,64}$/.test(room) || !/^[A-Za-z0-9_-]{32,96}$/.test(secret)) throw new TypeError('Invalid invitation');
  return { room, secret };
}
