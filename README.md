# Immersive Video Player

Watch **Jona** in an immersive view, with your phone as the remote.

**[Open the session page](https://georgefejer91.github.io/immersive-video-player/)**

Scan the same QR on the headset and phone, or choose **Viewer** / **Controller**. On both, select **Enable**, then **Connect**. Select **VR** on the viewer and **Start** on the phone.

The phone becomes a local video player with **Start**, **Pause**, **Stop** and a time slider. Pause holds the position; Stop resets every connected player to zero. The headset icon opens connection controls and pulses green when the authenticated viewer state, clock and local preview agree; otherwise it is red. Pairing controls close after connection.

Tap the **settings icon** on the phone to open video settings over the player. Drag **Angle** to adjust the fisheye lens live from 180° to 360° in 1° steps. **Jona 240°** restores the fitted default. Standard 180°, 270°, and 360° fisheye presets, 180° and 360° panorama mappings, and Flat are also available. Drag the preview to look around. Before pairing, settings change the phone preview. Once paired, they change the shared projection on the headset and all connected previews.

The viewer retains **Connection**, **Playback** and **View** sections. **Session** holds link utilities; **QR** opens pairing; **Hide** leaves only video.

The launcher loads no film or connection. **New** creates a fresh session. Pairing keys stay in memory; reopen the shared link after reloading or installing. Multiple invited phones can control the same viewer, with commands applied in arrival order. One phone disconnecting leaves the other devices connected. **Join viewer** in the QR dialog adds a synchronized viewer to the same session. Viewer **Disconnect** ends the session for everyone and clears the local invitation. Sessions expire after 30 minutes.

Interrupted connections retry automatically while the page is visible and online. On returning from the background, the phone refreshes its playback state and clock before enabling controls. Explicit Disconnect cancels retries. Keep Quest Browser open; a closed browser or expired session needs a fresh invitation. Internet and the signaling service must remain available.

The phone preview is silent; audio plays on the viewer. Playback pauses if the viewer buffers.

## How it works

The first viewer is authoritative. A high-entropy invitation stays in the URL fragment and is removed from visible history on each device. Device hints choose an interface; explicit role links override them. They do not authenticate a peer or grant commands. Actual WebXR support is checked at runtime. BRSP/1 proves both peers possess the pairing secret; phones negotiate playback and projection scopes and commands are acknowledged. Pinned VDO.Ninja SDK 1.5.5 handles signaling and a separate duplex data-only WebRTC connection for each invited device. Only controls, state and clock samples cross those connections. No camera, microphone, screen capture or video broadcast is involved.

Both devices fetch and decode the same MP4. The live build uses Jona's original 2880×2880, 60 fps video and audio streams. A local build without the source-quality asset uses the bundled 1920×1920 preview. The phone dewarps it using the viewer's projection shader and falls back to native video without WebGL; it can still adjust the paired viewer. The phone estimates viewer clock offset, receives a playback anchor 500 ms ahead and corrects preview drift. This is approximate synchronization. State older than two seconds disables remote phone commands.

The 240° setting fits straight edges in several Jona scenes. The exact camera lens is unverified. The viewer's **View** panel offers fine lens and alignment adjustment. WebXR sets the headset FOV; the FOV slider affects screens outside VR. [Calibration, verification and limits](for-ai/VERIFICATION.md).

Internet is required for VDO signaling and ICE, even on the same Wi-Fi. Direct peers can learn network addresses; TURN can relay encrypted traffic. Observed route and RTT remain available as body data attributes for diagnostics. No offline-LAN or service availability guarantee. [VDO SDK](https://sdk.vdo.ninja/docs/api-reference.html), [BRSP](https://github.com/GeorgeFejer91/browser-remote-sync-protocol).

## Install the controller and Quest shortcut

**Install app** appears when you enter the website and disappears once the video actually starts playing. In supported browsers it opens the browser's install prompt after a click. Otherwise it shows the appropriate browser-menu instructions. On iPhone/iPad, use Safari → Share → Add to Home Screen. The controller icon opens the phone controls; reopen your session link to pair it. Installation does not save pairing secrets. The service worker caches only the app interface; video and live synchronization require an internet connection.

On Quest, open [the automatic viewer entry](https://georgefejer91.github.io/immersive-video-player/?launch=quest), then use Quest Browser's menu → **Add this page to your library**. The resulting Library shortcut opens the viewer and a fresh phone QR. This uses the browser's built-in shortcut and needs no dedicated APK. The website can show instructions but cannot press the browser's Library action for you. [Meta's shortcut documentation](https://www.meta.com/en-gb/help/quest/172903867975450/).

## Optional APK launcher

[Download the optional APK directly](https://georgefejer91.github.io/immersive-video-player/downloads/ImmersiveVideoPlayer-Quest.apk), then sideload it using Meta Quest Developer Hub, SideQuest or ADB. The [installation guide](quest-launcher/README.md) covers setup and rebuilding. Its **Immersive Video Player** icon opens Meta Quest Browser directly to the viewer, starts pairing and displays a new phone QR automatically. Scan it on your phone, then select **Enable** and **Connect** there. In the headset, **Enter VR** on the pairing screen or **VR** in Connection enables video and opens immersive mode with one headset gesture. Use the phone's **Start**, **Pause** and **Stop** controls. Browser permission prompts still apply.

Only the reviewed signed launcher APK is published; its signing key stays private. Downloading does not install it automatically. No native renderer, WebView or background service is involved. The ordinary session page retains its explicit Connect flow. A regular Quest Browser tab requires a local gesture for immersive entry. Automatic entry from the app icon requires a signed and origin-verified immersive WebXR PWA. Opening `?launch=quest` is the launcher's explicit automatic-pairing entry; each launch uses fresh in-memory pairing material.

## Run and publish

Requires Node 22.12+. CI uses Node 24. The Pages workflow downloads the source-quality Jona release asset, verifies its SHA-256, and places it at the same media URL. For a local build with that asset, set the JONA_SOURCE_MEDIA environment variable to the MP4 path before building.

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
