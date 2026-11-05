# Immersive video player

Watch **Jona** in an immersive view, with your phone as the remote.

**[Open the viewer](https://georgefejer91.github.io/immersive-video-player/)**

1. Open the viewer in Meta Quest Browser or a desktop browser. Press **Enable playback** once.
2. Press **Enable phone remote**. Scan its QR on a smartphone or copy the controller link to it.
3. On the phone, press **Enable phone preview**, then **Connect to viewer**. Wait for pairing and clock synchronization.
4. On the headset press **Enter VR**. The wearer sees the film. On a desktop, drag or use arrow keys to look around.
5. Use the phone's **Play together**, Pause, seek, viewer volume, projection and recenter controls.

Any invited smartphone can control the viewer. One controller is active at a time. To hand over, the phone presses **End session**; the viewer pauses and waits for another invited phone. The viewer's **End session** revokes the invitation. Invitations expire after 30 minutes.

The phone preview is silent to avoid audio echo; sound plays on the viewer. Browsers require the initial local playback tap. Keep both pages awake. If the viewer buffers, playback pauses; press Play together when ready.

## How it works

The viewer is authoritative. A high-entropy invitation stays in the URL fragment and is removed from visible phone history. BRSP/1 proves both peers possess the pairing secret, negotiates player.transport/player.view scopes, and acknowledges validated commands. Pinned VDO.Ninja SDK 1.5.5 handles signaling and a single duplex data-only WebRTC connection. No camera, microphone, screen capture or video broadcast is involved.

Both devices fetch the bundled MP4. The phone estimates viewer clock offset, receives a future playback anchor and corrects preview drift. This is approximate synchronization, not frame lock. Buffering, decoding and mobile background scheduling still matter. State older than two seconds disables phone controls. [Verification and limits](for-ai/VERIFICATION.md).

Jona defaults to circular-fisheye dewarping with adjustable lens angle and alignment. Equirectangular 180/360 and flat mappings are available. These are runtime views of the same film. Jona is mono, not binocular stereo. WebXR determines headset FOV; the FOV slider affects the non-XR screen.

Internet is required for VDO signaling and ICE, even on the same Wi-Fi. Direct peers can learn network addresses; TURN can relay encrypted traffic. The site shows the observed route when available. No offline-LAN or service availability guarantee. [VDO SDK](https://sdk.vdo.ninja/docs/api-reference.html), [BRSP](https://github.com/GeorgeFejer91/browser-remote-sync-protocol).

## Run and publish

Requires Node 22.12+; CI uses Node 24.

```sh
npm ci
npm run dev
node scripts/verify-assets.mjs
npm run check
npx playwright install chromium
npm run test:browser
```

Optional public-network integration test:

```powershell
$env:RUN_NETWORK='1'
npm run test:browser
```

Pages uses **GitHub Actions** as source. Pushes to main verify asset hashes, run Node/browser checks, build and publish dist. Relative paths support the repository subpath. Set TEST_URL to a published site's complete root URL to exercise it with the browser suite.

## Film and licenses

Jona is the complete 7:47 film, encoded at 1920x1920, 30 fps H.264/AAC, approximately 72 MiB, tracked directly so Pages serves actual MP4 bytes. The large original and other footage are excluded. The owner requested this film's publication; no downstream reuse license is granted. [Exact provenance](public/media-provenance.json).

[Third-party notices](THIRD_PARTY_NOTICES.md) retain transport and library licenses. Project context lives in [for-ai](for-ai/README.md).
