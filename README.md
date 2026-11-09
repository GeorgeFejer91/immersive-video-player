# Immersive Video Player

Watch **Jona** together from [the same player URL](https://georgefejer91.github.io/immersive-video-player/) on Quest, phone, and desktop.

1. On the browser that will play the video, tap **Transmit beacon**.
2. On the browser that will control it, tap **Scan beacon**. It automatically requests pairing with the first available beacon.
3. On the transmitting browser, tap **Allow to pair**. Both dialogs and beacon buttons close once the connection is ready.

Either browser can transmit or scan. The pair shares **Start**, **Pause**, and **Stop**. Stop resets the video on both devices.

On the controller, **Request VR** prompts the wearer to tap **Enter VR** in the viewer. Once the headset enters VR, **Exit VR** ends the immersive session from the controller. WebXR requires the headset gesture for entry. [WebXR protected functionality](https://www.w3.org/TR/webxr/#immersive-session-request-is-allowed)

Each beacon expires after two minutes or closes when pairing succeeds. The Quest's **QR** button shares the player URL. A paired browser retries the selected connection after a network interruption. After disconnecting, send a new beacon to pair again.

Use **Recenter view** in the viewer browser, paired controller, or installed app. In VR, look where you want the center to be, including up or down, then press the button. The glowing headset icon is a controller shortcut for the same action. The player remembers the browser view and the VR center separately. To disconnect, open **Video settings**, then **Connection**. Video settings also let you select a warp preset or adjust **Angle** from 180° to 360° in 1° steps. **Jona 240°** restores the fitted default. Drag the preview to look around. The controller preview is silent.

## How it works

The public VDO.Ninja room lists temporary beacon IDs. On approval, the transmitter sends a fresh secret to the requesting browser over its WebRTC data channel. The browsers use the secret to open a separate private BRSP/1 session for one controller. The secret stays out of the listing, URL, and persistent storage. BRSP verifies role-bound proofs, negotiates command scopes, and confirms pairing after the controller receives fresh viewer state and a clock sample. The viewer orders playback, projection, and VR commands. VDO.Ninja SDK 1.5.5 carries controls and state over data-only WebRTC.

Both devices fetch and decode the same bundled MP4. The phone dewarps it using the viewer's projection shader and falls back to native video without WebGL; it can still adjust the paired viewer. The phone estimates viewer clock offset, receives a playback anchor 500 ms ahead and corrects preview drift. This is approximate synchronization. State older than two seconds disables remote phone commands.

The 240° setting fits straight edges in several Jona scenes. The exact camera lens is unverified. The viewer's **View** panel offers fine lens and alignment adjustment. WebXR sets the headset FOV; the FOV slider affects screens outside VR. [Calibration, verification and limits](for-ai/VERIFICATION.md).

Internet is required for VDO signaling and ICE, even on the same Wi-Fi. Direct peers can learn network addresses; TURN can relay encrypted traffic. Observed route and RTT remain available as body data attributes for diagnostics. No offline-LAN or service availability guarantee. [VDO SDK](https://sdk.vdo.ninja/docs/api-reference.html), [BRSP](https://github.com/GeorgeFejer91/browser-remote-sync-protocol).

## Install the controller and Quest shortcut

**Install app** appears on entry and disappears when playback begins. On iPhone or iPad, use Safari → Share → Add to Home Screen. On Quest, open the player in Quest Browser and use its menu → **Add this page to your library**. The installed shortcut opens the shared player URL. The service worker caches the app interface. Video and live synchronization require an internet connection.

## Optional APK launcher

[Download the optional APK](https://georgefejer91.github.io/immersive-video-player/downloads/ImmersiveVideoPlayer-Quest.apk), then sideload it using Meta Quest Developer Hub, SideQuest, or ADB. The [installation guide](quest-launcher/README.md) covers setup and rebuilding. The installed icon opens the same shared playback in Quest Browser. Tap **VR** on the headset to enable immersive playback.

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
