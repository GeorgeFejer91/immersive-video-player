import { test, expect } from '@playwright/test';

test('viewer opens the Affect Tracker accordion and applies a validated placement to the panorama', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/media/jona.mp4', route => route.abort());
  await page.goto('./?role=viewer');
  const summary = page.getByText('Affect Tracker', { exact: true });
  await expect(summary).toBeVisible({ timeout: 3000 });
  await summary.press('Enter');
  await expect(page.locator('#connection-settings')).not.toHaveAttribute('open');
  const visible = page.getByRole('checkbox', { name: 'Show Flubber' });
  const azimuth = page.getByRole('spinbutton', { name: 'Azimuth (°)' });
  const elevation = page.getByRole('spinbutton', { name: 'Elevation (°)' });
  const diameter = page.getByRole('spinbutton', { name: 'Diameter (°)' });
  await expect(azimuth).toHaveValue('0');
  await expect(elevation).toHaveValue('-15');
  await expect(diameter).toHaveValue('9');

  const captureStage = () => page.locator('#stage canvas').screenshot();
  const baseline = (await captureStage()).toString('base64');
  const flubber = async () => {
    const current = (await captureStage()).toString('base64');
    return page.evaluate(async ({ baseline, current }) => {
      const pixels = async encoded => {
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const { width, height } = image;
        const context = new OffscreenCanvas(width, height).getContext('2d');
        context.drawImage(image, 0, 0);
        image.close();
        return context.getImageData(0, 0, width, height);
      };
      const { data: before } = await pixels(baseline);
      const { data, width, height } = await pixels(current);
      let left = width, right = -1, top = height, bottom = -1;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.max(Math.abs(data[i] - before[i]), Math.abs(data[i + 1] - before[i + 1]),
          Math.abs(data[i + 2] - before[i + 2])) < 40) continue;
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      return right < 0 ? null : {
        x: (left + right) / (2 * width),
        y: (top + bottom) / (2 * height),
        width: right - left + 1
      };
    }, { baseline, current });
  };

  expect(await flubber()).toBeNull();
  await visible.check();
  await expect.poll(flubber).toMatchObject({
    x: expect.closeTo(0.5, 1),
    y: expect.closeTo(0.66, 1)
  });
  const initial = await flubber();

  const upload = async placement => {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON' }).click();
    await (await chooser).setFiles({
      name: 'placement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(placement))
    });
  };
  const placement = {
    schema: 'immersive-video-player-affect-placement', version: 1,
    azimuthDegrees: 20, elevationDegrees: 10, angularDiameterDegrees: 15
  };
  await upload(placement);
  await expect(azimuth).toHaveValue('20');
  await expect(elevation).toHaveValue('10');
  await expect(diameter).toHaveValue('15');
  await expect.poll(async () => (await flubber())?.x).toBeGreaterThan(0.61);
  const moved = await flubber();
  expect(moved.y).toBeLessThan(0.44);
  expect(moved.width).toBeGreaterThan(initial.width * 1.4);

  await upload({ ...placement, angularDiameterDegrees: 200 });
  await expect(page.locator('#affect-import-status')).toContainText('Diameter');
  await expect(diameter).toHaveValue('15');
  await visible.uncheck();
  await expect.poll(flubber).toBeNull();
});

test('immersive Flubber faces the moving eyes and responds to the right thumbstick during playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const gl = WebGL2RenderingContext.prototype;
    const locations = new WeakSet();
    const getLocation = gl.getUniformLocation;
    const setMatrix = gl.uniformMatrix4fv;
    gl.getUniformLocation = function (program, name) {
      const location = getLocation.call(this, program, name);
      if (location && name === 'modelViewMatrix') locations.add(location);
      return location;
    };
    gl.uniformMatrix4fv = function (location, transpose, matrix, ...rest) {
      if (locations.has(location) && Math.hypot(matrix[8], matrix[9], matrix[10]) < 0.9) {
        const offset = Array.from(matrix.slice(12, 15));
        const normal = Array.from(matrix.slice(8, 11));
        const dot = normal.reduce((sum, axis, index) => sum - axis * offset[index], 0);
        window.flubberTransform = { offset, facing: dot / (Math.hypot(...normal) * Math.hypot(...offset)) };
      }
      return setMatrix.call(this, location, transpose, matrix, ...rest);
    };
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args) {
      if (this.canvas.width === 256 && this.canvas.height === 256 && args[0] instanceof Path2D) {
        window.flubberTexture = this;
      }
      return fill.apply(this, args);
    };

    gl.makeXRCompatible = async () => {};
    window.XRWebGLBinding = undefined;
    window.XRWebGLLayer = class {
      framebuffer = null;
      framebufferWidth = 320;
      framebufferHeight = 240;
      getViewport() { return { x: 0, y: 0, width: 320, height: 240 }; }
    };
    window.eye = [0, 0, 0];
    window.rightStick = [0, 0, 0, 0];
    const focal = 1 / Math.tan(40 * Math.PI / 180);
    const projectionMatrix = new Float32Array([
      focal * 0.75, 0, 0, 0,
      0, focal, 0, 0,
      0, 0, -1.0002, -1,
      0, 0, -0.020002, 0
    ]);
    class Session extends EventTarget {
      inputSources = [
        { handedness: 'left', gamepad: { axes: [0, 0, 0, 1] } },
        { handedness: 'right', gamepad: { axes: window.rightStick } }
      ];
      updateRenderState() {}
      async requestReferenceSpace() { return {}; }
      requestAnimationFrame(callback) {
        return window.requestAnimationFrame(time => {
          const views = [-0.032, 0.032].map(offset => ({
            transform: { matrix: new DOMMatrix().translate(window.eye[0] + offset, window.eye[1], window.eye[2]).toFloat32Array() },
            projectionMatrix
          }));
          callback(time, { getViewerPose: () => ({ views }) });
        });
      }
      cancelAnimationFrame(id) { window.cancelAnimationFrame(id); }
      async end() { this.dispatchEvent(new Event('end')); }
    }
    Object.defineProperty(navigator, 'xr', { value: Object.assign(new EventTarget(), {
      requestSession: async () => new Session()
    }) });
  });

  await page.goto('./?launch=quest');
  await page.getByText('Affect Tracker', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show Flubber' }).check();
  await page.locator('#connection-settings summary').click();
  await page.waitForFunction(() => document.querySelector('video').readyState >= 3);
  await page.locator('#enter-vr').click();
  await expect(page.locator('body')).toHaveAttribute('data-xr', 'immersive');

  await page.evaluate(() => { window.flubberTransform = null; window.eye = [1, 0.3, -0.5]; });
  await expect.poll(() => page.evaluate(() => window.flubberTransform)).toMatchObject({
    offset: [expect.closeTo(-0.032, 2), expect.closeTo(-0.388, 2), expect.closeTo(-1.449, 2)],
    facing: expect.closeTo(1, 2)
  });
  await page.locator('#playback-settings summary').click();
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video.paused && !video.seeking && video.readyState >= 3;
  });
  await page.locator('#play').click();
  await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(0.1);

  const color = () => page.evaluate(() => Array.from(window.flubberTexture.getImageData(128, 128, 1, 1).data));
  expect(await color()).toEqual([183, 183, 183, 255]);
  await page.evaluate(() => { window.rightStick[3] = -1; });
  await expect.poll(color).toEqual([255, 209, 102, 255]);
  await page.evaluate(() => { window.rightStick[3] = 0; });
  await page.locator('#halt').click();
  await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeLessThan(0.1);
  expect(await color()).toEqual([255, 209, 102, 255]);
});
