# Immersive Video Player

Watch **Jona** in an immersive view, with your phone as the remote.

**[Open the session page](https://georgefejer91.github.io/immersive-video-player/)**

Scan the same QR on the headset and phone, or choose **Viewer** / **Controller**. On both, select **Enable**, then **Connect**. Select **VR** on the viewer and **Start** on the phone.

The phone becomes a local video player with **Start**, **Pause** and **Stop**. Pause holds the position; Stop resets both players to zero. The headset icon opens connection controls and pulses green when the authenticated viewer state, clock and local preview agree; otherwise it is red. Pairing controls close after connection.

The viewer retains **Connection**, **Playback** and **View** sections. **Session** holds link utilities; **QR** opens pairing; **Hide** leaves only video.

The launcher loads no film or connection. **New** creates a fresh session. Pairing keys stay in memory; reopen the shared link after reloading a device. One invited phone controls at a time. Its **Disconnect** pauses the viewer and allows another phone to connect; viewer **Disconnect** clears the local invitation. Sessions expire after 30 minutes.

The phone preview is silent; audio plays on the viewer. Playback pauses if the viewer buffers.

## How it works

The viewer is authoritative. A high-entropy invitation stays in the URL fragment and is removed from visible history on both devices. Device hints choose an interface; explicit role links override them. They do not authenticate a peer or grant commands. Actual WebXR support is checked at runtime. BRSP/1 proves both peers possess the pairing secret; the phone requests only player.transport scope and commands are acknowledged. Pinned VDO.Ninja SDK 1.5.5 handles signaling and a single duplex data-only WebRTC connection. No camera, microphone, screen capture or video broadcast is involved.

Both devices fetch the bundled MP4. The phone uses the native video element; only the viewer needs the immersive renderer. The phone estimates viewer clock offset, receives a playback anchor 500 ms ahead and corrects preview drift. This is approximate synchronization, not frame lock. State older than two seconds disables phone controls. [Verification and limits](for-ai/VERIFICATION.md).

Jona defaults to circular-fisheye dewarping with adjustable lens angle and alignment. Equirectangular 180/360 and flat mappings are available. These are runtime views of the same film. Jona is mono, not binocular stereo. WebXR determines headset FOV; the FOV slider affects the non-XR screen.

Internet is required for VDO signaling and ICE, even on the same Wi-Fi. Direct peers can learn network addresses; TURN can relay encrypted traffic. Observed route and RTT remain available as body data attributes for diagnostics. No offline-LAN or service availability guarantee. [VDO SDK](https://sdk.vdo.ninja/docs/api-reference.html), [BRSP](https://github.com/GeorgeFejer91/browser-remote-sync-protocol).

## Quest app launcher

The [Quest launcher](quest-launcher/README.md) builds a small sideloadable APK. Its **Immersive Video Player** icon opens Meta Quest Browser directly to the viewer, starts pairing and displays a new phone QR automatically. Scan it on your phone, select **Enable** and **Connect**, then select **VR** once on the headset. That headset gesture enables video and requests immersive mode. Use the phone's **Start**, **Pause** and **Stop** controls. Browser permission prompts still apply.

The APK and signing key stay local. No native renderer, WebView or background service is involved. The ordinary session page retains its explicit Connect flow. Opening `?launch=quest` is the launcher's explicit automatic-pairing entry; each launch uses fresh in-memory pairing material.

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
