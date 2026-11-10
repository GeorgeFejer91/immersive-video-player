const SCHEMA = 'immersive-video-player-affect-placement';
const RADIUS_METRES = 1.5;

export const AFFECT_PLACEMENT_FIELDS = [
  { name: 'azimuthDegrees', label: 'Azimuth', min: -180, max: 180 },
  { name: 'elevationDegrees', label: 'Elevation', min: -80, max: 80 },
  { name: 'angularDiameterDegrees', label: 'Diameter', min: 1, max: 30 }
];

export const DEFAULT_AFFECT_PLACEMENT = Object.freeze({
  azimuthDegrees: 0,
  elevationDegrees: -15,
  angularDiameterDegrees: 9
});

export function parseAffectPlacement(json) {
  let profile;
  try {
    profile = JSON.parse(json);
  } catch {
    throw new Error('Choose a valid placement JSON file.');
  }
  if (profile?.schema !== SCHEMA || profile.version !== 1 ||
      Object.keys(profile).length !== AFFECT_PLACEMENT_FIELDS.length + 2) {
    throw new Error('Expected an Affect Tracker placement profile, version 1.');
  }
  const placement = {};
  for (const { name, label, min, max } of AFFECT_PLACEMENT_FIELDS) {
    const value = profile[name];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${label} must be between ${min}° and ${max}°.`);
    }
    placement[name] = value;
  }
  return placement;
}

export function resolveAffectPlacement({ azimuthDegrees, elevationDegrees, angularDiameterDegrees }) {
  const azimuth = azimuthDegrees * Math.PI / 180;
  const elevation = elevationDegrees * Math.PI / 180;
  const horizontal = RADIUS_METRES * Math.cos(elevation);
  return {
    offset: [horizontal * Math.sin(azimuth), RADIUS_METRES * Math.sin(elevation), -horizontal * Math.cos(azimuth)],
    diameter: 2 * RADIUS_METRES * Math.tan(angularDiameterDegrees * Math.PI / 360)
  };
}
