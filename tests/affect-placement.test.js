import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAffectPlacement, resolveAffectPlacement } from '../src/affect-placement.js';

const profile = {
  schema: 'immersive-video-player-affect-placement',
  version: 1,
  azimuthDegrees: 90,
  elevationDegrees: -30,
  angularDiameterDegrees: 20
};

test('radial placement uses right and up in degrees at a fixed radius', () => {
  const placement = parseAffectPlacement(JSON.stringify(profile));
  const { offset, diameter } = resolveAffectPlacement(placement);
  assert.ok(Math.abs(offset[0] - 1.2990381057) < 1e-9);
  assert.ok(Math.abs(offset[1] + 0.75) < 1e-9);
  assert.ok(Math.abs(offset[2]) < 1e-9);
  assert.ok(Math.abs(diameter - 0.5289809421) < 1e-9);
});

test('placement import rejects unknown fields, versions and invalid angles', () => {
  for (const patch of [
    { script: 'anything' },
    { version: 2 },
    { schema: 'affect-research-xr-layout' },
    { azimuthDegrees: '90' },
    { elevationDegrees: 90 },
    { angularDiameterDegrees: 0 }
  ]) {
    assert.throws(() => parseAffectPlacement(JSON.stringify({ ...profile, ...patch })));
  }
  assert.throws(() => parseAffectPlacement('{"version":1}'));
  assert.throws(() => parseAffectPlacement('['));
});
